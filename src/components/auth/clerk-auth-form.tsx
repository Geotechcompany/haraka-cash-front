import {

  ClerkFailed,

  ClerkLoaded,

  ClerkLoading,

  SignIn,

  SignUp,

} from "@clerk/tanstack-react-start";

import type { ComponentProps, ReactNode } from "react";

import { useEffect, useState } from "react";

import { getClerkAppearance } from "@/lib/clerk-appearance";
import { useTheme } from "@/lib/theme";

import {

  clerkDashboardKeysUrl,

  type ClerkKeyIssue,

  validateClerkPublishableKey,

} from "@/lib/clerk-config";



function AuthFormSpinner() {

  return (

    <div className="flex min-h-[12rem] items-center justify-center" aria-busy="true">

      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />

    </div>

  );

}



function ClerkKeySetupError({ issue }: { issue: ClerkKeyIssue }) {

  const detail =

    issue === "missing"

      ? "Set VITE_CLERK_PUBLISHABLE_KEY and CLERK_PUBLISHABLE_KEY in your .env file."

      : issue === "placeholder"

        ? "Replace the placeholder pk_test_... value with your real publishable key from the Clerk dashboard."

        : "The publishable key in .env is not a valid Clerk key.";



  return (

    <div

      role="alert"

      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"

    >

      <p className="font-semibold text-destructive">Clerk authentication is not configured</p>

      <p className="mt-2 text-muted-foreground">{detail}</p>

      <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">

        <li>

          Open{" "}

          <a

            href={clerkDashboardKeysUrl}

            target="_blank"

            rel="noopener noreferrer"

            className="font-medium text-primary underline"

          >

            Clerk API keys

          </a>

          .

        </li>

        <li>Copy the publishable key (starts with pk_test_ or pk_live_).</li>

        <li>

          Add both <code className="text-xs">VITE_CLERK_PUBLISHABLE_KEY</code> and{" "}

          <code className="text-xs">CLERK_PUBLISHABLE_KEY</code> to <code className="text-xs">.env</code>.

        </li>

        <li>Restart the dev server.</li>

      </ol>

    </div>

  );

}



function ClerkLoadError() {

  return (

    <div

      role="alert"

      className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"

    >

      <p className="font-semibold text-destructive">Could not load Clerk sign-in</p>

      <p className="mt-2 text-muted-foreground">

        Your publishable and secret keys must come from the same Clerk application. If the browser

        console shows an infinite redirect loop, re-copy both keys from the dashboard, quote them in{" "}

        <code className="text-xs">.env</code>, then restart the dev server.

      </p>

      <p className="mt-2 text-muted-foreground">

        Keys:{" "}

        <a

          href={clerkDashboardKeysUrl}

          target="_blank"

          rel="noopener noreferrer"

          className="font-medium text-primary underline"

        >

          dashboard.clerk.com

        </a>

      </p>

    </div>

  );

}



function ClientOnly({ children }: { children: ReactNode }) {

  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <AuthFormSpinner />;

  return children;

}



function ClerkAuthShell({ children }: { children: ReactNode }) {

  const keyStatus = validateClerkPublishableKey();

  if (!keyStatus.ok) return <ClerkKeySetupError issue={keyStatus.issue} />;



  return (

    <ClientOnly>

      <ClerkLoading>

        <AuthFormSpinner />

      </ClerkLoading>

      <ClerkFailed>

        <ClerkLoadError />

      </ClerkFailed>

      <ClerkLoaded>{children}</ClerkLoaded>

    </ClientOnly>

  );

}



type SignInProps = ComponentProps<typeof SignIn>;

type SignUpProps = ComponentProps<typeof SignUp>;



export function ClerkSignIn(props: SignInProps) {
  const { theme } = useTheme();

  return (
    <ClerkAuthShell>
      <SignIn appearance={getClerkAppearance(theme)} {...props} />
    </ClerkAuthShell>
  );
}



export function ClerkSignUp(props: SignUpProps) {
  const { theme } = useTheme();

  return (
    <ClerkAuthShell>
      <SignUp appearance={getClerkAppearance(theme)} {...props} />
    </ClerkAuthShell>
  );
}


