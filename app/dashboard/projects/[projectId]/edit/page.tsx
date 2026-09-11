import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { EditProjectBriefForm } from '@/components/projects/edit-project-brief-form';
import { getCurrentUser } from '@/lib/data/current-user';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';

type EditProjectPageProps = { params: Promise<{ projectId: string }> };

export default async function EditProjectPage({ params }: EditProjectPageProps) {
  if (!isSupabaseConfigured()) redirect('/dashboard');
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=/dashboard/projects/${projectId}/edit`);

  const supabase = await createClient();
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, business_name, business_type, location, contact_email, contact_phone, project_briefs(business_story, primary_goal, website_copy, important_links, tone, color_preference, design_notes), design_references(id, url, notes)')
    .eq('id', projectId)
    .single();
  if (error || !project) notFound();

  const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
  const references = Array.isArray(project.design_references) ? project.design_references : [];
  const designReference = references[0] ?? null;

  return (
    <main className="app-shell">
      <header className="simple-header"><Link className="brand" href="/dashboard"><span className="brand-slate">slate<span className="brand-dot">.</span></span><span className="brand-divider" /><span className="brand-product">Sites</span></Link><Link className="back-link" href={`/dashboard/projects/${projectId}`}>← חזרה לפרויקט</Link></header>
      <section className="brief-page">
        <div className="brief-copy"><p className="kicker">01 / עדכון הבריף</p><h1>עוד קצת דיוק.<br />עוד יותר שלך.</h1><p>עדכנו את הסיפור, התוכן וההשראה. השמירה תחזיר אתכם לפרויקט, שם תוכלו ליצור תוכנית חדשה.</p><p className="privacy-note">הקבצים הקיימים נשמרים בפרויקט. כאן מעדכנים את הטקסט ואת קישור ההשראה.</p></div>
        <EditProjectBriefForm project={{ id: project.id, businessName: project.business_name, businessType: project.business_type, location: project.location, contactEmail:project.contact_email,contactPhone:project.contact_phone,designNotes:brief?.design_notes??null,businessStory: brief?.business_story ?? null, primaryGoal: brief?.primary_goal ?? null, websiteCopy: brief?.website_copy ?? null, importantLinks: brief?.important_links ?? null, tone: brief?.tone ?? null, colorPreference: brief?.color_preference ?? null, designReference }} />
      </section>
    </main>
  );
}
