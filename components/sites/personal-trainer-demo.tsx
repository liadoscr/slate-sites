import Image from 'next/image';
import Link from 'next/link';
import styles from './business-demos.module.css';

const programs = [
  { label: 'ONE TO ONE', title: 'אימון אישי', description: 'הזמן, תשומת הלב והתוכנית — כולם שלכם. אימוני כוח בסטודיו עם הכוונה לאורך כל האימון.', points: ['תוכנית לפי נקודת הפתיחה', 'עבודה על טכניקה', 'מעקב והתאמות בדרך'] },
  { label: 'BETTER TOGETHER', title: 'אימון זוגי', description: 'באים יחד, כל אחד בקצב שלו. מסגרת משותפת עם מקום למטרות ולרמה של כל מתאמן.', points: ['חבר, חברה או בן זוג', 'התאמה אישית בתוך האימון', 'מוטיבציה שעובדת לשניים'] },
  { label: 'WHEREVER YOU ARE', title: 'ליווי מרחוק', description: 'התוכנית איתכם גם כשאתם מתאמנים לבד. בבית או בחדר הכושר, עם מסגרת ברורה להמשך.', points: ['תוכנית מותאמת לציוד שלכם', 'שיחת מעקב תקופתית', 'עדכון התוכנית לפי ההתקדמות'] },
];

export function PersonalTrainerDemo() {
  return <div className={`${styles.site} ${styles.trainer}`} dir="rtl" data-demo="move-trainer-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <aside className={styles.notice}><span>דמו של Slate Sites · עסק דמיוני ותמונה להמחשה בלבד</span><Link href="/#examples">לכל הדוגמאות ←</Link></aside>
    <header className={styles.header}><a className={styles.wordmark} href="#top" aria-label="MOVE, ראש העמוד" dir="ltr">MOVE<span>PERSONAL TRAINING</span></a><nav aria-label="ניווט באימונים"><a href="#programs">המסלולים</a><a href="#method">הדרך</a><a href="#questions">שאלות נפוצות</a></nav><a className={styles.headerButton} href="#programs">למסלולי האימון <span aria-hidden="true">↙</span></a></header>
    <main id="main">
      <section className={styles.trainerHero} id="top" aria-labelledby="trainer-title">
        <div className={styles.trainerCopy}><p className={styles.eyebrow}>אימון אישי. התקדמות בקצב שלכם.</p><h1 id="trainer-title">יותר כוח.<br /><em>יותר אתם.</em></h1><p className={styles.lead}>לא צריך לחכות ליום ראשון.<br />בונים תוכנית שאפשר להתחיל איתה היום,<br />ולהתמיד בה גם מחר.</p><a className={styles.button} href="#method">להכיר את הדרך <span aria-hidden="true">↙</span></a><div className={styles.trainerHeroNote}><span dir="ltr">YOUR PACE. YOUR PROGRESS.</span><p>בסטודיו בתל אביב או מרחוק</p></div></div>
        <figure className={styles.trainerPortrait}><Image src="/demos/move-trainer-hero.webp" alt="מאמן כושר דמיוני בבגדי ספורט שחורים, עומד בחדר אימון" fill sizes="(max-width: 760px) 100vw, 48vw" preload /><figcaption><span>הצעד הראשון?</span><strong>פשוט להתחיל.</strong></figcaption></figure>
      </section>
      <div className={styles.trainingStrip}><span>כוח</span><span>תנועה</span><span>טכניקה</span><span>התמדה</span><b dir="ltr">LET’S MOVE.</b></div>
      <section className={styles.section} id="programs" aria-labelledby="trainer-programs"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>01 / בוחרים מסגרת</p><h2 id="trainer-programs">הדרך שלכם<br /><em>לזוז קדימה.</em></h2></div><p>לבד, יחד או מרחוק.<br />המסגרת משתנה. תשומת הלב נשארת אישית.</p></div><div className={styles.programGrid}>{programs.map((program, index) => <article className={styles.programCard} key={program.title}><div className={styles.programLabel}><span dir="ltr">{program.label}</span><b dir="ltr">0{index + 1}</b></div><h3>{program.title}</h3><p>{program.description}</p><ul>{program.points.map(point => <li key={point}>{point}</li>)}</ul><a href="#method" className={styles.programCta}>על תהליך האימון <span aria-hidden="true">↙</span></a></article>)}</div></section>
      <section className={styles.trainerMethod} id="method" aria-labelledby="trainer-method"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>02 / מכוונה לשגרה</p><h2 id="trainer-method">לא עוד תוכנית<br />שנשארת במגירה.</h2></div><p>התהליך מתחיל בחיים שלכם.<br />משם בונים תוכנית שיש לה מקום בתוכם.</p></div><ol className={styles.methodSteps}><li><span>01</span><h3>מגדירים כיוון</h3><p>מדברים על המטרות, הניסיון והזמן שיש לכם. לא מתחילים מניחושים.</p></li><li><span>02</span><h3>בונים בסיס</h3><p>מתאימים תוכנית ומכירים את התרגילים, עם דגש על טכניקה והדרגתיות.</p></li><li><span>03</span><h3>ממשיכים לדייק</h3><p>בודקים מה עובד, מקשיבים למשוב ומשנים את התוכנית כשצריך.</p></li></ol></section>
      <section className={`${styles.section} ${styles.faq}`} id="questions" aria-labelledby="trainer-questions"><div><p className={styles.eyebrow}>03 / לפני האימון הראשון</p><h2 id="trainer-questions">פחות סימני שאלה.<br /><em>יותר תנועה.</em></h2></div><div className={styles.questions}><details><summary>לא התאמנתי אף פעם. זה מתאים לי?</summary><p>אפשר להתחיל גם בלי ניסיון. בתוכנית של עסק אמיתי, המאמן מתאים את נקודת הפתיחה ואת קצב ההתקדמות לכל מתאמן.</p></details><details><summary>צריך מנוי לחדר כושר בשביל ליווי מרחוק?</summary><p>לא בהכרח. אפשר לבנות תוכנית לפי הציוד והמרחב הזמינים בבית או בחדר הכושר.</p></details><details><summary>מה ההבדל בין אימון אישי לזוגי?</summary><p>באימון אישי כל תשומת הלב מוקדשת למתאמן אחד. באימון זוגי מתאמנים יחד, עם התאמות למטרות ולרמה של כל אחד.</p></details></div></section>
      <section className={styles.trainerContact} id="contact" aria-labelledby="trainer-contact"><p className={styles.eyebrow}>מכאן מתחילים</p><h2 id="trainer-contact">הצעד הבא<br />הוא שלכם.</h2><div><p>ככה יכול להיראות המקום של העסק שלכם ברשת.</p><Link className={styles.button} href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link><small>דמו תדמיתי שעוצב מראש. העסק אינו פעיל והתמונה נוצרה ב־AI להמחשה.</small></div></section>
    </main>
    <footer className={styles.footer}><a className={styles.wordmark} href="#top" dir="ltr">MOVE</a><span>אימון אישי · תוכן ותמונה להמחשה</span><Link href="/">נבנה עם Slate Sites</Link></footer>
  </div>;
}
