import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(50000),
  model: z.string().max(120).optional()
});

async function getAuthorizedProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { supabase: null, user: null, error: "not_configured" as const };
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { supabase, user: null, error: "unauthorized" as const };
  const { data: project, error: projectError } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (projectError || !project) return { supabase, user, error: "not_found" as const };
  return { supabase, user, error: null };
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await getAuthorizedProject(id);
  if (access.error === "not_configured") return NextResponse.json({ error: "Supabase auth/database is not configured." }, { status: 503 });
  if (access.error === "unauthorized") return NextResponse.json({ error: "Sign in to view messages." }, { status: 401 });
  if (access.error) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  const { data, error } = await access.supabase!.from("messages").select("id,role,content,model,created_at").eq("project_id", id).order("created_at", { ascending: true }).limit(500);
  if (error) return NextResponse.json({ error: "Could not load project messages. Apply the Supabase migration first." }, { status: 500 });
  return NextResponse.json({ messages: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const access = await getAuthorizedProject(id);
  if (access.error === "not_configured") return NextResponse.json({ error: "Supabase auth/database is not configured." }, { status: 503 });
  if (access.error === "unauthorized") return NextResponse.json({ error: "Sign in to save messages." }, { status: 401 });
  if (access.error) return NextResponse.json({ error: "Project not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message content is required and must be 50,000 characters or fewer." }, { status: 400 });
  const { data, error } = await access.supabase!.from("messages").insert({
    project_id: id,
    user_id: access.user!.id,
    role: parsed.data.role,
    content: parsed.data.content,
    model: parsed.data.model || null
  }).select("id,role,content,model,created_at").single();
  if (error) return NextResponse.json({ error: "Could not save message. Apply the Supabase migration and verify row-level policies." }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}
