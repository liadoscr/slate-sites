import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { GeneratedSitePlan } from '@/lib/ai/gemini';
import { PublicContactForm } from '@/components/sites/public-contact-form';
import { getPublishedSite } from '@/lib/sites/public-site';
import { isOrangeGelDemo } from '@/lib/sites/orange-demo';
import { OrangeGelDemo } from '@/components/sites/orange-gel-demo';

export const dynamic = 'force-dynamic';

type PublicSitePageProps = { params: Promise<{ projectId: string }> };

export async function generateMetadata({ params }: PublicSitePageProps): Promise<Metadata> {
  const site = await getPublishedSite((await params).projectId);
  const content = site?.version.content as GeneratedSitePlan | undefined;
  if (!isGeneratedSitePlan(content)) return { title: 'האתר אינו זמין | Slate Sites', description: '', robots: { index: false } };
  return { title: content.seo.title, description: content.seo.description, ...(isOrangeGelDemo(content) ? { robots: { index: false, follow: true } } : {}) };
}

function isGeneratedSitePlan(plan: GeneratedSitePlan | undefined): plan is GeneratedSitePlan {
  return Boolean(plan?.siteTitle && plan.positioning && plan.sections?.length);
}

function accentFromPalette(palette: string[]) {
  for (const colour of palette) {
    const match = colour.match(/#[\da-f]{6}\b|#[\da-f]{3}\b/i);
    if (match) return match[0];
  }
  return '#5048e5';
}

function softAccent(hex: string) {
  const short = hex.length === 4 ? hex.slice(1).split('').map((part) => part + part).join('') : hex.slice(1);
  const red = Number.parseInt(short.slice(0, 2), 16);
  const green = Number.parseInt(short.slice(2, 4), 16);
  const blue = Number.parseInt(short.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.12)`;
}

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { projectId } = await params;
  const site = await getPublishedSite(projectId);
  if (!site) notFound();
  const { project, version } = site;
  const plan = version.content as GeneratedSitePlan | undefined;
  if (!isGeneratedSitePlan(plan)) notFound();
  if (isOrangeGelDemo(plan)) return <OrangeGelDemo />;

  const accent = accentFromPalette(plan.visualDirection.palette);
  const style = { '--preview-accent': accent, '--preview-accent-soft': softAccent(accent) } as CSSProperties;

  return (
    <main className="preview-shell public-site" style={style} dir="rtl" lang="he">
      <article className="site-preview">
        <nav className="preview-nav"><a href="#top">{project.business_name}</a><span>{project.business_type || 'ברוכים הבאים'}</span></nav>
        <section className="preview-hero" id="top">
          <div className="preview-hero-copy"><p className="preview-eyebrow">{project.location || 'ברוכים הבאים'}</p><h1>{plan.siteTitle}</h1><p>{plan.positioning}</p><a className="preview-cta" href="#contact">{plan.contactCta}</a></div>
          <aside className="public-hero-panel"><span>{project.business_type || 'העסק שלכם'}</span><b>{plan.visualDirection.summary}</b><div className="preview-swatches" aria-label="פלטת צבעים">{plan.visualDirection.palette.slice(0, 5).map((colour, index) => <i key={`${colour}-${index}`} title={colour} style={{ backgroundColor: accentFromPalette([colour]) }} />)}</div></aside>
        </section>
        <div className="public-section-list">
          {plan.sections.map((section, index) => (
            <section className={`public-section public-section-${index % 3}`} id={section.id || `section-${index + 1}`} key={`${section.id}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span><div><small>{section.label}</small><h2>{section.headline}</h2><p>{section.body}</p>{section.cta ? <a href="#contact">{section.cta}</a> : null}</div>
            </section>
          ))}
        </div>
        <section className="public-contact-section" id="contact"><PublicContactForm projectId={projectId} heading={plan.contactCta} /></section>
        <footer className="public-site-footer"><b>{project.business_name}</b><span>נבנה עם Slate Sites</span></footer>
      </article>
    </main>
  );
}
