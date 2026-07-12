"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "haraka-cookie-consent";

type ConsentChoice = "all" | "essential";

function readConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "all" || value === "essential") return value;
  } catch {
    /* private mode / blocked storage */
  }
  return null;
}

function writeConsent(choice: ConsentChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* ignore */
  }
}

export function CookieConsentBanner() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    setReady(true);
  }, []);

  if (!ready || !open) return null;

  const choose = (choice: ConsentChoice) => {
    writeConsent(choice);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-lg rounded-2xl border bg-background p-4 shadow-elevated sm:inset-x-auto sm:bottom-5 sm:left-5 sm:right-auto sm:p-5"
    >
      <p id="cookie-consent-title" className="font-display text-sm font-semibold text-foreground">
        Cookies on HarakaCash
      </p>
      <p id="cookie-consent-desc" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        We use essential cookies for sign-in and session security. We may also store a preference
        cookie for theme and this consent choice. See our{" "}
        <Link to="/privacy" className="font-medium text-foreground underline underline-offset-2">
          Privacy policy
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" className="rounded-xl" onClick={() => choose("all")}>
          Accept
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-xl"
          onClick={() => choose("essential")}
        >
          Essential only
        </Button>
      </div>
    </div>
  );
}
