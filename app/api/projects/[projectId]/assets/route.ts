import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/data/current-user';
import { createClient } from '@/lib/supabase/server';
import { cleanText, uuidPattern } from '@/lib/sites/document';
import { imageMime, workspaceError } from '@/lib/sites/workspace-server';

export const runtime = 'nodejs';
type Context = { params: Promise<{ projectId: string }> };
const maximumFile = 4 * 1024 * 1024;
async function ownedClient(projectId: string) {
  const user = await getCurrentUser();
  if (!user || !uuidPattern.test(projectId)) return null;
  const client = await createClient();
  const { data } = await client.from('projects').select('id').eq('id', projectId).eq('owner_id', user.id).maybeSingle();
  return data ? client : null;
}
export async function GET(_request: Request, { params }: Context) {
  const { projectId } = await params;
  const client = await ownedClient(projectId);
  if (!client) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  try {
    const { data, error } = await client.from('project_assets').select('id,original_name,mime_type,size_bytes,storage_path')
      .eq('project_id', projectId).order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    const assets = await Promise.all((data ?? []).map(async asset => {
      if (!asset.storage_path.startsWith(`${projectId}/`) || asset.storage_path.includes('..')) return { ...asset, url: null };
      const { data: signed } = await client.storage.from('project-assets').createSignedUrl(asset.storage_path, 1800);
      return { ...asset, url: signed?.signedUrl ?? null };
    }));
    return NextResponse.json({ assets }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { const result = workspaceError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export async function POST(request: Request, { params }: Context) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  const { projectId } = await params;
  const client = await ownedClient(projectId);
  if (!client) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });
  try {
    // Bound multipart bytes before parsing; Content-Length is not trusted.
    if (!request.body) throw new Error('בחרו תמונה להעלאה.');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > maximumFile + 64 * 1024) { await reader.cancel(); return NextResponse.json({ error: 'העלו תמונה בגודל עד 4MB.' }, { status: 413 }); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    const form = await new Response(bytes, { headers: { 'Content-Type': request.headers.get('content-type') ?? '' } }).formData();
    const file = form.get('file');
    const role = form.get('role');
    const alt = cleanText(form.get('alt'), 180);
    if (!(file instanceof File) || !file.size || file.size > maximumFile) throw new Error('העלו תמונה בגודל עד 4MB.');
    if (typeof role !== 'string' || !['reference', 'logo', 'hero', 'gallery'].includes(role) || !alt) throw new Error('בחרו שימוש בתמונה והוסיפו תיאור קצר.');
    const imageBytes = Buffer.from(await file.arrayBuffer());
    const mime = imageMime(imageBytes);
    if (!mime) throw new Error('העלו תמונת JPG, PNG או WebP בלבד.');
    const { count, error: countError } = await client.from('project_assets').select('id', { count: 'exact', head: true }).eq('project_id', projectId);
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) >= 60) throw new Error('ספריית הפרויקט מלאה. השתמשו בתמונות שכבר הועלו.');
    const id = crypto.randomUUID();
    const path = `${projectId}/${role === 'reference' ? 'reference' : 'business'}/${id}`;
    const { error: uploadError } = await client.storage.from('project-assets').upload(path, imageBytes, { contentType: mime, upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    const asset = { id, project_id: projectId, storage_path: path, original_name: cleanText(file.name, 180) || 'image', mime_type: mime, size_bytes: file.size };
    const { error: saveError } = await client.from('project_assets').insert(asset);
    if (saveError) {
      await client.storage.from('project-assets').remove([path]);
      throw new Error(saveError.message);
    }
    const { data: signed } = await client.storage.from('project-assets').createSignedUrl(path, 1800);
    return NextResponse.json({ asset: { ...asset, url: signed?.signedUrl ?? null }, image: { id, role, alt } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { const result = workspaceError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
