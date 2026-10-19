import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function POST(){try{const s=await createClient();await s.auth.signOut()}catch{}return NextResponse.json({ok:true})}
