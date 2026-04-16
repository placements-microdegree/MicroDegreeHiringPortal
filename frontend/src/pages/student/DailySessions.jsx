import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { FiClock, FiVideo, FiCalendar, FiLock } from "react-icons/fi";
import {
  joinTestingSession,
  listDailySessions,
} from "../../services/dailySessionService";

const DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function parseActiveDays(daysText) {
  const text = String(daysText || "")
    .trim()
    .toLowerCase();
  if (!text || text === "daily") return new Set([0, 1, 2, 3, 4, 5, 6]);

  const days = new Set();
  text
    .split(",")
    .map((part) => part.trim())
    .forEach((part) => {
      const normalized = part.replaceAll(".", "");
      const matchedKey = Object.keys(DAY_INDEX).find(
        (key) =>
          key.startsWith(normalized) || normalized.startsWith(key.slice(0, 3)),
      );
      if (matchedKey) days.add(DAY_INDEX[matchedKey]);
    });

  return days;
}

function parseClockTime(referenceDate, value) {
  const match = /(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i.exec(String(value || ""));
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = String(match[3] || "").toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  const date = new Date(referenceDate);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getDisabledSessionState() {
  return {
    cardClass: "border-slate-200 bg-slate-50 opacity-90",
    badgeClass: "bg-slate-200 text-slate-700",
    badgeText: "Not Live Yet",
    buttonLabel: "Will Be Live Soon",
    buttonDisabled: true,
    buttonHref: "",
    buttonAction: "link",
  };
}

function getUpcomingSessionState(activeDays, now) {
  const nextDay = getNextSessionDayLabel(activeDays, now.getDay());
  return {
    cardClass: "border-slate-200 bg-white",
    badgeClass: "bg-blue-100 text-blue-700",
    badgeText: nextDay ? `Next: ${nextDay}` : "Upcoming",
    buttonLabel: nextDay ? `Join On ${nextDay}` : "Upcoming Session",
    buttonDisabled: true,
    buttonHref: "",
    buttonAction: "link",
  };
}

function getTodaySessionState({
  now,
  startAt,
  endAt,
  hasJoinLink,
  registrationLink,
  isApiJoin,
}) {
  const joinEarlyWindowMs = 30 * 60 * 1000;

  if (startAt && now < startAt) {
    const countdownMs = startAt.getTime() - now.getTime();
    const canJoinEarly = countdownMs <= joinEarlyWindowMs;
    return {
      cardClass: "border-amber-200 bg-amber-50/40",
      badgeClass: "bg-amber-100 text-amber-800",
      badgeText: `Starts in ${formatCountdown(countdownMs)}`,
      buttonLabel: canJoinEarly
        ? `Join Session • Starts In ${formatCountdown(countdownMs)}`
        : `Join Opens In ${formatCountdown(countdownMs)}`,
      buttonDisabled: !canJoinEarly || !hasJoinLink,
      buttonHref: canJoinEarly ? registrationLink : "",
      buttonAction: canJoinEarly && isApiJoin ? "api" : "link",
    };
  }

  if (!endAt || now <= endAt) {
    return {
      cardClass: "border-emerald-200 bg-emerald-50/40",
      badgeClass: "bg-emerald-100 text-emerald-700",
      badgeText: "Live Today",
      buttonLabel: "Join Live Session",
      buttonDisabled: !hasJoinLink,
      buttonHref: registrationLink,
      buttonAction: isApiJoin ? "api" : "link",
    };
  }

  return {
    cardClass: "border-slate-200 bg-slate-50",
    badgeClass: "bg-slate-200 text-slate-700",
    badgeText: "Session Ended Today",
    buttonLabel: "Session Ended For Today",
    buttonDisabled: true,
    buttonHref: "",
    buttonAction: "link",
  };
}

function getSessionState(session, now) {
  const isEnabled = session?.enabled === true;
  const activeDays = parseActiveDays(session?.days);
  const isScheduledToday = activeDays.has(now.getDay());

  const [startText = "", endText = ""] = String(session?.time || "").split(
    "to",
  );
  const startAt = parseClockTime(now, startText.trim());
  const endAt = parseClockTime(now, endText.trim());

  const registrationLink = String(session?.registrationLink || "").trim();
  const isApiJoin = String(session?.joinMode || "").trim() === "api";
  const hasJoinLink = Boolean(registrationLink) || isApiJoin;

  if (!isEnabled) {
    return getDisabledSessionState();
  }

  if (isScheduledToday) {
    return getTodaySessionState({
      now,
      startAt,
      endAt,
      hasJoinLink,
      registrationLink,
      isApiJoin,
    });
  }

  return getUpcomingSessionState(activeDays, now);
}

function getNextSessionDayLabel(activeDays, currentDay) {
  if (!activeDays || activeDays.size === 0) return "";
  for (let offset = 1; offset <= 7; offset += 1) {
    const dayIndex = (currentDay + offset) % 7;
    if (activeDays.has(dayIndex)) return DAY_LABELS[dayIndex];
  }
  return "";
}

function formatCountdown(ms) {
  const safe = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function SessionCard({ session, now }) {
  const state = getSessionState(session, now);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const hasAfterButtonNote = Boolean(
    String(session?.afterButtonNote || "").trim(),
  );

  const onJoinNow = async () => {
    if (state.buttonDisabled || joining) return;

    if (state.buttonAction === "api") {
      setJoining(true);
      setJoinError("");
      try {
        const joinUrl = await joinTestingSession(session?.id);
        globalThis.location.href = joinUrl;
      } catch (err) {
        setJoinError(err?.message || "Failed to join live class");
      } finally {
        setJoining(false);
      }
      return;
    }

    if (state.buttonHref) {
      globalThis.open(state.buttonHref, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition ${state.cardClass}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {session?.topic || "Session"}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{session?.days || "-"}</p>
        </div>
        <span
          className={`inline-flex shrink-0 self-start items-center rounded-full px-2.5 py-1 text-xs font-semibold ${state.badgeClass}`}
        >
          {state.badgeText}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <div className="flex items-center gap-2">
          <FiCalendar className="h-4 w-4 text-slate-500" />
          <span>Meeting ID: {session?.meetingId || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiLock className="h-4 w-4 text-slate-500" />
          <span>Passcode: {session?.passcode || "-"}</span>
        </div>
        <div className="flex items-center gap-2">
          <FiClock className="h-4 w-4 text-slate-500" />
          <span>Time: {session?.time || "-"}</span>
        </div>
      </div>

      <div className="mt-5">
        {state.buttonDisabled ? (
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <FiVideo className="h-4 w-4" />
            {state.buttonLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onJoinNow}
            disabled={joining}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-80"
          >
            <FiVideo className="h-4 w-4" />
            {joining ? "Joining..." : state.buttonLabel}
          </button>
        )}

        {hasAfterButtonNote ? (
          <p className="mt-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-800">
            {session.afterButtonNote}
          </p>
        ) : null}

        {joinError ? (
          <p className="mt-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700">
            {joinError}
          </p>
        ) : null}
      </div>
    </article>
  );
}

SessionCard.propTypes = {
  now: PropTypes.instanceOf(Date).isRequired,
  session: PropTypes.shape({
    id: PropTypes.string,
    topic: PropTypes.string,
    days: PropTypes.string,
    time: PropTypes.string,
    meetingId: PropTypes.string,
    passcode: PropTypes.string,
    registrationLink: PropTypes.string,
    joinMode: PropTypes.string,
    afterButtonNote: PropTypes.string,
    enabled: PropTypes.bool,
  }).isRequired,
};

export default function DailySessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await listDailySessions();
        if (active) setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) {
          setSessions([]);
          setError(err?.message || "Failed to load daily sessions");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading daily sessions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              Live Career Assistance Sessions
            </h1>
            <ul className="mt-2 hidden list-disc space-y-1 pl-5 text-sm text-slate-600 md:block">
              <li>
                Stay aligned with your career progress through all live sessions
                conducted by the Career Assistance Team at MicroDegree.
              </li>
              <li>
                These sessions cover job search strategy, mentor-led guidance,
                debugging support, and weekend interview preparation.
              </li>
              <li>
                Regular participation is mandatory, and your attendance directly
                impacts your interview readiness and progress.
              </li>
              <li>
                Join on time, stay active, and take ownership of your career
                journey.
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900 lg:max-w-sm">
            <p className="font-semibold">How It Works</p>
            <p className="mt-1 text-blue-800">
              The join button unlocks 30 minutes before the start time on the
              session day, then stays available during the live session.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} now={now} />
        ))}
      </section>
    </div>
  );
}
