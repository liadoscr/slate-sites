import { timingSafeEqual } from 'node:crypto';
import { deliverLeadNotifications, notificationsConfigured } from '@/lib/sites/notifications';
export const runtime='nodejs';
export const maxDuration=60;
export async function GET(request:Request) {
  const expected=process.env.CRON_SECRET ? Buffer.from(`Bearer ${process.env.CRON_SECRET}`) : null;
  const actual=Buffer.from(request.headers.get('authorization')||'');
  if(!expected || actual.length!==expected.length || !timingSafeEqual(actual,expected))return Response.json({error:'Unauthorized'},{status:401});
  if(!notificationsConfigured())return Response.json({error:'Notification setup incomplete'},{status:503});
  await deliverLeadNotifications();return Response.json({ok:true});
}
