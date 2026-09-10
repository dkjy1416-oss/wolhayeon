import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { RESULT_TOKEN_RE, canShowResult } from "@/lib/result-access";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req: Request) {
  const body=(await req.json().catch(()=>null)) as {token?:string}|null; const token=body?.token??"";
  if(!RESULT_TOKEN_RE.test(token)) return new NextResponse(null,{status:204});
  try {
    const supabase=getSupabaseAdmin();
    const r=await supabase.from("ritual_results").select("order_id, approved_at, reviewed_content").eq("result_token",token).maybeSingle();
    if(r.error||!r.data) return new NextResponse(null,{status:204});
    const o=await supabase.from("ritual_orders").select("payment_status, generation_status, review_status, result_open_count, result_first_opened_at").eq("id",r.data.order_id).maybeSingle();
    if(o.error||!o.data||!canShowResult(r.data,o.data)) return new NextResponse(null,{status:204});
    const now=new Date().toISOString();
    await supabase.from("ritual_orders").update({result_first_opened_at:o.data.result_first_opened_at??now,result_last_opened_at:now,result_open_count:(o.data.result_open_count??0)+1}).eq("id",r.data.order_id);
  } catch {}
  return new NextResponse(null,{status:204});
}
