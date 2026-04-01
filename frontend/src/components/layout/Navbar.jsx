import Button from "../common/Button";
import PropTypes from "prop-types";
import {
  FiMenu,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import NotificationBell from "./NotificationBell";

const WHATSAPP_JOB_ALERTS_URL =
  "https://whatsapp.com/channel/0029VbBni2CHFxPA411oCA2U";

// ── EligibilityBadge ──────────────────────────────────────────────────────────

function EligibilityBadge({ isEligible, applicationQuota }) {
  if (isEligible === true) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
        <FiCheckCircle className="h-3.5 w-3.5" />
        Eligible
      </span>
    );
  }

  const quota = Number(applicationQuota ?? 0);

  if (quota > 0) {
    return (
      <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        <FiAlertCircle className="h-3.5 w-3.5" />
        Quota: {quota}
      </span>
    );
  }

  return (
    <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
      <FiXCircle className="h-3.5 w-3.5" />
      Not Eligible
    </span>
  );
}

function NavbarTitle({ title, onMenuClick }) {
  return (
    <div className="flex min-w-0 items-center gap-2 md:gap-3">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 md:hidden"
      >
        <FiMenu className="h-5 w-5" />
      </button>
      <div className="truncate text-sm font-semibold text-slate-900 md:text-base">
        {title}
      </div>
    </div>
  );
}

function NavbarActionSection({ actionButton }) {
  if (!actionButton?.label || !actionButton?.href) return null;

  return (
    <a
      href={actionButton.href}
      target={actionButton.target || "_self"}
      rel={actionButton.target === "_blank" ? "noopener noreferrer" : undefined}
      className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/15"
    >
      {actionButton.label}
    </a>
  );
}

function NavbarProfileSection({
  profilePhotoUrl,
  studentName,
  onProfileClick,
  isEligible,
  applicationQuota,
  completionPercent,
  showJobAlertsCta,
}) {
  const safePercent = Math.max(
    0,
    Math.min(100, Number(completionPercent) || 0),
  );
  const showCompletion =
    completionPercent !== null && completionPercent !== undefined;
  const shouldShowEligibilityBadge =
    isEligible !== undefined || applicationQuota !== undefined;
  const shouldShowJobAlertsCta = showJobAlertsCta && isEligible === true;
  const ringStyle = showCompletion
    ? {
        background: `conic-gradient(var(--color-primary, #2563eb) ${safePercent * 3.6}deg, #e2e8f0 0deg)`,
      }
    : undefined;

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {shouldShowJobAlertsCta ? (
        <a
          href={WHATSAPP_JOB_ALERTS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          aria-label="Get job alerts on WhatsApp"
        >
          <FaWhatsapp className="h-4 w-4" />
          Get Job Alerts
        </a>
      ) : null}

      {/* Eligibility status — shown only when props are provided */}
      {shouldShowEligibilityBadge ? (
        <EligibilityBadge
          isEligible={isEligible}
          applicationQuota={applicationQuota}
        />
      ) : null}

      {/* Notification bell */}
      <NotificationBell />

      {/* Profile button */}
      <Button
        variant="subtle"
        onClick={onProfileClick}
        className="gap-2 px-2 py-1.5 md:gap-3 md:px-4 md:py-2"
      >
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${showCompletion ? "p-0.5" : "overflow-hidden bg-slate-200"}`}
          style={ringStyle}
        >
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
            <div className="h-7.5 w-7.5 overflow-hidden rounded-full bg-slate-200">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
          </div>
        </div>
        <div className="hidden text-left sm:block">
          <div className="text-sm font-semibold text-slate-800">
            {studentName}
          </div>
          <div className="text-xs text-slate-500">Student</div>
        </div>
      </Button>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar({
  title,
  profilePhotoUrl,
  studentName = "Student",
  onProfileClick,
  onMenuClick,
  showProfile = true,
  completionPercent = null,
  // new props for eligibility
  isEligible,
  applicationQuota,
  showJobAlertsCta = false,
  actionButton,
}) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-3 md:px-6 md:py-4">
      <NavbarTitle title={title} onMenuClick={onMenuClick} />

      {showProfile ? (
        <NavbarProfileSection
          profilePhotoUrl={profilePhotoUrl}
          studentName={studentName}
          onProfileClick={onProfileClick}
          isEligible={isEligible}
          applicationQuota={applicationQuota}
          completionPercent={completionPercent}
          showJobAlertsCta={showJobAlertsCta}
        />
      ) : (
        <div className="flex items-center gap-2">
          <NavbarActionSection actionButton={actionButton} />
        </div>
      )}
    </header>
  );
}

EligibilityBadge.propTypes = {
  isEligible: PropTypes.bool,
  applicationQuota: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

NavbarTitle.propTypes = {
  title: PropTypes.string,
  onMenuClick: PropTypes.func,
};

NavbarActionSection.propTypes = {
  actionButton: PropTypes.shape({
    label: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string,
  }),
};

NavbarProfileSection.propTypes = {
  profilePhotoUrl: PropTypes.string,
  studentName: PropTypes.string,
  onProfileClick: PropTypes.func,
  isEligible: PropTypes.bool,
  applicationQuota: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  completionPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  showJobAlertsCta: PropTypes.bool,
};

Navbar.propTypes = {
  title: PropTypes.string,
  profilePhotoUrl: PropTypes.string,
  studentName: PropTypes.string,
  onProfileClick: PropTypes.func,
  onMenuClick: PropTypes.func,
  showProfile: PropTypes.bool,
  completionPercent: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  isEligible: PropTypes.bool,
  applicationQuota: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  showJobAlertsCta: PropTypes.bool,
  actionButton: PropTypes.shape({
    label: PropTypes.string,
    href: PropTypes.string,
    target: PropTypes.string,
  }),
};
