import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { GeneratedSitePlan } from '@/lib/ai/gemini';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type PreviewPageProps = { params: Promise<{ projectId: string }> };
type PreviewStyle = CSSProperties & { '--preview-accent': string; '--preview-accent-soft': string };

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

export default async function ProjectPreviewPage({ params }: PreviewPageProps) {
  if (!isSupabaseConfigured()) redirect('/dashboard');
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/dashboard/projects/${projectId}/preview`);

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, location')
    .eq('id', projectId)
    .single();
  if (error || !project) notFound();

  const { data: version } = await supabase
    .from('site_versions')
    .select('content, version_number, created_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const plan = version?.content as GeneratedSitePlan | undefined;
  if (!version || !isGeneratedSitePlan(plan)) redirect(`/dashboard/projects/${projectId}`);

  const accent = accentFromPalette(plan.visualDirection.palette);
  const style: PreviewStyle = { '--preview-accent': accent, '--preview-accent-soft': softAccent(accent) };

  return (
    <main className="preview-shell" style={style} dir="rtl" lang="he">
      <header className="preview-toolbar"><span>תצוגה פרטית · גרסה {version.version_number}</span><div><Link href={`/dashboard/projects/${projectId}`}>חזרה לפרויקט</Link><Link href={`/dashboard/projects/${projectId}/edit`}>עריכת הבריף</Link></div></header>
      <article className="site-preview">
        <nav className="preview-nav"><b>{project.business_name}</b><span>{project.business_type || 'האתר שלכם'}</span></nav>
        <section className="preview-hero">
          <div className="preview-hero-copy"><p className="preview-eyebrow">{project.location || 'ברוכים הבאים'}</p><h1>{plan.siteTitle}</h1><p>{plan.positioning}</p><a className="preview-cta" href="#contact">{plan.contactCta}</a></div>
          <aside className="preview-direction-card"><span>כיוון מקורי</span><b>{plan.visualDirection.summary}</b><div className="preview-swatches" aria-label="פלטת צבעים">{plan.visualDirection.palette.slice(0, 5).map((colour, index) => <i key={`${colour}-${index}`} title={colour} style={{ backgroundColor: accentFromPalette([colour]) }} />)}</div></aside>
        </section>
        <section className="preview-intent"><div><b>טיפוגרפיה</b><p>{plan.visualDirection.typography}</p></div><div><b>מבנה</b><p>{plan.visualDirection.layout}</p></div></section>
        <div className="preview-section-list">
          {plan.sections.map((section, index) => (
            <section className={`preview-section preview-section-${index % 3}`} id={section.id || `section-${index + 1}`} key={`${section.id}-${index}`}>
              <span>{String(index + 1).padStart(2, '0')}</span><div><small>{section.label}</small><h2>{section.headline}</h2><p>{section.body}</p>{section.cta ? <a href="#contact">{section.cta}</a> : null}</div>
            </section>
          ))}
        </div>
        <section className="preview-contact" id="contact"><p>השלב הבא</p><h2>{plan.contactCta}</h2><span>פרטי קשר אמיתיים יתווספו לאחר אישורכם.</span></section>
      </article>
      <p className="preview-disclaimer">זו תצוגת כיוון פרטית שנבנתה מהבריף שלכם. היא אינה אתר מפורסם, ואינה מעתיקה את עבודת ההשראה מ־Dribbble.</p>
    </main>
  );
}
