import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';
import { projectStatusLabels } from '@/lib/projects/status';
import { ORANGE_DEMO_PROJECT_ID } from '@/lib/sites/orange-demo';
import orangeHero from '@/public/gel-orange-hero.png';

type Project = { id: string; business_name: string; business_type: string | null; status: string; updated_at: string; site_versions: { visibility: string }[] };

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <main className="app-shell"><header className="simple-header"><Link className="brand" href="/"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link></header><section className="panel auth-panel"><h1>הדאשבורד מוכן לחיבור</h1><p className="setup-notice">יש להוסיף את משתני Supabase ולהריץ את קובץ המיגרציה לפני שאפשר לשמור משתמשים ופרויקטים אמיתיים.</p></section></main>;
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/dashboard');

  const { data, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, status, updated_at, site_versions(visibility)')
    .eq('site_versions.visibility', 'public')
    .order('updated_at', { ascending: false });
  const projects = ((data ?? []) as Project[]).map((project) => ({
    ...project,
    status: project.site_versions.some((version) => version.visibility === 'public') ? 'published' : project.status,
  }));

  return (
    <main className="app-shell">
      <header className="simple-header">
        <Link className="brand" href="/" aria-label="Slate Sites, דף הבית"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
        <Link className="back-link" href="/">לאתר Slate Sites ↗</Link>
      </header>
      <section className="dashboard-top">
        <div><p className="kicker">סביבת העבודה שלך</p><h1>האתרים שלי</h1><p><bdi>{user.email}</bdi> · ממשיכים מהמקום שבו עצרתם.</p></div>
        <Link className="primary-cta" href="/dashboard/new">יצירת אתר חדש <span aria-hidden="true">＋</span></Link>
      </section>
      {error ? <p className="error-message" role="alert">לא הצלחנו לטעון את האתרים. נסו לרענן את העמוד.</p> : <dl className="dashboard-summary" aria-label="סיכום האתרים"><div><dt>האתרים שלי</dt><dd>{projects.length}</dd></div><div><dt>באוויר</dt><dd>{projects.filter((project) => project.status === 'published').length}</dd></div><div><dt>בעבודה</dt><dd>{projects.filter((project) => !['published', 'archived'].includes(project.status)).length}</dd></div></dl>}
      <section className="dashboard-grid" aria-label="פרויקטים">
        {projects.map((project) => (
          <Link className="project-card" href={`/dashboard/projects/${project.id}`} key={project.id}>
            {project.id === ORANGE_DEMO_PROJECT_ID ? <div className="project-demo-image"><Image src={orangeHero} alt="אתר הדגמה ORANGE.GEL" fill sizes="(max-width: 620px) 90vw, 380px" /><span>אתר הדגמה</span></div> : null}
            <div className="project-card-head"><span className="project-monogram" aria-hidden="true">{project.business_name.slice(0, 1)}</span><span className="status-pill" data-status={project.status}>{projectStatusLabels[project.status] ?? 'בעבודה'}</span></div>
            <h2>{project.business_name}</h2>
            <p>{project.business_type || 'האתר של העסק שלך'}</p>
            <div className="project-card-footer"><time dateTime={project.updated_at}>עודכן {new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(project.updated_at))}</time><b>פתיחת הפרויקט ←</b></div>
          </Link>
        ))}
        <Link className="empty-card" href="/dashboard/new"><span aria-hidden="true">＋</span><b>מקום לרעיון הבא שלך</b><small>מוסיפים עסק, מספרים עליו, ומתחילים ליצור.</small></Link>
      </section>
    </main>
  );
}
