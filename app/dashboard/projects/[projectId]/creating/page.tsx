import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { uuidPattern } from '@/lib/sites/document';
import { WorkspaceHeader } from '@/components/projects/workspace-header';
import { GenerationProgress } from '@/components/projects/generation-progress';

export default async function CreatingPage({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ job?: string }> }) {
  const { projectId } = await params;
  const { job } = await searchParams;
  if (!uuidPattern.test(projectId) || !job || !uuidPattern.test(job)) notFound();
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/dashboard/projects/${projectId}/creating?job=${job}`)}`);
  const client = await createClient();
  const { data } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle();
  if (!data) notFound();
  return <main className="app-shell"><WorkspaceHeader /><GenerationProgress projectId={projectId} jobId={job} /></main>;
}
