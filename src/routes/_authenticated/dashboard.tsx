import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MoodSection } from "@/components/insights/MoodSection";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Calm AI home" },
      {
        name: "description",
        content: "Daily check-ins, your recent mood trend and what's coming next in Calm AI.",
      },
      { property: "og:title", content: "Your Calm AI home" },
      {
        property: "og:description",
        content: "Daily check-ins, your recent mood trend and what's coming next in Calm AI.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <AppShell>
      <MoodSection />
    </AppShell>
  );
}
