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
import {
  getNextDrive,
  listMyRegistrations,
  registerForDrive,
} from "../../services/cloudDriveService";

const WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbBni2CHFxPA411oCA2U";

const STEP_COUNT = 6;

const qualificationOptions = [
  "B.E / B.Tech",
  "M.E / M.Tech",
  "BCA / MCA",
  "B.Sc / M.Sc",
  "Diploma",
  "Other",
];

const currentStatusOptions = [
  "IT Professional",
  "Non-IT -> Transitioning to IT",
  "Fresher",
];

const totalExperienceOptions = [
  "Fresher (0 years)",
  "6 months - 1 year",
  "1-2 years",
  "3-4 years",
  "5-6 years",
  "7-10 years",
  "10+ years",
];

const relevantExperienceOptions = [
  "No experience (learning stage)",
  "6 months - 1 year",
  "< 1 year",
  "1-2 years",
  "3-4 years",
  "5+ years",
];

const itRoleOptions = [
  "Developer",
  "Tester / QA",
  "Support Engineer",
  "System Admin",
  "DevOps Engineer",
  "Cloud Engineer",
  "Other",
];

const trackOptions = ["AWS Cloud Track", "DevOps Track"];

const awsCertificationOptions = [
  "MicroDegree AWS Certified",
  "AWS Global Certification",
  "None",
];

const awsToolOptions = [
  "EC2",
  "S3",
  "IAM",
  "VPC",
  "Route 53",
  "CloudWatch",
  "Lambda",
  "CloudFormation",
  "None",
];

const devopsToolOptions = [
  "Docker",
  "Kubernetes",
  "Jenkins",
  "Terraform",
  "CI/CD",
  "Linux",
  "None",
];

const devopsCertificationOptions = [
  "MicroDegree DevOps Certified",
  "DevOps Global Certification",
  "None",
];

const jobIntentOptions = [
  "Yes (actively applying)",
  "Exploring opportunities",
  "Not actively looking",
];

const noticePeriodOptions = ["Immediate", "< 15 days", "30 days", "60+ days"];

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

const driveStatusClassMap = {
  Registered: "bg-slate-100 text-slate-700",
  "MCQ Screening Test cleared": "bg-amber-100 text-amber-700",
  "Practical Online Task Round": "bg-blue-100 text-blue-700",
  "Practical Online Task Round Cleared": "bg-emerald-100 text-emerald-700",
  "Practical Online Task Round Rejected": "bg-rose-100 text-rose-700",
  "Face-to-Face Round (Live Interview)": "bg-blue-100 text-blue-700",
  "Face-to-Face Round (Live Interview) Cleared": "bg-emerald-100 text-emerald-700",
  "Face-to-Face Round (Live Interview) Rejected": "bg-rose-100 text-rose-700",
  "Managerial Round": "bg-violet-100 text-violet-700",
  "Managerial Round Cleared": "bg-emerald-100 text-emerald-700",
  "Managerial Round Rejected": "bg-rose-100 text-rose-700",
  "Not Attended drive": "bg-slate-200 text-slate-700",
  Rejected: "bg-red-100 text-red-700",
};

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

function resolveDriveStartDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value)
      .split("-")
      .map((item) => Number(item));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day, 9, 30, 0, 0);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getCountdownParts(targetDate, nowMs) {
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) return null;
  const diff = targetDate.getTime() - nowMs;
  if (diff <= 0) {
    return {
      started: true,
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  return {
    started: false,
    days,
    hours,
    minutes,
  };
}

function renderRadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  required = false,
  error = "",
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
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function renderMultiSelectGroup({
  name,
  label,
  options,
  selectedValues,
  onToggle,
  required = false,
  error = "",
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-600">*</span> : null}
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <input
              type="checkbox"
              name={name}
              checked={selectedValues.includes(option)}
              onChange={() => onToggle(name, option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </fieldset>
  );
}

function mapTagValue(value, mapping) {
  return mapping[value] || value || null;
}

function renderTrackReadinessContent({ showPrepareSection = true } = {}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-indigo-50 p-4">
        <h3 className="text-base font-semibold text-slate-900">Track-wise interview readiness roadmap</h3>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          We run a structured hiring simulation with MCQ screening, practical task execution, and live interview rounds.
          This helps you become job-ready with real interview discipline and role-based evaluation.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="text-sm font-semibold text-amber-900">AWS Track</h4>
          <ul className="mt-2 space-y-2 text-sm text-amber-900">
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />MCQ round focused on AWS fundamentals, networking, IAM, and architecture basics.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Practical tasks around EC2, S3, IAM, VPC, Route 53, and monitoring scenarios.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Face-to-face interview to validate troubleshooting, deployment approach, and communication clarity.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Example roles: AWS Cloud Engineer, Cloud Support Engineer, Cloud Operations Associate.</li>
          </ul>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h4 className="text-sm font-semibold text-emerald-900">DevOps Track</h4>
          <ul className="mt-2 space-y-2 text-sm text-emerald-900">
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />MCQ round on Linux, CI/CD, container basics, pipelines, and release workflows.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Practical tasks on Docker, Jenkins, Terraform, Kubernetes, and automation thinking.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Live interview to assess hands-on confidence, debugging method, and production readiness.</li>
            <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />Example roles: DevOps Engineer, Platform Support Engineer, Site Reliability Associate.</li>
          </ul>
        </div>
      </div>

      {showPrepareSection ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <p className="font-semibold">How to prepare better</p>
          <p className="mt-1 leading-6">
            Attend regular interview preparation sessions, complete practice tasks weekly, and participate in mock interviews.
            Consistent preparation is the fastest way to clear all rounds and get mapped to opportunities.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function CloudDrive() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [knowAboutOpen, setKnowAboutOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nextDriveInfo, setNextDriveInfo] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [pastRegistrations, setPastRegistrations] = useState([]);
  const [pastLoading, setPastLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [countdownNow, setCountdownNow] = useState(Date.now());
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    current_location: "",
    highest_education: "",
    highest_education_other: "",
    current_status: "",
    total_experience: "",
    relevant_experience: "",
    current_last_role: "",
    transitioning_to_cloud_devops: "",
    non_it_field: "",
    graduation_year: "",
    track: "",
    has_aws_hands_on: "",
    aws_certifications: [],
    aws_tools: [],
    aws_global_certification_details: "",
    has_devops_hands_on: "",
    devops_tools: [],
    devops_certifications: [],
    devops_global_certification_details: "",
    job_intent: "",
    current_ctc: "",
    expected_ctc: "",
    notice_period: "",
    currently_working: "",
    commitment_full_drive: false,
    commitment_serious_roles: false,
    commitment_selection_performance: false,
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
      setPastLoading(true);
      try {
        const [driveData, historyData] = await Promise.all([
          getNextDrive(),
          listMyRegistrations(),
        ]);
        setNextDriveInfo(driveData.nextDrive || null);
        setRegistered(Boolean(driveData.registered));
        setPastRegistrations(historyData || []);
      } catch {
        setNextDriveInfo(null);
        setRegistered(false);
        setPastRegistrations([]);
      } finally {
        setPastLoading(false);
      }
    }
    void loadDrive();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const tentativeNextDate = useMemo(() => getTentativeNextDriveDate(), []);
  const closeAt = nextDriveInfo?.registration_close_at
    ? new Date(nextDriveInfo.registration_close_at)
    : null;
  const isCloseWindowPassed = Boolean(
    closeAt && closeAt.getTime() < Date.now() && !registered,
  );
  const displayNextDriveDate = isCloseWindowPassed
    ? tentativeNextDate
    : nextDriveInfo?.drive_date || tentativeNextDate;
  const driveStartDate = useMemo(
    () => resolveDriveStartDate(nextDriveInfo?.drive_date),
    [nextDriveInfo?.drive_date],
  );
  const driveCountdown = useMemo(
    () => getCountdownParts(driveStartDate, countdownNow),
    [driveStartDate, countdownNow],
  );

  const progressPercentage = Math.round((step / STEP_COUNT) * 100);

  function onChange(event) {
    const { name, value, type, checked } = event.target;
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
    setForm((prev) => {
      const nextValue = type === "checkbox" ? checked : value;
      const next = { ...prev, [name]: nextValue };

      if (name === "current_status") {
        next.current_last_role = "";
        next.transitioning_to_cloud_devops = "";
        next.non_it_field = "";
        next.graduation_year = "";
      }

      if (name === "track") {
        next.has_aws_hands_on = "";
        next.aws_certifications = [];
        next.aws_tools = [];
        next.aws_global_certification_details = "";
        next.has_devops_hands_on = "";
        next.devops_tools = [];
        next.devops_certifications = [];
        next.devops_global_certification_details = "";
      }

      if (name === "highest_education" && value !== "Other") {
        next.highest_education_other = "";
      }

      return next;
    });
  }

  function onToggleMultiSelect(name, option) {
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
    setForm((prev) => {
      const current = Array.isArray(prev[name]) ? prev[name] : [];
      const alreadyExists = current.includes(option);
      let nextValues = alreadyExists
        ? current.filter((item) => item !== option)
        : [...current, option];

      if (option === "None") {
        nextValues = alreadyExists ? [] : ["None"];
      } else {
        nextValues = nextValues.filter((item) => item !== "None");
      }

      return { ...prev, [name]: nextValues };
    });
  }

  function validateStep(stepNumber) {
    const nextErrors = {};

    if (stepNumber === 1) {
      if (!form.track) {
        nextErrors.track = "Please choose your target track.";
      }
    }

    if (stepNumber === 2) {
      if (!form.full_name.trim()) nextErrors.full_name = "Full Name is required.";
      if (!form.email.trim()) nextErrors.email = "Email ID is required.";
      if (!form.phone.trim()) nextErrors.phone = "Phone Number is required.";
      if (!form.current_location.trim()) {
        nextErrors.current_location = "Current Location is required.";
      }
      if (!form.highest_education) {
        nextErrors.highest_education = "Highest Qualification is required.";
      }
      if (form.highest_education === "Other" && !form.highest_education_other.trim()) {
        nextErrors.highest_education_other = "Please enter your highest qualification.";
      }
    }

    if (stepNumber === 3) {
      if (!form.current_status) nextErrors.current_status = "Current Status is required.";
      if (!form.total_experience) {
        nextErrors.total_experience = "Total Experience is required.";
      }
      if (!form.relevant_experience) {
        nextErrors.relevant_experience = "This experience field is required.";
      }
      if (form.current_status === "IT Professional") {
        if (!form.current_last_role) {
          nextErrors.current_last_role = "Current / Last Role is required.";
        }
        if (!form.transitioning_to_cloud_devops) {
          nextErrors.transitioning_to_cloud_devops =
            "Please select if you are transitioning to Cloud / DevOps.";
        }
      }
      if (form.current_status === "Non-IT -> Transitioning to IT") {
        if (!form.non_it_field.trim()) {
          nextErrors.non_it_field = "Current Field is required.";
        }
        if (!form.current_last_role.trim()) {
          nextErrors.current_last_role = "Current / Last Role is required.";
        }
      }
      if (form.current_status === "Fresher" && !form.graduation_year.trim()) {
        nextErrors.graduation_year = "Year of Graduation is required.";
      }
    }

    if (stepNumber === 4) {
      if (form.track === "AWS Cloud Track") {
        if (!form.has_aws_hands_on) {
          nextErrors.has_aws_hands_on = "Please select your AWS hands-on status.";
        }
        if (form.aws_certifications.length === 0) {
          nextErrors.aws_certifications = "Please select at least one AWS certification option.";
        }
        if (form.aws_tools.length === 0) {
          nextErrors.aws_tools = "Please select at least one AWS tool option.";
        }
        if (
          form.aws_certifications.includes("AWS Global Certification") &&
          !form.aws_global_certification_details.trim()
        ) {
          nextErrors.aws_global_certification_details =
            "Please enter your AWS global certification details.";
        }
      }
      if (form.track === "DevOps Track") {
        if (!form.has_devops_hands_on) {
          nextErrors.has_devops_hands_on =
            "Please select your DevOps hands-on status.";
        }
        if (form.devops_tools.length === 0) {
          nextErrors.devops_tools = "Please select at least one DevOps tool option.";
        }
        if (form.devops_certifications.length === 0) {
          nextErrors.devops_certifications =
            "Please select at least one DevOps certification option.";
        }
        if (
          form.devops_certifications.includes("DevOps Global Certification") &&
          !form.devops_global_certification_details.trim()
        ) {
          nextErrors.devops_global_certification_details =
            "Please enter your DevOps global certification details.";
        }
      }
    }

    if (stepNumber === 5) {
      if (!form.job_intent) nextErrors.job_intent = "Job intent is required.";
      if (!form.notice_period) nextErrors.notice_period = "Notice period is required.";
      if (!form.currently_working) {
        nextErrors.currently_working = "Please select whether you are currently working.";
      }
    }

    if (stepNumber === 6) {
      if (!form.commitment_full_drive) {
        nextErrors.commitment_full_drive = "This confirmation is required.";
      }
      if (!form.commitment_serious_roles) {
        nextErrors.commitment_serious_roles = "This confirmation is required.";
      }
      if (!form.commitment_selection_performance) {
        nextErrors.commitment_selection_performance = "This confirmation is required.";
      }
    }

    return nextErrors;
  }

  function goToNextStep() {
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((prev) => Math.min(STEP_COUNT, prev + 1));
  }

  function goToPreviousStep() {
    setStep((prev) => Math.max(1, prev - 1));
  }

  function openRegistrationModal() {
    setSubmitSuccess(false);
    setStep(1);
    setErrors({});
    setSubmitError("");
    setOpen(true);
  }

  function closeRegistrationModal() {
    setOpen(false);
    setStep(1);
    setErrors({});
    setSubmitError("");
  }

  async function onSubmit(event) {
    event.preventDefault();
    const stepErrors = validateStep(STEP_COUNT);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setSubmitError("");

    if (!nextDriveInfo?.id) {
      setSubmitError("No active drive available right now.");
      return;
    }

    const trackTag = mapTagValue(form.track, {
      "AWS Cloud Track": "aws",
      "DevOps Track": "devops",
    });
    const statusTag = mapTagValue(form.current_status, {
      "IT Professional": "it",
      "Non-IT -> Transitioning to IT": "non-it",
      Fresher: "fresher",
    });
    const relevantExperienceTag = mapTagValue(form.relevant_experience, {
      "No experience (learning stage)": "none",
      "6 months - 1 year": "0.5-1",
      "< 1 year": "<1",
      "1-2 years": "1-2",
      "3-4 years": "3-4",
      "5+ years": "5+",
    });
    const totalExperienceTag = mapTagValue(form.total_experience, {
      "Fresher (0 years)": "0",
      "6 months - 1 year": "0.5-1",
      "1-2 years": "1-2",
      "3-4 years": "3-4",
      "5-6 years": "5-6",
      "7-10 years": "7-10",
      "10+ years": "10+",
    });
    const jobIntentTag = mapTagValue(form.job_intent, {
      "Yes (actively applying)": "active",
      "Exploring opportunities": "exploring",
      "Not actively looking": "passive",
    });

    const payload = {
      ...form,
      drive_id: nextDriveInfo.id,
      backend_tags: {
        track: trackTag,
        status: statusTag,
        total_experience: totalExperienceTag,
        relevant_experience: relevantExperienceTag,
        job_intent: jobIntentTag,
      },
    };

    setSubmitting(true);
    try {
      await registerForDrive(payload);
      setRegistered(true);
      const history = await listMyRegistrations();
      setPastRegistrations(history || []);
      setSubmitSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Registration failed");
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
                MicroDegree Cloud Placement Drive - Registration
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
            Next Drive: <strong>{formatDate(displayNextDriveDate)}</strong>
          </div>
        </div>

        <div className="mt-4">
          {!nextDriveInfo ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Drive schedule will be announced soon.
            </div>
          ) : registered ? (
            <div className="overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-sm">
              <div className="border-b border-primary/20 bg-primary/10 px-4 py-3">
                <p className="text-sm font-semibold text-primary">Registration Confirmed</p>
              </div>

              <div className="space-y-3 px-4 py-4 text-sm text-slate-800">
                <div className="flex items-center gap-2 text-[15px] leading-6">
                  <span className="relative inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <p>
                    You are registered for{" "}
                    <span className="inline-flex rounded-full bg-red-600 px-3 py-1 font-bold text-white">
                      {formatDate(nextDriveInfo.drive_date)}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Important updates
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>Meeting details are shared one day before the drive.</span>
                      
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>You will get the Zoom link and passcode by email (check Spam/Promotions).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>The same details will also be available on your dashboard</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>Login through laptop is mandatory.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>Treat this as a real interview.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>Come on time, be professional.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>Be on time.</span>
                    </li>
                  </ul>
                </div>

                {driveCountdown ? (
                  <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-cyan-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      Drive start countdown
                    </p>
                    {driveCountdown.started ? (
                      <p className="mt-1 text-sm font-semibold text-emerald-700">
                        Drive day has started. Join on time for the rounds.
                      </p>
                    ) : (
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg border border-indigo-200 bg-white px-2 py-2">
                          <p className="text-lg font-bold leading-none text-indigo-800">{driveCountdown.days}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Days</p>
                        </div>
                        <div className="rounded-lg border border-indigo-200 bg-white px-2 py-2">
                          <p className="text-lg font-bold leading-none text-indigo-800">{driveCountdown.hours}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Hours</p>
                        </div>
                        <div className="rounded-lg border border-indigo-200 bg-white px-2 py-2">
                          <p className="text-lg font-bold leading-none text-indigo-800">{driveCountdown.minutes}</p>
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-600">Minutes</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {nextDriveInfo.zoom_link ? (
                <div className="mx-4 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-slate-800">
                  <p className="font-semibold text-emerald-900">Meeting details</p>
                  <p className="mt-1 text-xs text-emerald-800">Your session is ready. Use the button below to join.</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => window.open(nextDriveInfo.zoom_link, "_blank", "noopener,noreferrer")}
                    >
                      Join Meeting
                    </Button>
                    {nextDriveInfo.passcode ? (
                      <div className="inline-flex items-center gap-1 rounded-xl border border-dashed border-violet-400 bg-violet-50 px-2 py-1 text-sm text-violet-900">
                        <span className="font-semibold">Passcode:</span>
                        <strong className="text-sm leading-none">{nextDriveInfo.passcode}</strong> &nbsp;
                        <button
                          type="button"
                          onClick={() => {
                            if (nextDriveInfo.passcode) {
                              void navigator.clipboard.writeText(String(nextDriveInfo.passcode));
                            }
                          }}
                          className="rounded-md border border-violet-300 bg-white px-1 py-1 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                        >
                          Copy
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mx-4 mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
                  Zoom link and passcode will be shared one day prior. Please check your dashboard and email.
                </div>
              )}
            </div>
          ) : isCloseWindowPassed ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-800">
              Oops, you missed registration for this drive. Next drive is expected on <strong>{formatDate(tentativeNextDate)}</strong>.
            </div>
          ) : (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button onClick={openRegistrationModal} className="w-full sm:w-auto">
                <FiExternalLink className="mr-2 h-4 w-4" />
                Register for Cloud Drive
              </Button>
              <Button
                variant="outline"
                onClick={() => setKnowAboutOpen(true)}
                className="w-full sm:w-auto"
              >
                Know About Drive
              </Button>
            </div>
          )}
        </div>
      </section>

      <Modal
        title="Know About Cloud Drive Tracks"
        open={knowAboutOpen}
        onClose={() => setKnowAboutOpen(false)}
        scrollable
        maxWidthClass="max-w-[920px]"
      >
        <div className="space-y-4">
          {renderTrackReadinessContent()}
        </div>
      </Modal>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Your Past Cloud Drive Records</h2>
        <p className="mt-1 text-xs text-slate-500">
          Track your previous registrations, current HR status, and feedback comments.
        </p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full table-fixed text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="w-[30%] px-3 py-3 font-semibold sm:px-4">Drive Date</th>
                <th className="w-[30%] px-3 py-3 font-semibold sm:px-4">Status</th>
                <th className="w-[40%] px-3 py-3 font-semibold sm:px-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {pastLoading ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-600 sm:px-4">
                    Loading records...
                  </td>
                </tr>
              ) : pastRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-5 text-center text-slate-600 sm:px-4">
                    No past cloud drive records found.
                  </td>
                </tr>
              ) : (
                pastRegistrations.map((registration) => (
                  <tr key={registration.id} className="border-t border-slate-200 text-slate-700">
                    <td className="px-3 py-3 align-top text-xs sm:px-4 sm:text-sm">{formatDate(registration.drive_date)}</td>
                    <td className="px-3 py-3 align-top sm:px-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          driveStatusClassMap[registration.status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {registration.status || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top text-xs break-words sm:px-4 sm:text-sm">{registration.hr_comment || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Selection Process - 4 Rounds</h2>
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

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="text-base font-semibold text-slate-900">
            Your Gateway to Top Cloud &amp; DevOps Jobs
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            At MicroDegree, we’ve built a structured <strong>Cloud Drive Process</strong> to help
            serious learners transition into real job roles — faster and with expert support.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            This multi-round process acts as a <strong>mock industry hiring workflow</strong> and gives
            us confidence in mapping you to job openings sourced by our Hiring Team.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">What Is the Cloud Drive?</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            The Cloud Drive is our internal, recurring placement screening process. If you
            <strong> clear all 4 rounds</strong>, you’ll receive:
          </p>
          <ul className="mt-3 space-y-2">
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span><strong>First preference for jobs</strong> shared by MicroDegree&apos;s hiring partners</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span><strong>1:1 job search assistance</strong> and guidance</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span><strong>Referral opportunities</strong> through our Alumni Network (especially for experienced learners)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>Ongoing handholding in your job search journey</span>
            </li>
          </ul>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Our Placement Team actively reaches out to companies with Cloud, DevOps, and SysAdmin
            openings — and <strong>Cloud Drive cleared candidates are prioritized</strong> when mapping
            to those roles.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="text-sm font-semibold text-emerald-900">Eligibility Criteria</h3>
            <p className="mt-2 text-sm text-emerald-900">To register and participate, you must:</p>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2 text-sm text-emerald-900">
                <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                Have completed MicroDegree’s AWS + DevOps training (with certificate)
              </li>
              <li className="flex items-start gap-2 text-sm text-emerald-900">
                <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                Have access to your own AWS account
              </li>
              <li className="flex items-start gap-2 text-sm text-emerald-900">
                <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
                Completed at least 50% of the Placement Prep Course on your dashboard
              </li>
            </ul>
            <p className="mt-3 text-xs text-emerald-900">
              If you're not shortlisted in any round, you can <strong>re-register for the next available drive</strong>
              and start from Round 1 again.
            </p>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold text-slate-900">What Happens After You Clear All Rounds?</h3>
            <ul className="mt-2 space-y-2">
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                You get first preference for MicroDegree job postings
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Our team supports with referrals, follow-ups, resume adjustments, and mock interviews
              </li>
              <li className="flex items-start gap-2 text-sm text-slate-700">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                You’re eligible for exclusive openings shared with Cloud Drive cleared students only
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h3 className="text-sm font-semibold text-violet-900">For Experienced Candidates (1–4 years)</h3>
          <ul className="mt-2 space-y-2 text-sm text-violet-900">
            <li className="flex items-start gap-2">
              <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
              Referrals through our alumni network
            </li>
            <li className="flex items-start gap-2">
              <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
              Tailored guidance for lateral job switches
            </li>
            <li className="flex items-start gap-2">
              <FiArrowRight className="mt-0.5 h-4 w-4 shrink-0" />
              Direct mapping to interview-ready opportunities
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Final Thoughts</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            The Cloud Drive is not just an assessment — it&apos;s a launchpad.
          </p>
          <ul className="mt-2 space-y-2">
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              You’re technically ready
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              You know how to present yourself
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              You’ve proven your skills in a real-world-style format
            </li>
          </ul>
          <p className="mt-3 text-sm font-medium text-slate-800">
            Clearing this process significantly improves your chances of getting placed faster.
          </p>
          <p className="mt-1 text-sm text-slate-700">
            So take it seriously, prepare well, and show up with confidence.
          </p>
        </div>
      </section>

      <Modal
        title="MicroDegree Cloud Drive Registration"
        open={open}
        onClose={closeRegistrationModal}
        scrollable
        maxWidthClass="max-w-[820px]"
      >
        {submitSuccess ? (
          <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <h3 className="text-base font-semibold">Registration Successful</h3>
            <p>You will receive the MCQ round link, Zoom session details, and next steps shortly.</p>
            <p>
              Join WhatsApp group for updates:
              <a
                href={WHATSAPP_CHANNEL_URL}
                target="_blank"
                rel="noreferrer"
                className="ml-1 font-semibold underline"
              >
                Open WhatsApp Updates
              </a>
            </p>
            <div className="flex justify-end">
              <Button type="button" onClick={closeRegistrationModal}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-slate-700">
              <h3 className="text-base font-semibold text-slate-900">
                Get access to curated Cloud and DevOps job opportunities through our structured placement drive.
              </h3>
              <p>Drive Schedule: 2nd and 4th Saturday (Live on Zoom)</p>
              <p>Roles: AWS Engineer | DevOps Engineer | Cloud Engineer</p>
              <p className="font-medium text-rose-700">
                Only candidates who complete all rounds will be considered for job mapping.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Step {step} of {STEP_COUNT}</span>
                <span>{progressPercentage}% complete</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              {submitError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              ) : null}

              {step === 1 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Choose the role you want to target</h4>
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                    <ul className="list-disc space-y-1 pl-5">
                      <li>
                        Based on the track you select, your Cloud Drive questions will be tailored accordingly.
                      </li>
                      <li>
                        If you clear your selected track, you will be mapped to relevant job opportunities.
                      </li>
                      <li>
                        Can you do both tracks? Yes, you can do both (you can choose the other track in the next drive).
                      </li>
                    </ul>
                  </div>
                  {renderRadioGroup({
                    name: "track",
                    label: "Track",
                    options: trackOptions,
                    value: form.track,
                    onChange,
                    required: true,
                    error: errors.track,
                  })}
                  {renderTrackReadinessContent({ showPrepareSection: false })}
                </section>
              ) : null}

              {step === 2 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Lets start with your basic details</h4>
                  <Input label="Full Name *" name="full_name" value={form.full_name} onChange={onChange} error={errors.full_name} required />
                  <Input label="Email ID *" name="email" type="email" value={form.email} onChange={onChange} error={errors.email} required />
                  <Input label="Phone Number *" name="phone" value={form.phone} onChange={onChange} error={errors.phone} required />
                  <Input
                    label="Current Location (City) *"
                    name="current_location"
                    value={form.current_location}
                    onChange={onChange}
                    error={errors.current_location}
                    required
                  />

                  <label className="block">
                    <div className="mb-1 text-sm font-medium text-slate-700">
                      Highest Qualification <span className="text-rose-600">*</span>
                    </div>
                    <select
                      name="highest_education"
                      value={form.highest_education}
                      onChange={onChange}
                      className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${errors.highest_education ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
                      required
                    >
                      <option value="">Select qualification</option>
                      {qualificationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {errors.highest_education ? (
                      <p className="mt-1 text-xs text-red-600">{errors.highest_education}</p>
                    ) : null}
                  </label>

                  {form.highest_education === "Other" ? (
                    <Input
                      label="Enter Highest Qualification *"
                      name="highest_education_other"
                      value={form.highest_education_other}
                      onChange={onChange}
                      error={errors.highest_education_other}
                      placeholder="Enter your qualification"
                      required
                    />
                  ) : null}
                </section>
              ) : null}

              {step === 3 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Tell us about your professional background</h4>
                  {renderRadioGroup({
                    name: "current_status",
                    label: "Current Status",
                    options: currentStatusOptions,
                    value: form.current_status,
                    onChange,
                    required: true,
                    error: errors.current_status,
                  })}

                  {renderRadioGroup({
                    name: "total_experience",
                    label: "Total Experience",
                    options: totalExperienceOptions,
                    value: form.total_experience,
                    onChange,
                    required: true,
                    error: errors.total_experience,
                  })}

                  {renderRadioGroup({
                    name: "relevant_experience",
                    label: "Hands-on Real Cloud / DevOps experience",
                    options: relevantExperienceOptions,
                    value: form.relevant_experience,
                    onChange,
                    required: true,
                    error: errors.relevant_experience,
                  })}

                  {form.current_status === "IT Professional" ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">Your IT Background</p>

                      <label className="block">
                        <div className="mb-1 text-sm font-medium text-slate-700">
                          Current / Last Role <span className="text-rose-600">*</span>
                        </div>
                        <select
                          name="current_last_role"
                          value={form.current_last_role}
                          onChange={onChange}
                          className={`w-full rounded-xl border bg-white px-3 py-2 text-sm outline-none ${errors.current_last_role ? "border-red-400 focus:border-red-500" : "border-slate-200 focus:border-primary"}`}
                          required
                        >
                          <option value="">Select role</option>
                          {itRoleOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        {errors.current_last_role ? (
                          <p className="mt-1 text-xs text-red-600">{errors.current_last_role}</p>
                        ) : null}
                      </label>

                      {renderRadioGroup({
                        name: "transitioning_to_cloud_devops",
                        label: "Are you transitioning to Cloud / DevOps?",
                        options: ["Yes", "No"],
                        value: form.transitioning_to_cloud_devops,
                        onChange,
                        required: true,
                        error: errors.transitioning_to_cloud_devops,
                      })}
                    </div>
                  ) : null}

                  {form.current_status === "Non-IT -> Transitioning to IT" ? (
                    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">Your Current Background</p>
                      <Input
                        label="Current Field *"
                        name="non_it_field"
                        value={form.non_it_field}
                        onChange={onChange}
                        error={errors.non_it_field}
                        required
                      />
                      <Input
                        label="Current / Last Role *"
                        name="current_last_role"
                        value={form.current_last_role}
                        onChange={onChange}
                        error={errors.current_last_role}
                        required
                      />
                    </div>
                  ) : null}

                  {form.current_status === "Fresher" ? (
                    <Input
                      label="Year of Graduation *"
                      name="graduation_year"
                      value={form.graduation_year}
                      onChange={onChange}
                      error={errors.graduation_year}
                      placeholder="e.g. 2025"
                      required
                    />
                  ) : null}
                </section>
              ) : null}

              {step === 4 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Skill Snapshot</h4>
                  {form.track === "AWS Cloud Track" ? (
                    <>
                      {renderRadioGroup({
                        name: "has_aws_hands_on",
                        label: "Do you have hands-on AWS experience?",
                        options: ["Yes", "No"],
                        value: form.has_aws_hands_on,
                        onChange,
                        required: true,
                        error: errors.has_aws_hands_on,
                      })}

                      {renderMultiSelectGroup({
                        name: "aws_certifications",
                        label: "AWS Certifications",
                        options: awsCertificationOptions,
                        selectedValues: form.aws_certifications,
                        onToggle: onToggleMultiSelect,
                        required: true,
                        error: errors.aws_certifications,
                      })}

                      {form.aws_certifications.includes("AWS Global Certification") ? (
                        <Input
                          label="AWS Global Certification Details *"
                          name="aws_global_certification_details"
                          value={form.aws_global_certification_details}
                          onChange={onChange}
                          error={errors.aws_global_certification_details}
                          placeholder="Enter certification name, issuer, and year"
                          required
                        />
                      ) : null}

                      {renderMultiSelectGroup({
                        name: "aws_tools",
                        label: "Tools you have worked on",
                        options: awsToolOptions,
                        selectedValues: form.aws_tools,
                        onToggle: onToggleMultiSelect,
                        required: true,
                        error: errors.aws_tools,
                      })}
                    </>
                  ) : null}

                  {form.track === "DevOps Track" ? (
                    <>
                      {renderRadioGroup({
                        name: "has_devops_hands_on",
                        label: "Do you have hands-on DevOps experience?",
                        options: ["Yes", "No"],
                        value: form.has_devops_hands_on,
                        onChange,
                        required: true,
                        error: errors.has_devops_hands_on,
                      })}

                      {renderMultiSelectGroup({
                        name: "devops_tools",
                        label: "Tools you have worked on",
                        options: devopsToolOptions,
                        selectedValues: form.devops_tools,
                        onToggle: onToggleMultiSelect,
                        required: true,
                        error: errors.devops_tools,
                      })}

                      {renderMultiSelectGroup({
                        name: "devops_certifications",
                        label: "DevOps Certifications",
                        options: devopsCertificationOptions,
                        selectedValues: form.devops_certifications,
                        onToggle: onToggleMultiSelect,
                        required: true,
                        error: errors.devops_certifications,
                      })}

                      {form.devops_certifications.includes("DevOps Global Certification") ? (
                        <Input
                          label="DevOps Global Certification Details *"
                          name="devops_global_certification_details"
                          value={form.devops_global_certification_details}
                          onChange={onChange}
                          error={errors.devops_global_certification_details}
                          placeholder="Enter certification name, issuer, and year"
                          required
                        />
                      ) : null}
                    </>
                  ) : null}

                  {!form.track ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      Choose your track in Step 3 to continue.
                    </div>
                  ) : null}
                </section>
              ) : null}

              {step === 5 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Help us match you with the right opportunities</h4>

                  {renderRadioGroup({
                    name: "job_intent",
                    label: "Are you actively looking for a job?",
                    options: jobIntentOptions,
                    value: form.job_intent,
                    onChange,
                    required: true,
                    error: errors.job_intent,
                  })}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label="Current CTC (LPA - yearly)"
                      name="current_ctc"
                      value={form.current_ctc}
                      onChange={onChange}
                      placeholder="e.g. 7.5"
                    />
                    <Input
                      label="Expected CTC (LPA - yearly)"
                      name="expected_ctc"
                      value={form.expected_ctc}
                      onChange={onChange}
                      placeholder="e.g. 10.0"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Enter values in LPA only (example: 6.5, 7.5), not monthly or yearly rupee amount.
                  </p>

                  {renderRadioGroup({
                    name: "notice_period",
                    label: "Notice Period",
                    options: noticePeriodOptions,
                    value: form.notice_period,
                    onChange,
                    required: true,
                    error: errors.notice_period,
                  })}

                  {renderRadioGroup({
                    name: "currently_working",
                    label: "Are you currently working?",
                    options: ["Yes", "No"],
                    value: form.currently_working,
                    onChange,
                    required: true,
                    error: errors.currently_working,
                  })}
                </section>
              ) : null}

              {step === 6 ? (
                <section className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Before you proceed</h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    <p>This is a structured placement drive. You will go through:</p>
                    <ul className="mt-2 space-y-1">
                      <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 text-primary" />MCQ Round</li>
                      <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 text-primary" />Practical Task Round</li>
                      <li className="flex items-start gap-2"><FiArrowRight className="mt-0.5 h-4 w-4 text-primary" />1:1 Technical Evaluation</li>
                    </ul>
                  </div>

                  <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="commitment_full_drive"
                        checked={form.commitment_full_drive}
                        onChange={onChange}
                      />
                      <span>I will attend the full drive and complete all rounds <span className="text-rose-600">*</span></span>
                    </label>
                    {errors.commitment_full_drive ? (
                      <p className="text-xs text-red-600">{errors.commitment_full_drive}</p>
                    ) : null}

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="commitment_serious_roles"
                        checked={form.commitment_serious_roles}
                        onChange={onChange}
                      />
                      <span>I am serious about applying for Cloud / DevOps roles <span className="text-rose-600">*</span></span>
                    </label>
                    {errors.commitment_serious_roles ? (
                      <p className="text-xs text-red-600">{errors.commitment_serious_roles}</p>
                    ) : null}

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="commitment_selection_performance"
                        checked={form.commitment_selection_performance}
                        onChange={onChange}
                      />
                      <span>I understand that selection depends on my performance <span className="text-rose-600">*</span></span>
                    </label>
                    {errors.commitment_selection_performance ? (
                      <p className="text-xs text-red-600">{errors.commitment_selection_performance}</p>
                    ) : null}
                  </div>
                </section>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeRegistrationModal}>
                  Cancel
                </Button>

                <div className="flex items-center gap-2">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={goToPreviousStep}>
                      Back
                    </Button>
                  ) : null}
                  {step < STEP_COUNT ? (
                    <Button type="button" onClick={goToNextStep}>
                      Next
                    </Button>
                  ) : (
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Submitting..." : "Register for Cloud Drive"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </>
        )}
      </Modal>
    </div>
  );
}
