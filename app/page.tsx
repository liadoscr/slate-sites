import Image from 'next/image';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublishedSite } from '@/lib/sites/public-site';
import { isOrangeGelDemo, ORANGE_DEMO_PROJECT_ID } from '@/lib/sites/orange-demo';
import { demoCatalog, getCuratedDemo } from '@/lib/sites/demo-catalog';
import heroImage from '@/public/gel-orange-hero.png';
import styles from './home.module.css';

const steps = [
  ['01', 'מספרים על העסק', 'מה אתם עושים, למי אתם פונים ומה חשוב לכם שאנשים יכירו.'],
  ['02', 'בוחרים כיוון', 'מוסיפים השראה מ־Dribbble, טקסטים ותמונות. מתארים בדיוק מה אוהבים.'],
  ['03', 'יוצרים ומפרסמים', 'יוצרים תוכן עם AI, בודקים תצוגה מקדימה ומפרסמים כשמוכנים.'],
];

export default async function HomePage() {
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const accountHref = user ? '/dashboard' : '/auth';
  const briefHref = user ? '/dashboard/new' : '/auth?next=/dashboard/new';
  const publishedDemos = isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await Promise.all(demoCatalog.map(async demo => {
      const site = await getPublishedSite(demo.projectId).catch(() => null);
      return site && getCuratedDemo(site.version.content)?.template === demo.template ? demo : null;
    })) : [];
  const visibleDemos = publishedDemos.filter(demo => demo !== null);
  const publishedDemo = visibleDemos.some(demo => demo.projectId === ORANGE_DEMO_PROJECT_ID)
    ? await getPublishedSite(ORANGE_DEMO_PROJECT_ID) : null;
  const demoHref = publishedDemo && isOrangeGelDemo(publishedDemo.version.content) ? `/sites/${ORANGE_DEMO_PROJECT_ID}` : null;

  return (
    <div className={styles.page} id="top">
      <a className={styles.skip} href="#main">דלגו לתוכן</a>
      <header className={styles.header}>
        <Link className={`brand ${styles.brand}`} href="/" aria-label="Slate Sites, דף הבית"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link>
        <nav className={styles.nav} aria-label="ניווט ראשי"><a href="#how-it-works">איך זה עובד</a>{visibleDemos.length > 0 ? <a href="#examples">דוגמאות</a> : null}<a href="#your-workspace">מה מקבלים</a><a href="#security">פרטיות</a><a href="https://www.slate.co.il/" target="_blank" rel="noreferrer">ל־Slate ↗</a></nav>
        <Link className={styles.account} href={accountHref}>{user ? 'האתרים שלי' : 'כניסה לחשבון'} <span aria-hidden="true">↗</span></Link>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>מבית Slate <span /> נבנה סביב העסק שלך</p>
            <h1 id="hero-title">העסק שלך.<br />הסיפור שלך.<br /><em>האתר שלך.</em></h1>
            <p className={styles.intro}>יש לכם עסק לספר עליו. תנו לו מקום משלו ברשת — עם בריף פשוט, תוכן בעזרת AI ואתר של עמוד אחד, בשליטה שלכם.</p>
            <div className={styles.actions}><Link className={styles.primary} href={briefHref}>מתחילים את האתר שלי <span aria-hidden="true">←</span></Link><a className={styles.textLink} href="#how-it-works">ככה זה עובד ↓</a></div>
            <p className={styles.heroNote}>בעברית. בלי עורך מסובך. מפרסמים רק כשאתם מוכנים.</p>
          </div>
          <div className={styles.showcase}>
            <div className={styles.showcaseLabel}><span>מקום לסגנון של כל עסק</span><b>דוגמת עיצוב / 01</b></div>
            <div className={styles.demoWindow}>
              <div className={styles.windowBar}><span className={styles.windowDots} aria-hidden="true">● ● ●</span><b dir="ltr">ORANGE.GEL</b><span>אתר הדגמה</span></div>
              <div className={styles.demoHero}><div><small>סטודיו לק ג׳ל</small><h2>צבע שעושה<br />לך <em>מצב רוח.</em></h2><p>דוגמת מוצר בעיצוב מקורי.<br />אופי אחר. אותו בית ב־Slate.</p></div><div className={styles.demoImage}><Image src={heroImage} alt="מניקור כתום מתוך אתר ההדגמה ORANGE.GEL" fill sizes="(max-width: 800px) 45vw, 300px" preload /></div></div>
              <div className={styles.demoServices}><span>לק ג׳ל</span><span>מבנה אנטומי</span><span>נייל ארט</span></div>
            </div>
            <div className={styles.showcaseFooter}><p>דמו מעוצב מראש, להמחשת כיוון — לא תוצר אוטומטי של ה־AI.</p>{demoHref ? <Link href={demoHref}>לצפייה באתר הדמו ↗</Link> : <span>דוגמת עיצוב</span>}</div>
          </div>
        </section>

        {visibleDemos.length > 0 ? <section className={styles.examples} id="examples" aria-labelledby="examples-title">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>עסקים שונים. אופי אחר.</p><h2 id="examples-title">לכל עסק יש סיפור.<br /><span>תראו איך הוא יכול להיראות.</span></h2></div>
          <div className={styles.exampleGrid}>{visibleDemos.map(demo => <Link className={styles.exampleCard} href={`/sites/${demo.projectId}`} key={demo.projectId}>
            <div className={styles.exampleArt} style={{background: demo.background, color: demo.color}}><div className={styles.examplePhoto}><Image src={demo.image} alt={demo.imageAlt} fill sizes="(max-width: 640px) 90vw, 360px" style={{objectPosition: demo.name === 'ORANGE.GEL' ? 'center' : '50% 22%'}} /></div><b dir="ltr">{demo.name}</b><span>{demo.category}</span></div>
            <div className={styles.exampleDetails}><h3>{demo.category}</h3><p>{demo.description}</p><span>לצפייה בדמו <span aria-hidden="true">↗</span></span></div>
          </Link>)}</div>
          <p className={styles.exampleNote}>אתרי תדמית לדוגמה, שעוצבו מראש — ללא הזמנות או תשלומים. העסקים דמיוניים; אלה אינם תוצרים אוטומטיים של מנוע ה־AI.</p>
        </section> : null}

        <section className={styles.process} id="how-it-works" aria-labelledby="process-title">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>פשוט להתחיל</p><h2 id="process-title">שלושה דברים ממכם.<br /><span>אתר אחד שהוא שלכם.</span></h2></div>
          <ol className={styles.steps}>{steps.map(([number, title, description]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p>{number === '02' ? <a href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">מצאו השראה ב־Dribbble ↗</a> : null}</li>)}</ol>
        </section>

        <section className={styles.workspace} id="your-workspace" aria-labelledby="workspace-title">
          <div><p className={styles.eyebrow}>החשבון שלך, סביבת העבודה שלך</p><h2 id="workspace-title">פחות להתעסק באתר.<br /><em>יותר להתמקד בעסק.</em></h2><p>הבריף, ההשראות, גרסאות התוכן והפניות מהאתר נמצאים במקום אחד. חוזרים, מעדכנים ומתקדמים בקצב שלכם.</p><Link className={styles.primary} href={briefHref}>{user ? 'ליצירת אתר חדש' : 'פותחים חשבון ומתחילים'} <span aria-hidden="true">←</span></Link></div>
          <dl className={styles.features}><div><dt><span>01</span>החומרים שלכם, מסודרים</dt><dd>טקסטים, קישורי השראה וקבצים שמורים בתוך כל פרויקט.</dd></div><div><dt><span>02</span>רואים לפני שמפרסמים</dt><dd>תצוגה מקדימה פרטית וסטטוס הפרסום של האתר בתוך הפרויקט.</dd></div><div><dt><span>03</span>אתם מחליטים מתי לעלות לאוויר</dt><dd>פרסום עצמאי, קישור לאתר וטופס יצירת קשר. אין צורך בהמתנה לצוות.</dd></div></dl>
        </section>

        <section className={styles.security} id="security" aria-labelledby="security-title"><p className={styles.eyebrow}>פרטיות כחלק מהדרך</p><h2 id="security-title">החומרים שלכם נשארים בחשבון שלכם.</h2><p>נכנסים עם Google או קישור למייל. הבריפים והקבצים נגישים דרך החשבון, והתצוגה המקדימה מיועדת לבעל הפרויקט. האתר עצמו הופך לציבורי רק בפרסום.</p><p className={styles.betaNote}>אנחנו בבטא: ה־AI משתמש כרגע בטקסט ובהנחיות שלכם, לא קורא את הקישור ב־Dribbble ולא משלב אוטומטית קבצים שהעליתם. אל תכללו מידע רגיש בבריף.</p></section>
      </main>

      <footer className={styles.footer}><Link className="brand" href="/" aria-label="Slate Sites"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-product">Sites</span></Link><span>© {new Date().getFullYear()} Slate Sites</span><a href="https://www.slate.co.il/" target="_blank" rel="noreferrer">עוד מוצרים מבית Slate ↗</a></footer>
    </div>
  );
}
