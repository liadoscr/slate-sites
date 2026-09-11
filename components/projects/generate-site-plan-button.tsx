'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
type Asset={id:string;original_name:string;mime_type:string;size_bytes:number};
type Choice={id:string;role:string;alt:string};
type Job={id:string;state:string;phase:string;error_message?:string};
export function GenerateSitePlanButton({projectId,assets=[],hasVersion=false}:{projectId:string;assets?:Asset[];hasVersion?:boolean}) {
  const router=useRouter();const [busy,setBusy]=useState(false);const [job,setJob]=useState<Job|null>(null);const [error,setError]=useState('');
  const [choices,setChoices]=useState<Choice[]>([]); const waiting=useRef(false);
  const [consent,setConsent]=useState(false);const [whatsapp,setWhatsapp]=useState(false);
  const running=job?.state==='running';
  useEffect(()=>{
    let alive=true; let timer:ReturnType<typeof setTimeout>;
    async function poll(){
      try{const response=await fetch(`/api/projects/${projectId}/generate`,{cache:'no-store'}); if(!response.ok)return;const result=await response.json();if(!alive)return;setJob(result.job);
        if(result.job?.state==='running'){waiting.current=true;timer=setTimeout(poll,3000);}
        else if(waiting.current){waiting.current=false;router.refresh();}
      }catch{if(alive)timer=setTimeout(poll,7000);}
    }
    poll();return()=>{alive=false;clearTimeout(timer);};
  },[projectId,busy,router]);
  function update(id:string,field:string,value:string){setChoices(current=>current.map(i=>i.id===id?{...i,[field]:value}:i));}
  async function generate(){
    setBusy(true);setError('');
    try{const response=await fetch(`/api/projects/${projectId}/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),images:choices,consent,whatsapp})});const data=await response.json();if(!response.ok)throw new Error(data.error);setJob({id:data.jobId,state:data.state,phase:'preparing'});waiting.current=true;}
    catch(e){setError(e instanceof Error?e.message:'לא הצלחנו להתחיל את היצירה.');}finally{setBusy(false);}
  }
  const eligible=assets.filter(a=>['image/jpeg','image/png','image/webp'].includes(a.mime_type)&&a.size_bytes<=8*1024*1024);
  return <section className="generation-panel">
    {running?<div className="generation-progress" role="status"><b>{job.phase==='preparing'?'מכינים את הבריף והתמונות…':job.phase==='saving'?'שומרים את האתר החדש…':'Gemini יוצר את העיצוב והתוכן…'}</b><p>אפשר לצאת מהעמוד ולחזור. נציג את התוצאה כאן כשהיצירה תסתיים.</p></div>:null}
    <details open={!hasVersion} className="workspace-details"><summary>{hasVersion?'יצירת כיוון חדש עם AI':'יצירת האתר הראשון שלך'}</summary><p>בחרו אילו תמונות לשלב. אפשר גם להתחיל ללא תמונות. קישור Dribbble הוא השראה בלבד; תמונת השראה מאפשרת ל־AI להבין גם את הכיוון החזותי.</p>
      {eligible.length?<div className="image-choices">{eligible.map(asset=>{const choice=choices.find(c=>c.id===asset.id);return <div className="image-choice" key={asset.id}><img src={`/api/projects/${projectId}/assets/${asset.id}`} alt="" loading="lazy" /><label className="checkbox"><input type="checkbox" checked={Boolean(choice)} disabled={busy||running} onChange={e=>setChoices(current=>e.target.checked?[...current,{id:asset.id,role:'gallery',alt:''}]:current.filter(i=>i.id!==asset.id))} />{asset.original_name}</label>{choice?<><label className="field">תפקיד<select value={choice.role} onChange={e=>update(asset.id,'role',e.target.value)}><option value="gallery">תמונה מהעסק</option><option value="hero">תמונה ראשית</option><option value="logo">לוגו</option><option value="reference">השראה בלבד — לא לפרסום</option></select></label><label className="field">תיאור קצר<input maxLength={180} value={choice.alt} onChange={e=>update(asset.id,'alt',e.target.value)} placeholder="מה רואים בתמונה?" /></label></>:null}</div>;})}</div>:<p className="small-print">עוד אין תמונות מתאימות. אפשר להעלות JPG, PNG או WebP באזור החומרים למטה.</p>}
      <label className="checkbox"><input type="checkbox" checked={whatsapp} onChange={e=>setWhatsapp(e.target.checked)} />מספר הטלפון בבריף מחובר ל־WhatsApp ואפשר לפרסם קישור אליו.</label>
      <label className="checkbox"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} />אני מאשר/ת לשלוח ל־Google Gemini את הבריף ואת התמונות שנבחרו, ויש לי הרשאה להשתמש בהן. לא כללתי מידע רגיש.</label>
      <p className="small-print">עד 6 תמונות, 8MB לתמונה ו־12MB יחד. תמונות שסומנו כהשראה נשארות פרטיות. היצירה מוגבלת ל־8 בקשות ב־24 שעות לחשבון בזמן הבטא.</p>
      <button className="generate-plan-button" type="button" onClick={generate} disabled={busy||running||!consent}>{busy||running?'היצירה בעבודה…':hasVersion?'יצירת טיוטה חדשה':'יצירת האתר עם AI'}</button>
    </details>
    {error||job?.state==='failed'?<p className="error-message" role="alert">{error||job?.error_message||'היצירה לא הסתיימה. אפשר לנסות שוב.'}</p>:null}
  </section>;
}
