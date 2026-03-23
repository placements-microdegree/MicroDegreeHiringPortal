import { useEffect, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCloud,
  FiExternalLink,
} from "react-icons/fi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import { useAuth } from "../../context/authStore";
import { getNextDrive, registerForDrive } from "../../services/cloudDriveService";

const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbBni2CHFxPA411oCA2U";
const TELEGRAM_UPDATES_URL = "https://t.me/+F62Xb7LdhWk3YjQ1";

const relocationOptions = [
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Pune/Mumbai",
  "I am not ready to relocate",
];

const educationOptions = [
  "BE/MTech - IT Background (CS/IS/EC/EEE)",
  "BE/MTech - Non IT Background (Mech, Civil, Others)",
  "BCA/MCA/BSc/MSc (CS/IS/EC/EEE)",
  "Other Degrees - BSc/B.com/BA/Others",
  "Diploma",
  "Other",
];

const experienceOptions = [
  "I am a fresher",
  "6 months - 2 years experience",
  "2 - 3 years experience",
  "4+ years experience",
];

const domainOptions = [
  "IT domain - Dev/Testing/Cloud",
  "IT domain - Support/Maintenance",
  "Non-IT Domain",
  "I am a Fresher",
];

const sourceOptions = [
  "Facebook",
  "LinkedIn",
  "MicroDegree Telegram group",
  "Instagram / WhatsApp",
  "Indeed",
  "Other institutions",
  "Website",
];

const rounds = [
  {
    round: "Round 1",
    title: "MCQ Screening Test",
    points: [
      "Join the meeting by 9:30 AM",
      "Test will start from 9:45 AM",
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
      "Live interview conducted by Shiv Sir",
      "Self-introduction & communication",
      "Technical skills & practical knowledge",
      "Career gaps, prior experience & preferred location",
    ],
  },
];

function getSecondAndFourthSaturdayReference(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const saturdays = [];
  const cursor = new Date(year, month, 1);

  while (cursor.getMonth() === month) {
    if (cursor.getDay() === 6) {
      saturdays.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    second: saturdays[1] || null,
    fourth: saturdays[3] || null,
  };
}

function getTentativeNextDriveDate() {
  const now = new Date();
  const current = getSecondAndFourthSaturdayReference(now);
  const candidates = [current.second, current.fourth].filter(
    (value) => value && value > now,
  );
  if (candidates.length > 0) return candidates[0];

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const next = getSecondAndFourthSaturdayReference(nextMonth);
  return next.second || next.fourth || null;
}

function formatDate(value) {
  if (!value) return "Will be announced soon";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Will be announced soon";
  return date.toDateString();
}

function renderRadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  required = false,
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </legend>
      <div className="space-y-1">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={onChange}
              required={required}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function CloudDrive() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nextDriveInfo, setNextDriveInfo] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    current_location: "",
    relocation_preference: "",
    highest_education: "",
    total_experience: "",
    aws_experience: "",
    domain: "",
    aws_cert: "",
    devops_cert: "",
    institute_name: "",
    source: "",
    microdegree_certified: "",
    batch: "",
  });

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      full_name: profile?.full_name || prev.full_name,
      email: profile?.email || prev.email,
      phone: profile?.phone || prev.phone,
    }));
  }, [profile]);

  useEffect(() => {
    async function loadDrive() {
      try {
        const data = await getNextDrive();
        setNextDriveInfo(data.nextDrive || null);
        setRegistered(Boolean(data.registered));
      } catch {
        setNextDriveInfo(null);
        setRegistered(false);
      }
    }
    void loadDrive();
  }, []);

  const tentativeNextDate = useMemo(() => getTentativeNextDriveDate(), []);
  const closeAt = nextDriveInfo?.registration_close_at
    ? new Date(nextDriveInfo.registration_close_at)
    : null;
  const isCloseWindowPassed = Boolean(
    closeAt && closeAt.getTime() < Date.now() && !registered,
  );

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (!nextDriveInfo?.id) {
      alert("No active drive available right now.");
      return;
    }

    setSubmitting(true);
    try {
      await registerForDrive({ ...form, drive_id: nextDriveInfo.id });
      setRegistered(true);
      setOpen(false);
    } catch (err) {
      alert(err.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FiCloud className="h-5 w-5 text-primary" />
              <h1 className="text-base font-semibold text-slate-900">
                Cloud Placement Drive - Registration
              </h1>
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Cloud Drives happen on the <strong>2nd and 4th Saturday</strong> of every month.
              Register before <strong>Friday 5 PM</strong> of the drive week to get your invite email.
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Updates are shared in the Career Assistance Microdegree WhatsApp channel:
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 font-semibold text-primary underline"
              >
                Join updates
              </a>
            </p>
          </div>

          <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
            Next Drive: <strong>{formatDate(nextDriveInfo?.drive_date || tentativeNextDate)}</strong>
          </div>
        </div>

        <div className="mt-4">
          {!nextDriveInfo ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Drive schedule will be announced soon.
            </div>
          ) : registered ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-4 text-[15px] leading-6 text-emerald-900 shadow-sm">
              <p>
                You are registered for <strong>{formatDate(nextDriveInfo.drive_date)}</strong>. Your drive link
                will be shared one day before the drive by email (check Spam/Promotions) and on dashboard.
              </p>
              {nextDriveInfo.zoom_link ? (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-white/80 p-3 text-sm text-emerald-950">
                  <p className="font-semibold">Meeting details</p>
                  <p className="mt-1 break-all">
                    Zoom Link: <a href={nextDriveInfo.zoom_link} target="_blank" rel="noreferrer" className="font-semibold underline">{nextDriveInfo.zoom_link}</a>
                  </p>
                  {nextDriveInfo.passcode ? (
                    <p className="mt-1">
                      Passcode: <strong>{nextDriveInfo.passcode}</strong>
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 text-sm">
                  Zoom link and passcode will be shared one day prior. Please check your dashboard and email.
                </div>
              )}
            </div>
          ) : isCloseWindowPassed ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
              Oops, you missed registration for this drive. Next drive is expected on <strong>{formatDate(tentativeNextDate)}</strong>.
            </div>
          ) : (
            <Button onClick={() => setOpen(true)}>
              <FiExternalLink className="mr-2 h-4 w-4" />
              Register for Next Drive
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Selection Process — 4 Rounds</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {rounds.map((round) => (
            <div key={round.round} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-1 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {round.round}
              </div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{round.title}</div>
              <ul className="mt-2 space-y-1">
                {round.points.map((point) => (
                  <li key={point} className="flex items-start gap-1.5 text-xs text-slate-600">
                    <FiArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Modal
        title="Cloud Placement Drive - Registration"
        open={open}
        onClose={() => setOpen(false)}
        scrollable
        maxWidthClass="max-w-[820px]"
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Are you looking for a Job as an AWS DevOps Engineer?</p>
          <p>Here we are with 100+ job opportunities for you in big MNC's. Apply now and get shortlisted.</p>
          <p>2nd and 4th Saturday of every month | 1st round: Online Task | 2nd Round: Virtual Interview</p>
          <p>Clear the below test and get invited for the placement drive.</p>
          <div>
            <p className="font-semibold text-slate-900">Requirements</p>
            <ul className="mt-1 space-y-1">
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />0 to 4 years cloud experience</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />Graduates with Cloud Knowledge</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />Freshers with Hands On Project Experience</li>
              <li className="flex items-start gap-2"><FiCheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />Certifications on Cloud Computing</li>
            </ul>
          </div>
          <p>
            Are you a company looking for top Cloud Candidates? Drop your contact info at
            <span className="font-semibold text-slate-900"> hirings@microdegree.work</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <Input label="Your Name *" name="full_name" value={form.full_name} onChange={onChange} required />
          <Input label="Email Id *" name="email" type="email" value={form.email} onChange={onChange} required />
          <Input label="Mobile Number *" name="phone" value={form.phone} onChange={onChange} required />
          <Input label="Current Location *" name="current_location" value={form.current_location} onChange={onChange} required />

          {renderRadioGroup({
            name: "relocation_preference",
            label: "Are you ready to relocate if placed?",
            options: relocationOptions,
            value: form.relocation_preference,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "highest_education",
            label: "What is your highest educational qualification?",
            options: educationOptions,
            value: form.highest_education,
            onChange,
            required: true,
          })}

          <div className="text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Experience</p>
            <p>Mention previous experience if any. Placement drive is for all including freshers.</p>
          </div>

          {renderRadioGroup({
            name: "total_experience",
            label: "What's your total work experience",
            options: experienceOptions,
            value: form.total_experience,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "aws_experience",
            label: "How many years of AWS/Cloud work experience do you have?",
            options: experienceOptions,
            value: form.aws_experience,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "domain",
            label: "What domain is your previous experience?",
            options: domainOptions,
            value: form.domain,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "aws_cert",
            label: "Do you have Cloud AWS certification?",
            options: ["Yes", "No"],
            value: form.aws_cert,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "devops_cert",
            label: "Do you have DevOps Certification?",
            options: ["Yes", "No"],
            value: form.devops_cert,
            onChange,
            required: true,
          })}

          <Input
            label="If yes, mention the Institute Name"
            name="institute_name"
            value={form.institute_name}
            onChange={onChange}
          />

          {renderRadioGroup({
            name: "source",
            label: "Where did you get this placement Drive Information?",
            options: sourceOptions,
            value: form.source,
            onChange,
            required: true,
          })}

          {renderRadioGroup({
            name: "microdegree_certified",
            label: "Are you MicroDegree Cloud Certified?",
            options: ["Yes", "No"],
            value: form.microdegree_certified,
            onChange,
            required: true,
          })}

          <Input
            label="Batch (eg: DevOps-Batch-E-02032022) *"
            name="batch"
            value={form.batch}
            onChange={onChange}
            required
          />

          <p className="text-xs text-slate-500">
            Note: If you are not a MicroDegree Student, please fill as "Not a MicroDegree Student".
          </p>
          <p className="text-sm text-slate-700">
            Click and Join below link to get updates:
            <a
              href={TELEGRAM_UPDATES_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-1 font-semibold text-primary underline"
            >
              Join Telegram Updates
            </a>
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
