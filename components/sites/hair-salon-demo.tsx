import Image from 'next/image';
import Link from 'next/link';
import { DemoMotion } from './demo-motion';
import motion from './demo-motion.module.css';
import styles from './hair-salon-demo.module.css';

const services = [
  { number: '01', name: 'תספורת ועיצוב', description: 'גזירה שמתאימה למבנה הפנים, למרקם ולשגרה שלך.' },
  { number: '02', name: 'צבע עם עומק', description: 'גוונים שמאירים את הפנים ונראים טבעיים גם כשהשיער זז.' },
  { number: '03', name: 'טיפוח השיער', description: 'טיפול שמחזיר לשיער רכות, תנועה וברק שאפשר להרגיש.' },
];

export function HairSalonDemo() {
  return <div className={`${styles.site} ${motion.enabled}`} data-choreography="forma" data-motion="subtle" dir="rtl" lang="he" data-demo="forma-hair-v1">
    <a className={styles.skip} href="#main">דילוג לתוכן</a>
    <div className={styles.demoNote}><span>אתר הדגמה · עסק דמיוני ותמונות להמחשה</span><Link href="/#demo-preview">חזרה לדוגמאות ←</Link></div>

    <main id="main" className={styles.main}>
      <section className={styles.heroShell} id="top" aria-labelledby="forma-title">
        <header className={styles.header}>
          <a href="#top" className={styles.wordmark} aria-label="FORMA, ראש העמוד" dir="ltr"><span>F</span> FORMA</a>
          <nav aria-label="ניווט באתר FORMA"><a href="#approach">הסטודיו</a><a href="#services">השירותים</a><a href="#questions">כדאי לדעת</a></nav>
          <a className={styles.headerPill} href="#services">לשירותים</a>
        </header>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>HAIR, SHAPED AROUND YOU</p>
            <h1 id="forma-title"><span data-demo-enter="line">לגלות,</span><br /><span data-demo-enter="line" data-demo-order="1">לדייק.</span></h1>
            <p>שיער שמרגיש בדיוק את — מהגזירה הראשונה ועד הדרך שבה הוא מסתדר גם ביום שאחרי.</p>
            <a className={styles.primaryButton} href="#approach">להכיר את FORMA <span aria-hidden="true">↙</span></a>
          </div>
          <figure data-demo-enter="image" className={styles.heroVisual}>
            <div className={styles.heroPhoto}><Image data-demo-drift="" src="/demos/forma-hair-hero.webp" alt="דיוקן להמחשה של אישה עם שיער כהה וגלי" fill sizes="(max-width: 720px) 82vw, 42vw" preload /></div>
            <span className={styles.visualChipTop}>CUT / COLOR / CARE</span>
            <span className={styles.visualChipBottom}>FORMA · TEL AVIV</span>
            <figcaption>המראה שלך, בקצב שלך.</figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.bento} id="services" aria-labelledby="services-title">
        <article className={styles.servicesCard}>
          <div className={styles.cardHeading}><p className={styles.eyebrow}>01 / השירותים</p><h2 data-demo-enter="line" id="services-title">שלוש דרכים<br />להרגיש יותר את.</h2></div>
          <div className={styles.serviceRows}>{services.map((service, index) => <div data-demo-enter="card" data-demo-order={index} className={styles.serviceRow} id={`service-${service.number}`} key={service.number}><span>{service.number}</span><h3>{service.name}</h3><p>{service.description}</p></div>)}</div>
          <div className={styles.servicesBottom}>
            <div data-demo-enter="image" className={styles.salonCrop}><Image src="/demos/forma-editorial-hero-v2.webp" alt="חלל סטודיו שיער מואר בגוונים טבעיים" fill sizes="(max-width: 720px) 90vw, 34vw" /></div>
            <p>כל שירות מתחיל בשיחה קצרה על השיער, הזמן שלך והתחושה שאת רוצה לקחת איתך.</p>
            <div data-demo-enter="card" data-demo-order="2" className={styles.greenMetric}><strong>03</strong><span>תחומי טיפול.<br />גישה אחת אישית.</span></div>
          </div>
        </article>

        <article className={styles.insightCard} id="approach" aria-labelledby="approach-title">
          <p className={styles.eyebrow}>02 / הגישה</p>
          <h2 data-demo-enter="line" id="approach-title"><span>הסטודיו נולד מתוך</span><br />הקשבה, דיוק<br /><span>ותנועה טבעית.</span></h2>
          <div data-demo-enter="detail" data-demo-order="1" className={styles.insightBottom}><div><strong>1:1</strong><p>גישה אישית למרקם,<br />לשגרה ולך.</p></div><div className={styles.arcs} aria-hidden="true"><i /><i /><i /><i /></div></div>
          <ul data-demo-enter="detail" data-demo-order="2" className={styles.floatingNotes} aria-label="עקרונות העבודה"><li>קודם מקשיבים</li><li>אחר כך מעצבים</li><li>מסבירים גם לבית</li></ul>
        </article>
      </section>

      <section className={styles.questions} id="questions" aria-labelledby="questions-title">
        <div className={styles.questionsIntro}><p className={styles.eyebrow}>03 / לפני שמגיעים</p><h2 data-demo-enter="line" id="questions-title">כמה דברים<br />שטוב לדעת.</h2><p>פשוט, ברור ובלי הפתעות — כל מה שיעזור להגיע רגועה יותר.</p></div>
        <div className={styles.questionList}>
          <details data-demo-enter="card"><summary>לא בטוחה איזה כיוון יתאים לך?</summary><p>אפשר להביא תמונות השראה ולספר מה נוח לך ביום־יום. נתרגם את הכיוון למשהו שמתאים לשיער ולשגרה שלך.</p></details>
          <details data-demo-enter="card"><summary>כדאי להביא תמונות השראה?</summary><p>בהחלט. הן עוזרות להבין מה אהבת, בלי להתחייב להעתקה של מראה שלא בהכרח מתאים למרקם שלך.</p></details>
          <details data-demo-enter="card"><summary>איך שומרים על המראה בבית?</summary><p>בסיום מסבירים איך לייבש, לעצב ולשמור על המראה בעזרת שגרה פשוטה.</p></details>
        </div>
      </section>

      <section className={styles.endcap} aria-labelledby="endcap-title"><div><p className={styles.eyebrow}>FORMA / THE EVERYDAY MUSE</p><h2 data-demo-enter="line" id="endcap-title">גם לעסק שלכם<br />מגיע אתר מדויק.</h2></div><div><p>זהו אתר הדגמה לעסק דמיוני. Slate Sites הופך את הסיפור, התמונות והכיוון שלכם לאתר תדמיתי מקורי.</p><Link href="/auth?next=/dashboard/new">בנו אתר לעסק שלכם <span aria-hidden="true">←</span></Link></div></section>
    </main>

    <footer className={styles.footer}><a href="#top" className={styles.wordmark} dir="ltr"><span>F</span> FORMA</a><span>סטודיו לעיצוב שיער · דמו להמחשה בלבד</span><Link href="/">נבנה עם Slate Sites</Link></footer>
    <DemoMotion style="forma" />
  </div>;
}
