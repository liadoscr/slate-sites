import Link from 'next/link';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getPublishedSite } from '@/lib/sites/public-site';
import { demoCatalog, getCuratedDemo } from '@/lib/sites/demo-catalog';
import { DemoCarousel } from '@/components/home/demo-carousel';
import { MarketingHeader } from '@/components/home/marketing-header';
import styles from './home.module.css';

type Locale = 'he' | 'en';

const content = {
  he: {
    skip: 'דלגו לתוכן', eyebrow: 'מבית Slate · נבנה סביב העסק שלך',
    title: ['העסק שלך.', 'הסיפור שלך.', 'האתר שלך.'],
    intro: 'יש לכם עסק לספר עליו. תנו לו מקום משלו ברשת — עם בריף פשוט, תוכן בעזרת AI ואתר של עמוד אחד, בשליטה שלכם.',
    start: 'מתחילים את האתר שלי', demos: 'לצפייה בדוגמאות', note: 'בעברית. בלי עורך מסובך. מפרסמים רק כשאתם מוכנים.',
    processEyebrow: 'פשוט להתחיל', processTitle: 'שלושה צעדים. אתר אחד שהוא שלכם.',
    steps: [
      ['01', 'מספרים על העסק', 'מה אתם עושים, למי אתם פונים ומה חשוב לכם שאנשים יכירו.'],
      ['02', 'בוחרים כיוון', 'מוסיפים השראה מ־Dribbble, טקסטים ותמונות. מתארים בדיוק מה אוהבים.'],
      ['03', 'יוצרים ומפרסמים', 'יוצרים תוכן עם AI, בודקים תצוגה מקדימה ומפרסמים כשמוכנים.'],
    ],
    inspiration: 'מצאו השראה ב־Dribbble ↗', workspaceEyebrow: 'החשבון שלך, סביבת העבודה שלך',
    workspaceTitle: 'פחות להתעסק באתר. יותר להתמקד בעסק.',
    workspaceBody: 'הבריף, ההשראות, גרסאות התוכן והפניות מהאתר נמצאים במקום אחד. חוזרים, מעדכנים ומתקדמים בקצב שלכם.',
    workspaceAction: 'פותחים חשבון ומתחילים', signedInAction: 'ליצירת אתר חדש',
    features: [
      ['החומרים שלכם, מסודרים', 'טקסטים, קישורי השראה וקבצים שמורים בתוך כל פרויקט.'],
      ['רואים לפני שמפרסמים', 'תצוגה מקדימה פרטית וסטטוס הפרסום של האתר בתוך הפרויקט.'],
      ['אתם מחליטים מתי לעלות לאוויר', 'פרסום עצמאי, קישור לאתר וטופס יצירת קשר. אין צורך בהמתנה לצוות.'],
    ],
    securityEyebrow: 'פרטיות כחלק מהדרך', securityTitle: 'החומרים שלכם נשארים בחשבון שלכם.',
    securityBody: 'נכנסים עם Google או קישור למייל. הבריפים והקבצים נגישים דרך החשבון, והתצוגה המקדימה מיועדת לבעל הפרויקט. האתר עצמו הופך לציבורי רק בפרסום.',
    betaNote: 'אנחנו בבטא: ה־AI משתמש כרגע בטקסט ובהנחיות שלכם, לא קורא את הקישור ב־Dribbble ולא משלב אוטומטית קבצים שהעליתם. אל תכללו מידע רגיש בבריף.',
    finalTitle: 'מוכנים לתת לעסק מקום משלו?',
    finalBody: 'מספרים לנו על העסק, בוחרים כיוון ובונים אתר תדמיתי שנשאר בשליטה שלכם.',
    footerHeadings: ['המוצר', 'כלים', 'דוגמאות', 'החברה'],
    footerProduct: ['איך זה עובד', 'אתרי דוגמה', 'מה מקבלים', 'פרטיות באתר', 'יצירת אתר'],
    footerTools: ['השראה ב־Dribbble', 'תוכן בעזרת AI', 'תצוגה מקדימה', 'לוח הבקרה'],
    footerCompany: ['אתר Slate', 'אודות Slate', 'אבטחה ב־Slate', 'יצירת קשר עם Slate'],
    footerPrivacy: 'מדיניות הפרטיות של Slate', footerAccessibility: 'הצהרת הנגישות של Slate',
    footerNote: 'Slate Sites · אתרים תדמיתיים לעסקים',
  },
  en: {
    skip: 'Skip to content', eyebrow: 'From Slate · Built around your business',
    title: ['Your business.', 'Your story.', 'Your website.'],
    intro: 'Your business has a story. Give it a place online with a simple brief, AI-assisted content, and a one-page website you control.',
    start: 'Create my website', demos: 'Explore examples', note: 'No complicated editor. Publish only when you are ready.',
    processEyebrow: 'Simple from the start', processTitle: 'Three steps. One website that is yours.',
    steps: [
      ['01', 'Tell us about your business', 'What you do, who you serve, and what you want people to know.'],
      ['02', 'Choose a direction', 'Add Dribbble inspiration, your own words, and images. Tell us what you like.'],
      ['03', 'Create and publish', 'Draft content with AI, review a preview, and publish when you are ready.'],
    ],
    inspiration: 'Find inspiration on Dribbble ↗', workspaceEyebrow: 'Your account, your workspace',
    workspaceTitle: 'Spend less time on your website. More on your business.',
    workspaceBody: 'Your brief, inspiration, content versions, and site enquiries stay together. Return and update them at your own pace.',
    workspaceAction: 'Create an account', signedInAction: 'Create a new website',
    features: [
      ['Everything in one place', 'Keep copy, inspiration links, and uploaded files with each project.'],
      ['Preview before publishing', 'Review a private preview and publication status from your project.'],
      ['Go live when you choose', 'Publish independently with a site link and contact form. No team approval needed.'],
    ],
    securityEyebrow: 'Privacy by design', securityTitle: 'Your materials stay in your account.',
    securityBody: 'Sign in with Google or an email link. Your briefs and files are available through your account, and your preview is for the project owner. Your site becomes public only when you publish it.',
    betaNote: 'We are in beta: AI currently uses your written brief and instructions. It does not read Dribbble links or automatically include uploaded files. Do not add sensitive information to a brief.',
    finalTitle: 'Ready to give your business a home online?',
    finalBody: 'Tell us about your business, choose a direction, and build an informational site that stays in your control.',
    footerHeadings: ['Product', 'Tools', 'Examples', 'Company'],
    footerProduct: ['How it works', 'Example websites', 'What you get', 'Privacy on this site', 'Create a website'],
    footerTools: ['Dribbble inspiration', 'AI-assisted content', 'Private preview', 'Dashboard'],
    footerCompany: ['Slate website', 'About Slate', 'Security at Slate', 'Contact Slate'],
    footerPrivacy: 'Slate privacy policy', footerAccessibility: 'Slate accessibility statement',
    footerNote: 'Slate Sites · Informational websites for businesses',
  },
} as const;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const locale: Locale = (await searchParams).lang === 'en' ? 'en' : 'he';
  const copy = content[locale];
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const accountHref = user ? '/dashboard' : '/auth';
  const briefHref = user ? '/dashboard/new' : '/auth?next=/dashboard/new';
  const publishedDemos = isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await Promise.all(demoCatalog.map(async demo => {
      const site = await getPublishedSite(demo.projectId).catch(() => null);
      return site && getCuratedDemo(site.version.content)?.template === demo.template ? demo : null;
    })) : [];
  const visibleDemos = publishedDemos.filter(demo => demo !== null);
  const slateUrl = locale === 'en' ? 'https://www.slate.co.il/en' : 'https://www.slate.co.il/';

  return (
    <div className={styles.page} id="top" lang={locale} dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <a className={styles.skip} href="#main">{copy.skip}</a>
      <MarketingHeader locale={locale} accountHref={accountHref} isSignedIn={Boolean(user)} showDemos={visibleDemos.length > 0} />

      <main id="main">
        <div className={styles.heroBackdrop}>
          <section className={`${styles.hero} ${visibleDemos.length === 0 ? styles.heroSolo : ''}`} aria-labelledby="hero-title">
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.eyebrow}</p>
              <h1 id="hero-title">{copy.title.map((line, index) => <span key={line}>{line}{index < copy.title.length - 1 ? <br /> : null}</span>)}</h1>
              <p className={styles.intro}>{copy.intro}</p>
              <div className={styles.actions}><Link className={styles.primary} href={briefHref}>{copy.start}</Link>{visibleDemos.length > 0 ? <a className={styles.secondary} href="#demo-preview">{copy.demos}</a> : null}</div>
              <p className={styles.heroNote}>{copy.note}</p>
            </div>
            <DemoCarousel key={visibleDemos.map(demo => demo.projectId).join(',')} demos={visibleDemos} locale={locale} />
          </section>
        </div>

        <section className={styles.process} id="how-it-works" aria-labelledby="process-title">
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>{copy.processEyebrow}</p><h2 id="process-title">{copy.processTitle}</h2></div>
          <ol className={styles.steps}>{copy.steps.map(([number, title, description]) => <li key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p>{number === '02' ? <a href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">{copy.inspiration}</a> : null}</li>)}</ol>
        </section>

        <section className={styles.workspace} id="your-workspace" aria-labelledby="workspace-title">
          <div><p className={styles.eyebrow}>{copy.workspaceEyebrow}</p><h2 id="workspace-title">{copy.workspaceTitle}</h2><p>{copy.workspaceBody}</p><Link className={styles.primary} href={briefHref}>{user ? copy.signedInAction : copy.workspaceAction}</Link></div>
          <dl className={styles.features}>{copy.features.map(([title, description], index) => <div key={title}><dt><span>{String(index + 1).padStart(2, '0')}</span>{title}</dt><dd>{description}</dd></div>)}</dl>
        </section>

        <section className={styles.security} id="security" aria-labelledby="security-title"><p className={styles.eyebrow}>{copy.securityEyebrow}</p><h2 id="security-title">{copy.securityTitle}</h2><p>{copy.securityBody}</p><p className={styles.betaNote}>{copy.betaNote}</p></section>
        <section className={styles.finalCta} aria-labelledby="final-title"><h2 id="final-title">{copy.finalTitle}</h2><p>{copy.finalBody}</p><Link className={styles.primary} href={briefHref}>{copy.start}</Link></section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerColumns}>
            <nav aria-label={copy.footerHeadings[0]}><h2>{copy.footerHeadings[0]}</h2><ul><li><a href="#how-it-works">{copy.footerProduct[0]}</a></li>{visibleDemos.length > 0 ? <li><a href="#demo-preview">{copy.footerProduct[1]}</a></li> : null}<li><a href="#your-workspace">{copy.footerProduct[2]}</a></li><li><a href="#security">{copy.footerProduct[3]}</a></li><li><Link href={briefHref}>{copy.footerProduct[4]}</Link></li></ul></nav>
            <nav aria-label={copy.footerHeadings[1]}><h2>{copy.footerHeadings[1]}</h2><ul><li><a href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">{copy.footerTools[0]}</a></li><li><a href="#your-workspace">{copy.footerTools[1]}</a></li>{visibleDemos.length > 0 ? <li><a href="#demo-preview">{copy.footerTools[2]}</a></li> : null}<li><Link href={accountHref}>{copy.footerTools[3]}</Link></li></ul></nav>
            <nav aria-label={copy.footerHeadings[2]}><h2>{copy.footerHeadings[2]}</h2><ul>{visibleDemos.map(demo => <li key={demo.projectId}><Link href={`/sites/${demo.projectId}`}>{demo.name}</Link></li>)}<li><a href="#how-it-works">{copy.footerProduct[0]}</a></li></ul></nav>
            <nav aria-label={copy.footerHeadings[3]}><h2>{copy.footerHeadings[3]}</h2><ul><li><a href={slateUrl}>{copy.footerCompany[0]}</a></li><li><a href="https://www.slate.co.il/about">{copy.footerCompany[1]}</a></li><li><a href="https://www.slate.co.il/security">{copy.footerCompany[2]}</a></li><li><a href="https://www.slate.co.il/contact">{copy.footerCompany[3]}</a></li></ul></nav>
          </div>
          <div className={styles.footerBottom}><div className={styles.footerBrand}><span className={styles.footerLogo} aria-hidden="true">▤</span><strong>Slate <span>Sites</span></strong><span>© {new Date().getFullYear()}</span></div><p>{copy.footerNote}</p><div className={styles.footerLegal}><a href="https://www.slate.co.il/privacy">{copy.footerPrivacy}</a><a href="https://www.slate.co.il/accessibility">{copy.footerAccessibility}</a></div></div>
        </div>
      </footer>
    </div>
  );
}
