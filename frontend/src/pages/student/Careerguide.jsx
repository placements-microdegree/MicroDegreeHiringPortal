// FILE: src/pages/student/CareerGuide.jsx

import {
  FiBookOpen,
  FiExternalLink,
  FiArrowRight,
  FiCheckCircle,
  FiMessageCircle,
} from "react-icons/fi";

const NOTION_URL =
  "https://career-assistance.notion.site/Career-Assistance-Guide-21752af69e2c803f8024d55d973cd5bf";

const RESUME_SAMPLES_URL =
  "https://drive.google.com/drive/folders/10VuLUOv8jy4d72bhFzm7BG9cet4ZN2dO";

const resumeSampleCards = [
  {
    label: "Fresher",
    caption: "Entry-level resumes focused on clarity, projects, and learning outcomes.",
    theme: "from-sky-50 to-cyan-50 border-sky-200",
  },
  {
    label: "IT Experienced",
    caption: "Professional formats highlighting impact, ownership, and domain depth.",
    theme: "from-emerald-50 to-teal-50 border-emerald-200",
  },
  {
    label: "Non IT & IT",
    caption: "Transition-ready resume structures that connect prior experience to cloud roles.",
    theme: "from-amber-50 to-orange-50 border-amber-200",
  },
  {
    label: "Recently Placed",
    caption: "Latest placed-student CV samples with modern formatting and crisp storytelling.",
    theme: "from-rose-50 to-pink-50 border-rose-200",
  },
];

const startHereLinks = [
  {
    label: "Your 4-Week Onboarding Journey",
    url: "https://www.notion.so/Your-4-Week-Onboarding-Journey-23152af69e2c80518292e776c2945d08",
  },
  {
    label: "How to Contact the Career Assistance Team",
    url: "https://www.notion.so/How-to-Contact-the-Career-Assistance-Team-23152af69e2c808ba6fde2d07177fa9f",
  },
  {
    label: "Join Our WhatsApp Channel",
    url: "https://www.notion.so/Join-Our-WhatsApp-Channel-23152af69e2c80aa96c3d27e218065b1",
  },
  {
    label: "Submit Your Resume & Profile Form",
    url: "https://www.notion.so/Submit-Your-Resume-Profile-Form-23152af69e2c80259d2ff5771932df54",
  },
];

const weekdaySessions = [
  {
    day: "Monday",
    label: "Mock Quiz",
    url: "https://www.notion.so/Monday-Mock-Quiz-23152af69e2c80b3ac51fd26ae653bc0",
  },
  {
    day: "Wednesday",
    label: "Task Walkthrough",
    url: "https://www.notion.so/Wednesday-Task-Walkthrough-23152af69e2c8052b120cdd82c04636c",
  },
  {
    day: "Thursday",
    label: "Group Mock Interviews",
    url: "https://www.notion.so/Thursday-Group-Mock-Interviews-23152af69e2c8045b7dbfe4fb55e2963",
  },
  {
    day: "Sunday",
    label: "Mentor-Led Interview Prep",
    url: "https://www.notion.so/Sunday-Mentor-Led-Interview-Prep-Sessions-23152af69e2c80ed85d7fab838c40f39",
  },
];

const resumeLinks = [
  {
    label: "Resume Building Tips & Techniques",
    url: "https://www.notion.so/Resume-Building-Tips-Techniques-23152af69e2c8028bc70ee48df7c818d",
  },
  {
    label: "Tell Me About Yourself Templates",
    url: "https://www.notion.so/Tell-Me-About-Yourself-Templates-23152af69e2c80cc901af150c9c90032",
  },
  {
    label: "Common Mistakes & FAQs",
    url: "https://www.notion.so/Common-Mistakes-FAQs-23152af69e2c80ee98f6fdb994c6947e",
  },
  {
    label: "STAR Method for Scenario Questions",
    url: "https://www.notion.so/STAR-Method-for-Scenario-Questions-23152af69e2c802e92c6f2dc3f96d5ff",
  },
  {
    label: "Technical Interview Prep",
    url: "https://www.notion.so/Technical-Interview-Prep-23252af69e2c8066ae60e52c9e3b28a7",
  },
];

const jobLinks = [
  {
    label: "How to Apply for Jobs Shared by MicroDegree Hiring Team",
    url: "https://www.notion.so/How-to-Apply-for-Jobs-Shared-by-MicroDegree-Hiring-Team-23152af69e2c8054b668de848ad10a3f",
  },
  {
    label: "MicroDegree Cloud Drive Process",
    url: "https://www.notion.so/MicroDegree-Cloud-Drive-Process-23152af69e2c80bcb9a2e87d4bbc204b",
  },
  {
    label: "FAQs for Job Applicants",
    url: "https://www.notion.so/FAQs-for-Job-Applicants-23152af69e2c805483edfad5ec6f394c",
  },
  {
    label: "Which Cloud Roles Can I Apply & Salary?",
    url: "https://www.notion.so/Which-Cloud-Roles-Can-I-Apply-Salary-29552af69e2c8074899acb7a87c3fa93",
  },
];

// ── Reusable link list item ───────────────────────────────────────────────────

function NotionLink({ label, url }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <span className="flex items-center gap-2">
        <FiArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
        {label}
      </span>
      <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CareerGuide() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiBookOpen className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Career Assistance Guide
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Everything you need to prepare, apply, and land your next role.
              </p>
            </div>
          </div>
          <a
            href={NOTION_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
          >
            <FiExternalLink className="h-4 w-4" />
            View Full Guide
          </a>
        </div>

        {/* In Progress notice */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <FiMessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>
            This wiki is being actively updated by the Career Assistance Team.
            For suggestions, message{" "}
            <a
              href="https://wa.me/916366983877"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline hover:text-amber-900"
            >
              WhatsApp: 6366983877
            </a>
          </span>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Refer to Resume Samples</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Check out CVs of students who got placed through MicroDegree. Use them for content ideas, formatting, and clarity.
              </p>
            </div>
            <a
              href={RESUME_SAMPLES_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              Open All Samples
              <FiExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {resumeSampleCards.map((card) => (
              <a
                key={card.label}
                href={RESUME_SAMPLES_URL}
                target="_blank"
                rel="noreferrer"
                className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${card.theme}`}
              >
                <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 rounded-full bg-white/40 blur-xl" />
                <div className="relative">
                  <div className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-700">
                    Resume Category
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900">{card.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-700">{card.caption}</p>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 group-hover:text-primary">
                    View Samples
                    <FiExternalLink className="h-3.5 w-3.5" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Start Here */}
      <Section title="👋 Start Here">
        {startHereLinks.map((l) => (
          <NotionLink key={l.label} label={l.label} url={l.url} />
        ))}
      </Section>

      {/* Weekly Prep */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          📆 Weekly Prep Activities
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Weekday sessions at 7 PM · Weekend mentorship on Sunday mornings
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {weekdaySessions.map((s) => (
            <a
              key={s.label}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-primary hover:bg-primary/5"
            >
              <div>
                <div className="text-xs font-semibold text-primary">
                  {s.day}
                </div>
                <div className="text-sm font-medium text-slate-800">
                  {s.label}
                </div>
              </div>
              <FiExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </a>
          ))}
        </div>
      </section>

      {/* Resume & Interview */}
      <Section title="🚦 Resume & Interview Essentials">
        {resumeLinks.map((l) => (
          <NotionLink key={l.label} label={l.label} url={l.url} />
        ))}
      </Section>

      {/* Job Application */}
      <Section title="💼 Job Application Process">
        {jobLinks.map((l) => (
          <NotionLink key={l.label} label={l.label} url={l.url} />
        ))}
      </Section>

      {/* Contact */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">
          📬 Contact &amp; Updates
        </h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://wa.me/916366983877"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <FiMessageCircle className="h-4 w-4" />
            WhatsApp: 6366983877
          </a>
          <a
            href="https://www.notion.so/How-to-get-Recordings-Access-23152af69e2c80a1bd76cdfd21083bbb"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <FiExternalLink className="h-4 w-4" />
            How to Get Recordings Access
          </a>
        </div>
      </section>
    </div>
  );
}
