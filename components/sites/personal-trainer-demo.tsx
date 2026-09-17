import Image from 'next/image';
import Link from 'next/link';
import styles from './personal-trainer-demo.module.css';

const programs = [
  { number: '01', label: 'ONE TO ONE', title: 'אימון אישי', description: 'זמן, תשומת לב ותוכנית שמתאימים לנקודת הפתיחה ולמטרות שלכם.', points: 'טכניקה / כוח / התאמה אישית' },
  { number: '02', label: 'BETTER TOGETHER', title: 'אימון זוגי', description: 'מתאמנים יחד, אבל לכל אחד יש מקום לקצב ולדרך שלו.', points: 'תנועה משותפת / התקדמות אישית' },
  { number: '03', label: 'WHEREVER YOU ARE', title: 'ליווי מרחוק', description: 'מסגרת ברורה להמשך גם בבית או בחדר הכושר, בהתאם לציוד שזמין לכם.', points: 'תוכנית מותאמת / מעקב / עדכון' },
];

export function PersonalTrainerDemo() {
  return <div className={styles.site} dir="rtl" lang="he" data-demo="move-trainer-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <div className={styles.demoNote}><span>אתר הדגמה · עסק דמיוני ותמונות להמחשה</span><Link href="/#demo-preview">חזרה לדוגמאות ←</Link></div>
    <header className={styles.header}><a className={styles.wordmark} href="#top" aria-label="MOVE, ראש העמוד" dir="ltr">MOVE<span>PERSONAL TRAINING</span></a><nav aria-label="ניווט באתר MOVE"><a href="#programs">המסלולים</a><a href="#method">הדרך</a><a href="#questions">כדאי לדעת</a></nav><a className={styles.headerAction} href="#programs">בוחרים כיוון <span aria-hidden="true">↙</span></a></header>
    <main id="main">
      <section className={styles.hero} id="top" aria-labelledby="move-title"><div className={styles.heroImage}><Image src="/demos/move-coastal-runner-v3.webp" alt="אישה רצה בשביל ליד הים בשעת בוקר מוקדמת" fill sizes="100vw" preload /></div><div className={styles.heroCopy}><p className={styles.eyebrow}>תנועה שמתאימה לחיים שלכם / MOVE</p><h1 id="move-title">למצוא<br />את הקצב<br /><em>שלכם.</em></h1><p>אימון אישי שמתחיל במקום שבו אתם נמצאים. תוכנית ברורה, יחס אישי ומקום להתקדם בקצב שלכם.</p><a href="#programs" className={styles.limeButton}>מכירים את האפשרויות <span aria-hidden="true">↙</span></a></div><span className={styles.heroIndex} dir="ltr">MOVE / 01—03</span></section>

      <section className={styles.statement} aria-labelledby="statement-title"><span className={styles.eyebrow}>MOVE / FORWARD</span><h2 id="statement-title">לא רק להתאמן.<br /><em>לנוע קדימה.</em></h2><p>לא צריך לחכות ליום ראשון. מתחילים בשיחה על החיים שלכם, ואז בונים מסגרת שאפשר להתמיד בה גם מחר.</p></section>

      <section className={styles.programs} id="programs" aria-labelledby="programs-title"><div className={styles.sectionTop}><span className={styles.eyebrow}>01 / בוחרים מסגרת</span><h2 id="programs-title">בדרך שלכם.</h2><p>לבד, יחד או מרחוק. המסגרת משתנה; תשומת הלב נשארת אישית.</p></div><div className={styles.programGrid}>{programs.map((program,index) => <article className={`${styles.programCard} ${index === 0 ? styles.programLead : index === 1 ? styles.programDark : styles.programLight}`} key={program.number}><div className={styles.programMeta}><span>{program.number}</span><span dir="ltr">{program.label}</span></div><h3>{program.title}</h3><p>{program.description}</p><div className={styles.programFoot}><span>{program.points}</span><a href="#method" aria-label={`לקריאה על שיטת האימון עבור ${program.title}`}>על הדרך <span aria-hidden="true">↙</span></a></div></article>)}</div></section>

      <section className={styles.method} id="method" aria-labelledby="method-title"><div className={styles.methodIntro}><span className={styles.eyebrow}>02 / התהליך</span><h2 id="method-title">מכוונה<br />לשגרה.</h2><p>לא עוד תוכנית שנשארת במגירה. בונים בסיס שאפשר לחזור אליו, ומשנים בדרך כשצריך.</p></div><ol className={styles.steps}><li><span>01</span><div><h3>מגדירים כיוון</h3><p>מדברים על מטרות, ניסיון וזמן פנוי. לא מתחילים מניחושים.</p></div></li><li><span>02</span><div><h3>בונים בסיס</h3><p>מכירים את התרגילים עם דגש על טכניקה והדרגתיות.</p></div></li><li><span>03</span><div><h3>ממשיכים לדייק</h3><p>מקשיבים למשוב ומתאימים את התוכנית לפי ההתקדמות.</p></div></li></ol></section>

      <section className={styles.photoBreak} aria-label="אימון כוח בסטודיו"><Image src="/demos/move-action-hero-v2.webp" alt="מתאמנת עובדת עם חבלי כוח בסטודיו" fill sizes="100vw" /><p>YOUR PACE.<br /><span>YOUR PROGRESS.</span></p></section>

      <section className={styles.quickAnswers} id="questions" aria-labelledby="answers-title"><div><span className={styles.eyebrow}>03 / טוב לדעת</span><h2 id="answers-title">כמה תשובות<br />לפני שמתחילים.</h2></div><div className={styles.answerGrid}><article><h3>בלי ניסיון?</h3><p>אפשר להתחיל גם בלי ניסיון. נקודת הפתיחה וקצב ההתקדמות מותאמים למתאמן.</p></article><article><h3>בלי חדר כושר?</h3><p>ליווי מרחוק יכול להתאים גם לאימון בבית, לפי המרחב והציוד שזמינים לכם.</p></article><article><h3>ביחד או לבד?</h3><p>באימון זוגי מתאמנים יחד עם התאמות לכל אחד; באימון אישי כל תשומת הלב מוקדשת בכם.</p></article></div></section>

      <section className={styles.endcap} aria-labelledby="endcap-title"><span className={styles.eyebrow}>THE NEXT MOVE IS YOURS</span><h2 id="endcap-title">גם לעסק שלכם<br />יכול להיות מקום משלו.</h2><p>זהו אתר דמו לעסק דמיוני. בנו אתר תדמיתי משלכם עם Slate Sites.</p><Link href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link></section>
    </main>
    <footer className={styles.footer}><a className={styles.wordmark} href="#top" dir="ltr">MOVE</a><span>אימון אישי · דמו להמחשה בלבד</span><Link href="/">נבנה עם Slate Sites</Link></footer>
  </div>;
}
