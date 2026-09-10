import Link from 'next/link';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';

const process = [
  ['01', 'כיוון עיצובי', 'שולחים קישור ל־Dribbble ומספרים מה אהבתם בו.'],
  ['02', 'תמונות וטקסט', 'מעלים את חומרי הגלם ומספרים את הסיפור של העסק.'],
  ['03', 'בריף ושיחת התחלה', 'אנחנו מסדרים את החומרים, בודקים ומתחילים לבנות.'],
];

export default async function HomePage() {
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const accountHref = user ? '/dashboard' : '/auth';
  const briefHref = user ? '/dashboard/new' : '/auth?next=/dashboard/new';

  return (
    <main className="grid-page" id="top">
      <header className="site-header">
        <Link className="brand" href="#top" aria-label="Slate Sites, דף הבית">
          <span className="brand-slate">slate<span className="brand-dot">.</span></span>
          <span className="brand-divider" />
          <span className="brand-product">Sites</span>
        </Link>
        <nav className="header-nav" aria-label="ניווט ראשי">
          <Link href="#how-it-works">איך זה עובד</Link>
          <Link href="#security">פרטיות ואבטחה</Link>
          <a href="https://www.slate.co.il/" target="_blank" rel="noreferrer">ל־Slate ↗</a>
        </nav>
        <Link className="account-button" href={accountHref}>
          <span aria-hidden="true">{user ? 'ד' : 'א'}</span> {user ? 'לדאשבורד שלי' : 'החשבון שלי'}
        </Link>
      </header>

      <section className="hero" aria-labelledby="hero-title">
        <div>
          <p className="kicker">Slate Sites</p>
          <h1 id="hero-title">אתר מעולה מתחיל <em>בבריף מדויק.</em></h1>
          <p className="hero-text">אתם מביאים את הסיפור, התמונות והכיוון העיצובי. אנחנו הופכים אותם לאתר עסקי עברי, נגיש ומוכן להשקה.</p>
          <div className="hero-actions">
            <Link className="primary-cta" href={briefHref}>מתחילים בריף <span aria-hidden="true">←</span></Link>
            <Link className="text-cta" href="#how-it-works">איך זה עובד ↓</Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span className="floating-chip chip-one">Dribbble → כיוון</span>
          <span className="floating-chip chip-two">תמונות + תוכן</span>
          <div className="art-window">
            <div className="window-top"><span /><span /><span /><b>slate-sites.co</b></div>
            <div className="window-content">
              <div className="blue-stroke" />
              <span className="art-label">YOUR BUSINESS, CLEARLY</span>
              <span className="art-title">הסיפור שלך. האתר שלך.</span>
              <div className="art-card"><small>BRIEF → BUILD</small><b>בונים סביב מה שחשוב לעסק.</b></div>
              <div className="art-orbit" />
            </div>
          </div>
        </div>
      </section>

      <section className="process-section" id="how-it-works" aria-labelledby="process-title">
        <div className="section-heading"><p className="kicker">התהליך</p><h2 id="process-title">שלושה דברים ממכם.<br />תהליך מסודר מאיתנו.</h2></div>
        <ol className="process-list">
          {process.map(([number, title, description]) => (
            <li key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></li>
          ))}
        </ol>
      </section>

      <section className="brief-intro-section" aria-labelledby="brief-title">
        <div>
          <p className="kicker">בריף חדש</p>
          <h2 id="brief-title">אין עורך מסובך.<br />יש מקום לספר מה אתם רוצים.</h2>
          <p>בחשבון שלכם נשמור טיוטות, קישורי השראה, טקסטים וחומרים לכל עסק. אפשר לחזור לבריף בכל זמן, עד לשליחה לצוות Slate.</p>
          <Link className="primary-cta" href={briefHref}>{user ? 'לבריף חדש' : 'ליצירת החשבון והבריף'} <span aria-hidden="true">←</span></Link>
        </div>
        <dl className="brief-checklist">
          <div><dt>01</dt><dd><b>כניסה בטוחה</b><span>Google או קישור כניסה מאובטח, ללא סיסמה.</span></dd></div>
          <div><dt>02</dt><dd><b>תיק חומרים פרטי</b><span>תמונות, מסמכים והשראות לכל פרויקט.</span></dd></div>
          <div><dt>03</dt><dd><b>מעקב שקוף</b><span>טיוטה, בדיקה, בנייה, תצוגה מקדימה והשקה.</span></dd></div>
        </dl>
      </section>

      <section className="security-section" id="security" aria-labelledby="security-title">
        <p className="kicker">הבסיס למוצר האמיתי</p>
        <h2 id="security-title">כל לקוח רואה רק את הפרויקטים שלו.</h2>
        <p>התחברות במייל מאומת, הרשאות ברמת שורה, אחסון פרטי לחומרים וקישורי גישה מוגבלים בזמן לתצוגות מקדימות.</p>
      </section>

      <footer className="site-footer">
        <span>© Slate Sites · אתרים שנבנים סביב העסק שלך.</span>
        <a href="https://www.slate.co.il/" target="_blank" rel="noreferrer">מוצר מבית Slate ↗</a>
      </footer>
    </main>
  );
}
