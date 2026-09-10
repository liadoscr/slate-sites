import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getCurrentUser } from '@/lib/data/current-user';
import type { GeneratedSitePlan } from '@/lib/ai/gemini';
import { GenerateSitePlanButton } from '@/components/projects/generate-site-plan-button';
import { PublishSiteButton } from '@/components/projects/publish-site-button';
import { projectStatusLabels } from '@/lib/projects/status';

type ProjectPageProps = { params: Promise<{ projectId: string }> };

function isGeneratedSitePlan(plan: GeneratedSitePlan | undefined): plan is GeneratedSitePlan {
  return Boolean(plan?.siteTitle && plan.sections?.length);
}

function leadValue(details: unknown, key: string) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return '';
  const value = (details as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  if (!isSupabaseConfigured()) redirect('/dashboard');
  const { projectId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/dashboard/projects/${projectId}`);

  const { data: project, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, location, status, created_at, project_briefs(business_story, primary_goal, website_copy, important_links, tone, color_preference), design_references(url, notes), project_assets(original_name, mime_type, size_bytes)')
    .eq('id', projectId)
    .single();
  if (error || !project) notFound();

  const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
  const references = Array.isArray(project.design_references) ? project.design_references : [];
  const assets = Array.isArray(project.project_assets) ? project.project_assets : [];
  const { data: versions } = await supabase
    .from('site_versions')
    .select('version_number, content, created_at, visibility, published_url')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1);
  const latestVersion = versions?.[0];
  const plan = latestVersion?.content as GeneratedSitePlan | undefined;
  const { data: liveVersion } = await supabase
    .from('site_versions')
    .select('published_url, version_number')
    .eq('project_id', projectId)
    .eq('visibility', 'public')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: leads } = await supabase
    .from('project_activity')
    .select('id, details, created_at')
    .eq('project_id', projectId)
    .eq('event_type', 'public_contact_received')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main className="app-shell">
      <header className="simple-header"><Link className="brand" href="/dashboard"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link><Link className="back-link" href="/dashboard">← כל הפרויקטים</Link></header>
      <section className="dashboard-top"><div><p className="kicker">סביבת העבודה שלך</p><h1>{project.business_name}</h1><p>{project.business_type || 'עסק'}{project.location ? ` · ${project.location}` : ''}</p></div><div className="project-actions"><span className="status-pill" data-status={liveVersion ? 'published' : project.status}>{liveVersion ? 'האתר באוויר' : projectStatusLabels[project.status] || 'טיוטה'}</span><Link className="secondary-action" href={`/dashboard/projects/${projectId}/edit`}>עריכת הבריף</Link></div></section>
      <ol className="project-progress" aria-label="התקדמות הפרויקט">
        <li data-complete="true"><span>01</span><div><b>הבריף שלך</b><small>נשמר בפרויקט</small></div></li>
        <li data-complete={isGeneratedSitePlan(plan)}><span>02</span><div><b>תוכן ותצוגה</b><small>{latestVersion ? `גרסה ${latestVersion.version_number}` : 'מוכנים ליצירה'}</small></div></li>
        <li data-complete={Boolean(liveVersion)}><span>03</span><div><b>פרסום האתר</b><small>{liveVersion ? `גרסה ${liveVersion.version_number} באוויר` : 'כשתהיו מוכנים'}</small></div></li>
      </ol>
      <section className="panel ai-plan-panel">
        <div className="ai-plan-heading">
          <div>
            <p className="kicker">Slate AI</p>
            <h2>{isGeneratedSitePlan(plan) ? 'הכיוון של האתר שלך' : 'מהבריף לתוכנית הראשונה'}</h2>
            <p>{isGeneratedSitePlan(plan) ? 'עברו על התוכן, פתחו תצוגה מקדימה ופרסמו כשאתם מוכנים.' : 'יוצרים תוכן ומבנה לעמוד אחד, מתוך הפרטים שסיפרתם על העסק.'}</p>
          </div>
          <div className="ai-plan-actions">
            {isGeneratedSitePlan(plan) ? <Link className="preview-top-action" href={`/dashboard/projects/${projectId}/preview`}>פתיחת תצוגה מקדימה ↗</Link> : null}
            <GenerateSitePlanButton projectId={projectId} />
            {isGeneratedSitePlan(plan) && latestVersion ? <PublishSiteButton projectId={projectId} isCurrentVersionPublished={latestVersion.visibility === 'public'} hasLiveSite={Boolean(liveVersion)} liveUrl={liveVersion?.published_url ?? null} /> : null}
          </div>
        </div>
        <p className="ai-privacy-note">בשלב הבטא נשלח ל-AI רק הטקסט מהבריף — לא הקבצים שהעליתם. אל תוסיפו מידע רגיש לבריף.</p>
        {isGeneratedSitePlan(plan) && latestVersion ? (
          <div className="site-plan" dir="rtl">
            <div className="plan-overview">
              <div>
                <p className="version-label">גרסה {latestVersion.version_number} · {new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(latestVersion.created_at))}</p>
                <h3>{plan.siteTitle}</h3>
                <p>{plan.positioning}</p>
              </div>
              <div className="contact-cta-card"><span>קריאה לפעולה</span><b>{plan.contactCta}</b></div>
            </div>
            <div className="visual-direction">
              <div><b>כיוון חזותי</b><p>{plan.visualDirection.summary}</p></div>
              <div><b>טיפוגרפיה</b><p>{plan.visualDirection.typography}</p></div>
              <div><b>מבנה</b><p>{plan.visualDirection.layout}</p></div>
              {plan.visualDirection.palette.length ? <div><b>פלטה</b><p>{plan.visualDirection.palette.join(' · ')}</p></div> : null}
            </div>
            <div className="plan-sections">
              <h3>מבנה עמוד הבית</h3>
              <ol>
                {plan.sections.map((section, index) => <li key={`${section.id}-${index}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><small>{section.label}</small><h4>{section.headline}</h4><p>{section.body}</p>{section.cta ? <b>{section.cta}</b> : null}{section.notes ? <em>{section.notes}</em> : null}</div>
                </li>)}
              </ol>
            </div>
            <div className="plan-meta-grid">
              <div><h3>SEO ראשוני</h3><p><b>כותרת:</b> {plan.seo.title}</p><p><b>תיאור:</b> {plan.seo.description}</p>{plan.seo.keywords.length ? <p><b>מילות מפתח:</b> {plan.seo.keywords.join(' · ')}</p> : null}</div>
              <div><h3>מה עדיין צריך מכם</h3>{plan.missingInformation.length ? <ul>{plan.missingInformation.map((item) => <li key={item}>{item}</li>)}</ul> : <p>הבריף מכיל את המידע הבסיסי הדרוש.</p>}</div>
            </div>
            {plan.reviewNotes.length ? <div className="review-notes"><b>הערות לבדיקה לפני המשך:</b><ul>{plan.reviewNotes.map((note) => <li key={note}>{note}</li>)}</ul></div> : null}
          </div>
        ) : <div className="empty-ai-plan"><b>עוד אין תוכנית אתר</b><p>מלאו את הבריף ולחצו על הכפתור כדי ליצור את הכיוון הראשון לאתר שלכם.</p></div>}
      </section>
      <details className="panel brief-summary">
        <summary>הבריף והחומרים שלך</summary>
        <div className="brief-summary-content">
          <div className="field-grid">
            <p className="small-print"><b>מטרת האתר</b><br />{brief?.primary_goal || 'לא נוספה עדיין'}</p>
            <p className="small-print"><b>אופי האתר</b><br />{brief?.tone || 'לא נבחר עדיין'}</p>
            <p className="small-print field full"><b>הסיפור של העסק</b><br />{brief?.business_story || 'לא נוסף עדיין'}</p>
            <p className="small-print field full"><b>תוכן לאתר</b><br />{brief?.website_copy || 'לא נוסף עדיין'}</p>
          </div>
          <h3>השראות וקבצים</h3>
          {references.length ? <ul className="file-list">{references.map((reference) => <li key={reference.url}><a className="inline-link" href={reference.url} target="_blank" rel="noreferrer">קישור להשראה ↗</a><span>{reference.notes || 'ללא הערות'}</span></li>)}</ul> : <p className="small-print">לא נוספו קישורי השראה.</p>}
          {assets.length ? <ul className="file-list">{assets.map((asset) => <li key={asset.original_name}><b>{asset.original_name}</b><span>{asset.mime_type}</span></li>)}</ul> : <p className="small-print">לא הועלו קבצים.</p>}
        </div>
      </details>
      <section className="panel leads-panel">
        <div><p className="kicker">פניות מהאתר</p><h2>הודעות מלקוחות</h2><p>{leads?.length ? 'עד 20 הפניות האחרונות שהתקבלו באתר שלך.' : 'הפנייה הבאה מהאתר תופיע כאן.'}</p></div>
        {leads?.length ? <ul className="lead-list">{leads.map((lead) => <li key={lead.id}><div><b>{leadValue(lead.details, 'name')}</b><a dir="ltr" href={`mailto:${leadValue(lead.details, 'email')}`}>{leadValue(lead.details, 'email')}</a>{leadValue(lead.details, 'phone') ? <a dir="ltr" href={`tel:${leadValue(lead.details, 'phone')}`}>{leadValue(lead.details, 'phone')}</a> : null}<p>{leadValue(lead.details, 'message')}</p></div><time dateTime={lead.created_at}>{new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(lead.created_at))}</time></li>)}</ul> : <p className="small-print">אחרי הפרסום, מבקרים יוכלו להשאיר פרטים בטופס יצירת הקשר. הפניות נשמרות עבורך כאן.</p>}
      </section>
    </main>
  );
}
