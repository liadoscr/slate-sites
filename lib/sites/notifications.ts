import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
export function notificationsConfigured() { return Boolean(process.env.RESEND_API_KEY && process.env.LEAD_EMAIL_FROM && process.env.SLATE_SITES_APP_URL); }
export async function deliverLeadNotifications(projectId?:string) {
  if(!notificationsConfigured())return;
  const admin=createAdminClient();
  const {data:jobs,error}=await admin.rpc('slate_claim_notifications',{p_project:projectId ?? null});
  if(error)throw new Error('Could not claim notification jobs');
  await Promise.all((jobs ?? []).map(async(job:{id:string;project_id:string;lead_activity_id:string;recipient_email:string;business_name:string;attempts:number;lock_token:string})=>{
    try{
      const link=new URL(`/dashboard/projects/${job.project_id}`,process.env.SLATE_SITES_APP_URL!).toString();
      // A stable body and idempotency key prevent duplicate provider sends during retries.
      const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12_000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`slate-lead-${job.lead_activity_id}`},body:JSON.stringify({from:process.env.LEAD_EMAIL_FROM,to:[job.recipient_email],subject:'פנייה חדשה באתר שלך | Slate Sites',text:`התקבלה פנייה חדשה באתר ${job.business_name}.\n\nפרטי הפנייה זמינים בחשבון המאובטח שלך:\n${link}\n\nSlate Sites`})});
      if(!response.ok)throw new Error(`Provider HTTP ${response.status}`);
      const result=await response.json();
      if(typeof result.id!=='string')throw new Error('Missing provider receipt');
      const {error:saveError}=await admin.from('notification_outbox').update({status:'sent',provider_message_id:result.id,last_error:null,locked_until:null}).eq('id',job.id).eq('lock_token',job.lock_token);
      if(saveError)throw new Error('Could not record provider receipt');
    }catch{
      await admin.from('notification_outbox').update({status:job.attempts>=5?'failed':'pending',last_error:'Email delivery was not confirmed',locked_until:null,available_at:new Date(Date.now()+Math.min(3600,30*2**job.attempts)*1000).toISOString()}).eq('id',job.id).eq('lock_token',job.lock_token);
    }
  }));
}
