/**
 * Analytics module — GA4 + PostHog + GTM + UTM tracking.
 * HIPAA-compliant: never send PHI (names, MRNs, DOBs, etc.).
 * All IDs come from env vars so nothing is committed to source.
 */

import posthog from "posthog-js";

/* ------------------------------------------------------------------ */
/*  Environment                                                        */
/* ------------------------------------------------------------------ */

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ?? "";
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";
const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

/* ------------------------------------------------------------------ */
/*  Initialisation (call once from AnalyticsProvider)                  */
/* ------------------------------------------------------------------ */

let _initialised = false;

export function initAnalytics() {
  if (_initialised || typeof window === "undefined") return;
  _initialised = true;

  // --- PostHog ---
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      persistence: "localStorage+cookie",
      // HIPAA: mask all text and inputs by default in session recordings
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
      },
    });
  }

  // --- Google Tag Manager (loads GA4 via container) ---
  if (GTM_ID) {
    const script = document.createElement("script");
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${GTM_ID}');
    `;
    document.head.appendChild(script);
  }

  // --- GA4 fallback (if GTM not configured) ---
  if (GA4_MEASUREMENT_ID && !GTM_ID) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    }
    gtag("js", new Date());
    gtag("config", GA4_MEASUREMENT_ID, { send_page_view: true });
  }

  // --- Capture UTM params on first load ---
  captureUtmParams();
}

/* ------------------------------------------------------------------ */
/*  UTM Parameter Tracking                                             */
/* ------------------------------------------------------------------ */

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

function captureUtmParams() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const utm: UtmParams = {};

  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }

  if (Object.keys(utm).length === 0) return;

  // Persist to sessionStorage for attribution across pages
  sessionStorage.setItem("medtask_utm", JSON.stringify(utm));

  // Send to both platforms
  if (POSTHOG_KEY) posthog.register(utm);
  pushToDataLayer({ event: "utm_captured", ...utm });
}

/** Retrieve stored UTM params (for attaching to conversion events). */
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem("medtask_utm") ?? "{}");
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/*  Conversion Events                                                  */
/* ------------------------------------------------------------------ */

export type ConversionEvent =
  | "waitlist_signup"
  | "trial_start"
  | "demo_request"
  | "onboarding_completion"
  | "first_task_created";

/**
 * Fire a conversion event to GA4 + PostHog.
 * HIPAA: only pass non-PHI properties (org type, plan tier, etc.).
 */
export function trackConversion(
  event: ConversionEvent,
  properties: Record<string, string | number | boolean> = {},
) {
  const utm = getUtmParams();
  const enriched = { ...properties, ...utm };

  // PostHog
  if (POSTHOG_KEY) {
    posthog.capture(event, enriched);
  }

  // GA4 / GTM dataLayer
  pushToDataLayer({ event, ...enriched });
}

/**
 * Track a generic (non-conversion) product event.
 * HIPAA: never include PHI in properties.
 */
export function trackEvent(
  event: string,
  properties: Record<string, string | number | boolean> = {},
) {
  if (POSTHOG_KEY) posthog.capture(event, properties);
  pushToDataLayer({ event, ...properties });
}

/* ------------------------------------------------------------------ */
/*  Identity (HIPAA-safe)                                              */
/* ------------------------------------------------------------------ */

/**
 * Identify user by opaque ID only — never send name, email, MRN, DOB.
 * Safe properties: role, org_type, plan_tier.
 */
export function identifyUser(
  userId: string,
  traits: Record<string, string | number | boolean> = {},
) {
  if (POSTHOG_KEY) posthog.identify(userId, traits);
  pushToDataLayer({ event: "user_identified", user_id: userId, ...traits });
}

/** Reset identity on logout. */
export function resetAnalytics() {
  if (POSTHOG_KEY) posthog.reset();
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function pushToDataLayer(data: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}

/* ------------------------------------------------------------------ */
/*  Type augmentation                                                  */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
