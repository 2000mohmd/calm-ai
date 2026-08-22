import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createSupportThread,
  getMySupportThread,
  listMySupportThreads,
  replyToMySupportThread,
} from "@/lib/support.functions";
import { useTranslation } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/support")({
  validateSearch: z.object({ thread: z.string().uuid().optional() }),
  head: () => ({
    meta: [
      { title: "Contact support — Kalm" },
      {
        name: "description",
        content:
          "Message the Kalm team about your account, billing, or feedback, and read replies right here in the app.",
      },
      { property: "og:title", content: "Contact support — Kalm" },
      {
        property: "og:description",
        content: "Message the Kalm team about account questions and read their replies in the app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupportPage,
});

function statusTone(status: string) {
  if (status === "open") return "bg-primary/10 text-primary";
  if (status === "in_progress") return "bg-accent/20 text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function SupportPage() {
  const { t } = useTranslation();
  const { thread: activeThread } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const fetchThreads = useServerFn(listMySupportThreads);
  const fetchThread = useServerFn(getMySupportThread);
  const startThread = useServerFn(createSupportThread);
  const replyThread = useServerFn(replyToMySupportThread);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const list = useQuery({
    queryKey: ["my-support"],
    queryFn: () => fetchThreads(),
  });

  const detail = useQuery({
    queryKey: ["my-support-thread", activeThread],
    queryFn: () => fetchThread({ data: { thread_id: activeThread! } }),
    enabled: Boolean(activeThread),
    retry: false,
  });

  const create = useMutation({
    mutationFn: () => startThread({ data: { subject: subject.trim(), message: message.trim() } }),
    onSuccess: async (result) => {
      setSubject("");
      setMessage("");
      toast.success(t("supportPage.sentToast"));
      await queryClient.invalidateQueries({ queryKey: ["my-support"] });
      navigate({ search: { thread: result.thread_id } });
    },
    onError: () => toast.error(t("supportPage.sendFailedToast")),
  });

  const addReply = useMutation({
    mutationFn: () => replyThread({ data: { thread_id: activeThread!, message: reply.trim() } }),
    onSuccess: async () => {
      setReply("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-support"] }),
        queryClient.invalidateQueries({ queryKey: ["my-support-thread", activeThread] }),
      ]);
    },
    onError: () => toast.error(t("supportPage.replyFailedToast")),
  });

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl space-y-6 px-1">
        <header className="space-y-1">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5" /> {t("supportPage.help")}
          </p>
          <h1 className="font-display text-3xl">{t("supportPage.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("supportPage.subtitlePrefix")}{" "}
            <Link to="/care" className="underline">
              {t("supportPage.subtitleLink")}
            </Link>{" "}
            {t("supportPage.subtitleSuffix")}
          </p>
        </header>

        {activeThread ? (
          <section className="rounded-2xl border border-border bg-card p-5">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-3"
              onClick={() => navigate({ search: {} })}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> {t("supportPage.allMessages")}
            </Button>

            {detail.isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : detail.data ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <h2 className="font-display text-lg">{detail.data.thread.subject}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(detail.data.thread.status)}`}
                  >
                    {t(`support.status.${detail.data.thread.status}`)}
                  </span>
                </div>

                <ul className="space-y-3">
                  {detail.data.messages.map((item) => (
                    <li
                      key={item.id}
                      className={`rounded-2xl p-3 text-sm ${
                        item.sender === "admin"
                          ? "mr-6 border border-border bg-background"
                          : "ml-6 bg-primary/10"
                      }`}
                    >
                      <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {item.sender === "admin" ? t("supportPage.kalmTeam") : t("supportPage.you")}{" "}
                        · {new Date(item.created_at).toLocaleString()}
                      </p>
                      <p className="whitespace-pre-wrap">{item.content}</p>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 border-t border-border pt-3">
                  <Textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={3}
                    placeholder={t("supportPage.replyPlaceholder")}
                  />
                  <Button
                    onClick={() => addReply.mutate()}
                    disabled={reply.trim().length < 2 || addReply.isPending}
                  >
                    {addReply.isPending ? t("supportPage.sending") : t("supportPage.send")}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("supportPage.threadUnavailable")}</p>
            )}
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-display text-lg">{t("supportPage.startNewMessage")}</h2>
              <div className="mt-3 space-y-3">
                <Input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder={t("supportPage.subjectPlaceholder")}
                  maxLength={120}
                />
                <Textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  placeholder={t("supportPage.messagePlaceholder")}
                />
                <Button
                  onClick={() => create.mutate()}
                  disabled={
                    subject.trim().length < 3 || message.trim().length < 5 || create.isPending
                  }
                >
                  {create.isPending ? t("supportPage.sending") : t("supportPage.sendMessage")}
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="px-1 font-display text-lg">{t("supportPage.yourMessages")}</h2>
              {list.isLoading ? (
                <Skeleton className="h-24 w-full rounded-2xl" />
              ) : !list.data?.threads.length ? (
                <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  {t("supportPage.nothingYet")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {list.data.threads.map((thread) => (
                    <li key={thread.id}>
                      <button
                        type="button"
                        onClick={() => navigate({ search: { thread: thread.id } })}
                        className="w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/60"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">{thread.subject}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] ${statusTone(thread.status)}`}
                          >
                            {t(`support.status.${thread.status}`)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {thread.last_sender === "admin"
                            ? t("supportPage.kalmTeamPrefix")
                            : t("supportPage.youPrefix")}
                          {thread.last_message ?? "—"}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
