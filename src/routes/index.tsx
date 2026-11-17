import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const MENU_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#safety", label: "Safety" },
  { href: "#plans", label: "Plans" },
];

const SCREENS = [
  {
    src: "/screens/welcome.jpg",
    caption: "Welcome",
    alt: "Calm AI welcome screen: a quiet place to think out loud, with sign-in by email link, Google or Apple",
  },
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

// Not-yet-published store badge: deliberately not a link.
function SoonPill({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <span
      aria-disabled="true"
      className="inline-flex min-h-11 cursor-default select-none items-center rounded-full px-4 text-[13px] font-semibold"
      style={
        dark
          ? { background: "rgba(255,255,255,.08)", color: "#c9cbf2" }
          : { background: "rgba(255,255,255,.7)", border: "1px solid #fff", color: "#4a4c6b" }
      }
    >
      {label}
    </span>
  );
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calm AI — Somewhere to start at 2am" },
      {
        name: "description",
        content:
          "An AI companion for the days between appointments — chat or talk, guided exercises, and mood tracking. Not therapy, and it says so.",
      },
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

function Index() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Scroll-reveal + shrinking-nav enhancement, ported from the design mock.
  // Purely cosmetic — skipped entirely for prefers-reduced-motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const page = document.getElementById("ca-page");
    const nav = document.getElementById("ca-nav");
    if (!page || !nav) return;

    const blocks = (Array.from(page.children) as HTMLElement[]).filter((c) => c !== nav);
    if (!blocks.length) return;

    const units: Array<[HTMLElement, number]> = [];
    blocks.forEach((block) => {
      const grid = block.querySelector<HTMLElement>('div[style*="grid-template-columns"]');
      const kids =
        grid && grid.children.length > 1 ? (Array.from(grid.children) as HTMLElement[]) : null;
      if (kids) {
        const head = (Array.from(block.children) as HTMLElement[]).filter(
          (c) => c !== grid && !c.contains(grid),
        );
        head.forEach((h) => units.push([h, 0]));
        kids.forEach((k, i) => units.push([k, i * 90]));
      } else {
        units.push([block, 0]);
      }
    });

    units.forEach(([el, delay]) => {
      el.dataset["caDelay"] = String(delay);
      el.style.opacity = "0";
      el.style.transform = "translateY(26px)";
      el.style.willChange = "opacity, transform";
    });

    const reveal = (el: HTMLElement) => {
      if (el.dataset["caShown"]) return;
      el.dataset["caShown"] = "1";
      setTimeout(
        () => {
          el.style.transition =
            "opacity .85s cubic-bezier(.2,.8,.2,1), transform .85s cubic-bezier(.2,.8,.2,1)";
          el.style.opacity = "1";
          el.style.transform = "none";
          setTimeout(() => {
            el.style.willChange = "auto";
          }, 900);
        },
        Number(el.dataset["caDelay"] || 0),
      );
    };

    const pill = nav.querySelector<HTMLElement>(":scope > div");
    nav.style.transition = "padding .4s cubic-bezier(.2,.8,.2,1)";
    if (pill) pill.style.transition = "box-shadow .4s, background .4s";

    const update = () => {
      const h = window.innerHeight;
      units.forEach(([el]) => {
        if (el.dataset["caShown"]) return;
        const r = el.getBoundingClientRect();
        if (r.top < h * 0.9 && r.bottom > 0) reveal(el);
      });
      const past = window.scrollY > 40;
      nav.style.padding = past ? "10px 20px" : "16px 20px";
      if (pill) {
        pill.style.boxShadow = past
          ? "0 26px 54px -24px rgba(23,23,40,.9)"
          : "0 18px 40px -22px rgba(23,23,40,.8)";
      }
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    let raf: number | undefined;
    if (typeof requestAnimationFrame === "function") {
      const tick = () => {
        update();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    const failsafe = setTimeout(() => units.forEach(([el]) => reveal(el)), 2500);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(failsafe);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <>
      <style>{`#ca-page{font-family:Manrope,system-ui,sans-serif}
#ca-page a{color:#5b60c4;text-decoration:none}
#ca-page a:hover{color:#3f4499}
@keyframes caBreathe{0%,100%{transform:scale(.95)}50%{transform:scale(1.06)}}
@keyframes caFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes caDrift{0%{transform:translate(-50%,0) scale(1)}50%{transform:translate(-50%,26px) scale(1.08)}100%{transform:translate(-50%,0) scale(1)}}
@keyframes caOrb{0%{transform:translate(0,0) scale(1)}33%{transform:translate(28px,-18px) scale(1.06)}66%{transform:translate(-22px,14px) scale(.96)}100%{transform:translate(0,0) scale(1)}}
@keyframes caSheen{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(320%) skewX(-18deg)}}
@keyframes caRing{0%{opacity:.5;transform:scale(.9)}70%{opacity:0;transform:scale(1.35)}100%{opacity:0;transform:scale(1.35)}}
.ca-hov-1:hover{color:#fff}
.ca-hov-2:hover{color:#fff}
.ca-hov-3:hover{color:#fff}
.ca-hov-4:hover{color:#fff}
.ca-hov-5:hover{background:#dedef6}
.ca-hov-6:hover{transform:translateY(-2px)}
.ca-hov-7:hover{transform:translateY(-2px)}
.ca-hov-8:hover{transform:translateY(-6px);box-shadow:0 30px 60px -34px rgba(90,95,180,.6)}
.ca-hov-9:hover{transform:translateY(-6px);box-shadow:0 30px 60px -34px rgba(90,95,180,.6)}
.ca-hov-10:hover{transform:translateY(-6px);box-shadow:0 30px 60px -34px rgba(90,95,180,.6)}
.ca-hov-11:hover{transform:translateY(-6px);box-shadow:0 34px 66px -32px rgba(90,95,180,.8)}
.ca-hov-12:hover{transform:translateY(-6px);box-shadow:0 34px 66px -32px rgba(90,95,180,.8)}
.ca-hov-13:hover{transform:translateY(-6px);box-shadow:0 34px 66px -32px rgba(90,95,180,.8)}
.ca-hov-14:hover{transform:translateY(-5px);box-shadow:0 28px 56px -34px rgba(90,95,180,.7)}
.ca-hov-15:hover{transform:translateY(-5px);box-shadow:0 28px 56px -34px rgba(90,95,180,.7)}
.ca-hov-16:hover{transform:translateY(-4px);box-shadow:0 24px 48px -32px rgba(143,59,59,.45)}
.ca-hov-17:hover{transform:translateY(-4px);box-shadow:0 24px 48px -32px rgba(143,59,59,.45)}
.ca-hov-18:hover{transform:translateY(-4px);box-shadow:0 24px 48px -32px rgba(143,59,59,.45)}
.ca-hov-19:hover{transform:translateY(-6px);box-shadow:0 34px 66px -34px rgba(90,95,180,.7)}
.ca-hov-20:hover{background:rgba(23,23,40,.12)}
.ca-hov-21:hover{transform:translateY(-8px);box-shadow:0 46px 90px -30px rgba(23,23,40,.95)}
.ca-hov-22:hover{background:#dedef6}
.ca-hov-23:hover{transform:translateY(-6px);box-shadow:0 34px 66px -34px rgba(90,95,180,.7)}
.ca-hov-24:hover{background:#2a2a42}
.ca-hov-25:hover{transform:translateY(-2px)}
.ca-hov-26:hover{transform:translateY(-2px)}
.ca-hov-27:hover{transform:translateY(-2px)}
.ca-hov-28:hover{transform:translateY(-2px)}
.ca-hov-29:hover{background:#dedef6}
.ca-hov-30:hover{color:#fff}
.ca-hov-31:hover{color:#fff}
.ca-hov-32:hover{color:#fff}
.ca-hov-33:hover{color:#fff}
.ca-hov-34:hover{color:#fff}
.ca-hov-35:hover{color:#fff}
.ca-hov-36:hover{color:#fff}
.ca-hov-37:hover{color:#fff}
.ca-hov-38:hover{color:#fff}
.ca-hov-39:hover{color:#fff}
.ca-hov-40:hover{color:#fff}`}</style>
      <div id="ca-page" style={{ width: "100%", overflowX: "clip", background: "#f4f4fb" }}>
        <div
          id="ca-nav"
          style={{
            position: "sticky",
            top: "0",
            zIndex: "50",
            display: "flex",
            justifyContent: "center",
            padding: "16px 20px",
            background: "linear-gradient(180deg,rgba(244,244,251,.95),rgba(244,244,251,0))",
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
              background: "rgba(23,23,40,.94)",
              boxShadow: "0 18px 40px -22px rgba(23,23,40,.8)",
            }}
          >
            <div
              className="me-auto md:me-0"
              style={{ display: "flex", alignItems: "center", gap: "10px", flex: "none" }}
            >
              <svg width="26" height="26" viewBox="0 0 100 100">
                <path
                  d="M25,27 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M48,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M25,73 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M2,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0"
                  fill="#9ea1e6"
                ></path>
                <circle cx="50" cy="50" r="15" fill="#171728"></circle>
              </svg>
              <span
                style={{
                  font: "800 17px Manrope,sans-serif",
                  color: "#fff",
                  letterSpacing: "-.4px",
                }}
              >
                Calm <span style={{ color: "#9ea1e6" }}>AI</span>
              </span>
            </div>
            <div className="hidden flex-1 flex-wrap justify-center gap-[26px] md:flex">
              <a
                href="#how"
                className="ca-hov-1"
                style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,.72)" }}
              >
                How it works
              </a>
              <a
                href="#features"
                className="ca-hov-2"
                style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,.72)" }}
              >
                Features
              </a>
              <a
                href="#safety"
                className="ca-hov-3"
                style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,.72)" }}
              >
                Safety
              </a>
              <a
                href="#plans"
                className="ca-hov-4"
                style={{ fontSize: "14px", fontWeight: "600", color: "rgba(255,255,255,.72)" }}
              >
                Plans
              </a>
            </div>
            <Link
              to="/auth"
              className="inline-flex min-h-11 items-center rounded-full px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ea1e6]"
              style={{
                flex: "none",
                fontSize: "14px",
                fontWeight: "600",
                color: "rgba(255,255,255,.72)",
              }}
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="ca-hov-5 hidden min-h-11 items-center rounded-full px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ea1e6] md:inline-flex"
              style={{
                flex: "none",
                background: "#fff",
                fontSize: "14px",
                fontWeight: "700",
                color: "#171728",
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
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border-0 bg-white/10 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ea1e6] md:hidden"
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
              className="flex flex-col gap-1 rounded-3xl p-3 shadow-[0_26px_54px_-24px_rgba(23,23,40,.9)]"
              style={{ background: "rgba(23,23,40,.97)" }}
            >
              {MENU_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex min-h-11 items-center rounded-2xl px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ea1e6]"
                  style={{ fontSize: "16px", fontWeight: "600", color: "rgba(255,255,255,.88)" }}
                >
                  {l.label}
                </a>
              ))}
              <Link
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="mt-2 flex min-h-12 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9ea1e6]"
                style={{
                  background: "#fff",
                  fontSize: "15px",
                  fontWeight: "700",
                  color: "#171728",
                }}
              >
                Start free
              </Link>
            </nav>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "48px 24px 0",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-260px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(1100px,150vw)",
              height: "760px",
              borderRadius: "50%",
              background: "radial-gradient(circle,rgba(143,148,224,.34),transparent 62%)",
              animation: "caDrift 22s ease-in-out infinite",
            }}
          ></div>
          <div
            style={{
              position: "relative",
              display: "flex",
              flexWrap: "nowrap",
              justifyContent: "center",
              alignItems: "center",
              gap: "9px",
              padding: "8px 16px",
              borderRadius: "999px",
              background: "rgba(255,255,255,.86)",
              border: "1px solid #fff",
              boxShadow: "0 10px 26px -18px rgba(90,95,180,.6)",
            }}
          >
            <div
              style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#5b60c4" }}
            ></div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: "600",
                color: "#3f4160",
                whiteSpace: "nowrap",
              }}
            >
              Free to start — no card
            </span>
          </div>
          <h1
            style={{
              position: "relative",
              margin: "22px 0 0",
              font: "800 clamp(38px,6.4vw,74px) Manrope,sans-serif",
              color: "#171728",
              letterSpacing: "-2.6px",
              lineHeight: "1.02",
              maxWidth: "860px",
              textWrap: "pretty",
            }}
          >
            Somewhere to start
            <br />
            at 2am
          </h1>
          <p
            style={{
              position: "relative",
              margin: "20px 0 0",
              fontSize: "clamp(16px,2.1vw,21px)",
              lineHeight: "1.55",
              color: "#4a4c6b",
              maxWidth: "600px",
              textWrap: "pretty",
            }}
          >
            An AI companion for the days between appointments — or before you've managed to book
            one. Type, or actually talk. It's not therapy, and it says so.
          </p>
          <div
            style={{
              position: "relative",
              marginTop: "30px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "center",
            }}
          >
            <Link
              to="/auth"
              className="ca-hov-6"
              style={{
                transition: "transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s",
                display: "inline-flex",
                alignItems: "center",
                minHeight: "52px",
                padding: "0 30px",
                borderRadius: "999px",
                background: "#171728",
                boxShadow: "0 18px 40px -20px rgba(23,23,40,.8)",
                font: "800 16px Manrope,sans-serif",
                color: "#fff",
              }}
            >
              Start free on the web
            </Link>
          </div>
          <div
            style={{
              position: "relative",
              marginTop: "14px",
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <SoonPill label="Coming soon on iPhone" />
            <SoonPill label="Coming soon on Android" />
          </div>
          <div
            style={{
              position: "relative",
              marginTop: "14px",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "14px", color: "#4a4c6b" }}>Free to start — no card.</span>
            <a href="#how" style={{ fontSize: "14px", fontWeight: "700", color: "#5b60c4" }}>
              See how it works →
            </a>
          </div>
        </div>

        <section
          id="screens"
          aria-labelledby="screens-title"
          className="flex flex-col items-center pb-2 pt-14 sm:pt-20"
        >
          <div className="relative w-full max-w-[1120px]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute start-1/2 top-1/2 h-[420px] w-[min(900px,140%)] -translate-y-1/2 -translate-x-1/2 rounded-full rtl:translate-x-1/2"
              style={{
                background: "radial-gradient(circle,rgba(143,148,224,.28),transparent 64%)",
              }}
            ></div>
            <div className="relative px-6 text-center">
              <h2
                id="screens-title"
                style={{
                  margin: "0",
                  font: "800 clamp(28px,4.2vw,46px) Manrope,sans-serif",
                  color: "#171728",
                  letterSpacing: "-1.6px",
                  lineHeight: "1.08",
                }}
              >
                See it in action
              </h2>
              <p
                style={{
                  margin: "12px auto 0",
                  fontSize: "17px",
                  lineHeight: "1.6",
                  color: "#4a4c6b",
                  maxWidth: "480px",
                }}
              >
                Real screens from the app.
              </p>
            </div>
            <ul className="relative m-0 mt-10 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-8 pt-2 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:pb-4 [&::-webkit-scrollbar]:hidden">
              {SCREENS.map((s, i) => (
                <li
                  key={s.src}
                  className="w-[62%] max-w-[260px] shrink-0 snap-center sm:w-[44%] lg:w-auto lg:max-w-none lg:shrink"
                >
                  <figure className="m-0 flex flex-col items-center">
                    <div className="w-full rounded-[2.5rem] bg-[#171728] p-2 shadow-[0_30px_60px_-28px_rgba(70,74,150,.6)] ring-1 ring-[#171728]/80">
                      <img
                        src={s.src}
                        alt={s.alt}
                        width={780}
                        height={1688}
                        loading={i === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="block h-auto w-full rounded-[2rem]"
                      />
                    </div>
                    <figcaption className="mt-4 text-center text-[15px] font-bold text-[#171728]">
                      {s.caption}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div
          id="how"
          style={{
            padding: "clamp(72px,10vw,124px) 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "1120px" }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                whiteSpace: "nowrap",
                alignItems: "center",
                gap: "8px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.9)",
                border: "1px solid #fff",
                font: "500 11px IBM Plex Mono,monospace",
                color: "#4a4c6b",
                letterSpacing: ".14em",
              }}
            >
              HOW IT WORKS
            </div>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                gap: "24px",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  margin: "0",
                  font: "800 clamp(28px,4.2vw,46px) Manrope,sans-serif",
                  color: "#171728",
                  letterSpacing: "-1.6px",
                  lineHeight: "1.08",
                  maxWidth: "560px",
                  textWrap: "pretty",
                }}
              >
                Three minutes, not a<br />
                twelve-week programme
              </h2>
              <p
                style={{
                  margin: "0",
                  fontSize: "17px",
                  lineHeight: "1.6",
                  color: "#4a4c6b",
                  maxWidth: "380px",
                }}
              >
                No onboarding marathon. You're talking to someone before you've finished deciding
                whether you want to.
              </p>
            </div>
            <div
              style={{
                marginTop: "36px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))",
                gap: "18px",
              }}
            >
              <div
                className="ca-hov-8"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "28px",
                  padding: "28px",
                  background: "linear-gradient(160deg,#e9e9f9,#dcdcf4)",
                  minHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <span
                  style={{
                    font: "500 12px IBM Plex Mono,monospace",
                    color: "#5b60c4",
                    letterSpacing: ".14em",
                  }}
                >
                  01
                </span>
                <div
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "22px 0",
                  }}
                >
                  <div
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "26px",
                      background: "#fff",
                      boxShadow: "0 16px 34px -18px rgba(90,95,180,.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "14px",
                        height: "24px",
                        borderRadius: "7px",
                        background: "#5b60c4",
                      }}
                    ></div>
                  </div>
                </div>
                <div
                  style={{
                    font: "800 22px Manrope,sans-serif",
                    color: "#171728",
                    letterSpacing: "-.6px",
                  }}
                >
                  Say what's happening
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "15px",
                    lineHeight: "1.55",
                    color: "#4a4c6b",
                  }}
                >
                  Type it, or hold the mic and ramble. No form to fill in first.
                </p>
              </div>
              <div
                className="ca-hov-9"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "28px",
                  padding: "28px",
                  background: "linear-gradient(160deg,#efe9f9,#e4dcf4)",
                  minHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <span
                  style={{
                    font: "500 12px IBM Plex Mono,monospace",
                    color: "#5b60c4",
                    letterSpacing: ".14em",
                  }}
                >
                  02
                </span>
                <div
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "22px 0",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "96px",
                      height: "96px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: "0",
                        borderRadius: "50%",
                        background: "radial-gradient(circle,rgba(255,255,255,.95),transparent 70%)",
                        animation: "caBreathe 6s ease-in-out infinite",
                      }}
                    ></div>
                    <svg
                      width="52"
                      height="52"
                      viewBox="0 0 100 100"
                      style={{ position: "relative" }}
                    >
                      <path
                        d="M25,27 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M48,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M25,73 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M2,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0"
                        fill="#8f94e0"
                      ></path>
                      <circle cx="50" cy="50" r="15" fill="#eae4f7"></circle>
                    </svg>
                  </div>
                </div>
                <div
                  style={{
                    font: "800 22px Manrope,sans-serif",
                    color: "#171728",
                    letterSpacing: "-.6px",
                  }}
                >
                  It asks, then listens
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "15px",
                    lineHeight: "1.55",
                    color: "#4a4c6b",
                  }}
                >
                  Questions, not platitudes. It remembers what you said last time.
                </p>
              </div>
              <div
                className="ca-hov-10"
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "28px",
                  padding: "28px",
                  background: "linear-gradient(160deg,#e9f0f9,#dce6f4)",
                  minHeight: "300px",
                  display: "flex",
                  flexDirection: "column",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <span
                  style={{
                    font: "500 12px IBM Plex Mono,monospace",
                    color: "#5b60c4",
                    letterSpacing: ".14em",
                  }}
                >
                  03
                </span>
                <div
                  style={{
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "22px 0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      width: "100%",
                      maxWidth: "170px",
                    }}
                  >
                    <div
                      style={{
                        height: "14px",
                        borderRadius: "7px",
                        background: "rgba(91,96,196,.85)",
                      }}
                    ></div>
                    <div
                      style={{
                        height: "14px",
                        borderRadius: "7px",
                        background: "rgba(91,96,196,.5)",
                        width: "78%",
                      }}
                    ></div>
                    <div
                      style={{
                        height: "14px",
                        borderRadius: "7px",
                        background: "rgba(91,96,196,.3)",
                        width: "52%",
                      }}
                    ></div>
                  </div>
                </div>
                <div
                  style={{
                    font: "800 22px Manrope,sans-serif",
                    color: "#171728",
                    letterSpacing: "-.6px",
                  }}
                >
                  Leave with one thing
                </div>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "15px",
                    lineHeight: "1.55",
                    color: "#4a4c6b",
                  }}
                >
                  A three-minute exercise, or a sentence worth keeping. Not homework.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          id="features"
          style={{
            padding: "clamp(72px,10vw,124px) 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "1120px" }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                whiteSpace: "nowrap",
                alignItems: "center",
                gap: "8px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.9)",
                border: "1px solid #fff",
                font: "500 11px IBM Plex Mono,monospace",
                color: "#4a4c6b",
                letterSpacing: ".14em",
              }}
            >
              FEATURES
            </div>
            <h2
              style={{
                margin: "20px 0 0",
                font: "800 clamp(28px,4.2vw,46px) Manrope,sans-serif",
                color: "#171728",
                letterSpacing: "-1.6px",
                lineHeight: "1.08",
                maxWidth: "620px",
                textWrap: "pretty",
              }}
            >
              Everything quiet. Nothing that nags.
            </h2>

            <div
              style={{
                marginTop: "36px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,320px),1fr))",
                gap: "18px",
              }}
            >
              <div
                style={{
                  borderRadius: "32px",
                  padding: "34px",
                  background: "#171728",
                  display: "flex",
                  flexDirection: "column",
                  gap: "26px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "-140px",
                    right: "-100px",
                    width: "420px",
                    height: "420px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle,rgba(140,145,225,.3),transparent 66%)",
                    animation: "caOrb 24s ease-in-out infinite",
                  }}
                ></div>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      font: "500 11px IBM Plex Mono,monospace",
                      color: "#9ea1e6",
                      letterSpacing: ".14em",
                    }}
                  >
                    LIVE CALLS
                  </span>
                  <div
                    style={{
                      marginTop: "14px",
                      font: "800 clamp(24px,3vw,34px) Manrope,sans-serif",
                      color: "#fff",
                      letterSpacing: "-1.2px",
                      lineHeight: "1.08",
                    }}
                  >
                    Some things you
                    <br />
                    can't type
                  </div>
                  <p
                    style={{
                      margin: "12px 0 0",
                      fontSize: "16px",
                      lineHeight: "1.55",
                      color: "#9ea1e6",
                      maxWidth: "380px",
                    }}
                  >
                    Talk out loud when typing is too much, with live captions throughout. Our
                    Privacy notice says exactly what is kept.
                  </p>
                </div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    marginBottom: "-90px",
                  }}
                >
                  <div
                    style={{
                      width: "min(240px,70%)",
                      borderRadius: "34px",
                      padding: "8px",
                      background: "linear-gradient(160deg,#3a3a55,#22223a)",
                      boxShadow: "0 30px 60px -22px rgba(0,0,0,.7)",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "27px",
                        overflow: "hidden",
                        background: "#f4f4fb",
                        aspectRatio: "736/1600",
                      }}
                    >
                      <img
                        src="/shots/incall.jpeg"
                        alt="Calm AI live call"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "top",
                          display: "block",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
                <div
                  className="ca-hov-11"
                  style={{
                    borderRadius: "28px",
                    padding: "28px",
                    background: "rgba(255,255,255,.88)",
                    border: "1px solid #fff",
                    boxShadow: "0 20px 46px -34px rgba(90,95,180,.5)",
                    transition:
                      "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  <span
                    style={{
                      font: "500 11px IBM Plex Mono,monospace",
                      color: "#5b60c4",
                      letterSpacing: ".14em",
                    }}
                  >
                    CRISIS SCREENING
                  </span>
                  <div
                    style={{
                      marginTop: "12px",
                      font: "800 22px Manrope,sans-serif",
                      color: "#171728",
                      letterSpacing: "-.6px",
                    }}
                  >
                    It knows when to stop being clever
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "15px",
                      lineHeight: "1.55",
                      color: "#4a4c6b",
                    }}
                  >
                    Every message is checked for crisis language before the companion answers. When
                    it sees it, you get real humans and real numbers.
                  </p>
                </div>
                <div
                  className="ca-hov-12"
                  style={{
                    borderRadius: "28px",
                    padding: "28px",
                    background: "rgba(255,255,255,.88)",
                    border: "1px solid #fff",
                    boxShadow: "0 20px 46px -34px rgba(90,95,180,.5)",
                    transition:
                      "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  <span
                    style={{
                      font: "500 11px IBM Plex Mono,monospace",
                      color: "#5b60c4",
                      letterSpacing: ".14em",
                    }}
                  >
                    GUIDED EXERCISES
                  </span>
                  <div
                    style={{
                      marginTop: "12px",
                      font: "800 22px Manrope,sans-serif",
                      color: "#171728",
                      letterSpacing: "-.6px",
                    }}
                  >
                    A few minutes each, paced for you
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "15px",
                      lineHeight: "1.55",
                      color: "#4a4c6b",
                    }}
                  >
                    Box breathing, 5-4-3-2-1 grounding, reframing a thought, winding down for sleep.
                    Leave any of them halfway.
                  </p>
                </div>
                <div
                  className="ca-hov-13"
                  style={{
                    borderRadius: "28px",
                    padding: "28px",
                    background: "rgba(255,255,255,.88)",
                    border: "1px solid #fff",
                    boxShadow: "0 20px 46px -34px rgba(90,95,180,.5)",
                    transition:
                      "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                  }}
                >
                  <span
                    style={{
                      font: "500 11px IBM Plex Mono,monospace",
                      color: "#5b60c4",
                      letterSpacing: ".14em",
                    }}
                  >
                    PATTERNS, NOT STREAKS
                  </span>
                  <div
                    style={{
                      marginTop: "12px",
                      font: "800 22px Manrope,sans-serif",
                      color: "#171728",
                      letterSpacing: "-.6px",
                    }}
                  >
                    PHQ-9 and GAD-7, when they're due
                  </div>
                  <p
                    style={{
                      margin: "8px 0 0",
                      fontSize: "15px",
                      lineHeight: "1.55",
                      color: "#4a4c6b",
                    }}
                  >
                    Mood over the week and habits you chose yourself, all in one place.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "clamp(72px,10vw,120px) 24px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1120px",
              borderRadius: "36px",
              padding: "clamp(32px,5vw,56px)",
              background: "linear-gradient(160deg,#eeeefb,#dedef6)",
              border: "1px solid #fff",
            }}
          >
            <h2
              style={{
                margin: "0",
                font: "800 clamp(26px,3.6vw,40px) Manrope,sans-serif",
                color: "#171728",
                letterSpacing: "-1.4px",
                lineHeight: "1.08",
                maxWidth: "520px",
                textWrap: "pretty",
              }}
            >
              The basics, plainly
            </h2>
            <div
              style={{
                marginTop: "36px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,180px),1fr))",
                gap: "24px",
              }}
            >
              <div>
                <div
                  style={{
                    font: "800 clamp(34px,5vw,52px) Manrope,sans-serif",
                    color: "#5b60c4",
                    letterSpacing: "-2px",
                    lineHeight: "1",
                  }}
                >
                  Free
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    color: "#3f4160",
                  }}
                >
                  to start: a first conversation, no card
                </div>
              </div>
              <div>
                <div
                  style={{
                    font: "800 clamp(34px,5vw,52px) Manrope,sans-serif",
                    color: "#5b60c4",
                    letterSpacing: "-2px",
                    lineHeight: "1",
                  }}
                >
                  Always
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    color: "#3f4160",
                  }}
                >
                  free crisis resources, on every plan
                </div>
              </div>
              <div>
                <div
                  style={{
                    font: "800 clamp(34px,5vw,52px) Manrope,sans-serif",
                    color: "#5b60c4",
                    letterSpacing: "-2px",
                    lineHeight: "1",
                  }}
                >
                  3
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "15px",
                    lineHeight: "1.5",
                    color: "#3f4160",
                  }}
                >
                  languages — English, العربية, Français
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            padding: "clamp(72px,10vw,120px) 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "1120px" }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                whiteSpace: "nowrap",
                alignItems: "center",
                gap: "8px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.9)",
                border: "1px solid #fff",
                font: "500 11px IBM Plex Mono,monospace",
                color: "#4a4c6b",
                letterSpacing: ".14em",
              }}
            >
              THE VOICE
            </div>
            <h2
              style={{
                margin: "20px 0 0",
                font: "800 clamp(28px,4.2vw,46px) Manrope,sans-serif",
                color: "#171728",
                letterSpacing: "-1.6px",
                lineHeight: "1.08",
                maxWidth: "600px",
                textWrap: "pretty",
              }}
            >
              What it actually sounds like
            </h2>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: "17px",
                lineHeight: "1.6",
                color: "#4a4c6b",
                maxWidth: "560px",
              }}
            >
              Real lines from the app — no affirmations, no exclamation marks, no pretending to be
              your therapist.
            </p>
            <div
              style={{
                marginTop: "34px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))",
                gap: "18px",
              }}
            >
              <div
                className="ca-hov-14"
                style={{
                  borderRadius: "26px",
                  padding: "28px",
                  background: "rgba(255,255,255,.9)",
                  border: "1px solid #fff",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    font: "800 clamp(19px,2.3vw,23px) Manrope,sans-serif",
                    color: "#171728",
                    letterSpacing: "-.5px",
                    lineHeight: "1.35",
                  }}
                >
                  "So the week has been running you, more than you've been running it."
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    font: "500 11px IBM Plex Mono,monospace",
                    color: "#5b60c4",
                    letterSpacing: ".12em",
                  }}
                >
                  MID-CALL, 10:07PM
                </div>
              </div>
              <div style={{ borderRadius: "26px", padding: "28px", background: "#171728" }}>
                <div
                  style={{
                    font: "800 clamp(19px,2.3vw,23px) Manrope,sans-serif",
                    color: "#fff",
                    letterSpacing: "-.5px",
                    lineHeight: "1.35",
                  }}
                >
                  "Take your time. I'm still here."
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    font: "500 11px IBM Plex Mono,monospace",
                    color: "#9ea1e6",
                    letterSpacing: ".12em",
                  }}
                >
                  WHEN YOU GO QUIET MID-SENTENCE
                </div>
              </div>
              <div
                className="ca-hov-15"
                style={{
                  borderRadius: "26px",
                  padding: "28px",
                  background: "rgba(255,255,255,.9)",
                  border: "1px solid #fff",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    font: "800 clamp(19px,2.3vw,23px) Manrope,sans-serif",
                    color: "#171728",
                    letterSpacing: "-.5px",
                    lineHeight: "1.35",
                  }}
                >
                  "Let's take it apart together. What's the thought, word for word?"
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    font: "500 11px IBM Plex Mono,monospace",
                    color: "#5b60c4",
                    letterSpacing: ".12em",
                  }}
                >
                  STARTING A THOUGHT RECORD
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="safety"
          style={{
            padding: "clamp(72px,10vw,120px) 24px 0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1120px",
              borderRadius: "36px",
              padding: "clamp(32px,5vw,52px)",
              background: "linear-gradient(160deg,#fdf6f3,#f4ebe7)",
              border: "1px solid rgba(143,59,59,.12)",
            }}
          >
            <span
              style={{
                font: "500 11px IBM Plex Mono,monospace",
                color: "#7a5f57",
                letterSpacing: ".14em",
              }}
            >
              IF IT'S HEAVIER THAN AN APP
            </span>
            <h2
              style={{
                margin: "16px 0 0",
                font: "800 clamp(26px,3.6vw,40px) Manrope,sans-serif",
                color: "#3a2521",
                letterSpacing: "-1.4px",
                lineHeight: "1.08",
                maxWidth: "520px",
                textWrap: "pretty",
              }}
            >
              You don't have to hold this alone
            </h2>
            <p
              style={{
                margin: "14px 0 0",
                fontSize: "17px",
                lineHeight: "1.6",
                color: "#6d534c",
                maxWidth: "620px",
              }}
            >
              Calm AI is wellness support — not therapy, not a diagnosis, not emergency care. If
              you're in danger, please use one of these instead.
            </p>
            <div
              style={{
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))",
                gap: "14px",
              }}
            >
              <div
                className="ca-hov-16"
                style={{
                  borderRadius: "22px",
                  padding: "22px 24px",
                  background: "rgba(255,255,255,.92)",
                  border: "1px solid rgba(143,59,59,.14)",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    font: "800 21px Manrope,sans-serif",
                    color: "#5b3d36",
                    letterSpacing: "-.5px",
                  }}
                >
                  Local emergency services
                </div>
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#7a5f57",
                  }}
                >
                  Call the emergency number in your country · 24/7
                </div>
              </div>
              <div
                className="ca-hov-17"
                style={{
                  borderRadius: "22px",
                  padding: "22px 24px",
                  background: "rgba(255,255,255,.92)",
                  border: "1px solid rgba(143,59,59,.14)",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    font: "800 21px Manrope,sans-serif",
                    color: "#5b3d36",
                    letterSpacing: "-.5px",
                  }}
                >
                  Talk to a human coach
                </div>
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#7a5f57",
                  }}
                >
                  Request support right in the app
                </div>
              </div>
              <div
                className="ca-hov-18"
                style={{
                  borderRadius: "22px",
                  padding: "22px 24px",
                  background: "rgba(255,255,255,.92)",
                  border: "1px solid rgba(143,59,59,.14)",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    font: "800 21px Manrope,sans-serif",
                    color: "#5b3d36",
                    letterSpacing: "-.5px",
                  }}
                >
                  findahelpline.com
                </div>
                <div
                  style={{
                    marginTop: "5px",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#7a5f57",
                  }}
                >
                  A free line in your own country
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="plans"
          style={{
            padding: "clamp(72px,10vw,120px) 24px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "1120px" }}>
            <div
              style={{
                display: "inline-flex",
                alignSelf: "flex-start",
                whiteSpace: "nowrap",
                alignItems: "center",
                gap: "8px",
                padding: "7px 14px",
                borderRadius: "999px",
                background: "rgba(255,255,255,.9)",
                border: "1px solid #fff",
                font: "500 11px IBM Plex Mono,monospace",
                color: "#4a4c6b",
                letterSpacing: ".14em",
              }}
            >
              PLANS
            </div>
            <div
              style={{
                marginTop: "20px",
                display: "flex",
                flexWrap: "wrap",
                gap: "20px",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  margin: "0",
                  font: "800 clamp(28px,4.2vw,46px) Manrope,sans-serif",
                  color: "#171728",
                  letterSpacing: "-1.6px",
                  lineHeight: "1.08",
                  maxWidth: "520px",
                  textWrap: "pretty",
                }}
              >
                Free to start.
                <br />
                More on the way.
              </h2>
              <p
                style={{
                  margin: "0",
                  fontSize: "17px",
                  lineHeight: "1.6",
                  color: "#4a4c6b",
                  maxWidth: "360px",
                }}
              >
                Start with a first conversation, free. Paid plans are still being built, and the
                crisis resources are free for everyone.
              </p>
            </div>

            <div
              style={{
                marginTop: "36px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,280px),1fr))",
                gap: "18px",
                alignItems: "stretch",
              }}
            >
              <div
                className="ca-hov-19"
                style={{
                  borderRadius: "32px",
                  padding: "32px",
                  background: "rgba(255,255,255,.9)",
                  border: "1px solid #fff",
                  display: "flex",
                  flexDirection: "column",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <span
                  style={{
                    font: "500 11px IBM Plex Mono,monospace",
                    color: "#4a4c6b",
                    letterSpacing: ".14em",
                  }}
                >
                  FREE
                </span>
                <div
                  style={{ marginTop: "14px", display: "flex", alignItems: "baseline", gap: "7px" }}
                >
                  <span
                    style={{
                      font: "800 clamp(30px,4vw,42px) Manrope,sans-serif",
                      color: "#171728",
                      letterSpacing: "-1.8px",
                      lineHeight: "1",
                    }}
                  >
                    Free
                  </span>
                  <span style={{ fontSize: "14.5px", color: "#4a4c6b" }}>available now</span>
                </div>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: "14.5px",
                    lineHeight: "1.55",
                    color: "#4a4c6b",
                  }}
                >
                  A first conversation with Calm AI after setup. No card needed.
                </p>
                <div
                  style={{
                    marginTop: "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#171728",
                    }}
                  >
                    <span style={{ color: "#5b60c4", fontWeight: "700" }}>·</span>Companion chat for
                    a first conversation
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#171728",
                    }}
                  >
                    <span style={{ color: "#5b60c4", fontWeight: "700" }}>·</span>Guided exercises
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#171728",
                    }}
                  >
                    <span style={{ color: "#5b60c4", fontWeight: "700" }}>·</span>Mood &amp; habit
                    tracking
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#171728",
                    }}
                  >
                    <span style={{ color: "#5b60c4", fontWeight: "700" }}>·</span>Crisis resources,
                    always free
                  </div>
                </div>
                <div style={{ flex: "1", minHeight: "20px" }}></div>
                <Link
                  to="/auth"
                  className="ca-hov-20"
                  style={{
                    marginTop: "22px",
                    padding: "15px",
                    borderRadius: "16px",
                    background: "rgba(23,23,40,.06)",
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#171728",
                  }}
                >
                  Start free on the web
                </Link>
              </div>

              <div
                className="ca-hov-21"
                style={{
                  borderRadius: "32px",
                  padding: "32px",
                  background: "#171728",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 34px 74px -30px rgba(23,23,40,.85)",
                  transition:
                    "transform .55s cubic-bezier(.2,.8,.2,1),box-shadow .55s cubic-bezier(.2,.8,.2,1)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    bottom: "0",
                    width: "26%",
                    background:
                      "linear-gradient(90deg,transparent,rgba(255,255,255,.09),transparent)",
                    animation: "caSheen 7s ease-in-out 1.5s infinite",
                    pointerEvents: "none",
                  }}
                ></div>
                <div
                  style={{
                    position: "absolute",
                    top: "-150px",
                    right: "-110px",
                    width: "420px",
                    height: "420px",
                    borderRadius: "50%",
                    background: "radial-gradient(circle,rgba(140,145,225,.32),transparent 66%)",
                    animation: "caOrb 28s ease-in-out infinite",
                  }}
                ></div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "9px",
                  }}
                >
                  <span
                    style={{
                      font: "500 11px IBM Plex Mono,monospace",
                      color: "#9ea1e6",
                      letterSpacing: ".14em",
                    }}
                  >
                    PAID PLANS
                  </span>
                  <span
                    style={{
                      padding: "4px 9px",
                      borderRadius: "999px",
                      background: "rgba(158,161,230,.22)",
                      font: "500 10px IBM Plex Mono,monospace",
                      color: "#9ea1e6",
                      letterSpacing: ".1em",
                    }}
                  >
                    COMING SOON
                  </span>
                </div>
                <div
                  style={{
                    position: "relative",
                    marginTop: "14px",
                    font: "800 clamp(26px,3.4vw,34px) Manrope,sans-serif",
                    color: "#fff",
                    letterSpacing: "-1.2px",
                    lineHeight: "1.1",
                  }}
                >
                  More, when you want it
                </div>
                <p
                  style={{
                    position: "relative",
                    margin: "10px 0 0",
                    fontSize: "14.5px",
                    lineHeight: "1.55",
                    color: "#9ea1e6",
                  }}
                >
                  We're still working on these. Nothing to buy yet, and we'll say so here when that
                  changes.
                </p>
                <div
                  style={{
                    position: "relative",
                    marginTop: "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#fff",
                    }}
                  >
                    <span style={{ color: "#9ea1e6", fontWeight: "700" }}>·</span>More daily
                    conversation
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#fff",
                    }}
                  >
                    <span style={{ color: "#9ea1e6", fontWeight: "700" }}>·</span>Voice calls
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      fontSize: "14.5px",
                      lineHeight: "1.45",
                      color: "#fff",
                    }}
                  >
                    <span style={{ color: "#9ea1e6", fontWeight: "700" }}>·</span>A human coach
                  </div>
                </div>
                <div style={{ flex: "1", minHeight: "20px" }}></div>
                <span
                  aria-disabled="true"
                  style={{
                    position: "relative",
                    marginTop: "22px",
                    padding: "15px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,.12)",
                    textAlign: "center",
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#c9cbf2",
                  }}
                >
                  Coming soon
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          id="download"
          style={{
            padding: "clamp(80px,11vw,130px) 24px clamp(60px,8vw,90px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "1120px",
              borderRadius: "40px",
              padding: "clamp(40px,6vw,72px) clamp(28px,5vw,56px)",
              background: "linear-gradient(160deg,#f7f7fd,#dcdcf4)",
              border: "1px solid #fff",
              overflow: "hidden",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "absolute",
                bottom: "-220px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(760px,120%)",
                height: "520px",
                borderRadius: "50%",
                background: "radial-gradient(circle,rgba(143,148,224,.34),transparent 64%)",
                animation: "caDrift 26s ease-in-out infinite",
              }}
            ></div>
            <div
              style={{
                position: "relative",
                width: "84px",
                height: "84px",
                borderRadius: "26px",
                background: "linear-gradient(150deg,#8f94e0,#c9cbf2)",
                boxShadow: "0 22px 44px -16px rgba(90,95,180,.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 100 100">
                <path
                  d="M25,27 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M48,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M25,73 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M2,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0"
                  fill="#fff"
                ></path>
                <circle cx="50" cy="50" r="15" fill="#a3a7e6"></circle>
              </svg>
            </div>
            <h2
              style={{
                position: "relative",
                margin: "26px 0 0",
                font: "800 clamp(30px,5vw,58px) Manrope,sans-serif",
                color: "#171728",
                letterSpacing: "-2.2px",
                lineHeight: "1.02",
                maxWidth: "620px",
                textWrap: "pretty",
              }}
            >
              Talk tonight.
              <br />
              It's free to start.
            </h2>
            <p
              style={{
                position: "relative",
                margin: "18px 0 0",
                fontSize: "clamp(16px,2vw,19px)",
                lineHeight: "1.55",
                color: "#4a4c6b",
                maxWidth: "480px",
              }}
            >
              Set up in a minute, then start talking. No card, no streak to keep alive.
            </p>
            <div
              style={{
                position: "relative",
                marginTop: "28px",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <Link
                to="/auth"
                className="ca-hov-25"
                style={{
                  transition: "transform .45s cubic-bezier(.2,.8,.2,1),box-shadow .45s",
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: "52px",
                  padding: "0 30px",
                  borderRadius: "999px",
                  background: "#171728",
                  boxShadow: "0 18px 40px -20px rgba(23,23,40,.8)",
                  font: "800 16px Manrope,sans-serif",
                  color: "#fff",
                }}
              >
                Start free on the web
              </Link>
            </div>
            <div
              style={{
                position: "relative",
                marginTop: "14px",
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <SoonPill label="Coming soon on iPhone" />
              <SoonPill label="Coming soon on Android" />
            </div>
            <span
              style={{
                position: "relative",
                marginTop: "14px",
                fontSize: "14px",
                color: "#4a4c6b",
              }}
            >
              Free to start · no card · works in your browser today
            </span>
          </div>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "100%",
              maxWidth: "1120px",
              borderRadius: "36px",
              padding: "clamp(32px,4.5vw,52px)",
              background: "#171728",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))",
                gap: "36px",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <svg width="26" height="26" viewBox="0 0 100 100">
                    <path
                      d="M25,27 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M48,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M25,73 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0 M2,50 a25,25 0 1,1 50,0 a25,25 0 1,1 -50,0"
                      fill="#9ea1e6"
                    ></path>
                    <circle cx="50" cy="50" r="15" fill="#171728"></circle>
                  </svg>
                  <span
                    style={{
                      font: "800 18px Manrope,sans-serif",
                      color: "#fff",
                      letterSpacing: "-.4px",
                    }}
                  >
                    Calm <span style={{ color: "#9ea1e6" }}>AI</span>
                  </span>
                </div>
                <p
                  style={{
                    margin: "14px 0 0",
                    fontSize: "14px",
                    lineHeight: "1.6",
                    color: "#9ea1e6",
                    maxWidth: "260px",
                  }}
                >
                  A quiet place to think out loud. Wellness support, not therapy.
                </p>
                <div style={{ marginTop: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <SoonPill label="Coming soon on iPhone" dark />
                  <SoonPill label="Coming soon on Android" dark />
                </div>
              </div>
              <div>
                <div
                  style={{
                    font: "500 10.5px IBM Plex Mono,monospace",
                    color: "#7b7d9e",
                    letterSpacing: ".14em",
                  }}
                >
                  PRODUCT
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <a
                    href="#how"
                    className="ca-hov-30"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    How it works
                  </a>
                  <a
                    href="#features"
                    className="ca-hov-31"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Features
                  </a>
                  <a
                    href="#plans"
                    className="ca-hov-32"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Plans
                  </a>
                  <a
                    href="#features"
                    className="ca-hov-33"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Exercises
                  </a>
                </div>
              </div>
              <div>
                <div
                  style={{
                    font: "500 10.5px IBM Plex Mono,monospace",
                    color: "#7b7d9e",
                    letterSpacing: ".14em",
                  }}
                >
                  TRUST
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <a
                    href="#safety"
                    className="ca-hov-34"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Safety &amp; crisis
                  </a>
                  <a
                    href="#how"
                    className="ca-hov-35"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    How the AI works
                  </a>
                  <Link
                    to="/privacy"
                    className="ca-hov-36"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Privacy notice
                  </Link>
                  <Link
                    to="/terms"
                    className="ca-hov-37"
                    style={{ fontSize: "14px", color: "rgba(255,255,255,.82)" }}
                  >
                    Terms
                  </Link>
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: "40px",
                paddingTop: "22px",
                borderTop: "1px solid rgba(255,255,255,.14)",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  font: "500 11px IBM Plex Mono,monospace",
                  color: "#7b7d9e",
                  letterSpacing: ".12em",
                }}
              >
                CALMAI.SITE · © 2026
              </span>
              <span style={{ fontSize: "13px", color: "#9ea1e6" }}>
                In crisis? Call your local emergency number
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
