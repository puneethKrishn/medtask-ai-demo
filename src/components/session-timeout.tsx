"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes — HIPAA §164.312(a)(2)(iii)
const WARNING_BEFORE_MS = 2 * 60 * 1000; // Show warning 2 min before timeout
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const handleTimeout = useCallback(() => {
    // Clear any sensitive client state and redirect
    setShowWarning(false);
    window.location.href = "/?session=expired";
  }, []);

  const resetTimer = useCallback(() => {
    setShowWarning(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    timerRef.current = setTimeout(handleTimeout, IDLE_TIMEOUT_MS);
  }, [handleTimeout]);

  useEffect(() => {
    resetTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [resetTimer]);

  return (
    <>
      {children}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Session Expiring</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your session will expire in 2 minutes due to inactivity.
              Move your mouse or press any key to stay signed in.
            </p>
            <button
              onClick={resetTimer}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Stay Signed In
            </button>
          </div>
        </div>
      )}
    </>
  );
}
