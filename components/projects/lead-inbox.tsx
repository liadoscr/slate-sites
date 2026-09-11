'use client';
import { useEffect,useState } from 'react';
import { safeEmail,safePhone } from '@/lib/sites/document';
type Lead={id:string;created_at:string;details:Record<string,string>};
type Result={leads:Lead[];count:number;notifications:{lead_activity_id:string;status:string}[];notificationsConfigured:boolean};
export function LeadInbox({projectId}:{projectId:string}){
  const [page,setPage]=useState(0);const [data,setData]=useState<Result|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [reload,setReload]=useState(0);
  useEffect(()=>{let active=true;setError('');setData(null);fetch(`/api/projects/${projectId}/leads?page=${page}`,{cache:'no-store'}).then(async r=>{const result=await r.json();if(!r.ok)throw new Error(result.error);if(active)setData(result);}).catch(()=>{if(active)setError('לא הצלחנו לטעון את הפניות.');});return()=>{active=false;};},[projectId,page,reload]);
  async function update(body:Record<string,string>){setBusy(true);setError('');try{const r=await fetch(`/api/projects/${projectId}/leads`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await r.json();if(!r.ok)throw new Error(result.error);setReload(n=>n+1);}catch(e){setError(e instanceof Error?e.message:'אירעה שגיאה.');}finally{setBusy(false);}}
  return <section className="panel inbox-panel"><div className="ai-plan-heading"><div><p className="kicker">פניות מהאתר</p><h2>השיחה הבאה מתחילה כאן</h2><p>{data?`${data.count} פניות שמורות`:'טוענים את הפניות…'}</p></div><button className="secondary-action" type="button" onClick={()=>setReload(n=>n+1)}>רענון</button></div>
    {data&&!data.notificationsConfigured?<p className="setup-notice">הפניות נשמרות כאן. התראות במייל עדיין ממתינות להגדרת שירות השליחה.</p>:null}
    {error?<p className="error-message" role="alert">{error}</p>:null}
    {data?.leads.length===0?<div className="empty-ai-plan"><b>עוד אין פניות</b><p>אחרי הפרסום, הודעות מטופס יצירת הקשר יופיעו כאן.</p></div>:null}
    <ul className="lead-list">{data?.leads.map(lead=>{const delivery=data.notifications.find(n=>n.lead_activity_id===lead.id)?.status;return <li key={lead.id}><div><b>{lead.details.name}</b>{safeEmail(lead.details.email)?<a href={`mailto:${safeEmail(lead.details.email)}`} dir="ltr">{lead.details.email}</a>:null}{safePhone(lead.details.phone)?<a href={`tel:${safePhone(lead.details.phone)}`} dir="ltr">{lead.details.phone}</a>:null}<p>{lead.details.message}</p><small>{delivery==='sent'?'התראת המייל נמסרה לשירות השליחה':delivery==='failed'?'התראת המייל לא אושרה — הפנייה שמורה כאן':delivery?'התראת המייל ממתינה לשליחה':''}</small></div><div><time dateTime={lead.created_at}>{new Date(lead.created_at).toLocaleString('he-IL')}</time><label className="field">מצב הטיפול<select value={lead.details.status||'new'} disabled={busy} onChange={e=>update({leadId:lead.id,status:e.target.value})}><option value="new">חדשה</option><option value="contacted">יצרתי קשר</option><option value="completed">טופלה</option></select></label></div></li>;})}</ul>
    <div className="inbox-pagination"><button type="button" className="secondary-action" disabled={page===0} onClick={()=>setPage(n=>n-1)}>הקודמות</button><span>עמוד {page+1}</span><button type="button" className="secondary-action" disabled={!data||(page+1)*20>=data.count} onClick={()=>setPage(n=>n+1)}>הבאות</button></div>
    {data?.notificationsConfigured?<button className="quiet-button" type="button" disabled={busy} onClick={()=>update({action:'retry'})}>ניסיון שליחה לפניות שממתינות</button>:null}
  </section>;
}
