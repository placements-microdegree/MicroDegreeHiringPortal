// FILE: src/pages/student/CloudDrive.jsx

import {
  FiCloud,
  FiExternalLink,
  FiArrowRight,
  FiCheckCircle,
} from "react-icons/fi";

const NOTION_URL =
  "https://career-assistance.notion.site/MicroDegree-Cloud-Drive-Process-23152af69e2c80bcb9a2e87d4bbc204b";

const rounds = [
  {
    round: "Round 1",
    title: "MCQ Screening Test",
    points: [
      "30 AWS/DevOps-focused questions",
      "Duration: 30 minutes",
      "Cutoff: 18/30 to qualify",
    ],
  },
  {
    round: "Round 2",
    title: "Practical Online Task Round",
    points: [
      "Time: 10:45 AM – 12:50 PM (2 hrs + buffer)",
      "15 hands-on tasks (attempt at least 8)",
      "At least 2 DevOps tasks if AWS DevOps course completed",
    ],
  },
  {
    round: "Round 3",
    title: "Face-to-Face Round (Live Interview)",
    points: [
      "Zoom interview conducted after Round 2 results",
      "Real-time Q&A and problem-solving",
      "Evaluates hands-on depth",
    ],
  },
  {
    round: "Round 4",
    title: "Managerial Round",
    points: [
      "Conducted by Shivu Sir",
      "Self-introduction & communication",
      "Technical skills & practical knowledge",
      "Career gaps, prior experience & preferred location",
    ],
  },
];

const eligibility = [
  "Completed MicroDegree's AWS + DevOps training (with certificate)",
  "Have access to your own AWS account",
  "Completed at least 50% of the Placement Prep Course",
];

const benefits = [
  "First preference for jobs shared by MicroDegree's hiring partners",
  "1:1 job search assistance and guidance",
  "Referral opportunities through our Alumni Network",
  "Ongoing handholding in your job search journey",
];

export default function CloudDrive() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiCloud className="h-5 w-5 text-primary" />
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                MicroDegree Cloud Drive Process
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Your gateway to top Cloud &amp; DevOps jobs.
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
      </section>

      {/* What is Cloud Drive */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          What is the Cloud Drive?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          The Cloud Drive is MicroDegree's internal recurring placement
          screening process — a mock industry hiring workflow. Clear all 4
          rounds and get first preference for jobs sourced by our Hiring Team,
          along with dedicated placement support.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {benefits.map((b) => (
            <div
              key={b}
              className="flex items-start gap-2 text-sm text-slate-700"
            >
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {b}
            </div>
          ))}
        </div>
      </section>
      {/* Eligibility + Registration side by side */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Eligibility */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Eligibility Criteria
          </h2>
          <ul className="space-y-2">
            {eligibility.map((e) => (
              <li
                key={e}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {e}
              </li>
            ))}
          </ul>
        </section>

        {/* Registration */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Registration
          </h2>
          <p className="text-sm text-slate-600">
            Cloud Drives happen on the{" "}
            <span className="font-semibold text-slate-800">
              2nd and 4th Saturday
            </span>{" "}
            of every month. Register before{" "}
            <span className="font-semibold text-slate-800">Friday 6 PM</span> of
            the drive week to receive your invite email.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Updates are also shared in the{" "}
            <span className="font-semibold text-slate-800">
              G101 Telegram Group
            </span>
            .
          </p>
          <a
            href="https://tally.so/r/3xVJNk"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            <FiExternalLink className="h-4 w-4" />
            Register for Next Drive
          </a>
        </section>
      </div>

      {/* 4 Rounds */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Selection Process — 4 Rounds
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {rounds.map((r) => (
            <div
              key={r.round}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-1 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {r.round}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {r.title}
              </div>
              <ul className="mt-2 space-y-1">
                {r.points.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-1.5 text-xs text-slate-600"
                  >
                    <FiArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          🛑 Not shortlisted in a round? You can{" "}
          <span className="font-semibold text-slate-800">
            re-register for the next drive
          </span>{" "}
          and start from Round 1. Clearing this process significantly improves
          your chances of getting placed faster.
        </p>
      </section>
    </div>
  );
}
