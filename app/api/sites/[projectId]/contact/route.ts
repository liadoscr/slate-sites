import { createHmac } from 'node:crypto';
import { after,NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deliverLeadNotifications } from '@/lib/sites/notifications';
import { cleanText,safeEmail,safePhone,uuidPattern } from '@/lib/sites/document';
import { readJson } from '@/lib/http/request';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request,{params}:{params:Promise<{projectId:string}>}){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'בקשה לא תקינה.'},{status:403});
  const {projectId}=await params;if(!uuidPattern.test(projectId))return NextResponse.json({error:'האתר לא נמצא.'},{status:404});
  const body=await readJson(request,12000).catch(()=>null);
  if(!body)return NextResponse.json({error:'פרטי הפנייה אינם תקינים.'},{status:400});
  if(cleanText(body.website))return NextResponse.json({ok:true});
  const name=cleanText(body.name,100),email=safeEmail(body.email),phone=safePhone(body.phone),message=cleanText(body.message,2000);
  if(name.length<2||!email||message.length<2||!uuidPattern.test(body.requestId))return NextResponse.json({error:'מלאו שם, אימייל והודעה תקינים.'},{status:422});
  const admin=createAdminClient();const {data:version}=await admin.from('site_versions').select('id').eq('project_id',projectId).eq('visibility','public').limit(1).maybeSingle();
  if(!version)return NextResponse.json({error:'האתר אינו מקבל פניות כרגע.'},{status:404});
  const {data:existing}=await admin.from('project_activity').select('id').eq('id',body.requestId).eq('project_id',projectId).eq('event_type','public_contact_received').maybeSingle();
  if(existing)return NextResponse.json({ok:true});
  const ip=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const hash=createHmac('sha256',process.env.SUPABASE_SERVICE_ROLE_KEY!).update(`${projectId}:${ip}`).digest('hex');
  for(const [key,limit] of [[`lead-project:${projectId}`,100],[`lead-ip:${hash}`,5]] as const){
    const {data:allowed,error}=await admin.rpc('slate_take_limit',{p_key:key,p_limit:limit,p_seconds:900});
    if(error)return NextResponse.json({error:'הטופס אינו זמין כרגע. נסו את פרטי הקשר הישירים.'},{status:503});
    if(!allowed)return NextResponse.json({error:'נשלחו יותר מדי פניות. נסו שוב בעוד כמה דקות.'},{status:429});
  }
  const {error}=await admin.from('project_activity').insert({id:body.requestId,project_id:projectId,event_type:'public_contact_received',details:{name,email,phone:phone||null,message,status:'new',receivedAt:new Date().toISOString()}});
  if(error){
    if(error.code==='23505'){const {data:duplicate}=await admin.from('project_activity').select('id').eq('id',body.requestId).eq('project_id',projectId).eq('event_type','public_contact_received').maybeSingle();if(duplicate)return NextResponse.json({ok:true});}
    return NextResponse.json({error:'לא הצלחנו לשמור את הפנייה. נסו שוב.'},{status:502});
  }
  after(async()=>{try{await deliverLeadNotifications(projectId);}catch{console.error('Lead notification remains queued');}});
  return NextResponse.json({ok:true});
}
