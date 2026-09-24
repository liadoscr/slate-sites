import Image from 'next/image';
import Link from 'next/link';
import { DemoMotion } from './demo-motion';
import motion from './demo-motion.module.css';
import styles from './personal-trainer-demo.module.css';

const services = [
  { number: '01', title: 'אימון אישי', label: 'PERSONAL TRAINING', image: '/demos/move-action-hero-v2.webp', position: 'center' },
  { number: '02', title: 'אימון זוגי', label: 'BETTER TOGETHER', image: '/demos/move-trainer-hero.webp', position: 'center 30%' },
  { number: '03', title: 'ליווי מרחוק', label: 'REMOTE SUPPORT', image: '/demos/move-coastal-runner-v3.webp', position: '78% center' },
];

const paths = [
  { number: '01', label: 'ONE TO ONE', title: 'מסלול אישי', description: 'תוכנית שמתחילה בנקודת הפתיחה שלכם, עם דגש על טכניקה, כוח והתקדמות הדרגתית.', details: ['מטרות ברורות', 'התאמה אישית', 'בדיקה ועדכון'] },
  { number: '02', label: 'MOVE TOGETHER', title: 'מסלול זוגי', description: 'מתאמנים יחד, אבל לכל אחד נשאר מקום לקצב, לרמה ולמטרות שלו.', details: ['מסגרת משותפת', 'שתי התאמות אישיות', 'מוטיבציה לשניים'] },
  { number: '03', label: 'MOVE ANYWHERE', title: 'מסלול מרחוק', description: 'תוכנית ברורה להמשך בבית או בחדר הכושר, בהתאם לציוד ולזמן שיש לכם.', details: ['לפי הציוד שלכם', 'הנחיות פשוטות', 'מעקב תקופתי'] },
];

export function PersonalTrainerDemo() {
  return <div className={`${styles.site} ${motion.enabled}`} data-choreography="move" data-motion="expressive" dir="rtl" lang="he" data-demo="move-trainer-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <div className={styles.demoNote}><span>אתר הדגמה · עסק דמיוני ותמונות להמחשה</span><Link href="/#demo-preview">חזרה לדוגמאות ←</Link></div>
    <div className={styles.frame}>
      <header className={styles.header}><a className={styles.wordmark} href="#top" aria-label="MOVE, ראש העמוד" dir="ltr"><span>✦</span> MOVE</a><nav aria-label="ניווט באתר MOVE"><a href="#about">על MOVE</a><a href="#services">תחומי אימון</a><a href="#paths">מסלולים</a><a href="#questions">כדאי לדעת</a></nav><a className={styles.headerAction} href="#services">להכיר את הדרך <span aria-hidden="true">↙</span></a></header>
      <main id="main">
        <section className={styles.hero} id="top" aria-labelledby="move-title">
          <Image data-demo-enter="image" data-demo-drift="" src="/demos/move-action-hero-v2.webp" alt="מתאמנת עובדת עם חבלי כוח בחדר אימון כהה" fill sizes="100vw" preload />
          <div className={styles.heroCopy}><span className={styles.memberPill}>● תנועה שמתאימה לחיים שלכם</span><h1 id="move-title"><span data-demo-enter="line">גוף חזק מתחיל</span><br /><span data-demo-enter="line" data-demo-order="1">בתוכנית חכמה.</span></h1></div>
          <div className={styles.heroAside}><p>בונים כוח, משפרים תנועה ומתקדמים בקצב שאפשר להתמיד בו — עם תוכנית ברורה ויחס אישי.</p><a href="#services">לגלות את האפשרויות <span aria-hidden="true">↙</span></a></div>
        </section>

        <section className={styles.about} id="about" aria-labelledby="about-title"><p className={styles.eyebrow}>✦ ABOUT MOVE</p><h2 data-demo-enter="line" id="about-title">אימון שעוזר לבנות <span>כוח, לשפר תנועה,</span><br />ולהרגיש טוב יותר ביום־יום.</h2><div className={styles.aboutGrid}><figure data-demo-enter="image" className={styles.aboutWide}><Image src="/demos/move-coastal-runner-v3.webp" alt="אישה רצה בשביל סמוך לים" fill sizes="(max-width: 720px) 100vw, 34vw" /></figure><div className={styles.aboutStat}><strong>03</strong><span>עקרונות שמובילים<br />את כל מסלולי האימון</span><h3>מתאמנים חכם.<br />מתקדמים יציב.</h3><p>מכירים את נקודת הפתיחה, בונים בסיס ומוסיפים עומס רק כשהגוף מוכן.</p><a href="#paths">איך זה עובד <span aria-hidden="true">↙</span></a></div><figure data-demo-enter="image" data-demo-order="1" className={styles.aboutPortrait}><Image src="/demos/move-trainer-hero.webp" alt="מאמן כושר בחדר אימון" fill sizes="(max-width: 720px) 100vw, 25vw" /></figure></div></section>

        <section className={styles.services} id="services" aria-labelledby="services-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>✦ OUR SERVICES</p><h2 data-demo-enter="line" id="services-title">הדרך שלכם<br />לגוף חזק יותר.</h2></div><p>אימון אישי, זוגי או מרחוק — כל מסגרת מתחילה בהיכרות עם המטרות, הניסיון והשגרה שלכם.</p></div><div className={styles.serviceGrid}>{services.map((service, index) => <article data-demo-enter="card" data-demo-order={index} className={styles.serviceCard} key={service.number}><Image src={service.image} alt="" fill sizes="(max-width: 720px) 84vw, 24vw" style={{ objectPosition: service.position }} /><div className={styles.serviceOverlay}><span>{service.number}</span><p>{service.label}</p><h3>{service.title}</h3><a href="#paths" aria-label={`לקריאה על ${service.title}`}>↙</a></div></article>)}</div></section>

        <section className={styles.paths} id="paths" aria-labelledby="paths-title"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>✦ TRAINING PATHS</p><h2 data-demo-enter="line" id="paths-title">בוחרים מסגרת.<br />מתחילים לזוז.</h2></div><p>בלי מחירון ובלי הזמנה באתר — רק מידע ברור שיעזור להבין איזה מסלול יכול להתאים.</p></div><div className={styles.pathGrid}>{paths.map((path,index) => <article data-demo-enter="card" data-demo-order={index} className={`${styles.pathCard} ${index === 1 ? styles.pathFeatured : ''}`} key={path.number}><div className={styles.pathMeta}><span>{path.number}</span><span>{path.label}</span></div><h3>{path.title}</h3><p>{path.description}</p><ul>{path.details.map(detail => <li key={detail}>{detail}</li>)}</ul><a href="#method">לראות את התהליך <span aria-hidden="true">↙</span></a></article>)}</div></section>

        <section className={styles.method} id="method" aria-labelledby="method-title"><div data-demo-enter="image" className={styles.methodPhoto}><Image src="/demos/move-trainer-hero.webp" alt="מאמן MOVE בחדר אימון" fill sizes="(max-width: 720px) 100vw, 42vw" /></div><div className={styles.methodCopy}><p className={styles.eyebrow}>✦ THE METHOD</p><h2 data-demo-enter="line" id="method-title">מקצועיות<br />שמרגישים בדרך.</h2><p>התוכנית לא נשארת קבועה. בודקים מה עובד, מקשיבים למשוב ומתקדמים בהתאם.</p><ol><li><span>01</span><div><h3>מגדירים כיוון</h3><p>מטרות, ניסיון, מגבלות וזמן פנוי.</p></div></li><li><span>02</span><div><h3>בונים בסיס</h3><p>טכניקה, תנועה ותוכנית שמתאימה לשגרה.</p></div></li><li><span>03</span><div><h3>ממשיכים לדייק</h3><p>מתקדמים, בודקים ומעדכנים כשצריך.</p></div></li></ol></div></section>

        <section className={styles.questions} id="questions" aria-labelledby="questions-title"><div><p className={styles.eyebrow}>✦ GOOD TO KNOW</p><h2 data-demo-enter="line" id="questions-title">פחות סימני שאלה.<br />יותר תנועה.</h2></div><div className={styles.answerGrid}><article data-demo-enter="card"><span>01</span><h3>בלי ניסיון?</h3><p>אפשר להתחיל גם בלי ניסיון קודם. המסגרת מותאמת לנקודת הפתיחה.</p></article><article><span>02</span><h3>בלי חדר כושר?</h3><p>ליווי מרחוק יכול להתאים גם לבית, לפי המרחב והציוד שזמינים.</p></article><article><span>03</span><h3>ביחד או לבד?</h3><p>באימון זוגי מתאמנים יחד עם התאמות לכל אחד; באישי כל המיקוד הוא שלכם.</p></article></div></section>

        <section className={styles.endcap} aria-labelledby="endcap-title"><span className={styles.eyebrow}>THE NEXT MOVE IS YOURS</span><h2 data-demo-enter="line" id="endcap-title">גם לעסק שלכם<br />מגיע אתר חזק.</h2><div><p>זהו אתר הדגמה לעסק דמיוני. בנו אתר תדמיתי מקורי עם Slate Sites.</p><Link href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link></div></section>
      </main>
      <footer className={styles.footer}><a className={styles.wordmark} href="#top" dir="ltr"><span>✦</span> MOVE</a><span>אימון אישי · דמו להמחשה בלבד</span><Link href="/">נבנה עם Slate Sites</Link></footer>
    </div>
    <DemoMotion style="move" />
  </div>;
}
