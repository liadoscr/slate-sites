import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { CuratedDemo } from '@/components/sites/curated-demo';
import { getCuratedDemo } from '@/lib/sites/demo-catalog';
import { isSitePlan, uuidPattern } from '@/lib/sites/document';
import { SiteRenderer } from '@/components/sites/site-renderer';
import { PreviewViewport } from '@/components/projects/preview-viewport';
import { PublishSiteButton } from '@/components/projects/publish-site-button';
import styles from '@/components/projects/creation-simple.module.css';
export const metadata = {robots:{index:false,follow:false}};
export default async function ProjectPreviewPage({params,searchParams}:{params:Promise<{projectId:string}>;searchParams:Promise<{version?:string}>}) {
  const {projectId}=await params; const {version:versionId}=await searchParams;
  if (!uuidPattern.test(projectId)) notFound();
  if (!await getCurrentUser()) redirect(`/auth?next=${encodeURIComponent(`/dashboard/projects/${projectId}/preview${versionId && uuidPattern.test(versionId) ? `?version=${versionId}` : ''}`)}`);
  const client=await createClient();
  let query=client.from('site_versions').select('id,content,version_number,visibility').eq('project_id',projectId);
  if (versionId) { if (!uuidPattern.test(versionId)) notFound(); query=query.eq('id',versionId); } else query=query.neq('visibility','preview');
  const {data:version}=await query.order('version_number',{ascending:false}).limit(1).maybeSingle();
  if (!version || !isSitePlan(version.content)) notFound();
  const { data: live } = await client.from('site_versions').select('id,published_url').eq('project_id',projectId).eq('visibility','public').limit(1).maybeSingle();
  const curated = Boolean(getCuratedDemo(version.content));
  return <div><header className={styles.toolbar}><div><p>{version.visibility==='preview'?'הצעת שינוי לבדיקה':version.visibility==='public'?'הגרסה המפורסמת':'הטיוטה שלכם מוכנה'} · גרסה {version.version_number}</p><small>{version.visibility==='public'?'הגרסה הזו זמינה למבקרים.':'פרטי — עדיין לא פורסם. שינוי טקסט או עיצוב יפתח את הטיוטה האחרונה לעריכה.'}</small></div><div className={styles.actions}>{!curated ? <><Link href={`/dashboard/projects/${projectId}?edit=text#site-editor`}>שינוי טקסט</Link><Link href={`/dashboard/projects/${projectId}?edit=design#site-editor`}>שינוי עיצוב ותמונות</Link></> : null}{version.visibility !== 'preview' ? <PublishSiteButton projectId={projectId} versionId={version.id} isCurrentVersionPublished={version.visibility==='public'} hasLiveSite={Boolean(live)} liveUrl={live?.published_url ?? null} /> : null}<Link href={`/dashboard/projects/${projectId}`}>כל אפשרויות הפרויקט</Link></div></header><PreviewViewport>{getCuratedDemo(version.content)?<CuratedDemo content={version.content} />:<SiteRenderer plan={version.content} projectId={projectId} versionId={version.id} />}</PreviewViewport></div>;
}
