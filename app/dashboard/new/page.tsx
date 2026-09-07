import Link from 'next/link';
import { redirect } from 'next/navigation';
import { NewProjectBriefForm } from '@/components/projects/new-project-brief-form';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';

export default async function NewProjectPage() {
  if (!isSupabaseConfigured()) {
    return <main className="app-shell"><Link className="back-link" href="/">← חזרה</Link><p className="setup-notice">יש לחבר קודם את Supabase כדי לשמור בריפים אמיתיים.</p></main>;
  }
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect('/auth?next=/dashboard/new');

  return (
    <main className="app-shell">
      <header className="simple-header">
        <Link className="brand" href="/dashboard" aria-label="חזרה לפרויקטים"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
        <Link className="back-link" href="/dashboard">← כל הפרויקטים</Link>
      </header>
      <section className="brief-page">
        <aside className="brief-copy"><p className="kicker">פרויקט חדש</p><h1>בואו נכיר את האתר שאתם רוצים.</h1><p>שומרים בריף אמיתי בחשבון שלך. אפשר להשאיר טיוטה ולחזור אליה, או לשלוח אותה לבדיקת הצוות.</p><p className="privacy-note">הקבצים עולים לתיק פרטי של הפרויקט. רק בעל/ת הפרויקט והצוות המורשה יכולים לגשת אליהם.</p></aside>
        <NewProjectBriefForm userId={user.id} />
      </section>
    </main>
  );
}
