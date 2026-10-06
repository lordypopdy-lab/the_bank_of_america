import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { SupportThread } from "@/components/SupportThread";
import { useAuth } from "@/hooks/useAuth";
import { useMyConversation, useSupportRealtime } from "@/hooks/useSupport";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Customer Support — Vaultline Banking" },
      { name: "description", content: "Chat directly with the Vaultline support team." },
      { property: "og:title", content: "Customer Support — Vaultline Banking" },
      { property: "og:description", content: "Chat directly with the Vaultline support team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const { data: cid } = useMyConversation(profile?.id);
  useSupportRealtime(!!profile?.id);

  return (
    <AppShell title="Customer Support" subtitle="Message our team — we usually reply within a few hours.">
      <section className="surface-card overflow-hidden">
        <SupportThread
          conversationId={cid ?? null}
          viewer="user"
          onSent={() => void qc.invalidateQueries({ queryKey: ["support", "mine"] })}
        />
      </section>
    </AppShell>
  );
}
