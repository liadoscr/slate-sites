import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { readJson } from '@/lib/http/request';
import { createAdminClient } from '@/lib/supabase/admin';
import { uuidPattern } from '@/lib/sites/document';
import { removeProjectStorageBatch } from '@/lib/sites/project-storage';
import { workspaceError } from '@/lib/sites/workspace-server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Context = { params: Promise<{ projectId: string }> };
type AdminClient = ReturnType<typeof createAdminClient>;
type CleanupRecord = { project_id: string; actor_id: string; state: 'pending' | 'complete'; attempts: number };

function missingDeleteFunction(message: string) {
  return /schema cache|Could not find the function|does not exist/i.test(message);
}

function cleanupResponse(cleanupPending: boolean, removedFiles = 0) {
  return NextResponse.json(
    { deleted: true, publicSiteRemoved: true, cleanupPending, removedFiles },
    { status: cleanupPending ? 202 : 200, headers: { 'Cache-Control': 'no-store' } },
  );
}

async function findCleanup(admin: AdminClient, projectId: string, actorId: string) {
  const { data, error } = await admin
    .from('project_deletion_cleanup')
    .select('project_id,actor_id,state,attempts')
    .eq('project_id', projectId)
    .eq('actor_id', actorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as CleanupRecord | null;
}

async function attemptStorageCleanup(admin: AdminClient, cleanup: CleanupRecord) {
  if (cleanup.state === 'complete') return cleanupResponse(false);

  const attemptedAt = new Date().toISOString();
  const attempts = cleanup.attempts + 1;
  try {
    const result = await removeProjectStorageBatch(admin, cleanup.project_id);
    const values = result.pending
      ? { attempts, last_attempt_at: attemptedAt, last_error: null, updated_at: attemptedAt }
      : { state: 'complete', attempts, last_attempt_at: attemptedAt, last_error: null, completed_at: attemptedAt, updated_at: attemptedAt };
    const { error } = await admin
      .from('project_deletion_cleanup')
      .update(values)
      .eq('project_id', cleanup.project_id)
      .eq('actor_id', cleanup.actor_id)
      .eq('state', 'pending');
    if (error) throw error;
    return cleanupResponse(result.pending, result.removed);
  } catch (cleanupError) {
    const message = cleanupError instanceof Error ? cleanupError.message : 'unknown';
    const { error: recordError } = await admin
      .from('project_deletion_cleanup')
      .update({ attempts, last_attempt_at: attemptedAt, last_error: message.slice(0, 500), updated_at: attemptedAt })
      .eq('project_id', cleanup.project_id)
      .eq('actor_id', cleanup.actor_id)
      .eq('state', 'pending');
    console.error('Deleted project storage cleanup failed', {
      projectId: cleanup.project_id,
      message,
      recordError: recordError?.message,
    });
    return cleanupResponse(true);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  }

  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר.' }, { status: 401 });
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });

  try {
    const admin = createAdminClient();
    const { data: project, error: projectError } = await admin
      .from('projects')
      .select('id,business_name')
      .eq('id', projectId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (projectError) throw new Error(projectError.message);
    if (project) {
      const body = await readJson(request);
      if (typeof body.confirmationName !== 'string' || body.confirmationName.trim() !== project.business_name) {
        return NextResponse.json({ error: 'הקלידו את שם העסק בדיוק כפי שהוא מופיע כדי לאשר את המחיקה.' }, { status: 422 });
      }

      // This RPC row-locks the project against generation and atomically writes
      // a durable cleanup row before the project cascade removes public data.
      const { error: deleteError } = await admin.rpc('slate_delete_project', {
        p_project: projectId,
        p_actor: user.id,
      });
      if (deleteError) {
        if (missingDeleteFunction(deleteError.message)) {
          return NextResponse.json({ error: 'נדרש עדכון מסד הנתונים לפני שאפשר למחוק פרויקט בבטחה.' }, { status: 503 });
        }
        if (/GENERATION_BUSY/.test(deleteError.message)) return NextResponse.json({ error: 'יצירת האתר עדיין מתבצעת. המתינו לסיום ואז נסו למחוק שוב.' }, { status: 409 });
        if (/DELETE_CLEANUP_CONFLICT/.test(deleteError.message)) return NextResponse.json({ error: 'לא ניתן למחוק את הפרויקט בבטחה כרגע. פנו לתמיכה של Slate Sites.' }, { status: 409 });
        if (!/NOT_OWNER/.test(deleteError.message)) throw new Error(deleteError.message);
        // A simultaneous request may already have deleted the row. In that case
        // its owner-scoped cleanup record below makes this retry idempotent.
      }
    }

    const cleanup = await findCleanup(admin, projectId, user.id);
    if (!cleanup) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
    return await attemptStorageCleanup(admin, cleanup);
  } catch (error) {
    const result = workspaceError(error);
    const message = result.status === 503
      ? result.error
      : 'לא הצלחנו להשלים או לאשר את המחיקה. אפשר לנסות שוב בבטחה.';
    return NextResponse.json({ error: message }, { status: result.status });
  }
}
