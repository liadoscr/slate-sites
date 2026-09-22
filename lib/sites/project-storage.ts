import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

const listPageSize = 100;
const defaultFileBatchSize = 100;
const defaultListCallLimit = 32;

export type ProjectStorageCleanupResult = {
  removed: number;
  pending: boolean;
};

type CleanupLimits = {
  maxFiles?: number;
  maxListCalls?: number;
};

type CleanupBudget = {
  filesRemaining: number;
  listCallsRemaining: number;
};

async function collectProjectFileBatch(
  admin: AdminClient,
  bucketName: string,
  projectId: string,
  budget: CleanupBudget,
) {
  const bucket = admin.storage.from(bucketName);
  const folders = [projectId];
  const visited = new Set<string>();
  const files: string[] = [];
  let truncated = false;

  traversal: while (folders.length) {
    if (budget.filesRemaining <= 0 || budget.listCallsRemaining <= 0) {
      truncated = true;
      break;
    }

    const folder = folders.shift()!;
    if (visited.has(folder)) continue;
    visited.add(folder);

    for (let offset = 0; ; offset += listPageSize) {
      if (budget.listCallsRemaining <= 0) {
        truncated = true;
        break traversal;
      }

      budget.listCallsRemaining -= 1;
      const { data, error } = await bucket.list(folder, {
        limit: listPageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      for (const entry of data ?? []) {
        const path = `${folder}/${entry.name}`;
        // Storage object names are opaque keys, not filesystem paths. Keeping
        // the project prefix is the authorization boundary; rejecting a literal
        // `..` segment would strand an object an owner uploaded directly.
        if (!path.startsWith(`${projectId}/`)) continue;
        if (entry.id) {
          files.push(path);
          budget.filesRemaining -= 1;
          if (budget.filesRemaining <= 0) {
            // There may be more entries on this page. A later request safely
            // starts from the prefix again after this batch has been removed.
            truncated = true;
            break traversal;
          }
        } else {
          folders.push(path);
        }
      }

      if (!data || data.length < listPageSize) break;
    }
  }

  return { files, truncated };
}

async function removeFiles(admin: AdminClient, bucketName: string, paths: string[]) {
  const bucket = admin.storage.from(bucketName);
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await bucket.remove(paths.slice(index, index + 100));
    if (error) throw error;
  }
}

/**
 * Removes a bounded, idempotent batch below a project's private prefixes.
 * Call again while `pending` is true. Starting each pass at the prefix avoids
 * offset drift when earlier objects have just been removed.
 */
export async function removeProjectStorageBatch(
  admin: AdminClient,
  projectId: string,
  limits: CleanupLimits = {},
): Promise<ProjectStorageCleanupResult> {
  const maxFiles = Math.max(1, Math.min(limits.maxFiles ?? defaultFileBatchSize, 500));
  const maxListCalls = Math.max(1, Math.min(limits.maxListCalls ?? defaultListCallLimit, 100));
  const budget: CleanupBudget = { filesRemaining: maxFiles, listCallsRemaining: maxListCalls };
  const buckets = ['project-assets', 'site-version-assets'] as const;
  let removed = 0;

  for (const bucketName of buckets) {
    const { files, truncated } = await collectProjectFileBatch(admin, bucketName, projectId, budget);
    await removeFiles(admin, bucketName, files);
    removed += files.length;

    if (truncated) return { removed, pending: true };
  }

  return { removed, pending: false };
}
