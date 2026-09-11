'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SiteRenderer } from '@/components/sites/site-renderer';
import { PreviewViewport } from './preview-viewport';
import { themeFor, launchChecks, type GeneratedSitePlan } from '@/lib/sites/document';

type Version = {id:string;version_number:number;created_at:string;visibility:string};
export function SiteWorkbench({projectId,versionId,plan,versions,curated=false}:{projectId:string;versionId:string;plan:GeneratedSitePlan;versions:Version[];curated?:boolean}) {
  const router=useRouter();
  const [selected,setSelected]=useState('site-header');
  const section=selected==='site-header'?{id:'site-header',label:'פתיחת האתר',headline:plan.siteTitle,body:plan.positioning,cta:plan.contactCta,imageId:plan.heroImageId===null?'':plan.heroImageId??plan.images?.find(i=>i.role==='hero')?.id??plan.images?.find(i=>i.role==='gallery')?.id}:plan.sections.find(s=>s.id===selected) ?? plan.sections[0];
  const [candidate,setCandidate]=useState<{id:string;plan:GeneratedSitePlan}|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [message,setMessage]=useState('');
  const [restoreId,setRestoreId]=useState('');
  const requestAttempt=useRef<{key:string;id:string}|null>(null);
  async function change(values:Record<string,unknown>) {
    setBusy(true);setError('');setMessage('');
    try {
      const key=JSON.stringify({values,versionId});
      if(requestAttempt.current?.key!==key)requestAttempt.current={key,id:crypto.randomUUID()};
      const response=await fetch(`/api/projects/${projectId}/revisions`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,baseVersionId:versionId,requestId:requestAttempt.current.id})});
      const data=await response.json();
      requestAttempt.current=null;
      if(!response.ok)throw new Error(data.error||'לא הצלחנו לשמור את השינוי.');
      if(data.proposal && data.plan) {setCandidate({id:data.versionId,plan:data.plan});setMessage('ההצעה מוכנה לבדיקה. הטיוטה והאתר החי עדיין לא השתנו.');}
      else {setCandidate(null);setMessage('נשמרה טיוטה חדשה. האתר החי לא השתנה.');router.refresh();}
    }catch(e){setError(e instanceof Error?e.message:'אירעה שגיאה.');}finally{setBusy(false);}
  }
  const shown=candidate?.plan ?? plan; const theme=themeFor(plan);
  return <div className="site-workbench">
    {candidate?<div className="revision-review"><div><b>הצעת השינוי שלך</b><p>בדקו את התוצאה לפני שמירתה כטיוטה.</p></div><div className="project-actions"><button className="generate-plan-button" disabled={busy} onClick={()=>change({mode:'apply',sourceVersionId:candidate.id})}>שמירת ההצעה כטיוטה</button><button className="secondary-action" disabled={busy} onClick={()=>setCandidate(null)}>ביטול והצגת המקור</button><a href={`/dashboard/projects/${projectId}/preview?version=${candidate.id}`} target="_blank" rel="noreferrer">פתיחה בגודל מלא ↗</a></div></div>:null}
    {!curated?<div className="workbench-preview"><PreviewViewport><SiteRenderer plan={shown} projectId={projectId} versionId={candidate?.id ?? versionId} compact /></PreviewViewport></div>:null}
    {message?<p className="success-message" role="status">{message}</p>:null}{error?<p className="error-message" role="alert">{error}</p>:null}
    {!curated?<details className="workspace-details"><summary>רוצים לשנות משהו?</summary><div className="revision-grid">
      <form key={`${versionId}-${selected}`} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);change({mode:'section',sectionId:selected,headline:f.get('headline'),body:f.get('body'),cta:f.get('cta'),imageId:f.get('imageId')});}}>
        <label className="field">מה מעדכנים?<select value={selected} onChange={e=>{setSelected(e.target.value);setCandidate(null);}}><option value="site-header">פתיחת האתר</option>{plan.sections.filter(s=>s.kind!=='hero').map(s=><option value={s.id} key={s.id}>{s.label}</option>)}</select></label>
        <label className="field">כותרת<input name="headline" defaultValue={section.headline} maxLength={180} required /></label><label className="field">תוכן<textarea name="body" defaultValue={section.body} maxLength={1200} required /></label><label className="field">טקסט הכפתור<input name="cta" defaultValue={section.cta} maxLength={100} /></label>
        <label className="field">תמונה במקטע<select name="imageId" defaultValue={section.imageId||''}><option value="">ללא תמונה</option>{plan.images?.filter(i=>i.role!=='logo').map(i=><option key={i.id} value={i.id}>{i.alt}</option>)}</select></label>
        <button className="secondary-button" disabled={busy}>הצגת השינויים לפני שמירה</button>
      </form>
      <div><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);change({mode:'rewrite',sectionId:selected,instruction:f.get('instruction'),consent:f.get('consent')==='on'});}}><h3>לבקש במילים שלך</h3><label className="field">מה לשנות ב״{section.label}״?<textarea name="instruction" required maxLength={600} placeholder="למשל: קצרו את הטקסט ושמרו על טון חם ואישי" /></label><label className="checkbox"><input name="consent" type="checkbox" required />שליחת המקטע והבקשה ל־Gemini. שאר המקטעים יישארו ללא שינוי.</label><button className="form-button" disabled={busy}>{busy?'עובדים על השינוי…':'הכנת הצעה עם AI'}</button></form>
      <form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);change({mode:'theme',layout:f.get('layout'),accent:f.get('accent')});}}><h3>הכיוון העיצובי</h3><label className="field">מבנה<select name="layout" defaultValue={theme.layout}><option value="split">תמונה לצד הסיפור</option><option value="editorial">כותרת גדולה ותמונה רחבה</option><option value="centered">מרכזי עם כרטיסי תוכן</option></select></label><label className="field">צבע מוביל<input name="accent" type="color" defaultValue={theme.accent} /><small>הצבע יותאם במידת הצורך לקריאות הטקסט.</small></label><button className="secondary-button" disabled={busy}>הצגת הכיוון החדש</button></form></div>
    </div></details>:null}
    <details className="workspace-details"><summary>גרסאות קודמות ושחזור</summary><p>השחזור ייצור טיוטה חדשה. שום גרסה קודמת לא תימחק והאתר החי לא ישתנה.</p><ul className="version-history">{versions.filter(v=>v.visibility!=='preview').map(v=><li key={v.id}><div><b>גרסה {v.version_number}</b> · {new Date(v.created_at).toLocaleDateString('he-IL')}{v.visibility==='public'?' · באוויר':''}</div><div><a href={`/dashboard/projects/${projectId}/preview?version=${v.id}`} target="_blank" rel="noreferrer">צפייה</a>{v.id!==versionId?<button type="button" disabled={busy} onClick={()=>setRestoreId(v.id)}>שחזור כטיוטה</button>:null}</div></li>)}</ul>{restoreId?<div className="publication-confirm"><p>ליצור טיוטה מהגרסה שנבחרה?</p><button className="secondary-button" disabled={busy} onClick={()=>{change({mode:'restore',sourceVersionId:restoreId});setRestoreId('');}}>אישור השחזור</button><button className="quiet-button" onClick={()=>setRestoreId('')}>ביטול</button></div>:null}
    {versions.some(v=>v.visibility==='preview')?<><h3>הצעות שינוי שנשמרו לבדיקה</h3><ul className="version-history">{versions.filter(v=>v.visibility==='preview').slice(0,5).map(v=><li key={v.id}><a href={`/dashboard/projects/${projectId}/preview?version=${v.id}`} target="_blank" rel="noreferrer">הצעה {v.version_number} ↗</a><button type="button" disabled={busy} onClick={()=>change({mode:'apply',sourceVersionId:v.id})}>אישור ושמירה כטיוטה</button></li>)}</ul></>:null}</details>
    <details className="workspace-details"><summary>בדיקה לפני פרסום</summary><ul className="launch-checks">{launchChecks(plan).map(check=><li key={check.label}><span>{check.ok?'✓':'כדאי להשלים'}</span>{check.label}</li>)}</ul><p className="small-print">בדיקה בסיסית בלבד. עברו גם על התוכן, הקישורים, תצוגת המובייל והנגישות לפני הפרסום.</p></details>
  </div>;
}
