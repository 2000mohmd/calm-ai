import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { HeroNight } from "@/components/landing/illustrations/HeroNight";
import { BreatheOutdoors } from "@/components/landing/illustrations/BreatheOutdoors";
import { WalkTogether } from "@/components/landing/illustrations/WalkTogether";
import { SleepPeace } from "@/components/landing/illustrations/SleepPeace";
import { TalkAloud } from "@/components/landing/illustrations/TalkAloud";

const SITE = "https://www.calmai.site";
const OG_IMAGE = `${SITE}/screens/chat.jpg`;
const OG_ALT =
  "Calm AI chat: the companion asks how the day went and suggests a short grounding exercise";

const MENU_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#safety", label: "Safety" },
  { href: "#plans", label: "Plans" },
];

const SCREENS = [
  {
    src: "/screens/chat.jpg",
    caption: "A calm conversation",
    alt: "A chat where Calm AI asks how the day went and suggests a three-minute grounding exercise",
  },
  {
    src: "/screens/progress.jpg",
    caption: "Your patterns",
    alt: "The patterns screen with a seven-day mood chart, habit tracker and a mood check-in",
  },
  {
    src: "/screens/exercises.jpg",
    caption: "Guided exercises",
    alt: "A list of short guided exercises: grounding, box breathing, reframing a thought, winding down for sleep",
  },
];

const STEPS = [
  {
    title: "Say what's happening",
    body: "Type it, or hold the mic and ramble. No form to fill in first.",
  },
  {
    title: "It asks, then listens",
    body: "Questions, not platitudes. It remembers what you said last time.",
  },
  {
    title: "Leave with one thing",
    body: "A three-minute exercise, or a sentence worth keeping. Not homework.",
  },
];

// Every claim here is stated in src/routes/privacy.tsx, terms.tsx or src/lib/crisis.ts.
const TRUST = [
  "Not therapy, and it says so",
  "Crisis help always free and one tap away",
  "Delete your data any time, in the app",
  "13+ · under 18 needs a parent or guardian's approval",
];

const SAFETY_CARDS = [
  { title: "Local emergency services", body: "Call the emergency number in your country." },
  { title: "findahelpline.com", body: "Free, confidential lines in your own country." },
  { title: "A human coach", body: "Request support from inside the app." },
];

const FEATURE_ROWS = [
  {
    eyebrow: "Breathing exercises",
    title: "Slow your breathing down, together",
    body: "Box breathing and 5-4-3-2-1 grounding, with a gentle circle to follow. Start one when your chest is tight, and leave whenever you like.",
    Art: BreatheOutdoors,
  },
  {
    eyebrow: "A few minutes each",
    title: "Paced for you, not for a streak",
    body: "Short sessions: reframing a thought, grounding, a quiet check-in. Leave any of them halfway, and nothing nags you to come back.",
    Art: WalkTogether,
  },
  {
    eyebrow: "Winding down",
    title: "Help getting ready for sleep",
    body: "When your mind won't settle, a wind-down exercise helps you set the day down. It's not a cure for insomnia, just a calmer way to end the night.",
    Art: SleepPeace,
  },
  {
    eyebrow: "Voice, coming soon",
    title: "Some things you can't type",
    body: "Talk out loud when typing is too much. Voice calls are coming with the paid plans. It's an AI voice, not a person, and the app tells you up front what is kept. The Privacy notice has the detail.",
    Art: TalkAloud,
  },
];

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBF6EF]";
const FOCUS_DARK =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C7A8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#4A3428]";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calm AI — Somewhere to start at 2am" },
      {
        name: "description",
        content:
          "An AI companion for the days between appointments — chat or talk, guided exercises, and mood tracking. Not therapy, and it says so.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Calm AI" },
      { property: "og:title", content: "Calm AI — Somewhere to start at 2am" },
      {
        property: "og:description",
        content:
          "An AI companion for the days between appointments. Free to start, no card. Not therapy, and it says so.",
      },
      { property: "og:url", content: `${SITE}/` },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "780" },
      { property: "og:image:height", content: "1688" },
      { property: "og:image:alt", content: OG_ALT },
      // Portrait screenshot: the small "summary" card avoids a bad crop.
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Calm AI — Somewhere to start at 2am" },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "twitter:image:alt", content: OG_ALT },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  component: Index,
});

function Logo({
  size = 26,
  bg = "#4A3428",
  fill = "#B9B3F0",
}: {
  size?: number;
  bg?: string;
  fill?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M25,27 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M48,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M25,73 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M2,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0"
        fill={fill}
      ></path>
      <circle cx="50" cy="50" r="15" fill={bg}></circle>
    </svg>
  );
}

function Section({
  id,
  labelledBy,
  className = "",
  children,
}: {
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-24 px-6 py-16 md:py-20 ${className}`}
    >
      <div className="ca-reveal mx-auto w-full max-w-[1120px]">{children}</div>
    </section>
  );
}

function SectionHead({
  id,
  title,
  lead,
  tone = "light",
}: {
  id: string;
  title: string;
  lead: string;
  tone?: "light" | "warm";
}) {
  return (
    <div className="mx-auto mb-12 max-w-[640px] text-center md:mb-16">
      <h2
        id={id}
        className="m-0 text-balance text-[clamp(30px,4.2vw,46px)] font-extrabold leading-[1.08] tracking-[-0.035em]"
        style={{ color: tone === "warm" ? "#4A3428" : "#4A3428" }}
      >
        {title}
      </h2>
      <p
        className="mx-auto mb-0 mt-4 max-w-[540px] text-pretty text-[17px] leading-[1.6]"
        style={{ color: tone === "warm" ? "#6B5244" : "#6B5244" }}
      >
        {lead}
      </p>
    </div>
  );
}

function PrimaryCta({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Link
      to="/auth"
      className={`ca-btn inline-flex min-h-[54px] items-center justify-center rounded-full px-9 text-base font-extrabold ${dark ? `shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)] hover:bg-[#F1E4D3] ${FOCUS_DARK}` : `shadow-[0_18px_40px_-18px_rgba(74,52,40,.75)] hover:bg-[#5E4538] ${FOCUS}`} ${className}`}
      style={dark ? { background: "#FBF6EF", color: "#4A3428" } : { background: "#4A3428", color: "#FBF6EF" }}
    >
      Start free
    </Link>
  );
}

function CtaBlock() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 text-center">
      <PrimaryCta />
      <p className="m-0 text-sm" style={{ color: "#6B5244" }}>
        Free to start · no card · works in your browser
      </p>
    </div>
  );
}

function Phone({
  src,
  alt,
  eager = false,
  className = "",
}: {
  src: string;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.5rem] bg-[#4A3428] p-2 shadow-[0_30px_60px_-28px_rgba(120,75,45,.6)] ring-1 ring-[#4A3428]/80 ${className}`}
    >
      <img
        src={src}
        alt={alt}
        width={780}
        height={1688}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="block h-auto w-full rounded-[2rem]"
      />
    </div>
  );
}

type WaitlistStatus = "idle" | "loading" | "success" | "error";

// POST /api/public/waitlist  { email, source }
//   200 { ok: true }  ·  400 { error }  invalid email  ·  429 { error }  rate limited  ·  other: generic
function WaitlistForm({
  source,
  tone = "light",
}: {
  source: "plans" | "final" | "footer";
  tone?: "light" | "dark";
}) {
  const uid = useId();
  const inputId = `${uid}-email`;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<WaitlistStatus>("idle");
  const [message, setMessage] = useState("");
  const dark = tone === "dark";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const generic = "Something went wrong — please try again.";
    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
        signal: controller.signal,
      });
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list. We'll only email you about the launch.");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: unknown } | null;
      const serverMsg = typeof data?.error === "string" ? data.error : "";
      setStatus("error");
      if (res.status === 400) setMessage(serverMsg || "Please enter a valid email address.");
      else if (res.status === 429)
        setMessage(serverMsg || "Too many attempts — please try again in a little while.");
      else setMessage(generic);
    } catch {
      setStatus("error");
      setMessage(generic);
    } finally {
      clearTimeout(timer);
    }
  };

  return (
    <div className="w-full">
      {status !== "success" && (
        <form onSubmit={onSubmit} noValidate={false} className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className="text-start text-sm font-semibold"
            style={{ color: dark ? "#F1E4D3" : "#4A3428" }}
          >
            Email address
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={inputId}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={status === "loading"}
              className={`min-h-12 w-full min-w-0 flex-1 rounded-full border px-5 text-base disabled:opacity-60 ${dark ? "border-white/25 bg-white/10 text-white placeholder:text-[#CBB49D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F]" : "border-[#D9C4AC] bg-white text-[#4A3428] placeholder:text-[#85705F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F]"}`}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className={`min-h-12 shrink-0 rounded-full px-6 text-[15px] font-extrabold disabled:opacity-60 ${dark ? `bg-white text-[#4A3428] hover:bg-[#F1E4D3] ${FOCUS_DARK}` : `bg-[#4A3428] text-white hover:bg-[#5E4538] ${FOCUS}`}`}
            >
              {status === "loading" ? "Sending…" : "Notify me"}
            </button>
          </div>
        </form>
      )}
      <p
        role="status"
        aria-live="polite"
        className={`m-0 text-start text-sm font-semibold ${message ? "mt-3" : ""}`}
        style={{
          color: status === "error" ? (dark ? "#ffb4b4" : "#9b2c2c") : dark ? "#F1E4D3" : "#2f6b4f",
        }}
      >
        {message}
      </p>
      {status !== "success" && (
        <p
          className="mb-0 mt-3 text-start text-[13px] leading-[1.5]"
          style={{ color: dark ? "#E9D5C0" : "#6B5244" }}
        >
          We'll only email you about the launch.{" "}
          <Link
            to="/privacy"
            className={`underline underline-offset-2 ${dark ? "text-[#F1E4D3]" : "text-[#9A4F33]"}`}
          >
            Privacy notice
          </Link>
        </p>
      )}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-[#E8D8C4]">
      <summary
        className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-start text-[17px] font-bold text-[#4A3428] [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        {q}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-45 motion-reduce:transition-none"
        >
          <path d="M9 3v12M3 9h12" stroke="#B5603F" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </summary>
      <div className="pb-5 pe-8 text-[16px] leading-[1.65]" style={{ color: "#6B5244" }}>
        {children}
      </div>
    </details>
  );
}

function Index() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile menu and returns focus to its button.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Signed-in users who land here are sent straight to the app.
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/chat", replace: true });
    });
  }, [navigate]);

  // Mobile sticky CTA: shown once the hero is out of view, hidden again while
  // the final CTA or footer is on screen. State is only set in the callback.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const els = ["ca-hero", "ca-final", "ca-footer"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const seen: Record<string, boolean> = {};
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        seen[en.target.id] = en.isIntersecting;
      });
      setShowBar(seen["ca-hero"] === false && !seen["ca-final"] && !seen["ca-footer"]);
    });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Soft scroll reveal: content is visible by default; only armed here when
  // motion is allowed, so no-JS and reduced-motion users see everything.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".ca-reveal"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add("ca-in");
          io.unobserve(en.target);
        }),
      { threshold: 0.04, rootMargin: "0px 0px -8% 0px" },
    );
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("ca-pre");
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <>
      <style>{`#ca-page{font-family:Manrope,system-ui,sans-serif}
#ca-page a{text-decoration:none}
#ca-page summary{outline:none}
@media (prefers-reduced-motion:no-preference){
.ca-orb{animation:caOrb 28s ease-in-out infinite}.ca-orb-b{animation-duration:30s;animation-delay:-14s}
.ca-breathe{animation:caBreathe 8s ease-in-out infinite}.ca-breathe-b{animation-delay:-2.6s}
.ca-pre{opacity:0;transform:translateY(18px)}
.ca-in{opacity:1;transform:none;transition:opacity 1.2s ease-out,transform 1.2s ease-out}
.ca-card{transition:transform .6s ease,box-shadow .6s ease}.ca-card:hover{transform:translateY(-4px);box-shadow:0 30px 60px -34px rgba(120,75,45,.6)}
.ca-btn{transition:transform .3s ease,background-color .3s ease}.ca-btn:hover{transform:translateY(-1px)}}
@media (prefers-reduced-motion:reduce){.ca-orb,.ca-breathe{animation:none}.ca-pre{opacity:1;transform:none}}
@keyframes caOrb{0%,100%{transform:translate(0,0) scale(1) rotate(0)}50%{transform:translate(40px,26px) scale(1.07) rotate(6deg)}}
@keyframes caBreathe{0%,100%{transform:scale(.8);opacity:.5}50%{transform:scale(1.04);opacity:1}}
.ca-hov-1:hover,.ca-hov-2:hover,.ca-hov-3:hover,.ca-hov-4:hover{color:#4A3428}
.ca-hov-5:hover{background:#5E4538}`}</style>
      <div
        id="ca-page"
        className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-0"
        style={{ width: "100%", overflowX: "clip", background: "#FBF6EF", color: "#4A3428" }}
      >
        <div
          id="ca-nav"
          style={{
            position: "sticky",
            top: "0",
            zIndex: "50",
            display: "flex",
            justifyContent: "center",
            padding: "16px 20px",
            background: "transparent",
          }}
        >
          <div
            className="gap-2 md:gap-4"
            style={{
              width: "100%",
              maxWidth: "1120px",
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              paddingInlineStart: "20px",
              borderRadius: "999px",
              background: "rgba(251,246,239,.97)",
              backdropFilter: "blur(14px)",
              border: "1px solid #E8D8C4",
              boxShadow: "0 14px 34px -24px rgba(120,75,45,.55)",
            }}
          >
            <div
              className="me-auto md:me-0"
              style={{ display: "flex", alignItems: "center", gap: "10px", flex: "none" }}
            >
              <Logo bg="#FBF6EF" fill="#D98B6A" />
              <span
                style={{
                  font: "800 17px Manrope,sans-serif",
                  color: "#4A3428",
                  letterSpacing: "-.4px",
                }}
              >
                Calm <span style={{ color: "#B5603F" }}>AI</span>
              </span>
            </div>
            <div className="hidden flex-1 flex-wrap justify-center gap-[26px] md:flex">
              <a
                href="#how"
                className="ca-hov-1"
                style={{ fontSize: "14px", fontWeight: "600", color: "#6B5244" }}
              >
                How it works
              </a>
              <a
                href="#features"
                className="ca-hov-2"
                style={{ fontSize: "14px", fontWeight: "600", color: "#6B5244" }}
              >
                Features
              </a>
              <a
                href="#safety"
                className="ca-hov-3"
                style={{ fontSize: "14px", fontWeight: "600", color: "#6B5244" }}
              >
                Safety
              </a>
              <a
                href="#plans"
                className="ca-hov-4"
                style={{ fontSize: "14px", fontWeight: "600", color: "#6B5244" }}
              >
                Plans
              </a>
            </div>
            <Link
              to="/auth"
              className="inline-flex min-h-11 items-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F]"
              style={{
                flex: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "#6B5244",
              }}
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="ca-hov-5 hidden min-h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F] md:inline-flex"
              style={{
                flex: "none",
                background: "#4A3428",
                fontSize: "14px",
                fontWeight: "700",
                color: "#FBF6EF",
              }}
            >
              Start free
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="ca-mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-[#4A3428]/10 text-[#4A3428] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F] md:hidden"
              ref={menuButtonRef}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : (
                  <path
                    d="M3 6h14M3 10h14M3 14h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </svg>
            </button>
          </div>
          <div
            id="ca-mobile-menu"
            hidden={!menuOpen}
            className="absolute inset-x-5 top-full md:hidden"
          >
            <nav
              aria-label="Sections"
              className="flex flex-col gap-1 rounded-3xl p-3 shadow-[0_26px_54px_-24px_rgba(74,52,40,.9)]"
              style={{ background: "#FBF6EF", border: "1px solid #E8D8C4" }}
            >
              {MENU_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-2xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F]"
                  style={{ fontSize: "16px", fontWeight: "600", color: "#4A3428" }}
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B5603F]"
                style={{
                  background: "#4A3428",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#FBF6EF",
                }}
              >
                Start free
              </Link>
            </nav>
          </div>
        </div>

        <main>
          {/* Hero */}
          <section
            id="ca-hero"
            aria-labelledby="hero-title"
            className="relative px-6 pb-12 pt-6 md:pb-20 md:pt-14"
          >
            {/* Organic blobs: transform only, masked so they dissolve with no hard edge */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[1000px] overflow-hidden"
              style={{
                WebkitMaskImage: "linear-gradient(to bottom,transparent 0,#000 14%,#000 40%,transparent 100%)",
                maskImage: "linear-gradient(to bottom,transparent 0,#000 14%,#000 40%,transparent 100%)",
              }}
            >
              <div
                className="ca-orb absolute -start-40 -top-32 h-[560px] w-[640px]"
                style={{
                  borderRadius: "58% 42% 61% 39% / 47% 56% 44% 53%",
                  background: "radial-gradient(circle at 40% 40%,rgba(244,199,168,.7),rgba(244,199,168,0) 70%)",
                }}
              ></div>
              <div
                className="ca-orb ca-orb-b absolute -end-32 top-10 h-[620px] w-[680px]"
                style={{
                  borderRadius: "42% 58% 39% 61% / 55% 44% 56% 45%",
                  background: "radial-gradient(circle at 55% 45%,rgba(227,165,160,.45),rgba(227,165,160,0) 70%)",
                }}
              ></div>
              <div
                className="ca-orb absolute start-1/3 top-80 h-[420px] w-[520px]"
                style={{
                  borderRadius: "55% 45% 50% 50% / 45% 55% 45% 55%",
                  background: "radial-gradient(circle,rgba(157,181,154,.35),rgba(157,181,154,0) 70%)",
                  animationDelay: "-9s",
                }}
              ></div>
            </div>

            <div className="relative mx-auto grid w-full max-w-[1120px] items-center gap-8 lg:grid-cols-[1fr_1.08fr] lg:gap-6">
              <div className="text-start">
                <p className="m-0 inline-flex items-center gap-2 rounded-full border border-[#E8D8C4] bg-white/70 px-4 py-1.5 text-[13px] font-bold text-[#9A4F33] backdrop-blur">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-[#D98B6A]"></span>
                  An AI companion, not therapy
                </p>
                <h1
                  id="hero-title"
                  className="m-0 mt-6 max-w-[600px] text-balance text-[clamp(42px,5.6vw,72px)] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#4A3428]"
                >
                  Somewhere to start at 2am
                </h1>
                <p className="mb-0 mt-6 max-w-[500px] text-pretty text-[clamp(17px,2vw,19px)] leading-[1.65] text-[#6B5244]">
                  An AI companion for the days between appointments, or before you've managed to
                  book one. Type, or actually talk. It's not therapy, and it says so.
                </p>
                <div className="mt-7 flex flex-row flex-wrap items-center gap-x-6 gap-y-2 sm:mt-9">
                  <PrimaryCta />
                  <a
                    href="#how"
                    className={`inline-flex min-h-11 items-center rounded-full text-[15px] font-bold text-[#9A4F33] underline-offset-4 hover:underline ${FOCUS}`}
                  >
                    See how it works →
                  </a>
                </div>
                <p className="mb-0 mt-4 text-sm text-[#6B5244]">
                  Free to start · no card · works in your browser
                </p>
              </div>

              <div className="relative mx-auto w-full max-w-[640px] lg:me-0 lg:ms-auto">
                <HeroNight className="block h-auto w-full drop-shadow-[0_30px_40px_rgba(120,75,45,.22)]" />
              </div>
            </div>
          </section>

          {/* Trust bar */}
          <section aria-label="Trust and safety at a glance" className="relative px-6">
            <ul className="mx-auto m-0 grid w-full max-w-[1120px] list-none gap-x-6 gap-y-4 rounded-[28px] border border-white bg-white/85 p-6 shadow-[0_24px_60px_-40px_rgba(120,75,45,.55)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:p-0">
              {TRUST.map((t) => (
                <li
                  key={t}
                  className="flex items-start gap-3 text-[14px] font-semibold leading-[1.4] text-[#4A3428] lg:items-center lg:px-7 lg:py-6 lg:[&:not(:first-child)]:border-s lg:[&:not(:first-child)]:border-[#E8D8C4]"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 18 18"
                    fill="none"
                    aria-hidden="true"
                    className="mt-px shrink-0"
                  >
                    <circle cx="9" cy="9" r="9" fill="#F1E4D3" />
                    <path
                      d="M5.5 9.2l2.4 2.4 4.6-4.9"
                      stroke="#9A4F33"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t}
                </li>
              ))}
            </ul>
          </section>

          {/* See it in action */}
          <section
            id="screens"
            aria-labelledby="screens-title"
            className="scroll-mt-24 py-20 md:py-28"
          >
            <div className="ca-reveal mx-auto w-full max-w-[1120px]">
              <div className="px-6">
                <SectionHead
                  id="screens-title"
                  title="See it in action"
                  lead="Real screens from the app: a conversation, your patterns, and short guided exercises."
                />
              </div>
              <ul className="m-0 mx-auto flex list-none snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-4 pt-2 [scrollbar-width:none] md:max-w-[960px] md:grid md:grid-cols-3 md:gap-8 md:overflow-visible [&::-webkit-scrollbar]:hidden">
                {SCREENS.map((s) => (
                  <li
                    key={s.src}
                    className="w-[62%] max-w-[260px] shrink-0 snap-center sm:w-[44%] md:w-auto md:max-w-none md:shrink"
                  >
                    <figure className="m-0 flex flex-col items-center">
                      <Phone src={s.src} alt={s.alt} className="w-full" />
                      <figcaption className="mt-5 text-center text-[15px] font-bold text-[#4A3428]">
                        {s.caption}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* How it works */}
          <Section id="how" labelledBy="how-title">
            <SectionHead
              id="how-title"
              title="Three minutes, not a twelve-week programme"
              lead="No onboarding marathon. You're talking to someone before you've finished deciding whether you want to."
            />
            <ol className="m-0 grid list-none gap-5 p-0 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="ca-card rounded-[28px] border border-white bg-white/90 p-8 shadow-[0_20px_46px_-34px_rgba(120,75,45,.5)]"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#F1E4D3] text-sm font-extrabold text-[#9A4F33]">
                    {i + 1}
                  </span>
                  <h3 className="m-0 mt-5 text-[21px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#4A3428]">
                    {s.title}
                  </h3>
                  <p className="mb-0 mt-2 text-[15px] leading-[1.6] text-[#6B5244]">{s.body}</p>
                </li>
              ))}
            </ol>
            <CtaBlock />
          </Section>

          {/* Features: illustrated rows, text and picture alternating */}
          <Section id="features" labelledBy="features-title">
            <SectionHead
              id="features-title"
              title="Everything quiet. Nothing that nags."
              lead="Chat or talk, with a few tools that stay out of your way."
            />
            <div className="grid gap-16 md:gap-24">
              {FEATURE_ROWS.map((f, i) => (
                <div
                  key={f.title}
                  className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
                >
                  <div className={i % 2 === 1 ? "md:order-2" : ""}>
                    <p className="m-0 text-[13px] font-extrabold uppercase tracking-[0.12em] text-[#9A4F33]">
                      {f.eyebrow}
                    </p>
                    <h3 className="m-0 mt-3 text-balance text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#4A3428]">
                      {f.title}
                    </h3>
                    <p className="mb-0 mt-4 max-w-[460px] text-pretty text-[17px] leading-[1.65] text-[#6B5244]">
                      {f.body}
                    </p>
                  </div>
                  <div className={i % 2 === 1 ? "md:order-1" : ""}>
                    <f.Art className="mx-auto block h-auto w-full max-w-[520px] drop-shadow-[0_24px_32px_rgba(120,75,45,.18)]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-20 grid gap-5 md:grid-cols-2">
              {[
                {
                  title: "It knows when to stop being clever",
                  body: "Every message is checked for crisis language before the companion answers. When it sees it, you get real people and real numbers.",
                },
                {
                  title: "Patterns, not streaks",
                  body: "Mood over the week and habits you chose yourself, plus PHQ-9 and GAD-7 check-ins when they're due.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="ca-card rounded-[28px] border border-[#E8D8C4] bg-[#F1E4D3]/60 p-8"
                >
                  <h3 className="m-0 text-[21px] font-extrabold leading-[1.2] tracking-[-0.02em] text-[#4A3428]">
                    {f.title}
                  </h3>
                  <p className="mb-0 mt-2 text-[15px] leading-[1.6] text-[#6B5244]">{f.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Safety */}
          <Section id="safety" labelledBy="safety-title">
            <div
              className="grid items-center gap-10 rounded-[36px] p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:gap-14 lg:p-14"
              style={{
                background: "linear-gradient(160deg,#FBEDE4,#F4DCCB)",
                border: "1px solid rgba(154,79,51,.18)",
              }}
            >
              <div>
                <h2
                  id="safety-title"
                  className="m-0 text-balance text-[clamp(28px,4.2vw,40px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#4A3428]"
                >
                  You don't have to hold this alone
                </h2>
                <p className="mb-0 mt-4 max-w-[560px] text-[17px] leading-[1.6] text-[#6B5244]">
                  Calm AI is wellness support, not therapy, not a diagnosis, not emergency care. If
                  you're in danger, please use one of these instead. Crisis resources are always
                  free.
                </p>
                <ul className="m-0 mt-7 grid list-none gap-3 p-0">
                  {SAFETY_CARDS.map((c) => (
                    <li
                      key={c.title}
                      className="rounded-[20px] border border-[rgba(154,79,51,.16)] bg-white/90 px-5 py-4"
                    >
                      <div className="text-[19px] font-extrabold tracking-[-0.02em] text-[#4A3428]">
                        {c.title}
                      </div>
                      <div className="mt-1 text-[14px] leading-[1.5] text-[#6B5244]">{c.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
              <Phone
                src="/screens/crisis.jpg"
                alt="Calm AI crisis help screen: call your local emergency number, or find a free helpline in your country at findahelpline.com"
                className="mx-auto w-[min(250px,70%)]"
              />
            </div>
          </Section>

          {/* Plans */}
          <Section id="plans" labelledBy="plans-title">
            <SectionHead
              id="plans-title"
              title="Free to start. More on the way."
              lead="Start with a first conversation, free. Paid plans are still being built, and crisis resources are free for everyone."
            />
            <div className="grid items-stretch gap-5 md:grid-cols-2">
              <div className="flex flex-col rounded-[32px] border border-white bg-white/90 p-8">
                <h3 className="m-0 text-[15px] font-bold uppercase tracking-[0.1em] text-[#6B5244]">
                  Free
                </h3>
                <p className="mb-0 mt-3 text-[40px] font-extrabold leading-none tracking-[-0.04em] text-[#4A3428]">
                  Free{" "}
                  <span className="text-[15px] font-medium tracking-normal text-[#6B5244]">
                    available now
                  </span>
                </p>
                <p className="mb-0 mt-3 text-[15px] leading-[1.55] text-[#6B5244]">
                  A first conversation with Calm AI after setup. No card needed.
                </p>
                <ul className="m-0 mt-6 grid list-none gap-3 p-0 text-[15px] text-[#4A3428]">
                  {[
                    "Companion chat",
                    "Guided exercises",
                    "Mood and habit tracking",
                    "Crisis resources, always free",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <span aria-hidden="true" className="font-bold text-[#B5603F]">
                        ·
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="min-h-6 flex-1"></div>
                <PrimaryCta className="mt-6 w-full" />
              </div>

              <div className="flex flex-col rounded-[32px] bg-[#4A3428] p-8 shadow-[0_34px_74px_-40px_rgba(74,52,40,.85)]">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="m-0 text-[15px] font-bold uppercase tracking-[0.1em] text-[#E9D5C0]">
                    Paid plans
                  </h3>
                  <span className="rounded-full bg-[rgba(158,161,230,.22)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[#F1E4D3]">
                    Coming soon
                  </span>
                </div>
                <p className="mb-0 mt-3 text-[clamp(26px,3.4vw,32px)] font-extrabold leading-[1.1] tracking-[-0.03em] text-white">
                  More, when you want it
                </p>
                <p className="mb-0 mt-3 text-[15px] leading-[1.55] text-[#E9D5C0]">
                  Get notified when paid plans, voice calls and the iPhone and Android apps launch.
                  Nothing to buy yet, and we'll say so here when that changes.
                </p>
                <div className="min-h-6 flex-1"></div>
                <div className="mt-6">
                  <WaitlistForm source="plans" tone="dark" />
                </div>
              </div>
            </div>
          </Section>

          {/* FAQ */}
          <Section id="faq" labelledBy="faq-title">
            <SectionHead
              id="faq-title"
              title="Questions, answered plainly"
              lead="The short version. The Privacy notice and Terms have the full detail."
            />
            <div className="mx-auto max-w-[760px] border-t border-[#E8D8C4]">
              <Faq q="Is Calm AI therapy?">
                <p className="m-0">
                  No. Calm AI is wellness support: somewhere to think things through, with short
                  exercises and mood tracking. It doesn't diagnose or treat anything, it isn't a
                  substitute for a doctor or therapist, and it is not emergency care.
                </p>
              </Faq>
              <Faq q="Is it free?">
                <p className="m-0">
                  Free to start, and no card is needed. The free plan has a daily message limit.
                  Paid plans are planned but not launched, and no prices have been announced. Join
                  the list in the Plans section to hear when that changes.
                </p>
              </Faq>
              <Faq q="Is my data private?">
                <p className="m-0">
                  The{" "}
                  <Link
                    to="/privacy"
                    className="font-semibold text-[#9A4F33] underline underline-offset-2"
                  >
                    Privacy notice
                  </Link>{" "}
                  lists what we collect, which services process it, and how long it is kept. You can
                  download or delete your data and account at any time in the app, under Profile,
                  Your data &amp; privacy.
                </p>
              </Faq>
              <Faq q="Can I use it on my phone?">
                <p className="m-0">
                  Yes. It works in your phone's browser today. iPhone and Android apps are coming
                  soon.
                </p>
              </Faq>
              <Faq q="What happens if I'm in crisis?">
                <p className="m-0">
                  Crisis resources are always free and easy to find in the app. Every message is
                  checked for crisis language before the companion answers, and Calm AI points you
                  to real people rather than trying to handle it itself. If you're in danger, call
                  your local emergency number.
                </p>
              </Faq>
              <Faq q="Who can use it?">
                <p className="m-0">
                  You must be 13 or older. If you're under 18, a parent or guardian needs to approve
                  your use of Calm AI.
                </p>
              </Faq>
              <Faq q="What's behind the AI?">
                <p className="m-0">
                  AI language models from third-party providers, which the{" "}
                  <Link
                    to="/privacy"
                    className="font-semibold text-[#9A4F33] underline underline-offset-2"
                  >
                    Privacy notice
                  </Link>{" "}
                  names. Calm AI is an AI, not a person, it says so, and it can make mistakes.
                </p>
              </Faq>
            </div>
          </Section>

          {/* Final CTA */}
          <section
            id="ca-final"
            aria-labelledby="final-title"
            className="scroll-mt-24 px-6 pb-20 pt-4 md:pb-28"
          >
            <div
              className="ca-reveal relative mx-auto flex w-full max-w-[1120px] flex-col items-center overflow-hidden rounded-[40px] px-6 py-16 text-center sm:px-14 md:py-24"
              style={{ background: "linear-gradient(160deg,#5A3A2C,#4A3428 55%,#6A4333)" }}
            >
              <div
                aria-hidden="true"
                className="ca-orb pointer-events-none absolute -start-32 -top-32 size-[420px] rounded-full opacity-60"
                style={{ background: "radial-gradient(circle,rgba(217,139,106,.5),transparent 65%)" }}
              ></div>
              <div
                aria-hidden="true"
                className="ca-orb ca-orb-b pointer-events-none absolute -bottom-40 -end-24 size-[460px] rounded-full opacity-60"
                style={{ background: "radial-gradient(circle,rgba(227,165,160,.35),transparent 65%)" }}
              ></div>
              <h2
                id="final-title"
                className="relative m-0 max-w-[640px] text-balance text-[clamp(34px,5vw,56px)] font-extrabold leading-[1.05] tracking-[-0.035em] text-white"
              >
                Talk tonight. It's free to start.
              </h2>
              <p className="relative mb-0 mt-5 max-w-[480px] text-pretty text-[18px] leading-[1.55] text-[#F1E4D3]">
                Set up in a minute, then start talking. No card, no streak to keep alive.
              </p>
              <div className="relative mt-9 flex flex-col items-center gap-3">
                <PrimaryCta tone="dark" />
                <p className="m-0 text-sm text-[#E9D5C0]">
                  Free to start · no card · works in your browser
                </p>
              </div>
              <div className="relative mt-12 w-full max-w-[460px] border-t border-white/15 pt-8">
                <p className="m-0 mb-4 text-[15px] font-semibold text-white">
                  Not ready? Get notified when the iPhone and Android apps launch.
                </p>
                <WaitlistForm source="final" tone="dark" />
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer id="ca-footer" className="px-6 pb-6">
          <div className="mx-auto w-full max-w-[1120px] rounded-[36px] bg-[#4A3428] p-8 sm:p-12">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <div className="flex items-center gap-[10px]">
                  <Logo />
                  <span className="text-[18px] font-extrabold tracking-[-0.02em] text-white">
                    Calm <span className="text-[#B9B3F0]">AI</span>
                  </span>
                </div>
                <p className="mb-0 mt-4 max-w-[300px] text-[14px] leading-[1.6] text-[#E9D5C0]">
                  Calm AI is wellness support, not therapy or emergency care.
                </p>
                <p className="mb-0 mt-3 text-[14px] text-[#E9D5C0]">
                  iPhone and Android apps coming soon.
                </p>
              </div>
              <nav aria-label="Product">
                <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#CBB49D]">
                  Product
                </h2>
                <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                  {MENU_LINKS.map((l) => (
                    <li key={l.href}>
                      <a
                        href={l.href}
                        className={`inline-flex min-h-11 items-center text-[14px] text-white/85 hover:text-white ${FOCUS_DARK}`}
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav aria-label="Legal">
                <h2 className="m-0 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[#CBB49D]">
                  Legal
                </h2>
                <ul className="m-0 mt-3 grid list-none gap-1 p-0">
                  <li>
                    <Link
                      to="/privacy"
                      className={`inline-flex min-h-11 items-center text-[14px] text-white/85 hover:text-white ${FOCUS_DARK}`}
                    >
                      Privacy notice
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/terms"
                      className={`inline-flex min-h-11 items-center text-[14px] text-white/85 hover:text-white ${FOCUS_DARK}`}
                    >
                      Terms
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
              <span className="font-mono text-[11px] tracking-[0.12em] text-[#CBB49D]">
                CALMAI.SITE · © 2026
              </span>
              <span className="text-[13px] text-[#E9D5C0]">
                In crisis? Call your local emergency number.
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile sticky CTA */}
      {showBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8D8C4] bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
          <Link
            to="/auth"
            className={`flex min-h-12 w-full items-center justify-center rounded-full text-[16px] font-extrabold hover:bg-[#5E4538] ${FOCUS}`}
            style={{ background: "#4A3428", color: "#fff" }}
          >
            Start free — no card
          </Link>
        </div>
      )}
    </>
  );
}
