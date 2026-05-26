"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initAnalytics, trackEvent } from "@/lib/analytics";

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialise analytics once on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Track client-side navigations
  useEffect(() => {
    trackEvent("page_view", {
      path: pathname,
      search: searchParams.toString(),
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
