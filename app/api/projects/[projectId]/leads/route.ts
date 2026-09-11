import { after, NextResponse } from 'next/server';
import { readJson } from '@/lib/http/request';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverLeadNotifications, notificationsConfigured } from '@/lib/sites/notifications';
import { uuidPattern } from '@/lib/sites/document';
type Context={params:Promise<{projectId:string}>};
async function owns(projectId:string){
  if(!uuidPattern.test(projectId)||!await getCurrentUser())return false;
  const {data}=await (await createClient()).from('projects').select('id').eq('id',projectId).maybeSingle();return Boolean(data);
}
export async function GET(request:Request,{params}:Context){
  const {projectId}=await params;if(!await owns(projectId))return NextResponse.json({error:'לא נמצא.'},{status:404});
  const page=Math.floor(Math.max(0,Math.min(10000,Number(new URL(request.url).searchParams.get('page'))||0)));
  const client=await createClient();const {data:leads,count,error}=await client.from('project_activity').select('id,details,created_at',{count:'exact'}).eq('project_id',projectId).eq('event_type','public_contact_received').order('created_at',{ascending:false}).range(page*20,page*20+19);
  if(error)return NextResponse.json({error:'לא הצלחנו לטעון פניות.'},{status:502});
  const admin=createAdminClient();const {data:notifications}=await admin.from('notification_outbox').select('lead_activity_id,status,attempts').eq('project_id',projectId).in('lead_activity_id',(leads??[]).map(l=>l.id));
  return NextResponse.json({leads,count,notifications:notifications??[],notificationsConfigured:notificationsConfigured()},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request,{params}:Context){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'בקשה לא תקינה.'},{status:403});
  const {projectId}=await params;if(!await owns(projectId))return NextResponse.json({error:'לא נמצא.'},{status:404});
  const body=await readJson(request).catch(()=>null);const admin=createAdminClient();
  if(body?.action==='retry'){
    if(!notificationsConfigured())return NextResponse.json({error:'שליחת מייל עדיין לא הוגדרה. הפניות שמורות בתיבה.'},{status:503});
    after(async()=>{try{await deliverLeadNotifications(projectId);}catch{console.error('Lead notification retry failed');}});
    return NextResponse.json({ok:true});
  }
  if(!body||!uuidPattern.test(body.leadId)||!['new','contacted','completed'].includes(body.status))return NextResponse.json({error:'סטטוס לא תקין.'},{status:422});
  const {data:lead}=await (await createClient()).from('project_activity').select('details').eq('id',body.leadId).eq('project_id',projectId).eq('event_type','public_contact_received').single();
  if(!lead)return NextResponse.json({error:'לא נמצא.'},{status:404});
  const {error}=await admin.from('project_activity').update({details:{...lead.details,status:body.status}}).eq('id',body.leadId).eq('project_id',projectId);
  return error?NextResponse.json({error:'לא הצלחנו לשמור את הסטטוס.'},{status:502}):NextResponse.json({ok:true});
}
