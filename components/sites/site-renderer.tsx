import type { CSSProperties, ReactNode } from 'react';
import { safeEmail, safePhone, themeFor, type GeneratedSitePlan, type SiteImage } from '@/lib/sites/document';
import styles from './site-renderer.module.css';

export function SiteRenderer({plan,projectId,versionId,contact,compact=false}:{plan:GeneratedSitePlan;projectId:string;versionId:string;contact?:ReactNode;compact?:boolean}) {
  const theme = themeFor(plan);
  const business = plan.business ?? { name:plan.siteTitle,type:'',location:'',phone:'',email:'',whatsapp:'' };
  const images = plan.images ?? [];
  const hero = plan.heroImageId === null ? undefined : (images.find(i=>i.id===plan.heroImageId && i.role!=='logo') ?? images.find(i=>i.role==='hero') ?? images.find(i=>i.role==='gallery'));
  const logo = images.find(i=>i.role==='logo');
  const sections = plan.sections.filter(s=>s.kind!=='hero' && s.kind!=='contact');
  const primary = business.whatsapp && /^\d{8,15}$/.test(business.whatsapp) ? `https://wa.me/${business.whatsapp}` : safePhone(business.phone) ? `tel:${safePhone(business.phone)}` : '#contact';
  const image = (asset: SiteImage, heroImage=false) => <img src={`/api/sites/${projectId}/media/${versionId}/${asset.id}`} alt={asset.alt} loading={heroImage?'eager':'lazy'} decoding="async" />;
  const style = {'--site-accent':theme.accent,'--site-radius':theme.corners==='soft'?'24px':'3px'} as CSSProperties;
  return <article className={styles.site} data-layout={theme.layout} data-font={theme.font} data-compact={compact} style={style} dir="rtl" lang="he">
    <a className={styles.skip} href="#site-content">דילוג לתוכן</a>
    <nav className={styles.nav} aria-label="ניווט באתר"><a href="#site-top" className={styles.brand}>{logo ? image(logo,true) : null}<b>{business.name}</b></a><a className={styles.navContact} href="#contact">יצירת קשר</a></nav>
    <div id="site-content">
      <section className={styles.hero} id="site-top" data-has-image={Boolean(hero)}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{[business.type,business.location].filter(Boolean).join(' · ')}</p><h1>{plan.siteTitle}</h1><p className={styles.positioning}>{plan.positioning}</p><a className={styles.cta} href={primary}>{plan.contactCta}</a></div>
        {hero ? <div className={styles.heroImage}>{image(hero,true)}</div> : null}
      </section>
      <div className={styles.sections}>{sections.map((section,index)=>{
        const photo = images.find(i=>i.id===section.imageId && i.role!=='logo');
        return <section className={styles.section} data-kind={section.kind} data-image={Boolean(photo)} id={`content-${index}`} key={section.id}>
          <div><p className={styles.eyebrow}>{section.label}</p><h2>{section.headline}</h2><p>{section.body}</p>{section.cta ? <a className={styles.textLink} href={primary}>{section.cta}</a> : null}</div>
          {photo ? <div className={styles.sectionImage}>{image(photo)}</div> : null}
        </section>;
      })}</div>
      {images.filter(i=>i.role==='gallery' && !sections.some(s=>s.imageId===i.id) && i.id!==hero?.id).length ? <section className={styles.gallery} aria-label="תמונות מהעסק">{images.filter(i=>i.role==='gallery' && !sections.some(s=>s.imageId===i.id) && i.id!==hero?.id).map(i=><figure key={i.id}>{image(i)}</figure>)}</section> : null}
      <section className={styles.contact} id="contact"><div><p className={styles.eyebrow}>נשמח לשמוע מכם</p><h2>{plan.contactCta}</h2><div className={styles.contactLinks}>
        {safePhone(business.phone)?<a href={`tel:${safePhone(business.phone)}`} dir="ltr">{business.phone}</a>:null}
        {safeEmail(business.email)?<a href={`mailto:${safeEmail(business.email)}`}>{business.email}</a>:null}
        {business.whatsapp && /^\d{8,15}$/.test(business.whatsapp)?<a href={`https://wa.me/${business.whatsapp}`}>הודעה ב־WhatsApp</a>:null}
      </div></div>{contact ?? <p>טופס יצירת הקשר יהיה פעיל באתר המפורסם.</p>}</section>
    </div>
    <footer className={styles.footer}><b>{business.name}</b><span>נבנה עם Slate Sites</span></footer>
  </article>;
}
