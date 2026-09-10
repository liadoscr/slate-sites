import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmailOtpForm } from '@/components/auth/email-otp-form';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';

type AuthPageProps = {
  searchParams: Promise<{ next?: string; source?: string; error?: string }>;
};

function safeNextPath(path: string | undefined) {
  return path?.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';
}

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
          <h1>כל העסקים והאתרים שלך, במקום אחד.</h1>
          <p>אין סיסמאות לשמור. שולחים קישור כניסה מאובטח למייל וממשיכים ישירות לפרויקטים שלך.</p>
          <ul className="auth-points">
            <li><span>1</span>החשבון שייך ל־Slate Sites ומופרד ממסד הנתונים של Slate.</li>
            <li><span>2</span>אם הגעת מ־Slate, נזהה את ההעברה המאובטחת ונאמת את אותו מייל.</li>
            <li><span>3</span>אותו מייל תמיד מחזיר אותך לאותם פרויקטים.</li>
          </ul>
        </aside>
        <div className="panel auth-panel">
          <h2>{source === 'slate' ? 'ממשיכים מ־Slate' : 'כניסה או יצירת חשבון'}</h2>
          <p>{source === 'slate' ? 'נשלח קישור כניסה למייל המאומת שהועבר אלינו מ־Slate.' : 'הזינו את כתובת המייל שלכם ונשלח קישור כניסה מאובטח.'}</p>
          {params.error ? <p className="error-message">{params.error}</p> : null}
          <EmailOtpForm source={source} nextPath={nextPath} />
        </div>
      </section>
    </main>
  );
}
