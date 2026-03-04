import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiBell } from "react-icons/fi";
import {
  listNotifications,
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

export default function NotificationBell() {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [markingId, setMarkingId] = useState("");

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
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
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
    if (nextOpen) {
      refreshNotifications({ silent: true });
    }
  };

  const onNotificationClick = async (notification) => {
    if (!notification?.id || isRead(notification)) return;

    const targetId = notification.id;
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
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggleOpen}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-primary hover:text-primary"
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      <div
        className={`absolute right-0 z-40 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl transition-all duration-200 ease-out ${open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {unreadCount} unread
            </span>
          ) : null}
        </div>

        <div className="max-h-80 overflow-y-auto pr-1">
          {loading ? (
            <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-600">
              Loading notifications...
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl bg-red-50 px-3 py-4 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-600">
              No notifications yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {notifications.map((notification) => {
                const rowRead = isRead(notification);
                return (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => onNotificationClick(notification)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${rowRead ? "border-slate-200 bg-white hover:bg-slate-50" : "border-blue-100 bg-blue-50/70 hover:bg-blue-50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">
                          {notification.title || "Notification"}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {notification.message || "You have a new update."}
                      </div>
                      {markingId === notification.id ? (
                        <div className="mt-1 text-xs text-primary">
                          Marking as read...
                        </div>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
