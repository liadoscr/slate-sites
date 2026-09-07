import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';

const statusLabels: Record<string, string> = {
  draft: 'טיוטה', submitted: 'נשלח לבדיקה', in_review: 'בבדיקה', needs_changes: 'נדרשים פרטים',
  approved: 'אושר', building: 'בבנייה', preview_ready: 'מוכן לתצוגה', published: 'פורסם', archived: 'בארכיון',
};

type Project = { id: string; business_name: string; business_type: string | null; status: string; updated_at: string };

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) {
    return <main className="app-shell"><header className="simple-header"><Link className="brand" href="/"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link></header><section className="panel auth-panel"><h1>הדאשבורד מוכן לחיבור</h1><p className="setup-notice">יש להוסיף את משתני Supabase ולהריץ את קובץ המיגרציה לפני שאפשר לשמור משתמשים ופרויקטים אמיתיים.</p></section></main>;
  }

  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/dashboard');

  const { data, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, status, updated_at')
    .order('updated_at', { ascending: false });
  const projects = (data ?? []) as Project[];

  return (
    <main className="app-shell">
      <header className="simple-header">
        <Link className="brand" href="/" aria-label="Slate Sites, דף הבית"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
        <Link className="back-link" href="/">לאתר Slate Sites ↗</Link>
      </header>
      <section className="dashboard-top">
        <div><p className="kicker">החשבון שלי</p><h1>הפרויקטים שלך</h1><p>{user.email} · כל בריף נשמר כאן באופן פרטי.</p></div>
        <Link className="primary-cta" href="/dashboard/new">בריף חדש <span aria-hidden="true">←</span></Link>
      </section>
      {error ? <p className="error-message">לא הצלחנו לטעון פרויקטים. ודאו שהמיגרציה הותקנה: {error.message}</p> : null}
      <section className="dashboard-grid" aria-label="פרויקטים">
        <Link className="empty-card" href="/dashboard/new">+<br />יצירת אתר לעסק חדש</Link>
        {projects.map((project) => (
          <Link className="project-card" href={`/dashboard/projects/${project.id}`} key={project.id}>
            <span className="status-pill">{statusLabels[project.status] ?? project.status}</span>
            <h2>{project.business_name}</h2>
            <p>{project.business_type || 'העסק שלך'}<br />עודכן {new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(new Date(project.updated_at))}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
