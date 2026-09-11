import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmailOtpForm } from '@/components/auth/email-otp-form';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type AuthPageProps = {
  searchParams: Promise<{ next?: string; source?: string; error?: string }>;
};

import { safeNextPath } from '@/lib/auth/safe-next-path';

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const source = params.source === 'slate' ? 'slate' : 'direct';
  const nextPath = safeNextPath(params.next);
  // A direct visitor who already has a valid session should never be asked to
  // authenticate again. Slate handoffs are intentionally excluded because they
  // must verify the email associated with the one-time Slate transfer.
  if (source === 'direct' && isSupabaseConfigured() && await getCurrentUser()) redirect(nextPath);

  return (
    <main className="app-shell">
      <header className="simple-header">
        <Link className="brand" href="/" aria-label="Slate Sites, דף הבית">
          <span className="brand-slate">slate<span className="brand-dot">.</span></span>
          <span className="brand-divider" />
          <span className="brand-product">Sites</span>
        </Link>
        <Link className="back-link" href="/">← חזרה לאתר</Link>
      </header>
      <section className="auth-layout" aria-label="כניסה לחשבון Slate Sites">
        <aside className="auth-side">
          <p className="kicker">חשבון Slate Sites</p>
          <h1>האתר הבא שלך<br />מתחיל כאן.</h1>
          <p>מהסיפור של העסק ועד לרגע הפרסום. כל התוכן, ההשראות והאתרים שלך, במקום אחד.</p>
          <ul className="auth-points">
            <li><span>01</span>מספרים על העסק ובוחרים כיוון</li>
            <li><span>02</span>יוצרים תוכן ובודקים תצוגה מקדימה</li>
            <li><span>03</span>מפרסמים ברגע שמוכנים</li>
          </ul>
        </aside>
        <div className="panel auth-panel">
          <h2>{source === 'slate' ? 'ממשיכים מ־Slate' : 'ברוכים הבאים ל־Sites'}</h2>
          <p>{source === 'slate' ? 'נשלח קישור כניסה למייל שהועבר אלינו מ־Slate.' : 'נכנסים עם Google או קישור למייל. בפעם הראשונה ניצור עבורכם חשבון.'}</p>
          {params.error ? <p className="error-message" role="alert">{params.error}</p> : null}
          <EmailOtpForm source={source} nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
