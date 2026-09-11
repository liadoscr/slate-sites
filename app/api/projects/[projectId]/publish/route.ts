import { NextResponse } from 'next/server';
import { readJson } from '@/lib/http/request';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { uuidPattern } from '@/lib/sites/document';
import { workspaceError } from '@/lib/sites/workspace-server';
type Context = { params: Promise<{ projectId: string }> };
export const runtime = 'nodejs';
async function publish(request: Request, { params }: Context, remove: boolean) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({error:'בקשה לא תקינה.'},{status:403});
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({error:'צריך להתחבר.'},{status:401});
  if (!uuidPattern.test(projectId)) return NextResponse.json({error:'לא נמצא.'},{status:404});
  try {
    const body = remove ? {} : await readJson(request);
    if (!remove && (!uuidPattern.test(body.versionId) || body.reviewed !== true)) return NextResponse.json({error:'פתחו את הגרסה הרצויה ואשרו שבדקתם אותה לפני הפרסום.'},{status:422});
    const publicUrl = `${new URL(request.url).origin}/sites/${projectId}`;
    const { error } = await createAdminClient().rpc('slate_publish_version',{p_project:projectId,p_actor:user.id,p_version:remove ? null : body.versionId,p_url:remove ? null : publicUrl});
    if (error) {
      if (/NOT_OWNER|VERSION_NOT_FOUND/.test(error.message)) return NextResponse.json({error:'הפרויקט או הגרסה לא נמצאו.'},{status:404});
      throw new Error(error.message);
    }
    return NextResponse.json({publicUrl:remove ? null : publicUrl});
  } catch(error) { const result = workspaceError(error); return NextResponse.json({error:result.error},{status:result.status}); }
}
export const POST = (request: Request, context: Context) => publish(request,context,false);
export const DELETE = (request: Request, context: Context) => publish(request,context,true);
