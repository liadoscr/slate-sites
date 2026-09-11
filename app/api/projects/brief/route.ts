import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanText,safeEmail,safePhone,uuidPattern } from '@/lib/sites/document';
import { workspaceError } from '@/lib/sites/workspace-server';
import { readJson } from '@/lib/http/request';
export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'בקשה לא תקינה.'},{status:403});
  const user=await getCurrentUser();if(!user)return NextResponse.json({error:'צריך להתחבר.'},{status:401});
  try{
    const body=await readJson(request);if(!uuidPattern.test(body.projectId))return NextResponse.json({error:'מזהה לא תקין.'},{status:422});
    const fields:Record<string,number>={businessName:120,businessType:120,location:120,contactEmail:254,contactPhone:40,businessStory:2500,primaryGoal:500,websiteCopy:4000,importantLinks:1200,tone:160,colors:160,designNotes:1000,designUrl:500};
    const data=Object.fromEntries(Object.entries(fields).map(([key,max])=>[key,cleanText(body[key],max)]));
    if(data.businessName.length<2)throw new Error('הוסיפו שם עסק באורך שתי אותיות לפחות.');
    if(data.contactEmail&&!safeEmail(data.contactEmail))throw new Error('האימייל לפרסום באתר אינו תקין.');
    if(data.contactPhone&&!safePhone(data.contactPhone))throw new Error('מספר הטלפון לפרסום באתר אינו תקין.');
    data.contactEmail=safeEmail(data.contactEmail);data.contactPhone=safePhone(data.contactPhone);
    if(data.designUrl){let url:URL;try{url=new URL(data.designUrl);}catch{throw new Error('קישור ההשראה אינו תקין.');}if(url.protocol!=='https:'||url.username||url.password)throw new Error('הוסיפו קישור HTTPS ללא פרטי התחברות.');data.designUrl=url.toString();}
    const {data:id,error}=await createAdminClient().rpc('slate_save_brief',{p_project:body.projectId,p_actor:user.id,p_data:data});
    if(error)throw new Error(error.message);
    return NextResponse.json({projectId:id});
  }catch(error){const result=workspaceError(error);return NextResponse.json({error:result.error},{status:result.status});}
}
