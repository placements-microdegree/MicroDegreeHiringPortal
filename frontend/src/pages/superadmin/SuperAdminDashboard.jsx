import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  FiActivity,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFilter,
  FiFileText,
  FiLayers,
  FiPieChart,
  FiRefreshCcw,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAnalytics } from "../../services/adminService";

const metricCardClass =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";

const chartCardClass =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";

const metricSkeletonIds = [
  "metric-skeleton-1",
  "metric-skeleton-2",
  "metric-skeleton-3",
  "metric-skeleton-4",
  "metric-skeleton-5",
  "metric-skeleton-6",
  "metric-skeleton-7",
  "metric-skeleton-8",
  "metric-skeleton-9",
  "metric-skeleton-10",
];

const skillSkeletonIds = [
  "skill-skeleton-1",
  "skill-skeleton-2",
  "skill-skeleton-3",
  "skill-skeleton-4",
  "skill-skeleton-5",
  "skill-skeleton-6",
];

const expirySkeletonIds = [
  "expiry-skeleton-1",
  "expiry-skeleton-2",
  "expiry-skeleton-3",
  "expiry-skeleton-4",
];

const activitySkeletonIds = [
  "activity-skeleton-1",
  "activity-skeleton-2",
  "activity-skeleton-3",
  "activity-skeleton-4",
  "activity-skeleton-5",
  "activity-skeleton-6",
];

const statusColors = {
  Applied: "#2563eb",
  Shortlisted: "#f59e0b",
  Interview: "#8b5cf6",
  Selected: "#16a34a",
  Rejected: "#ef4444",
};

const defaultAnalytics = {
  totalUsers: 0,
  totalStudents: 0,
  totalAdmins: 0,
  totalJobs: 0,
  activeJobs: 0,
  totalApplications: 0,
  newUsersToday: 0,
  applicationsToday: 0,
  quickApproximateDau: 0,
  accurateDau: null,
  accurateDauAvailable: false,
  dauDate: null,
  statusBreakdown: {
    Applied: 0,
    Shortlisted: 0,
    Interview: 0,
    Selected: 0,
    Rejected: 0,
  },
  usersGrowth: [],
  jobsPerDay: [],
  applicationsPerDay: [],
  recentActivities: [],
  eligibleVsNonEligible: {
    eligible: 0,
    nonEligible: 0,
  },
  studentsWithRemainingQuota: 0,
  topDemandedSkills: [],
  jobsExpiringSoon: [],
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildQuickRange(days) {
  const now = new Date();
  const toDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
  return {
    from: toDateKey(fromDate),
    to: toDateKey(toDate),
  };
}

function resolveDateRangeInput(fromDate, toDate) {
  const normalizedFrom = String(fromDate || "").trim();
  const normalizedTo = String(toDate || "").trim();

  if (!normalizedFrom && !normalizedTo) {
    return {
      range: { from: "", to: "" },
      error: "",
    };
  }

  if (!normalizedFrom || !normalizedTo) {
    return {
      range: null,
      error: "Please select both From and To dates.",
    };
  }

  if (normalizedFrom > normalizedTo) {
    return {
      range: null,
      error: "From date cannot be greater than To date.",
    };
  }

  return {
    range: { from: normalizedFrom, to: normalizedTo },
    error: "",
  };
}

function resolveChartContent({ loading, hasData, dataNode, emptyLabel }) {
  if (loading) {
    return <div className="h-64 animate-pulse rounded-lg bg-slate-100" />;
  }
  if (hasData) {
    return dataNode;
  }
  return <EmptyState label={emptyLabel} />;
}

function EmptyState({ label }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      {label}
    </div>
  );
}

EmptyState.propTypes = {
  label: PropTypes.string.isRequired,
};

function SkeletonMetricCard() {
  return (
    <div className={`${metricCardClass} animate-pulse`}>
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
      <div className="mt-3 h-3 w-28 rounded bg-slate-100" />
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, subtitle }) {
  return (
    <article className={metricCardClass}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
}

MetricCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-slate-900">
          <Icon className="h-4 w-4 text-slate-600" />
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

SectionHeader.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};

export default function SuperAdminDashboard() {
  const [analytics, setAnalytics] = useState(defaultAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filterError, setFilterError] = useState("");
  const [activeRange, setActiveRange] = useState({ from: "", to: "" });

  useEffect(() => {
    let mounted = true;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getAnalytics(activeRange);
        if (!mounted) return;
        const normalizedData = data && typeof data === "object" ? data : {};
        setAnalytics({ ...defaultAnalytics, ...normalizedData });
      } catch (err) {
        if (!mounted) return;
        setAnalytics(defaultAnalytics);
        setError(err?.message || "Failed to load analytics dashboard");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [activeRange]);

  const selectedRangeLabel = useMemo(() => {
    if (!activeRange.from || !activeRange.to) return "All-time analytics";
    return `${activeRange.from} to ${activeRange.to}`;
  }, [activeRange]);

  const applyFilter = () => {
    const result = resolveDateRangeInput(fromDate, toDate);
    setFilterError(result.error);
    if (!result.range) {
      return;
    }
    setActiveRange(result.range);
  };

  const resetFilter = () => {
    setFromDate("");
    setToDate("");
    setFilterError("");
    setActiveRange({ from: "", to: "" });
  };

  const applyQuickRange = (days) => {
    const range = buildQuickRange(days);
    setFromDate(range.from);
    setToDate(range.to);
    setFilterError("");
    setActiveRange(range);
  };

  const metricCards = useMemo(
    () => [
      {
        key: "total-users",
        title: "Total Users",
        value: formatNumber(analytics.totalUsers),
        subtitle: "All registered accounts",
        icon: FiUsers,
      },
      {
        key: "total-students",
        title: "Total Students",
        value: formatNumber(analytics.totalStudents),
        subtitle: "Student role profiles",
        icon: FiUserCheck,
      },
      {
        key: "total-admins",
        title: "Total Admins",
        value: formatNumber(analytics.totalAdmins),
        subtitle: "HR/Admin accounts",
        icon: FiUserPlus,
      },
      {
        key: "total-jobs",
        title: "Total Jobs",
        value: formatNumber(analytics.totalJobs),
        subtitle: "All jobs ever posted",
        icon: FiBriefcase,
      },
      {
        key: "active-jobs",
        title: "Active Jobs",
        value: formatNumber(analytics.activeJobs),
        subtitle: "Currently open jobs",
        icon: FiCheckCircle,
      },
      {
        key: "total-applications",
        title: "Total Applications",
        value: formatNumber(analytics.totalApplications),
        subtitle: "Platform-wide submissions",
        icon: FiFileText,
      },
      {
        key: "new-users-today",
        title: "New Users Today",
        value: formatNumber(analytics.newUsersToday),
        subtitle: "Signups in the last 24h",
        icon: FiCalendar,
      },
      {
        key: "applications-today",
        title: "Applications Today",
        value: formatNumber(analytics.applicationsToday),
        subtitle: "Fresh applications today",
        icon: FiActivity,
      },
      {
        key: "quick-approx-dau",
        title: "DAU (Quick Approx)",
        value: formatNumber(analytics.quickApproximateDau),
        subtitle: `Estimated for ${analytics.dauDate || "today"}`,
        icon: FiClock,
      },
      {
        key: "accurate-dau",
        title: "DAU (Accurate)",
        value:
          analytics.accurateDauAvailable && analytics.accurateDau !== null
            ? formatNumber(analytics.accurateDau)
            : "-",
        subtitle: analytics.accurateDauAvailable
          ? `Tracked for ${analytics.dauDate || "today"}`
          : "Run DAU migration to enable",
        icon: FiCheckCircle,
      },
    ],
    [analytics],
  );

  const pieData = useMemo(() => {
    return Object.entries(analytics.statusBreakdown || {}).map(
      ([name, value]) => ({
        name,
        value: Number(value || 0),
        fill: statusColors[name] || "#94a3b8",
      }),
    );
  }, [analytics.statusBreakdown]);

  const hasPieData = pieData.some((item) => item.value > 0);

  let metricCardsSection = metricCards.map((card) => (
    <MetricCard
      key={card.key}
      icon={card.icon}
      title={card.title}
      value={card.value}
      subtitle={card.subtitle}
    />
  ));
  if (loading) {
    metricCardsSection = metricSkeletonIds.map((id) => (
      <SkeletonMetricCard key={id} />
    ));
  }

  const userGrowthSection = resolveChartContent({
    loading,
    hasData: Boolean(analytics.usersGrowth?.length),
    dataNode: (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analytics.usersGrowth}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ),
    emptyLabel: "No user growth data available yet.",
  });

  const pieChartSection = resolveChartContent({
    loading,
    hasData: hasPieData,
    dataNode: (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="48%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            />
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ),
    emptyLabel: "No application status data available yet.",
  });

  const jobsPerDaySection = resolveChartContent({
    loading,
    hasData: Boolean(analytics.jobsPerDay?.length),
    dataNode: (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.jobsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="jobs" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ),
    emptyLabel: "No jobs timeline data available yet.",
  });

  const applicationsTrendSection = resolveChartContent({
    loading,
    hasData: Boolean(analytics.applicationsPerDay?.length),
    dataNode: (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analytics.applicationsPerDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="applications"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ),
    emptyLabel: "No applications trend data available yet.",
  });

  let topSkillsSection = (
    <EmptyState label="No skill demand data available yet." />
  );
  if (loading) {
    topSkillsSection = (
      <div className="space-y-2">
        {skillSkeletonIds.map((id) => (
          <div
            key={id}
            className="h-10 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  } else if (analytics.topDemandedSkills?.length) {
    topSkillsSection = (
      <div className="space-y-2">
        {analytics.topDemandedSkills.map((item) => (
          <div
            key={item.skill}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="text-sm font-medium capitalize text-slate-800">
              {item.skill}
            </span>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              {formatNumber(item.count)} jobs
            </span>
          </div>
        ))}
      </div>
    );
  }

  let expiringJobsSection = <EmptyState label="No jobs expiring soon." />;
  if (loading) {
    expiringJobsSection = (
      <div className="space-y-2">
        {expirySkeletonIds.map((id) => (
          <div
            key={id}
            className="h-14 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  } else if (analytics.jobsExpiringSoon?.length) {
    expiringJobsSection = (
      <div className="space-y-2">
        {analytics.jobsExpiringSoon.map((job) => (
          <div
            key={job.id}
            className="rounded-lg border border-slate-200 px-3 py-2"
          >
            <p className="text-sm font-semibold text-slate-900">
              {job.title || "Untitled Job"}
            </p>
            <p className="text-xs text-slate-500">
              {job.company || "Unknown Company"}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Expires on {formatDate(job.validTill)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  let activitiesSection = <EmptyState label="No recent activity found." />;
  if (loading) {
    activitiesSection = (
      <div className="space-y-2">
        {activitySkeletonIds.map((id) => (
          <div
            key={id}
            className="h-12 animate-pulse rounded-lg bg-slate-100"
          />
        ))}
      </div>
    );
  } else if (analytics.recentActivities?.length) {
    activitiesSection = (
      <div className="space-y-2">
        {analytics.recentActivities.map((activity) => (
          <div
            key={`${activity.type}-${activity.createdAt}-${activity.description}`}
            className="flex flex-col gap-1 rounded-lg border border-slate-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activity.title}
              </p>
              <p className="text-xs text-slate-600">{activity.description}</p>
            </div>
            <p className="text-xs text-slate-500">
              {formatDateTime(activity.createdAt)}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              Super Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Platform health, growth, and hiring analytics at a glance.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {selectedRangeLabel}
            </p>
          </div>
        </div>
        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FiFilter className="h-4 w-4" />
          Date Range Filter
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={applyFilter}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={resetFilter}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiRefreshCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={() => applyQuickRange(1)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(7)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => applyQuickRange(30)}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {filterError ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            {filterError}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCardsSection}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className={`${chartCardClass} xl:col-span-2`}>
          <SectionHeader
            icon={FiTrendingUp}
            title="User Growth Over Time"
            subtitle={`Daily registrations trend (${selectedRangeLabel})`}
          />
          {userGrowthSection}
        </article>

        <article className={chartCardClass}>
          <SectionHeader
            icon={FiPieChart}
            title="Application Status"
            subtitle="Distribution by hiring stage"
          />
          {pieChartSection}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className={`${chartCardClass} xl:col-span-2`}>
          <SectionHeader
            icon={FiLayers}
            title="Jobs Posted Per Day"
            subtitle={`Daily posting volume (${selectedRangeLabel})`}
          />
          {jobsPerDaySection}
        </article>

        <article className={chartCardClass}>
          <SectionHeader
            icon={FiClock}
            title="Eligibility Insights"
            subtitle="Student readiness and quota usage"
          />
          {loading ? (
            <div className="space-y-3">
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Eligible Students
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(analytics.eligibleVsNonEligible?.eligible)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Non-eligible Students
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(analytics.eligibleVsNonEligible?.nonEligible)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Students With Remaining Quota
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatNumber(analytics.studentsWithRemainingQuota)}
                </p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section>
        <article className={chartCardClass}>
          <SectionHeader
            icon={FiActivity}
            title="Applications Trend"
            subtitle={`Daily applications trend (${selectedRangeLabel})`}
          />
          {applicationsTrendSection}
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className={chartCardClass}>
          <SectionHeader
            icon={FiTrendingUp}
            title="Top Demanded Skills"
            subtitle="Most frequent skills in recent job postings"
          />
          {topSkillsSection}
        </article>

        <article className={chartCardClass}>
          <SectionHeader
            icon={FiCalendar}
            title="Jobs Expiring Soon"
            subtitle="Active jobs expiring in the next 7 days"
          />
          {expiringJobsSection}
        </article>
      </section>

      <section>
        <article className={chartCardClass}>
          <SectionHeader
            icon={FiActivity}
            title="Recent Activity"
            subtitle="Latest user, job, and application events"
          />
          {activitiesSection}
        </article>
      </section>
    </div>
  );
}
