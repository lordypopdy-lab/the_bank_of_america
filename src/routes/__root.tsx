import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";


// function NotFoundComponent() {
//   return (
//     <div className="flex min-h-screen items-center justify-center bg-background px-4">
//       <div className="max-w-md text-center">
//         <h1 className="text-7xl font-bold text-foreground">404</h1>
//         <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
//         <p className="mt-2 text-sm text-muted-foreground">
//           The 333 page you're looking for doesn't exist or has been moved.
//         </p>
//         <div className="mt-6">
//           <Link
//             to="/"
//             className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
//           >
//             Go home
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }

///////// START ///////////

 const SUBSCRIBE_URL = "https://harmonweb.com";

 const styles = {
    page: {
      minHeight: "100vh",
      width: "100%",
      background: "linear-gradient(145deg, #080d18, #111b2d)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "25px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: "#fff",
      boxSizing: "border-box",
    },
    card: {
      width: "100%",
      maxWidth: "490px",
      background: "rgba(20, 31, 49, 0.95)",
      border: "1px solid rgba(255,255,255,0.09)",
      borderRadius: "20px",
      padding: "45px 35px",
      textAlign: "center",
      boxShadow: "0 25px 80px rgba(0,0,0,0.35)",
      boxSizing: "border-box",
    },
    icon: {
      width: "78px",
      height: "78px",
      borderRadius: "22px",
      background: "rgba(245, 158, 11, 0.12)",
      border: "1px solid rgba(245,158,11,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 25px",
      fontSize: "35px",
    },
    label: {
      display: "inline-block",
      padding: "7px 13px",
      borderRadius: "30px",
      background: "rgba(245,158,11,0.12)",
      color: "#fbbf24",
      fontSize: "11px",
      fontWeight: "700",
      letterSpacing: "1.2px",
      marginBottom: "18px",
    },
    heading: {
      fontSize: "29px",
      fontWeight: "750",
      margin: "0 0 15px",
      letterSpacing: "-0.8px",
    },
    description: {
      fontSize: "14px",
      color: "#9caec5",
      lineHeight: "1.8",
      margin: "0 auto 28px",
      maxWidth: "365px",
    },
    info: {
      background: "rgba(255,255,255,0.035)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: "12px",
      padding: "17px",
      marginBottom: "27px",
      textAlign: "left",
    },
    infoTitle: {
      fontSize: "13px",
      fontWeight: "700",
      marginBottom: "7px",
      color: "#e2e8f0",
    },
    infoText: {
      fontSize: "12px",
      color: "#91a2b9",
      lineHeight: "1.7",
      margin: 0,
    },
    button: {
      width: "100%",
      padding: "16px",
      border: "none",
      borderRadius: "11px",
      background: "linear-gradient(135deg, #2563eb, #3b82f6)",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "700",
      cursor: "pointer",
      boxShadow: "0 8px 25px rgba(37,99,235,0.25)",
    },
    footer: {
      fontSize: "11px",
      color: "#718096",
      marginTop: "25px",
      lineHeight: "1.7",
    },
  };


function NotFoundComponent() {
  return (
        <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.icon}>⌛</div>

        <div style={styles.label}>SUBSCRIPTION EXPIRED</div>

        <h1 style={styles.heading}>
          Your Free Hosting Has Ended
        </h1>

        <p style={styles.description}>
          Your 30-day complimentary hosting period has expired.
          To continue using your hosting services without interruption,
          please select a subscription plan.
        </p>

        <div style={styles.info}>
          <div style={styles.infoTitle}>
            What happens next?
          </div>
          <p style={styles.infoText}>
            Renew your hosting subscription through Harmon Web
            to continue enjoying your hosting services.
          </p>
        </div>

        <button
          style={styles.button}
          onClick={() => window.location.assign(SUBSCRIBE_URL)}
        >
          Subscribe Now &nbsp; →
        </button>

        <div style={styles.footer}>
          Secure subscription management powered by Harmon Web.
          <br />
          Thank you for choosing our hosting services.
        </div>
      </div>
    </div>
  );
}

//////// FINISH ////////''''


function ErrorComponent({ error, reset }: import("@tanstack/react-router").ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vaultline — Modern Digital Banking Platform" },
      {
        name: "description",
        content:
          "Vaultline is a premium digital banking experience with real-time balances, secure withdrawal requests, time-locked savings and full administrative controls.",
      },
      { property: "og:title", content: "Vaultline — Modern Digital Banking Platform" },
      {
        property: "og:description",
        content: "Vaultline is a premium digital banking experience with real-time balances, secure withdrawal requests, time-locked savings and full administrative controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Vaultline — Modern Digital Banking Platform" },
      { name: "twitter:description", content: "Vaultline is a premium digital banking experience with real-time balances, secure withdrawal requests, time-locked savings and full administrative controls." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b41e61f59aac1e640727fc68b84d283/id-preview-f8297b64--8c1ce9d0-4ba9-4b8d-becd-d3ae923b3bcb.lovable.app-1786406020844.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b41e61f59aac1e640727fc68b84d283/id-preview-f8297b64--8c1ce9d0-4ba9-4b8d-becd-d3ae923b3bcb.lovable.app-1786406020844.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}

