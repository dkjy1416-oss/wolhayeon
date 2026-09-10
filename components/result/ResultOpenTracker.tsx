"use client";
import { useEffect } from "react";
export default function ResultOpenTracker({ token }: { token: string }) {
  useEffect(() => {
    let cancelled=false;
    const timer=window.setTimeout(async()=>{
      if (cancelled || document.visibilityState!=="visible") return;
      const key=`wolhayeon_result_open:${token}`;
      try { if (sessionStorage.getItem(key)==="1") return; } catch {}
      try {
        const res=await fetch("/api/cs/result-open",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token}),keepalive:true});
        if (res.ok) { try { sessionStorage.setItem(key,"1"); } catch {} }
      } catch {}
    },900);
    return()=>{cancelled=true;window.clearTimeout(timer);};
  },[token]);
  return null;
}
