import { createFileRoute } from "@tanstack/react-router";
import { LegalDocument, type LegalSection } from "@/components/LegalDocument";

// Public and server-rendered so an App Store / Play listing can link to it.

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — Kalm" },
      {
        name: "description",
        content: "The rules for using Kalm, what it is and is not, and your responsibilities.",
      },
      { property: "og:title", content: "Terms of Use — Kalm" },
      {
        property: "og:description",
        content: "The rules for using Kalm, what it is and is not.",
      },
    ],
  }),
  component: TermsPage,
});

const SECTIONS: LegalSection[] = [
  {
    heading: "Using Kalm",
    body: (
      <p>
        By creating an account or using Kalm you agree to these terms and to our Privacy Policy. If
        you do not agree, please do not use the service.
      </p>
    ),
  },
  {
    heading: "Kalm is not medical care",
    body: (
      <p>
        Kalm is wellness support. It is not therapy, it does not give medical advice, diagnosis or
        treatment, and it is not a substitute for a doctor, a therapist or emergency services. The
        companion is an AI, not a person, and it can make mistakes. Screening questionnaires track
        patterns over time and are not a diagnosis. Please do not delay or ignore professional
        advice because of something Kalm said.
      </p>
    ),
  },
  {
    heading: "In an emergency",
    body: (
      <p>
        If you are in danger or may harm yourself or someone else, call your local emergency number
        or a crisis line immediately. Crisis resources are always free and available in Kalm.
      </p>
    ),
  },
  {
    heading: "Who can use it",
    body: (
      <p>
        You must be at least 13. If you are under 18, a parent or guardian must approve your use of
        Kalm. You are responsible for keeping your sign-in secure and for the accuracy of the
        details you give us.
      </p>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <ul className="list-disc space-y-1 ps-5">
        <li>Do not use Kalm to harm yourself or others, or to break the law.</li>
        <li>
          Do not try to break, probe or overload the service, or access other people&apos;s data.
        </li>
        <li>Do not use automated tools to scrape the service or copy its content.</li>
        <li>
          Do not misuse the support or human-coach channels, including impersonation or abuse.
        </li>
      </ul>
    ),
  },
  {
    heading: "Plans and payments",
    body: (
      <p>
        Kalm currently has a free plan with a daily message limit. If paid plans are introduced,
        their price and what they include will be announced before launch and nothing will be
        charged without your clear agreement.
      </p>
    ),
  },
  {
    heading: "Availability and limits",
    body: (
      <p>
        We work to keep Kalm available but we do not promise it will always be uninterrupted or
        error-free, and features can change. To the extent the law allows, Kalm is provided as it is
        and we are not liable for indirect or consequential loss arising from your use of it.
        Nothing in these terms limits rights you have under law that cannot be limited.
      </p>
    ),
  },
  {
    heading: "Ending your use",
    body: (
      <p>
        You can stop using Kalm and delete your data and account at any time from Profile, Your data
        &amp; privacy. We may suspend or end access if these terms are broken or to protect
        people&apos;s safety.
      </p>
    ),
  },
  {
    heading: "Changes",
    body: (
      <p>
        We may update these terms. We will change the date above, and keep using Kalm after an
        update means you accept the new version.
      </p>
    ),
  },
];

function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Use"
      updated="2026-11-17"
      intro="These terms set out the rules for using Kalm, an AI wellness companion."
      sections={SECTIONS}
    />
  );
}
