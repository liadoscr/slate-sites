'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type ProjectDetails = {
  id: string;
  businessName: string;
  businessType: string | null;
  location: string | null;
  businessStory: string | null;
  primaryGoal: string | null;
  websiteCopy: string | null;
  importantLinks: string | null;
  tone: string | null;
  colorPreference: string | null;
  designReference: { id: string; url: string; notes: string | null } | null;
};

type EditProjectBriefFormProps = { project: ProjectDetails };

function validateReference(url: string) {
  if (!url) return '';
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('קישור ההשראה אינו כתובת אינטרנט תקינה.'); }
  if (parsed.protocol !== 'https:') throw new Error('קישור ההשראה חייב להתחיל ב־https://');
  return parsed.toString();
}

export function EditProjectBriefForm({ project }: EditProjectBriefFormProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const businessName = String(form.get('businessName') || '').trim();
    const designUrlInput = String(form.get('designUrl') || '').trim();
    const designNotes = String(form.get('designNotes') || '').trim();

    if (businessName.length < 2) { setError('הוסיפו שם עסק באורך של שתי אותיות לפחות.'); return; }
    if (designUrlInput && designNotes.length < 12) { setError('כתבו בכמה מילים מה בדיוק רוצים לקחת מההשראה, כדי שהכיוון החדש יהיה מדויק.'); return; }

    setBusy(true); setError('');
    try {
      const designUrl = validateReference(designUrlInput);
      const supabase = createClient();
      const { error: projectError } = await supabase.from('projects').update({
        business_name: businessName,
        business_type: String(form.get('businessType') || '').trim() || null,
        location: String(form.get('location') || '').trim() || null,
      }).eq('id', project.id);
      if (projectError) throw projectError;

      const { error: briefError } = await supabase.from('project_briefs').update({
        business_story: String(form.get('businessStory') || '').trim() || null,
        primary_goal: String(form.get('primaryGoal') || '').trim() || null,
        website_copy: String(form.get('websiteCopy') || '').trim() || null,
        important_links: String(form.get('importantLinks') || '').trim() || null,
        tone: String(form.get('tone') || '').trim() || null,
        color_preference: String(form.get('colors') || '').trim() || null,
      }).eq('project_id', project.id);
      if (briefError) throw briefError;

      if (designUrl) {
        const reference = { project_id: project.id, provider: 'dribbble', url: designUrl, notes: designNotes || null };
        const { error: referenceError } = project.designReference
          ? await supabase.from('design_references').update(reference).eq('id', project.designReference.id)
          : await supabase.from('design_references').insert(reference);
        if (referenceError) throw referenceError;
      } else if (project.designReference) {
        const { error: referenceError } = await supabase.from('design_references').delete().eq('id', project.designReference.id);
        if (referenceError) throw referenceError;
      }

      router.replace(`/dashboard/projects/${project.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'לא הצלחנו לשמור את השינויים. נסו שוב.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel brief-form" onSubmit={submit} noValidate>
      <h2>עריכת הבריף</h2>
      <p>ככל שההנחיות על ההשראה מדויקות יותר, כך הכיוון של התצוגה המקדימה יהיה מותאם יותר לעסק שלכם.</p>
      <div className="field-grid">
        <label className="field">שם העסק<input name="businessName" defaultValue={project.businessName} required /></label>
        <label className="field">תחום העסק<input name="businessType" defaultValue={project.businessType ?? ''} /></label>
        <label className="field full">אזור פעילות<input name="location" defaultValue={project.location ?? ''} /></label>
        <label className="field full">ספרו על העסק<textarea name="businessStory" defaultValue={project.businessStory ?? ''} /></label>
        <label className="field full">מה הפעולה החשובה באתר?<input name="primaryGoal" defaultValue={project.primaryGoal ?? ''} /></label>
        <label className="field full">קישור להשראה ב־Dribbble<input name="designUrl" type="url" inputMode="url" defaultValue={project.designReference?.url ?? ''} placeholder="https://dribbble.com/shots/..." /><small>מחפשים כיוון אחר? <a className="inline-link" href="https://dribbble.com/search/web-design" target="_blank" rel="noreferrer">לעיון בעיצובים של אתרים ב־Dribbble ↗</a></small></label>
        <label className="field full">מה רוצים לקחת מההשראה? <span className="required-hint">(חשוב ל־AI)</span><textarea name="designNotes" defaultValue={project.designReference?.notes ?? ''} placeholder="למשל: פתיחה כהה, הרבה שטח לבן, כותרת גדולה וכרטיסי שירות בהירים." /><small>ה־AI מסתמך על התיאור שלכם ולא פותח את הקישור או מעתיק עיצוב.</small></label>
        <label className="field">אופי האתר<select name="tone" defaultValue={project.tone ?? ''}><option value="">בחרו אופי</option><option>נקי ומקצועי</option><option>חם ואישי</option><option>נועז וחדשני</option><option>אלגנטי ומדויק</option></select></label>
        <label className="field">צבעים שאוהבים<input name="colors" defaultValue={project.colorPreference ?? ''} placeholder="למשל: כחול, לבן וסגול" /></label>
        <label className="field full">טקסטים ותוכן לאתר<textarea name="websiteCopy" defaultValue={project.websiteCopy ?? ''} /></label>
        <label className="field full">קישורים שחשוב לכלול<input name="importantLinks" defaultValue={project.importantLinks ?? ''} /></label>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <button className="form-button" disabled={busy} type="submit">{busy ? 'שומרים…' : 'שמירת השינויים'}</button>
    </form>
  );
}
