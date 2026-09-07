import Link from 'next/link';
import { EmailOtpForm } from '@/components/auth/email-otp-form';

type AuthPageProps = {
  searchParams: Promise<{ next?: string; source?: string; error?: string }>;
};

function safeNextPath(path: string | undefined) {
  return path?.startsWith('/') && !path.startsWith('//') ? path : '/dashboard';
}

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const params = await searchParams;
  const source = params.source === 'slate' ? 'slate' : 'direct';

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
          <p>אין סיסמאות לשמור. שולחים קוד חד־פעמי למייל וממשיכים ישירות לפרויקטים שלך.</p>
          <ul className="auth-points">
            <li><span>1</span>החשבון שייך ל־Slate Sites ומופרד ממסד הנתונים של Slate.</li>
            <li><span>2</span>אם הגעת מ־Slate, נזהה את ההעברה המאובטחת ונאמת את אותו מייל.</li>
            <li><span>3</span>אותו מייל תמיד מחזיר אותך לאותם פרויקטים.</li>
          </ul>
        </aside>
        <div className="panel auth-panel">
          <h2>{source === 'slate' ? 'ממשיכים מ־Slate' : 'כניסה או יצירת חשבון'}</h2>
          <p>{source === 'slate' ? 'נשלח קוד למייל המאומת שהועבר אלינו מ־Slate.' : 'הזינו את כתובת המייל שלכם ונשלח קוד חד־פעמי.'}</p>
          {params.error ? <p className="error-message">{params.error}</p> : null}
          <EmailOtpForm source={source} nextPath={safeNextPath(params.next)} />
        </div>
      </section>
    </main>
  );
}
