import Image from 'next/image';
import Link from 'next/link';
import styles from './hair-salon-demo.module.css';

const services = [
  { name: 'תספורת ועיצוב', description: 'גזירה שמתאימה למבנה הפנים, למרקם ולשגרה שלך.', label: 'CUT / STYLE' },
  { name: 'צבע עם עומק', description: 'גוונים שמאירים את הפנים ונראים טבעיים גם כשהשיער זז.', label: 'COLOR / LIGHT' },
  { name: 'טיפוח השיער', description: 'זמן לעצור, להזין ולצאת עם שיער שנעים לגעת בו.', label: 'HAIR CARE' },
];

export function HairSalonDemo() {
  return <div className={styles.site} dir="rtl" lang="he" data-demo="forma-hair-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <div className={styles.demoNote}><span>אתר הדגמה · עסק דמיוני ותמונות להמחשה</span><Link href="/#demo-preview">חזרה לדוגמאות ←</Link></div>
    <header className={styles.header}>
      <a href="#top" className={styles.wordmark} aria-label="FORMA, ראש העמוד" dir="ltr">forma<span>HAIR ATELIER</span></a>
      <nav aria-label="ניווט באתר FORMA"><a href="#approach">הסטודיו</a><a href="#services">השירותים</a><a href="#questions">כדאי לדעת</a></nav>
      <a className={styles.headerLink} href="#services">לגלות את השירותים <span aria-hidden="true">↙</span></a>
    </header>
    <main id="main">
      <section className={styles.hero} id="top" aria-labelledby="forma-title">
        <div className={styles.heroFrame}>
          <div className={styles.heroImage}><Image src="/demos/forma-editorial-hero-v2.webp" alt="סטודיו שיער מואר בגוונים טבעיים, ואישה עם שיער כהה וגלי" fill sizes="(max-width: 760px) 100vw, 65vw" preload /></div>
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>FORMA / תל אביב / סטודיו בוטיק לשיער</p>
            <h1 id="forma-title">שיער<br />שמרגיש<br /><em>בדיוק את.</em></h1>
            <p>תספורת שיושבת נכון. צבע שמאיר את הפנים. שיער שכיף לקום איתו גם מחר.</p>
            <a href="#approach" className={styles.darkButton}>להכיר את הסטודיו <span aria-hidden="true">↙</span></a>
          </div>
          <p className={styles.heroCaption} dir="ltr">THE EVERYDAY MUSE — FORMA</p>
        </div>
        <nav className={styles.serviceRail} aria-label="מעבר לסוגי השירותים"><span>למצוא את מה שמתאים לך</span>{services.map((service, index) => <a href={`#service-${index + 1}`} key={service.label}><bdi>{service.label}</bdi><span>{service.name}</span><span aria-hidden="true">↙</span></a>)}</nav>
      </section>

      <section className={styles.story} id="approach" aria-labelledby="story-title">
        <div className={styles.storyCopy}><p className={styles.kicker}>01 / הסיפור שלנו</p><h2 id="story-title">מתחילים<br />בהקשבה.</h2><p>יש את התמונה ששמרת, ויש את השיער שלך. אנחנו אוהבים את המקום שבו הם נפגשים: מראה שמתאים לך, לא רק לרגע שבו יוצאים מהסטודיו.</p><p>מדברות על מרקם, גוון ועל הזמן שבאמת יש לך בבוקר. אחר כך בוחרות יחד כיוון שאפשר להרגיש איתו בבית.</p><span className={styles.signature} dir="ltr">A little more you.</span></div>
        <figure className={styles.storyPortrait}><Image src="/demos/forma-hair-hero.webp" alt="דיוקן להמחשה של אישה עם שיער כהה וגלי" fill sizes="(max-width: 760px) 100vw, 45vw" /><figcaption>01 / יופי שנשאר שלך</figcaption></figure>
      </section>

      <section className={styles.services} id="services" aria-labelledby="services-title"><div className={styles.servicesHeading}><p className={styles.kicker}>02 / מה עושים אצלנו</p><h2 id="services-title">לכל שיער<br />יש סיפור.</h2><p>גזירה, צבע וטיפוח — כל טיפול מתחיל בשיחה על מה שנכון לך.</p></div><div className={styles.serviceCards}>{services.map((service, index) => <article id={`service-${index + 1}`} className={styles.serviceCard} key={service.label}><span className={styles.serviceIndex}>0{index + 1} / <bdi>{service.label}</bdi></span><h3>{service.name}</h3><p>{service.description}</p><span className={styles.cardArrow} aria-hidden="true">↙</span></article>)}</div></section>

      <section className={styles.questions} id="questions" aria-labelledby="questions-title"><div><p className={styles.kicker}>03 / לפני שמגיעים</p><h2 id="questions-title">טוב לדעת.</h2></div><div className={styles.questionList}><details><summary>לא בטוחה מה את רוצה?</summary><p>אפשר להביא תמונות השראה ולספר מה נוח לך ביום יום. נמצא יחד כיוון שמתאים לשיער ולשגרה שלך.</p></details><details><summary>כדאי להביא תמונות השראה?</summary><p>בהחלט. הן דרך טובה להסביר מה אהבת. המראה הסופי מותאם למרקם השיער ולאורך הרצוי.</p></details><details><summary>איך שומרים על המראה בבית?</summary><p>בחירת המראה מתחילה גם בכמות הזמן שתרצי להשקיע בו. נסביר איך להמשיך לעצב אותו בשגרה.</p></details></div></section>

      <section className={styles.endcap} aria-labelledby="endcap-title"><p className={styles.kicker}>FORMA / THE EVERYDAY MUSE</p><h2 id="endcap-title">מקום למראה<br />הבא שלך.</h2><div><p>זהו אתר הדגמה לעסק דמיוני. גם לעסק שלכם יכול להיות מקום משלו ברשת.</p><Link href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link></div></section>
    </main>
    <footer className={styles.footer}><a href="#top" className={styles.wordmark} dir="ltr">forma</a><span>סטודיו לעיצוב שיער · דמו להמחשה בלבד</span><Link href="/">נבנה עם Slate Sites</Link></footer>
  </div>;
}
