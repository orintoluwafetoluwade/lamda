import { NextResponse,type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
export async function middleware(request:NextRequest){const p=request.nextUrl.pathname;if(p.startsWith("/_next/")||p==="/favicon.ico"||/\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(p))return NextResponse.next();return updateSession(request)}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
