import Image from 'next/image';
import Link from 'next/link';
import styles from './business-demos.module.css';

const services = [
  { name: 'תספורת + עיצוב', description: 'גזירה שמתאימה למבנה הפנים, למרקם ולשגרה שלך.', label: 'CUT / STYLE' },
  { name: 'צבע שורש', description: 'גוון מדויק, חיבור טבעי לאורך וגימור מלא ברק.', label: 'COLOR' },
  { name: 'בליאז׳', description: 'משחק עדין של אור ועומק, עם מעבר רך בין הגוונים.', label: 'LIGHT / DEPTH' },
  { name: 'טיפול לחות + פן', description: 'זמן לעצור, להזין ולצאת עם שיער שנעים לגעת בו.', label: 'HAIR CARE' },
];

export function HairSalonDemo() {
  return <div className={`${styles.site} ${styles.salon}`} dir="rtl" data-demo="forma-hair-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <aside className={styles.notice}><span>דמו של Slate Sites · עסק דמיוני ותמונה להמחשה בלבד</span><Link href="/#examples">לכל הדוגמאות ←</Link></aside>
    <header className={styles.header}>
      <a href="#top" className={styles.wordmark} aria-label="FORMA, ראש העמוד" dir="ltr">forma<span>HAIR ATELIER</span></a>
      <nav aria-label="ניווט בסטודיו"><a href="#services">השירותים</a><a href="#approach">הגישה שלנו</a><a href="#questions">שאלות נפוצות</a></nav>
      <a className={styles.headerButton} href="#services">לשירותי הסטודיו</a>
    </header>
    <main id="main">
      <section className={styles.salonHero} id="top" aria-labelledby="salon-title">
        <div className={styles.salonCopy}>
          <p className={styles.eyebrow}>סטודיו בוטיק לשיער · תל אביב</p>
          <h1 id="salon-title">שיער שמרגיש<br /><em>בדיוק את.</em></h1>
          <p className={styles.lead}>תספורת שיושבת נכון. צבע שמאיר את הפנים.<br />שיער שכיף לקום איתו גם מחר.</p>
          <div className={styles.actions}><a className={styles.button} href="#approach">להכיר את הסטודיו <span aria-hidden="true">↙</span></a><a className={styles.textLink} href="#services">גלי את השירותים</a></div>
          <p className={styles.salonSignature} dir="ltr">A little change. A little more you.</p>
        </div>
        <figure className={styles.salonPortrait}>
          <div className={styles.salonImage}><Image src="/demos/forma-hair-hero.webp" alt="דיוקן להמחשה של אישה עם שיער כהה וגלי בעיצוב טבעי" fill sizes="(max-width: 760px) 92vw, 48vw" preload /></div>
          <figcaption><span dir="ltr">THE EVERYDAY MUSE</span><span>תנועה. מרקם. את.</span></figcaption>
        </figure>
      </section>
      <div className={styles.salonRibbon}><span>גזירה אישית</span><span aria-hidden="true">/</span><span>צבע עם עומק</span><span aria-hidden="true">/</span><span>יופי שמרגיש טבעי</span></div>
      <section className={styles.section} id="services" aria-labelledby="salon-services">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / שירותי הסטודיו</p><h2 id="salon-services">שינוי קטן.<br /><em>הרגשה אחרת.</em></h2></div><p>מתחילים בשיחה ומוצאים את מה שנכון לך.<br />מגזירה מדויקת ועד נגיעה חדשה של צבע.</p></div>
        <div className={styles.serviceList}>{services.map((service, index) => <article className={styles.serviceRow} key={service.name}><span className={styles.serviceNumber} dir="ltr">0{index + 1}</span><div><h3>{service.name}</h3><p>{service.description}</p></div><span className={styles.serviceTime} dir="ltr">{service.label}</span></article>)}</div>
      </section>
      <section className={styles.salonApproach} id="approach" aria-labelledby="salon-approach">
        <div><p className={styles.eyebrow}>02 / פחות רעש. יותר הקשבה.</p><h2 id="salon-approach">קודם מקשיבים.<br /><em>אחר כך מספרים.</em></h2><p>יש את התמונה ששמרת, ויש את השיער שלך. אנחנו אוהבים את המקום שבו הם נפגשים: מראה שמתאים לך, לא רק לרגע שבו יוצאים מהסטודיו.</p></div>
        <ol className={styles.approachSteps}><li><span>01</span><div><h3>מכירות את השגרה</h3><p>איך את אוהבת את השיער שלך, וכמה זמן באמת יש לך בבוקר?</p></div></li><li><span>02</span><div><h3>מוצאות את הכיוון</h3><p>מדברות על אורך, גוון ותחושה. מחליטות יחד, לפני שמתחילים.</p></div></li><li><span>03</span><div><h3>לוקחות את זה הביתה</h3><p>כמה טיפים פשוטים כדי שתדעי לעצב את השיער גם בעצמך.</p></div></li></ol>
      </section>
      <section className={`${styles.section} ${styles.faq}`} id="questions" aria-labelledby="salon-questions"><div><p className={styles.eyebrow}>03 / טוב לדעת</p><h2 id="salon-questions">לפני שמתיישבים<br />בכיסא.</h2></div><div className={styles.questions}>
        <details><summary>אני לא בטוחה מה אני רוצה. אפשר להתחיל בייעוץ?</summary><p>כן. באתר אמיתי אפשר להציע פגישת ייעוץ קצרה, לדבר על האפשרויות ולתאם טיפול רק אחרי שמוצאים כיוון.</p></details>
        <details><summary>כדאי להביא תמונות השראה?</summary><p>בהחלט. הן דרך טובה להסביר מה אהבת. המראה הסופי מותאם למרקם השיער, לאורך ולשגרת הטיפוח שלך.</p></details>
        <details><summary>מה חשוב לדעת על תחזוקת המראה בבית?</summary><p>בחירת המראה מתחילה גם בכמות הזמן שאת רוצה להשקיע בו. בסיום הביקור מסבירים איך לשמור על העיצוב בשגרה שלך.</p></details>
      </div></section>
      <section className={styles.salonContact} id="contact" aria-labelledby="salon-contact"><p className={styles.eyebrow}>הסיפור שלך. הסגנון שלך.</p><h2 id="salon-contact">מקום למראה<br /><em>הבא שלך.</em></h2><p>אהבתם את הכיוון? גם לעסק שלכם יכול להיות מקום משלו.</p><Link className={styles.button} href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link><small>דמו תדמיתי שעוצב מראש. העסק אינו פעיל והתמונה נוצרה ב־AI להמחשה.</small></section>
    </main>
    <footer className={styles.footer}><a className={styles.wordmark} href="#top" dir="ltr">forma</a><span>עיצוב שיער · תוכן ותמונה להמחשה</span><Link href="/">נבנה עם Slate Sites</Link></footer>
  </div>;
}
