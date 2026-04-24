import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/common/Footer";
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiChevronRight,
  FiCloud,
  FiFileText,
  FiLayers,
  FiMenu,
  FiTarget,
  FiTrendingUp,
  FiUsers,
  FiX,
  FiZap,
  FiAward,
  FiEdit3,
  FiShield,
  FiActivity,
  FiMapPin,
  FiRadio,
} from "react-icons/fi";

// ─── Data ─────────────────────────────────────────────────────────────────────

const STUDENT_FEATURES = [
  {
    title: "Premium & Practice Jobs",
    description:
      "Access curated job listings tailored to your profile. Premium roles unlock once you're placement-ready. Practice opportunities are always open to build your application confidence.",
    icon: FiBriefcase,
    tag: "Core Feature",
    accent: "#2563eb",
    bg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
  },
  {
    title: "Career Readiness Score",
    description:
      "See exactly where you stand. Your readiness score tracks profile completion, resume approval, cloud drive clearance, and more, so you always know your next step.",
    icon: FiActivity,
    tag: "Progress",
    accent: "#059669",
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
  },
  {
    title: "Resume Builder",
    description:
      "Build a job-ready resume that aligns with the roles you're targeting to boost visibility. Get HR approval directly on the platform and keep your resume updated as you grow your professional career",
    icon: FiFileText,
    tag: "Tools",
    accent: "#7c3aed",
    bg: "from-violet-50 to-purple-50",
    border: "border-violet-200",
  },
  {
    title: "Cloud Drive Pathway",
    description:
      "Register for cloud drives, track your status, and get cleared for real opportunities. The drive pathway is your bridge between learning and landing.",
    icon: FiCloud,
    tag: "Milestone",
    accent: "#d97706",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
  },
  {
    title: "Daily Interview Prep",
    description:
      "Join structured daily sessions via Zoom. Short, focused, and consistent, designed to keep your interview skills sharp and your momentum high.",
    icon: FiCalendar,
    tag: "Sessions",
    accent: "#0891b2",
    bg: "from-cyan-50 to-sky-50",
    border: "border-cyan-200",
  },
  {
    title: "Application Tracking",
    description:
      "Track every application in a clear timeline. See your status, stage, HR comments, and next steps. No more guessing where you stand in the hiring pipeline.",
    icon: FiBarChart2,
    tag: "Visibility",
    accent: "#e11d48",
    bg: "from-rose-50 to-pink-50",
    border: "border-rose-200",
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Build Your Profile",
    description:
      "Complete your student profile with your academic details, skills, and aspirations. A strong profile unlocks better visibility and more opportunities.",
    icon: FiLayers,
    color: "text-blue-600",
    glow: "shadow-blue-500/10",
  },
  {
    step: "02",
    title: "Reach Readiness",
    description:
      "Complete your cloud drive, get your resume approved, and hit full readiness. Each milestone brings you one step closer to premium job access.",
    icon: FiTarget,
    color: "text-emerald-600",
    glow: "shadow-emerald-500/10",
  },
  {
    step: "03",
    title: "Apply & Get Placed",
    description:
      "Browse jobs matched to your profile, apply with confidence, and track every step of the hiring journey from application to offer.",
    icon: FiTrendingUp,
    color: "text-violet-600",
    glow: "shadow-violet-500/10",
  },
];

const PROOF_POINTS = [
  {
    value: "10,000+",
    label: "Students Enrolled",
    sub: "and actively building their placement readiness",
    icon: FiUsers,
    color: "text-blue-600",
  },
  {
    value: "500+",
    label: "Hiring Partners",
    sub: "across IT, product, and service companies",
    icon: FiBriefcase,
    color: "text-emerald-600",
  },
  {
    value: "95%",
    label: "Placement Focus",
    sub: "every feature built around career outcomes",
    icon: FiAward,
    color: "text-amber-600",
  },
  {
    value: "Daily",
    label: "Live Sessions",
    sub: "interview prep and skill-building every day",
    icon: FiRadio,
    color: "text-violet-600",
  },
];

const CAREER_PATHS = [
  {
    title: "Software Developer",
    tag: "Frontend · Backend · Full-Stack",
    desc: "Build production applications across web and backend stacks at product and service companies.",
    path: "Python Full-Stack track",
    icon: FiLayers,
    accent: "#2563eb",
    bg: "from-blue-50 to-cyan-50",
    border: "border-blue-200",
  },
  {
    title: "Cloud Engineer",
    tag: "AWS · Azure · GCP",
    desc: "Design and operate cloud infrastructure, from container orchestration to managed services.",
    path: "Docker & Kubernetes track",
    icon: FiCloud,
    accent: "#d97706",
    bg: "from-amber-50 to-orange-50",
    border: "border-amber-200",
  },
  {
    title: "Data Analyst",
    tag: "SQL · Python · BI",
    desc: "Turn raw data into business decisions using SQL pipelines, Python notebooks, and BI dashboards.",
    path: "Power BI track",
    icon: FiBarChart2,
    accent: "#0891b2",
    bg: "from-cyan-50 to-sky-50",
    border: "border-cyan-200",
  },
  {
    title: "QA / Automation Engineer",
    tag: "Manual · Selenium · CI",
    desc: "Ship quality software with structured manual testing and Selenium-based automation in modern CI pipelines.",
    path: "Java / Python Automation track",
    icon: FiCheckCircle,
    accent: "#059669",
    bg: "from-emerald-50 to-teal-50",
    border: "border-emerald-200",
  },
];

const READINESS_ITEMS = [
  { label: "Profile Completion", status: "Done", color: "text-emerald-600", dot: "bg-emerald-500" },
  { label: "Resume Uploaded", status: "HR Approved", color: "text-emerald-600", dot: "bg-emerald-500" },
  { label: "Cloud Drive", status: "Cleared", color: "text-emerald-600", dot: "bg-emerald-500" },
  { label: "Premium Jobs", status: "Unlocked", color: "text-blue-600", dot: "bg-blue-500" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function useReveal({ threshold = 0.15, rootMargin = "0px 0px -40px 0px" } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
          }
        });
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, rootMargin]);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "", as: Tag = "div" }) {
  const { ref, visible } = useReveal();
  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transform-gpu transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

function ActionLink({ to, variant = "primary", children, className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold tracking-wide transition-all duration-200";
  const styles = {
    primary:
      "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/20",
    outline:
      "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 hover:-translate-y-0.5 hover:border-slate-400",
    blue: "bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/30",
    ghost:
      "text-slate-600 hover:text-slate-900 gap-1.5",
  };
  return (
    <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${colors[color]}`}
    >
      <FiZap className="h-3 w-3" />
      {children}
    </span>
  );
}

function FeatureCard({ feature }) {
  const Icon = feature.icon;
  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${feature.bg} ${feature.border}`}
      style={{ "--accent": feature.accent }}
    >
      <div
        className="absolute right-0 top-0 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25"
        style={{ background: feature.accent }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
            style={{ background: `${feature.accent}1a`, border: `1px solid ${feature.accent}33` }}
          >
            <Icon className="h-5 w-5" style={{ color: feature.accent }} />
          </div>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              background: `${feature.accent}14`,
              color: feature.accent,
              border: `1px solid ${feature.accent}2e`,
            }}
          >
            {feature.tag}
          </span>
        </div>

        <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {feature.description}
        </p>

        <div
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5"
          style={{ color: feature.accent }}
        >
          Learn more
          <FiChevronRight className="h-4 w-4" />
        </div>
      </div>
    </article>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      {/* Glow blobs */}
      <div className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute -right-6 bottom-10 h-36 w-36 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="relative rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Your Placement Dashboard
            </p>
            <h3 className="mt-1.5 text-lg font-bold text-slate-900">
              Career Readiness: 92%
            </h3>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Jobs Unlocked
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
              style={{ width: "92%" }}
            />
          </div>
        </div>

        {/* Readiness checklist */}
        <div className="mt-5 space-y-2.5">
          {READINESS_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${item.dot}`} />
                <span className="text-sm font-medium text-slate-700">
                  {item.label}
                </span>
              </div>
              <span className={`text-xs font-bold ${item.color}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { n: "148", l: "Open Jobs" },
            { n: "24", l: "Sessions" },
            { n: "3", l: "Applied" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-center"
            >
              <div className="text-xl font-extrabold text-slate-900">{s.n}</div>
              <div className="mt-1 text-xs text-slate-500">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
          <FiCheckCircle className="h-5 w-5 shrink-0 text-blue-600" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              You're placement-ready!
            </p>
            <p className="text-xs text-slate-600">
              Browse 148 open jobs matched to your profile
            </p>
          </div>
          <FiArrowRight className="h-4 w-4 shrink-0 text-blue-600" />
        </div>
      </div>

      {/* Floating card */}
      <div className="absolute -right-4 -top-5 hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/10 sm:block lg:-right-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <FiBriefcase className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">New Job Posted</p>
            <p className="text-xs text-slate-500">DevOps Engineer · 2 min ago</p>
          </div>
        </div>
      </div>

      {/* Floating badge */}
      <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/10 sm:block lg:-left-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FiAward className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">Offer Received</p>
            <p className="text-xs text-slate-500">Umesh · ₹11 LPA</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const NAV_LINKS = [
  ["Home", "#home"],
  ["Features", "#features"],
  ["How It Works", "#how-it-works"],
  
  // ["Career Paths", "#proof"], // hidden while the proof/career-paths section is disabled
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const scrollToTop = (e) => {
    e?.preventDefault();
    setMenuOpen(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        {/* Main bar */}
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">

          {/* Logo — clicking scrolls to top of the home page */}
          <Link
            to="/home"
            className="flex shrink-0 items-center transition-transform duration-200 hover:scale-[1.03]"
            onClick={scrollToTop}
            aria-label="Back to top"
          >
            <img
              src="https://www.microdegree.work/static/media/MicroDegree%20Pink.5777a8ffd9ff3026b011.png"
              alt="MicroDegree"
              className="h-8 w-auto object-contain sm:h-9"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            {NAV_LINKS.map(([label, href]) => (
              <a key={label} href={href} className="transition-colors hover:text-slate-900">
                {label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop-only CTAs — wrapper controls visibility so base `inline-flex` can't override */}
            <div className="hidden items-center gap-3 md:flex">
              <ActionLink to="/login" variant="ghost">
                Log in
              </ActionLink>
              <ActionLink
                to="/signup"
                variant="blue"
                className="!px-5 !py-3 text-sm"
              >
                Get Started
                <FiArrowRight className="h-4 w-4" />
              </ActionLink>
            </div>

            {/* Hamburger — mobile only */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
            >
              {menuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        <div
          id="mobile-menu"
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out md:hidden ${
            menuOpen ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-slate-200 bg-white px-4 pb-5 pt-2">
            <nav className="flex flex-col">
              {NAV_LINKS.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between rounded-xl px-3 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {label}
                  <FiChevronRight className="h-4 w-4 text-slate-400" />
                </a>
              ))}
            </nav>

            <div className="mt-3 flex flex-col gap-2.5 border-t border-slate-200 pt-4">
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500"
              >
                Create Free Account
                <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section id="home"className="relative overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(59,130,246,0.12),transparent)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(15,23,42,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.8)_1px,transparent_1px)] [background-size:72px_72px] pointer-events-none" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-16 sm:gap-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          {/* Left */}
          <Reveal>
            <Badge color="blue">Built for student success</Badge>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
              Your Career
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-700 bg-clip-text text-transparent">
                Starts Here.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              MicroDegree is your all-in-one placement portal. Track your
              readiness, apply to premium jobs, prep for interviews, and get
              placed faster with a system built around your career journey.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ActionLink to="/signup" variant="blue" className="text-base px-7 py-4">
                Create Free Account
                <FiArrowRight className="h-5 w-5" />
              </ActionLink>
              <ActionLink to="/login" variant="outline" className="text-base px-7 py-4">
                Log In
              </ActionLink>
            </div>

            {/* Trust hints */}
            <div className="mt-10 flex flex-wrap items-center gap-5">
              {[
                "Free to join",
                "No hidden fees",
                "Placement-focused",
              ].map((t) => (
                <span
                  key={t}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <FiCheck className="h-4 w-4 text-emerald-600" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>

          {/* Right */}
          <Reveal delay={150}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* ── STATS STRIP ──────────────────────────────────────────────────────── */}
      <div className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-4 py-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {PROOF_POINTS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal
                key={p.label}
                delay={i * 80}
                className="group flex flex-col items-center gap-1.5 py-8 text-center"
              >
                <Icon
                  className={`h-5 w-5 ${p.color} mb-1 transition-transform duration-300 group-hover:scale-125`}
                />
                <div className="text-3xl font-extrabold tracking-tight text-slate-900">
                  {p.value}
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {p.label}
                </div>
                <div className="max-w-[160px] text-xs leading-relaxed text-slate-500">
                  {p.sub}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <Reveal className="flex flex-col items-center gap-4 text-center">
          <Badge color="violet">Platform Features</Badge>
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Everything you need to go from student to{" "}
            <span className="text-blue-600">placed professional</span>
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600 sm:text-lg">
            Every feature is designed around one goal: helping you get placed
            with clarity, structure, and real preparation behind you.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {STUDENT_FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 80}>
              <FeatureCard feature={f} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="relative border-y border-slate-200 bg-white py-20 sm:py-24"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(59,130,246,0.06),transparent)] pointer-events-none" />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col items-center gap-4 text-center">
            <Badge color="emerald">How It Works</Badge>
            <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Three steps from signup to{" "}
              <span className="text-emerald-600">your first offer</span>
            </h2>
            <p className="mt-2 max-w-xl text-base text-slate-600 sm:text-lg">
              The journey is designed to be simple. Every step unlocks the
              next, and you can always see where you are.
            </p>
          </Reveal>

          <div className="relative mt-16 grid gap-6 lg:grid-cols-3">
            {/* Connector line */}
            <div className="absolute left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] top-11 hidden h-px bg-gradient-to-r from-blue-300 via-emerald-300 to-violet-300 lg:block" />

            {JOURNEY_STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.step} delay={i * 120}>
                  <article className="group relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition-transform duration-300 group-hover:scale-110 ${step.glow} ${step.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-4xl font-black text-slate-100 transition-colors duration-300 group-hover:text-slate-200">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {step.description}
                    </p>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <Reveal className="mt-12 flex justify-center">
            <ActionLink to="/signup" variant="blue" className="text-base px-8 py-4">
              Start Your Journey
              <FiArrowRight className="h-5 w-5" />
            </ActionLink>
          </Reveal>
        </div>
      </section>

      {/* ── DEEPER FEATURES HIGHLIGHT ────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: text */}
          <Reveal>
            <Badge color="amber">Readiness Engine</Badge>
            <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Know exactly what's{" "}
              <span className="text-amber-600">blocking your next job</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              The career readiness engine tracks four things that actually
              matter to hiring teams: your profile, resume approval, cloud
              drive clearance, and account standing. When all four are green,
              premium jobs open up automatically.
            </p>

            <div className="mt-8 space-y-4">
              {[
                {
                  icon: FiEdit3,
                  title: "Profile Completeness",
                  desc: "Academic details, skills, and contact info. Complete it once.",
                },
                {
                  icon: FiFileText,
                  title: "Resume Approval",
                  desc: "Upload your resume, our team reviews and approves it directly.",
                },
                {
                  icon: FiCloud,
                  title: "Cloud Drive Cleared",
                  desc: "Complete a cloud drive to prove you're ready for real opportunities.",
                },
                {
                  icon: FiShield,
                  title: "Account in Good Standing",
                  desc: "Stay active and engaged. Your readiness unlocks premium access.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="group flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>

          {/* Right: visual */}
          <Reveal delay={150} className="relative">
            <div className="absolute -left-6 -top-6 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="relative rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-xl">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-900">Your Readiness Progress</p>
                <span className="text-sm font-bold text-emerald-600">92%</span>
              </div>

              <div className="mt-5 space-y-4">
                {[
                  { label: "Profile Complete", pct: 100, color: "bg-emerald-500" },
                  { label: "Resume Approved", pct: 100, color: "bg-emerald-500" },
                  { label: "Cloud Drive", pct: 100, color: "bg-blue-500" },
                  { label: "Account Standing", pct: 100, color: "bg-emerald-500" },
                  { label: "Overall Readiness", pct: 92, color: "bg-gradient-to-r from-blue-500 to-cyan-400" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{bar.label}</span>
                      <span className="font-bold text-slate-900">{bar.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${bar.color} transition-all`}
                        style={{ width: `${bar.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <FiCheckCircle className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Premium Jobs: Unlocked
                    </p>
                    <p className="text-xs text-slate-600">
                      You qualify for 148 active job listings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PROOF / TRUST SECTION (disabled — flip `false` to `true` to re-enable) ─── */}
      {false && (
      <section id="proof" className="border-y border-slate-200 bg-white py-20 sm:py-24">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="flex flex-col items-start gap-4">
            <Badge color="emerald">Career Outcomes</Badge>
            <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Real placements across{" "}
              <span className="text-emerald-600">in-demand roles.</span>
            </h2>
            <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
              MicroDegree students land jobs across software, cloud, data, and
              quality engineering. Every track on the platform is built around
              roles companies are actually hiring for.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr_1fr]">
            {/* Metric cards */}
            <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
              {[
                {
                  icon: FiUsers,
                  color: "text-blue-600",
                  bg: "border-blue-200 bg-blue-50",
                  value: "10,000+",
                  title: "Students Enrolled",
                  body: "A strong and growing community of learners actively working toward placement.",
                },
                {
                  icon: FiBriefcase,
                  color: "text-emerald-600",
                  bg: "border-emerald-200 bg-emerald-50",
                  value: "500+",
                  title: "Hiring Partners",
                  body: "Companies ranging from growing startups to established tech firms looking for our talent.",
                },
                {
                  icon: FiCalendar,
                  color: "text-cyan-600",
                  bg: "border-cyan-200 bg-cyan-50",
                  value: "Daily",
                  title: "Live Prep Sessions",
                  body: "Structured interview prep every day. Short, focused, and consistently effective.",
                },
                {
                  icon: FiAward,
                  color: "text-amber-600",
                  bg: "border-amber-200 bg-amber-50",
                  value: "95%",
                  title: "Placement-Focused Design",
                  body: "Every feature, from readiness to referrals, is built to move you toward an offer.",
                },
              ].map((m, i) => {
                const Icon = m.icon;
                return (
                  <Reveal
                    key={m.title}
                    delay={i * 80}
                    className={`group rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${m.bg}`}
                  >
                    <Icon
                      className={`h-5 w-5 ${m.color} transition-transform duration-300 group-hover:scale-125`}
                    />
                    <p className="mt-3 text-2xl font-extrabold text-slate-900">
                      {m.value}
                    </p>
                    <p className="mt-1 font-semibold text-slate-900">{m.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">
                      {m.body}
                    </p>
                  </Reveal>
                );
              })}
            </div>

            {/* Career path cards */}
            <div className="col-span-full grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-2 lg:content-start">
              {CAREER_PATHS.map((role, i) => {
                const Icon = role.icon;
                return (
                  <Reveal key={role.title} delay={i * 100}>
                    <article
                      className={`group h-full overflow-hidden rounded-3xl border bg-gradient-to-br p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${role.bg} ${role.border}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
                          style={{
                            background: `${role.accent}1a`,
                            border: `1px solid ${role.accent}33`,
                          }}
                        >
                          <Icon className="h-5 w-5" style={{ color: role.accent }} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900">
                            {role.title}
                          </h3>
                          <p
                            className="mt-0.5 text-xs font-semibold uppercase tracking-wide"
                            style={{ color: role.accent }}
                          >
                            {role.tag}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-slate-600">
                        {role.desc}
                      </p>

                      <div className="mt-5 flex items-center gap-2 border-t border-slate-200/60 pt-4 text-xs font-semibold text-slate-700">
                        <FiTarget
                          className="h-3.5 w-3.5"
                          style={{ color: role.accent }}
                        />
                        Build it through the {role.path}
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6 py-14 text-center shadow-sm sm:rounded-[32px] sm:px-12 sm:py-16 lg:py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(59,130,246,0.15),transparent)] pointer-events-none" />
          <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
          <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-cyan-200/40 blur-3xl" />

          <Reveal className="relative">
            <Badge color="blue">Ready to begin?</Badge>
            <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">
              Stop waiting.{" "}
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Start building
              </span>{" "}
              your future.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
              Create your free account, build your profile, and take the first
              step toward your placement, all in one place built for students
              like you.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ActionLink to="/signup" variant="primary" className="text-base px-8 py-4">
                Create Free Account
                <FiArrowRight className="h-5 w-5" />
              </ActionLink>
              <ActionLink to="/login" variant="outline" className="text-base px-8 py-4">
                Already have an account? Log in
              </ActionLink>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              {[
                "Free to join, no card needed",
                "Profile setup takes under 10 min",
                "Jobs visible once you're ready",
              ].map((t) => (
                <span key={t} className="flex items-center gap-2">
                  <FiCheck className="h-4 w-4 text-emerald-600" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
