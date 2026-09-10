import Image from 'next/image';
import heroImage from '../public/gel-orange-hero.png';
import styles from './nail.module.css';

const treatments = [
  { number: '01', name: 'לק ג׳ל', description: 'מניקור קפדני, מבנה נקי וצבע מושלם עד שלושה שבועות.', duration: '60 דק׳', price: '₪140' },
  { number: '02', name: 'מבנה אנטומי', description: 'יישור וחיזוק לציפורן טבעית במראה דק, מאוזן ועמיד.', duration: '75 דק׳', price: '₪175' },
  { number: '03', name: 'נייל ארט', description: 'פרנץ׳, קווים, כרום או רעיון משלך — בתוספת לטיפול.', duration: '+15 דק׳', price: 'מ־₪20' },
  { number: '04', name: 'הסרה + מניקור', description: 'הסרה בטוחה, עיצוב הציפורן וטיפול מזין לידיים.', duration: '40 דק׳', price: '₪90' },
];

const shades = [
  { name: 'Orange Crush', color: '#ff5c1a', dark: false },
  { name: 'Cherry Mood', color: '#c91e35', dark: false },
  { name: 'Milky Way', color: '#f1dfd6', dark: false },
  { name: 'Soft Pink', color: '#f0a9ba', dark: false },
  { name: 'Lime Shot', color: '#c9ef43', dark: false },
  { name: 'Midnight', color: '#1c1c1c', dark: true },
];

// The homepage is a self-contained client-facing concept for the gel studio.
export default function HomePage() {
  return (
    <main className={styles.site} id="top">
      <header className={styles.header}>
        <a className={styles.logo} href="#top" aria-label="ORANGE GEL, דף הבית">
          ORANGE<span>.</span>GEL
        </a>
        <nav className={styles.nav} aria-label="ניווט ראשי">
          <a href="#treatments">טיפולים</a>
          <a href="#studio">הסטודיו</a>
          <a href="#booking">קביעת תור</a>
        </nav>
        <a className={styles.headerCta} href="#booking">קובעות תור <span aria-hidden="true">↙</span></a>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>סטודיו לק ג׳ל · רמת גן</p>
          <h1 id="hero-title">צבע שעושה<br />לך <em>מצב רוח.</em></h1>
          <p className={styles.heroText}>מניקור מדויק, חומרים מעולים ושעה שהיא רק שלך. יוצאות עם ידיים שקשה להפסיק להסתכל עליהן.</p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href="#booking">בא לי תור <span aria-hidden="true">←</span></a>
            <a className={styles.secondaryCta} href="#treatments">למחירון</a>
          </div>
          <div className={styles.heroMeta} aria-label="פרטי הסטודיו">
            <span>א׳—ה׳ · 09:00–20:00</span>
            <span>הרא״ה 18, רמת גן</span>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <Image
            className={styles.heroImage}
            src={heroImage}
            alt="יד עם מניקור ג׳ל כתום מבריק על כדור כרום"
            fill
            sizes="(max-width: 860px) 100vw, 48vw"
            preload
            unoptimized
          />
          <span className={styles.imageBadge}>NEW<br />SHADE<br /><b>024</b></span>
          <span className={styles.imageNote}>ORANGE CRUSH</span>
        </div>
      </section>

      <div className={styles.ticker} aria-label="התמחויות הסטודיו">
        <div>לק ג׳ל <span>✦</span> בנייה אנטומית <span>✦</span> חיזוק טבעי <span>✦</span> נייל ארט עדין <span>✦</span> לק ג׳ל <span>✦</span></div>
      </div>

      <section className={styles.treatments} id="treatments" aria-labelledby="treatments-title">
        <div className={styles.sectionIntro}>
          <p className={styles.sectionNumber}>01 / טיפולים</p>
          <h2 id="treatments-title">כל מה שהציפורניים שלך צריכות.<br /><em>בלי קיצורי דרך.</em></h2>
          <p>כל טיפול מתחיל באבחון קצר ומסתיים בשמן קוטיקולה, קרם ידיים והנחיות מדויקות לשמירה בבית.</p>
        </div>
        <div className={styles.treatmentGrid}>
          {treatments.map((treatment, index) => (
            <article className={`${styles.treatmentCard} ${index === 0 ? styles.featuredTreatment : ''}`} key={treatment.number}>
              <span className={styles.cardNumber}>{treatment.number}</span>
              <h3>{treatment.name}</h3>
              <p>{treatment.description}</p>
              <div><span>{treatment.duration}</span><strong>{treatment.price}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.studio} id="studio" aria-labelledby="studio-title">
        <p className={styles.sectionNumber}>02 / הסטודיו</p>
        <div className={styles.studioHeadline}>
          <span aria-hidden="true">GOOD</span>
          <h2 id="studio-title">ציפורניים טובות.<br /><em>מצב רוח טוב.</em></h2>
          <span aria-hidden="true">MOOD</span>
        </div>
        <div className={styles.studioDetails}>
          <p className={styles.studioLead}>ORANGE.GEL הוא סטודיו קטן ואישי שבו אסתטיקה, סטריליות ודיוק מקבלים את אותו מקום.</p>
          <ol>
            <li><span>01</span><div><strong>עובדות נקי</strong><p>כלים עוברים חיטוי ועיקור בין לקוחה ללקוחה. תמיד.</p></div></li>
            <li><span>02</span><div><strong>שומרות על הטבעי</strong><p>בנייה נכונה והסרה עדינה, בלי לפגוע בציפורן שלך.</p></div></li>
            <li><span>03</span><div><strong>לא ממהרות</strong><p>השעה שלך שמורה רק לך, בלי תורים כפולים ובלי לחץ.</p></div></li>
          </ol>
        </div>
      </section>

      <section className={styles.shades} aria-labelledby="shades-title">
        <div className={styles.shadesHeading}>
          <p className={styles.sectionNumber}>03 / הצבעים</p>
          <h2 id="shades-title">מה הצבע שלך<br /><em>היום?</em></h2>
          <p>מעל 120 גוונים מחכים בסטודיו. אלה השישה שאנחנו לא מפסיקות לבחור החודש.</p>
        </div>
        <div className={styles.shadeList}>
          {shades.map((shade, index) => (
            <div className={styles.shade} key={shade.name}>
              <span className={styles.shadeCircle} style={{ backgroundColor: shade.color, color: shade.dark ? '#fff' : '#171717' }}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <b>{shade.name}</b>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.booking} id="booking" aria-labelledby="booking-title">
        <div className={styles.reviewCard}>
          <div className={styles.stars} aria-label="5 מתוך 5 כוכבים">★★★★★</div>
          <blockquote>״סוף סוף מצאתי מישהי שגם רואה כל פרט קטן וגם ממש כיף להעביר איתה שעה. הג׳ל נשאר מושלם כמעט חודש.״</blockquote>
          <p>— נטע לוי, לקוחה קבועה</p>
          <span className={styles.reviewMark} aria-hidden="true">“</span>
        </div>
        <div className={styles.bookingCard}>
          <p className={styles.sectionNumber}>04 / קובעות</p>
          <h2 id="booking-title">התור הבא שלך<br /><em>מתחיל כאן.</em></h2>
          <p>כתבי לנו איזה טיפול תרצי ומתי נוח לך. נחזור עם השעות הפנויות הקרובות.</p>
          <a className={styles.bookingCta} href="mailto:hello@orangegel.studio?subject=בא לי לקבוע תור">שלחי הודעה <span aria-hidden="true">←</span></a>
          <dl className={styles.contactList}>
            <div><dt>טלפון</dt><dd><a href="tel:+97235550148">03-555-0148</a></dd></div>
            <div><dt>כתובת</dt><dd>הרא״ה 18, רמת גן</dd></div>
            <div><dt>שעות</dt><dd>א׳—ה׳, 09:00–20:00</dd></div>
          </dl>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.logo} href="#top">ORANGE<span>.</span>GEL</a>
        <p>לק ג׳ל · מבנה אנטומי · נייל ארט</p>
        <a href="mailto:hello@orangegel.studio">hello@orangegel.studio</a>
        <span>© 2026</span>
      </footer>
    </main>
  );
}
