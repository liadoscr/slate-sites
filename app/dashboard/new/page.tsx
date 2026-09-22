import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NewProjectBriefForm } from '@/components/projects/new-project-brief-form';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    return <main className="app-shell"><Link className="back-link" href="/">← חזרה</Link><p className="setup-notice">יש לחבר קודם את Supabase כדי לשמור בריפים אמיתיים.</p></main>;
  }
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/dashboard/new');

  return (
    <main className="app-shell">
      <header className="simple-header">
        <Link className="brand" href="/dashboard" aria-label="חזרה לפרויקטים"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
        <Link className="back-link" href="/dashboard">← כל הפרויקטים</Link>
      </header>
      <section aria-label="יצירת אתר חדש">
        <h1 className="sr-only">יצירת האתר שלכם</h1>
        <NewProjectBriefForm userId={user.id} />
      </section>
    </main>
  );
}
