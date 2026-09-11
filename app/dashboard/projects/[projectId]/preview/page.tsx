import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { OrangeGelDemo } from '@/components/sites/orange-gel-demo';
import { isOrangeGelDemo } from '@/lib/sites/orange-demo';
import { isSitePlan, uuidPattern } from '@/lib/sites/document';
import { SiteRenderer } from '@/components/sites/site-renderer';
import { PreviewViewport } from '@/components/projects/preview-viewport';
export const metadata = {robots:{index:false,follow:false}};
export default async function ProjectPreviewPage({params,searchParams}:{params:Promise<{projectId:string}>;searchParams:Promise<{version?:string}>}) {
  const {projectId}=await params; const {version:versionId}=await searchParams;
  if (!await getCurrentUser()) redirect(`/auth?next=/dashboard/projects/${projectId}/preview`);
  const client=await createClient();
  let query=client.from('site_versions').select('id,content,version_number,visibility').eq('project_id',projectId);
  if (versionId) { if (!uuidPattern.test(versionId)) notFound(); query=query.eq('id',versionId); } else query=query.neq('visibility','preview');
  const {data:version}=await query.order('version_number',{ascending:false}).limit(1).maybeSingle();
  if (!version || !isSitePlan(version.content)) notFound();
  return <div><header className="preview-toolbar"><span>{version.visibility==='preview'?'הצעת שינוי פרטית':'תצוגה פרטית'} · גרסה {version.version_number}</span><Link href={`/dashboard/projects/${projectId}`}>חזרה לפרויקט</Link></header><PreviewViewport>{isOrangeGelDemo(version.content)?<OrangeGelDemo />:<SiteRenderer plan={version.content} projectId={projectId} versionId={version.id} />}</PreviewViewport></div>;
}
