import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";

// Public and server-rendered so an App Store / Play listing can link to it.

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Calm AI" },
      {
        name: "description",
        content:
          "What Calm AI collects, who processes it, how long it is kept, and how to export or delete your data.",
      },
      { property: "og:title", content: "Privacy Policy — Calm AI" },
      {
        property: "og:description",
        content: "What Calm AI collects, who processes it, and how to export or delete your data.",
      },
    ],
  }),
  component: PrivacyPage,
});

const SECTIONS: LegalSection[] = [
  {
    heading: "What Calm AI is",
    body: (
      <p>
        Calm AI is a wellness companion. It is not therapy, it does not diagnose or treat anything,
        and it is not emergency care. You are talking to an AI, not a person. Because what you share
        can be very personal, we collect only what the app needs and we do not sell it.
      </p>
    ),
  },
  {
    heading: "What we collect",
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>
          Account: your email address and your name, or what your Google or Apple sign-in shares.
        </li>
        <li>Profile: your date of birth, used to work out your age and apply teen safeguards.</li>
        <li>
          Check-ins: mood logs, exercise completions, habits and screening questionnaire answers
          (PHQ-9 and GAD-7).
        </li>
        <li>
          Conversations: the messages you send the companion and its replies, plus short summaries
          used to remember context between chats.
        </li>
        <li>
          Voice: voice notes are transcribed to text. Live calls run on a voice service; call audio
          is not recorded, and we keep a transcript or short summary.
        </li>
        <li>Support: messages you send to our team through Support.</li>
        <li>Device: a push notification token, if you allow notifications on your phone.</li>
        <li>
          Safety: when crisis language is detected we record a safety event and alert our team so
          the right help can be offered.
        </li>
      </ul>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <p>
        To run the companion and your check-ins, to keep your experience continuous, to screen
        messages for crisis language before the companion replies, to send notifications and emails
        you have not turned off, and to keep the service secure. We do not use your data for
        advertising and we do not sell it.
      </p>
    ),
  },
  {
    heading: "Who processes your data",
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>Supabase: database and sign-in, hosted in the EU (Frankfurt) region.</li>
        <li>
          OpenRouter, and the AI model provider it routes to: receives your messages and the context
          needed to write the companion&apos;s replies, summaries and crisis checks.
        </li>
        <li>OpenAI: receives audio for voice-note transcription and for live voice calls.</li>
        <li>Resend: sends our emails, so it receives your email address and the email content.</li>
        <li>Vercel: hosts the website and the app&apos;s server functions (Frankfurt region).</li>
        <li>
          Apple and Google push services: deliver notifications to your device using your push
          token. Google and Apple also handle sign-in if you choose those options.
        </li>
      </ul>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <p>
        We keep your data until you delete it. You can delete your account data at any time and we
        will remove it from our systems; copies in provider backups expire on the provider&apos;s
        own schedule.
      </p>
    ),
  },
  {
    heading: "Your choices: export and delete",
    body: (
      <p>
        In the app, go to Profile, then Your data &amp; privacy. There you can download a copy of
        your data and delete your data and account. You can switch off emails and notifications at
        any time, and every email has an unsubscribe link.
      </p>
    ),
  },
  {
    heading: "Waitlist",
    body: (
      <p>
        If you join the notify list on our website we store your email address and the page you
        signed up from. We use it only to tell you about launches of paid plans, voice and the
        iPhone and Android apps. We keep it until you ask us to delete it or the list is closed; you
        can ask through Support in the app or by replying to any email we send. It is not shared or
        sold.
      </p>
    ),
  },
  {
    heading: "Age and guardian consent",
    body: (
      <p>
        Calm AI is not for children under 13, and you cannot create an account if you are under 13.
        If you are 13 to 17, a parent or guardian must approve your use of Calm AI, and teen mode
        applies stricter safety guardrails. Until approval is given, chat stays unavailable. We
        email the parent or guardian address you provide to ask for that approval.
      </p>
    ),
  },
  {
    heading: "Crisis and safety",
    body: (
      <p>
        If you are in danger or thinking about harming yourself, contact your local emergency number
        or a crisis line right away. Crisis resources are always available in Calm AI, without
        signing in, on the crisis resources page and inside the app.
      </p>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        Data is encrypted in transit, and access to the database is restricted by per-user access
        rules. No system is perfectly secure, so please use a device lock on your phone.
      </p>
    ),
  },
  {
    heading: "Changes",
    body: (
      <p>
        If we change this policy in a meaningful way we will update the date above and, where
        appropriate, tell you in the app.
      </p>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      updated="2026-11-18"
      intro="This policy explains what Calm AI collects about you, who helps us process it, and the control you have over it."
      sections={SECTIONS}
    />
  );
}
