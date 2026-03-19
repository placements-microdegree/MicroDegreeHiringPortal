// FILE: src/components/common/NotificationBell.jsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell } from "react-icons/fi";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";

function formatRelativeTime(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes <= 0) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString();
}

function isRead(notification) {
  if (typeof notification?.is_read === "boolean") return notification.is_read;
  return Boolean(notification?.isRead);
}

function parseJobInfo(notification) {
  const message = String(notification?.message || "");
  const roleRegex = /Role:\s*([^.]+)/i;
  const companyRegex = /Company:\s*([^.]+)/i;
  const experienceRegex = /Experience:\s*([^.]+)/i;

  const roleFromMessage = (roleRegex.exec(message)?.[1] || "").trim();
  const companyFromMessage = (companyRegex.exec(message)?.[1] || "").trim();
  const expFromMessage = (experienceRegex.exec(message)?.[1] || "").trim();

  return {
    role:
      String(notification?.job_role || "").trim() || roleFromMessage || null,
    company:
      String(notification?.job_company || "").trim() ||
      companyFromMessage ||
      null,
    experience:
      String(notification?.job_experience || "").trim() ||
      expFromMessage ||
      null,
  };
}

function getNotificationMessage(notification) {
  const message = String(notification?.message || "").trim();
  if (!message) return "";

  if (String(notification?.type || "").toLowerCase() === "job_posted") {
    return message
      .replace(/New job\s+"[^"]+"\s+has been posted\.?\s*/i, "")
      .trim();
  }

  return message;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !isRead(item)).length,
    [notifications],
  );

  const refreshNotifications = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const rows = await listNotifications();
      setNotifications(Array.isArray(rows) ? rows : []);
      setErrorMessage("");
    } catch (error) {
      if (!silent) {
        setNotifications([]);
        setErrorMessage(error?.message || "Failed to load notifications.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const intervalId = setInterval(() => {
      refreshNotifications({ silent: true });
    }, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [refreshNotifications]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggleOpen = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) refreshNotifications({ silent: true });
  };

  const onNotificationClick = async (notification) => {
    if (!notification?.id) return;

    const targetId = notification.id;
    if (!isRead(notification)) {
      setMarkingId(targetId);
      setNotifications((prev) =>
        prev.map((row) =>
          row.id === targetId ? { ...row, is_read: true, isRead: true } : row,
        ),
      );
      try {
        await markNotificationRead(targetId);
      } catch {
        refreshNotifications({ silent: true });
      } finally {
        setMarkingId("");
      }
    }

    setOpen(false);
    navigate("/student/jobs");
  };

  const onMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    setNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true, isRead: true })),
    );

    try {
      await markAllNotificationsRead();
    } catch {
      refreshNotifications({ silent: true });
    } finally {
      setMarkingAll(false);
    }
  };

  let dropdownBody = (
    <ul className="space-y-2">
      {notifications.map((notification) => {
        const rowRead = isRead(notification);
        const jobInfo = parseJobInfo(notification);
        const messageText = getNotificationMessage(notification);
        return (
          <li key={notification.id}>
            <button
              type="button"
              onClick={() => onNotificationClick(notification)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                rowRead
                  ? "border-slate-200 bg-white hover:bg-slate-50"
                  : "border-blue-100 bg-blue-50/70 hover:bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  {notification.title || "Notification"}
                </div>
                <span className="shrink-0 text-[11px] text-slate-500">
                  {formatRelativeTime(notification.created_at)}
                </span>
              </div>
              {messageText ? (
                <div className="mt-1 text-sm text-slate-600">{messageText}</div>
              ) : null}
              {(jobInfo.company || jobInfo.role || jobInfo.experience) && (
                <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                  {jobInfo.company ? (
                    <div>
                      <span className="font-semibold text-slate-900">
                        Company:
                      </span>{" "}
                      {jobInfo.company}
                    </div>
                  ) : null}
                  {jobInfo.role ? (
                    <div>
                      <span className="font-semibold text-slate-900">
                        Role:
                      </span>{" "}
                      {jobInfo.role}
                    </div>
                  ) : null}
                  {jobInfo.experience ? (
                    <div>
                      <span className="font-semibold text-slate-900">
                        Experience:
                      </span>{" "}
                      {jobInfo.experience}
                    </div>
                  ) : null}
                </div>
              )}
              {markingId === notification.id && (
                <div className="mt-1 text-xs text-primary">
                  Marking as read...
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (loading) {
    dropdownBody = (
      <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-600">
        Loading notifications...
      </div>
    );
  } else if (errorMessage) {
    dropdownBody = (
      <div className="rounded-xl bg-red-50 px-3 py-4 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  } else if (notifications.length === 0) {
    dropdownBody = (
      <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-600">
        No notifications yet.
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-primary hover:text-primary"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/*
        Dropdown positioning:
        — Desktop (sm+): anchor to right edge of bell button  → right-0
        — Mobile       : fixed to viewport, full width with margin → fixed inset-x-3 top-[calc(...)]
          We use a wrapping div with `sm:absolute sm:right-0 sm:w-80`
          and on mobile switch to `fixed` so it can never overflow the screen.
      */}
      <div
        className={`
          fixed left-3 right-3 z-50 mt-3 top-16
          sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-80
          rounded-2xl border border-slate-200 bg-white p-3 shadow-xl
          transition-all duration-200 ease-out
          ${
            open
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }
        `}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Notifications
          </h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {unreadCount} unread
              </span>
            )}
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0 || markingAll}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto pr-1">{dropdownBody}</div>
      </div>
    </div>
  );
}
