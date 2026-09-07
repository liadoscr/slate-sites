import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';

type ProjectPageProps = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: ProjectPageProps) {
  if (!isSupabaseConfigured()) redirect('/dashboard');
  const { projectId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/dashboard/projects/${projectId}`);

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, location, status, created_at, project_briefs(business_story, primary_goal, website_copy, important_links, tone, color_preference), design_references(url, notes), project_assets(original_name, mime_type, size_bytes)')
    .eq('id', projectId)
    .single();
  if (error || !project) notFound();

  const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
  const references = Array.isArray(project.design_references) ? project.design_references : [];
  const assets = Array.isArray(project.project_assets) ? project.project_assets : [];

  return (
    <main className="app-shell">
      <header className="simple-header"><Link className="brand" href="/dashboard"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link><Link className="back-link" href="/dashboard">← כל הפרויקטים</Link></header>
      <section className="dashboard-top"><div><p className="kicker">פרויקט</p><h1>{project.business_name}</h1><p>{project.business_type || 'עסק'}{project.location ? ` · ${project.location}` : ''}</p></div><span className="status-pill">{project.status}</span></section>
      <section className="panel brief-form">
        <h2>סיכום הבריף</h2>
        <div className="field-grid">
          <p className="small-print"><b>מטרת האתר:</b><br />{brief?.primary_goal || 'לא נוספה עדיין'}</p>
          <p className="small-print"><b>אופי האתר:</b><br />{brief?.tone || 'לא נבחר עדיין'}</p>
          <p className="small-print field full"><b>הסיפור של העסק:</b><br />{brief?.business_story || 'לא נוסף עדיין'}</p>
          <p className="small-print field full"><b>תוכן לאתר:</b><br />{brief?.website_copy || 'לא נוסף עדיין'}</p>
        </div>
        <h3>השראות וקבצים</h3>
        {references.length ? <ul className="file-list">{references.map((reference) => <li key={reference.url}><a className="inline-link" href={reference.url} target="_blank" rel="noreferrer">קישור להשראה ↗</a><span>{reference.notes || 'ללא הערות'}</span></li>)}</ul> : <p className="small-print">לא נוספו קישורי השראה.</p>}
        {assets.length ? <ul className="file-list">{assets.map((asset) => <li key={asset.original_name}><b>{asset.original_name}</b><span>{asset.mime_type}</span></li>)}</ul> : <p className="small-print">לא הועלו קבצים.</p>}
      </section>
    </main>
  );
}
