import type { CSSProperties, ReactNode } from 'react';
import { focalPointFor, paletteFor, safeEmail, safePhone, themeFor, type GeneratedSitePlan, type SiteImage } from '@/lib/sites/document';
import styles from './site-renderer.module.css';

export function SiteRenderer({plan,projectId,versionId,contact,compact=false}:{plan:GeneratedSitePlan;projectId:string;versionId:string;contact?:ReactNode;compact?:boolean}) {
  const theme = themeFor(plan);
  const palette = paletteFor(theme);
  const business = plan.business ?? { name:plan.siteTitle,type:'',location:'',phone:'',email:'',whatsapp:'' };
  const images = (plan.images ?? []).filter(asset => ['logo', 'hero', 'gallery'].includes(asset.role));
  const hero = plan.heroImageId === null ? undefined : (images.find(i=>i.id===plan.heroImageId && i.role!=='logo') ?? images.find(i=>i.role==='hero') ?? images.find(i=>i.role==='gallery'));
  const logo = images.find(i=>i.role==='logo');
  const sections = plan.sections.filter(s=>s.kind!=='hero' && s.kind!=='contact');
  const contactTargets = {
    whatsapp: /^\d{8,15}$/.test(business.whatsapp) ? `https://wa.me/${business.whatsapp}` : '',
    phone: safePhone(business.phone) ? `tel:${safePhone(business.phone)}` : '',
    email: safeEmail(business.email) ? `mailto:${safeEmail(business.email)}` : '',
    form: '#contact',
  };
  const primary = (plan.contactPreference && contactTargets[plan.contactPreference]) || contactTargets.whatsapp || contactTargets.phone || contactTargets.email || '#contact';
  const image = (asset: SiteImage, heroImage=false) => {
    const focal = focalPointFor(asset);
    return <img src={`/api/sites/${projectId}/media/${versionId}/${asset.id}`} alt={asset.alt} loading={heroImage?'eager':'lazy'} decoding="async" style={{ '--image-position': `${focal.x}% ${focal.y}%`, '--image-mobile-position': `${focal.mobileX}% ${focal.mobileY}%` } as CSSProperties} />;
  };
  const style = {
    '--site-accent': palette.accent, '--site-on-accent': palette.onAccent, '--site-background': palette.background,
    '--site-surface': palette.surface, '--site-text': palette.text, '--site-muted': palette.muted, '--site-border': palette.border,
    '--site-radius': theme.corners === 'soft' ? '24px' : '3px',
  } as CSSProperties;
  const spareImages = images.filter(i => i.role === 'gallery' && !sections.some(s => s.imageId === i.id) && i.id !== hero?.id);
  return <article className={styles.site} data-layout={theme.layout} data-font={theme.font} data-mode={theme.mode} data-density={theme.density} data-compact={compact} style={style} dir="rtl" lang="he">
    <a className={styles.skip} href="#site-content">דילוג לתוכן</a>
    <nav className={styles.nav} aria-label="ניווט באתר"><a href="#site-top" className={styles.brand}>{logo ? image(logo,true) : null}<b>{business.name}</b></a><a className={styles.navContact} href="#contact">יצירת קשר</a></nav>
    <div id="site-content">
      <section className={styles.hero} id="site-top" data-has-image={Boolean(hero)}>
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{[business.type,business.location].filter(Boolean).join(' · ')}</p><h1>{plan.siteTitle}</h1><p className={styles.positioning}>{plan.positioning}</p><a className={styles.cta} href={primary}>{plan.contactCta}</a></div>
        {hero ? <div className={styles.heroImage}>{image(hero,true)}</div> : null}
      </section>
      <div className={styles.sections}>{sections.map((section,index)=>{
        const photo = images.find(i=>i.id===section.imageId && i.role!=='logo');
        const variant = section.presentation?.layout ?? (theme.layout === 'centered' || theme.layout === 'bento' ? 'cards' : 'split');
        const tone = section.presentation?.tone ?? (theme.layout === 'bento' || theme.layout === 'centered' ? 'muted' : 'default');
        return <section className={styles.section} data-kind={section.kind} data-image={Boolean(photo)} data-variant={variant} data-tone={tone} id={`content-${index}`} key={section.id}>
          <div className={styles.sectionCopy}><p className={styles.eyebrow}>{section.label}</p><h2>{section.headline}</h2><p>{section.body}</p>{section.cta ? <a className={styles.textLink} href={primary}>{section.cta}</a> : null}</div>
          {photo ? <div className={styles.sectionImage}>{image(photo)}</div> : null}
        </section>;
      })}</div>
      {spareImages.length ? <section className={styles.gallery} aria-label="תמונות מהעסק">{spareImages.map(i=><figure key={i.id}>{image(i)}</figure>)}</section> : null}
      <section className={styles.contact} id="contact"><div><p className={styles.eyebrow}>נשמח לשמוע מכם</p><h2>{plan.contactCta}</h2><div className={styles.contactLinks}>
        {safePhone(business.phone)?<a href={`tel:${safePhone(business.phone)}`} dir="ltr">{business.phone}</a>:null}
        {safeEmail(business.email)?<a href={`mailto:${safeEmail(business.email)}`}>{business.email}</a>:null}
        {business.whatsapp && /^\d{8,15}$/.test(business.whatsapp)?<a href={`https://wa.me/${business.whatsapp}`}>הודעה ב־WhatsApp</a>:null}
      </div></div>{contact ?? <p>טופס יצירת הקשר יהיה פעיל באתר המפורסם.</p>}</section>
    </div>
    <footer className={styles.footer}><b>{business.name}</b><span>נבנה עם Slate Sites</span></footer>
  </article>;
}
