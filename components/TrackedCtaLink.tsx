"use client";

import Link from "next/link";
import { trackEvent, type FunnelEvent } from "@/lib/analytics";

export default function TrackedCtaLink({
  href,
  event,
  placement,
  className,
  children,
  tabIndex,
}: {
  href: string;
  event: FunnelEvent;
  placement?: string;
  className?: string;
  children: React.ReactNode;
  tabIndex?: number;
}) {
  return (
    <Link
      href={href}
      className={className}
      tabIndex={tabIndex}
      onClick={() => trackEvent(event, placement ? { placement } : undefined)}
    >
      {children}
    </Link>
  );
}
