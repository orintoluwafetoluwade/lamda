import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000).optional()
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase auth/database is not configured." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view your projects." }, { status: 401 });
  const { data, error } = await supabase.from("projects").select("id,name,description,repository_full_name,default_branch,created_at,updated_at").order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Could not load projects. Apply the Supabase migration and check table policies." }, { status: 500 });
  return NextResponse.json({ projects: data || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase auth/database is not configured." }, { status: 503 });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to create a project." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Project name is required and must be 120 characters or fewer." }, { status: 400 });
  const { data, error } = await supabase.from("projects").insert({
    user_id: user.id,
    name: parsed.data.name,
    description: parsed.data.description || ""
  }).select("id,name,description,repository_full_name,default_branch,created_at,updated_at").single();
  if (error) return NextResponse.json({ error: "Could not save project. Apply the Supabase migration first." }, { status: 500 });
  return NextResponse.json({ project: data }, { status: 201 });
}
