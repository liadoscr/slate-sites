import Link from 'next/link';
import { notFound,redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';
import { GenerateSitePlanButton } from '@/components/projects/generate-site-plan-button';
import { PublishSiteButton } from '@/components/projects/publish-site-button';
import { SiteWorkbench } from '@/components/projects/site-workbench';
import { AssetLibrary } from '@/components/projects/asset-library';
import { LeadInbox } from '@/components/projects/lead-inbox';
import { isSitePlan } from '@/lib/sites/document';
import { isOrangeGelDemo } from '@/lib/sites/orange-demo';
export default async function ProjectPage({params}:{params:Promise<{projectId:string}>}){
  if(!isSupabaseConfigured())redirect('/dashboard');
  const {projectId}=await params;if(!await getCurrentUser())redirect(`/auth?next=/dashboard/projects/${projectId}`);
  const client=await createClient();
  const {data:project}=await client.from('projects').select('id,business_name,business_type,location,status,project_briefs(business_story,primary_goal,website_copy,tone),design_references(url,notes),project_assets(id,original_name,mime_type,size_bytes)').eq('id',projectId).single();
  if(!project)notFound();
  const brief=Array.isArray(project.project_briefs)?project.project_briefs[0]:project.project_briefs;
  const assets=project.project_assets??[];
  const [{data:latest},{data:versions},{data:live}]=await Promise.all([
    client.from('site_versions').select('id,version_number,content,visibility').eq('project_id',projectId).neq('visibility','preview').order('version_number',{ascending:false}).limit(1).maybeSingle(),
    client.from('site_versions').select('id,version_number,created_at,visibility').eq('project_id',projectId).order('version_number',{ascending:false}).limit(50),
    client.from('site_versions').select('id,version_number,published_url').eq('project_id',projectId).eq('visibility','public').limit(1).maybeSingle(),
  ]);
  const plan=latest?.content;const ready=isSitePlan(plan);const curated=isOrangeGelDemo(plan);
  return <main className="app-shell">
    <header className="simple-header"><Link className="brand" href="/dashboard"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider"/><span className="brand-product">Sites</span></Link><Link className="back-link" href="/dashboard">← כל הפרויקטים</Link></header>
    <section className="dashboard-top"><div><p className="kicker">סביבת העבודה שלך</p><h1>{project.business_name}</h1><p>{project.business_type}{project.location?` · ${project.location}`:''}</p></div><div className="project-actions"><span className="status-pill" data-status={live?'published':'draft'}>{live?latest?.id===live.id?'האתר באוויר':'שינויים שעדיין לא פורסמו':'טיוטה פרטית'}</span><Link className="secondary-action" href={`/dashboard/projects/${projectId}/edit`}>עריכת הבריף</Link></div></section>
    <ol className="project-progress" aria-label="התקדמות הפרויקט"><li data-complete="true"><span>01</span><div><b>הסיפור שלך</b><small>הבריף נשמר</small></div></li><li data-complete={ready}><span>02</span><div><b>האתר שלך</b><small>{latest?`טיוטה ${latest.version_number}`:'מוכנים ליצירה'}</small></div></li><li data-complete={Boolean(live)}><span>03</span><div><b>באוויר</b><small>{live?`גרסה ${live.version_number}`:'לאחר הבדיקה שלך'}</small></div></li></ol>
    <section className="panel ai-plan-panel"><div className="ai-plan-heading"><div><p className="kicker">{curated?'ORANGE.GEL · דמו ידני':'Slate Sites'}</p><h2>{curated?'אתר ההדגמה שלך':ready?'כאן האתר שלך מקבל צורה':'ניצור את האתר הראשון שלך'}</h2><p>{ready?'בדקו, דייקו ופרסמו — ההחלטה אצלכם.':'הבריף והתמונות שבחרתם הופכים לאתר שאפשר לראות ולשפר.'}</p></div><div className="ai-plan-actions">{ready&&latest?<><Link className="preview-top-action" href={`/dashboard/projects/${projectId}/preview?version=${latest.id}`}>פתיחת תצוגה מקדימה ↗</Link><PublishSiteButton key={latest.id} projectId={projectId} versionId={latest.id} isCurrentVersionPublished={latest.visibility==='public'} hasLiveSite={Boolean(live)} liveUrl={live?.published_url??null}/></>:null}<a className="secondary-action" href="#new-direction">{ready?'יצירת כיוון חדש':'התחלת היצירה'}</a></div></div>
      {curated?<p className="ai-privacy-note">זהו דמו שעוצב ידנית. יצירת AI תיצור טיוטה נפרדת, ולא תחליף את הדמו המפורסם ללא אישורכם.</p>:null}
      {ready&&latest?<SiteWorkbench key={latest.id} projectId={projectId} versionId={latest.id} plan={plan} versions={versions??[]} curated={curated}/>:<div className="empty-ai-plan"><b>מכאן יוצרים את הכיוון הראשון</b><p>בחרו תמונות ליצירה, או התחילו מהסיפור של העסק בלבד.</p></div>}
      <div id="new-direction"><GenerateSitePlanButton projectId={projectId} assets={assets} hasVersion={ready}/></div>
    </section>
    <details className="panel brief-summary"><summary>הבריף והחומרים שלך</summary><div className="brief-summary-content"><div className="field-grid"><p className="small-print"><b>מטרת האתר</b><br/>{brief?.primary_goal||'לא נוספה עדיין'}</p><p className="small-print"><b>אופי האתר</b><br/>{brief?.tone||'לא נבחר עדיין'}</p><p className="small-print field full"><b>הסיפור של העסק</b><br/>{brief?.business_story||'לא נוסף עדיין'}</p></div><ul className="file-list">{(project.design_references??[]).map(r=><li key={r.url}><a href={r.url} target="_blank" rel="noreferrer">קישור להשראה ↗</a><span>{r.notes}</span></li>)}</ul><AssetLibrary projectId={projectId} assets={assets}/></div></details>
    <LeadInbox projectId={projectId}/>
  </main>;
}
