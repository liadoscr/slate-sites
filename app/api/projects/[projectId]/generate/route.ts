import { NextResponse } from 'next/server';
import { generateSitePlan, type SitePlanBrief } from '@/lib/ai/gemini';
import { getCurrentUser } from '@/lib/data/current-user';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ projectId: string }> };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function messageFromError(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error';
}

export async function POST(request: Request, { params }: RouteContext) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'בקשה לא תקינה.' }, { status: 403 });
  }

  const { projectId } = await params;
  if (!uuidPattern.test(projectId)) return NextResponse.json({ error: 'מזהה פרויקט לא תקין.' }, { status: 400 });

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'צריך להתחבר כדי ליצור תוכנית אתר.' }, { status: 401 });

  const supabase = await createClient();
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, business_name, business_type, location, project_briefs(business_story, primary_goal, website_copy, important_links, tone, color_preference), design_references(url, notes)')
    .eq('id', projectId)
    .single();

  if (projectError || !project) return NextResponse.json({ error: 'הפרויקט לא נמצא.' }, { status: 404 });

  const brief = Array.isArray(project.project_briefs) ? project.project_briefs[0] : project.project_briefs;
  const hasUsefulBrief = Boolean(brief?.business_story || brief?.primary_goal || brief?.website_copy);
  if (!hasUsefulBrief) {
    return NextResponse.json({ error: 'כדי ליצור תוכנית, הוסיפו לפחות סיפור עסקי, מטרת אתר או טקסט לאתר.' }, { status: 422 });
  }

  const { data: latestVersion } = await supabase
    .from('site_versions')
    .select('version_number, created_at')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestVersion && Date.now() - new Date(latestVersion.created_at).getTime() < 60_000) {
    return NextResponse.json({ error: 'כבר נוצרה תוכנית לפני פחות מדקה. אפשרו רגע לפני יצירה נוספת.' }, { status: 429 });
  }

  const references = Array.isArray(project.design_references) ? project.design_references : [];
  const input: SitePlanBrief = {
    businessName: project.business_name,
    businessType: project.business_type,
    location: project.location,
    businessStory: brief?.business_story,
    primaryGoal: brief?.primary_goal,
    websiteCopy: brief?.website_copy,
    importantLinks: brief?.important_links,
    tone: brief?.tone,
    colorPreference: brief?.color_preference,
    designReferences: references,
  };

  try {
    const { plan, model } = await generateSitePlan(input);
    const nextVersion = (latestVersion?.version_number ?? 0) + 1;
    const admin = createAdminClient();
    const { data: savedVersion, error: saveError } = await admin
      .from('site_versions')
      .insert({ project_id: projectId, version_number: nextVersion, content: plan, visibility: 'private' })
      .select('id, version_number')
      .single();

    if (saveError || !savedVersion) throw new Error('Could not save the generated plan.');

    await admin.from('project_activity').insert({
      project_id: projectId,
      actor_id: user.id,
      event_type: 'ai_site_plan_generated',
      details: { versionNumber: nextVersion, model },
    });

    return NextResponse.json({ versionId: savedVersion.id, versionNumber: savedVersion.version_number, plan });
  } catch (error) {
    const message = messageFromError(error);
    console.error('Site plan generation failed:', message);
    if (message.includes('GEMINI_API_KEY')) {
      return NextResponse.json({ error: 'שירות ה-AI עדיין לא הוגדר. נסו שוב בעוד כמה דקות.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'לא הצלחנו ליצור תוכנית כרגע. בדקו שהבריף מלא ונסו שוב.' }, { status: 502 });
  }
}
