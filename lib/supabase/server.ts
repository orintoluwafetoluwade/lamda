import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
type CookieWrite = { name: string; value: string; options?: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2] };
export async function createClient(){const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error("Supabase URL and public key are required.");return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(items:CookieWrite[]){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{/* Middleware handles session refresh. */}}}})}
export async function getCurrentUser(){try{const s=await createClient();const {data:{user},error}=await s.auth.getUser();return error?null:user}catch{return null}}
