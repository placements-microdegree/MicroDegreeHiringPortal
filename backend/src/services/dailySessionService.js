const { getSupabaseAdmin, getSupabaseAnon } = require("../config/db");

const DAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function getReadClient() {
  return getSupabaseAdmin() || getSupabaseAnon();
}

function getWriteClient() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const err = new Error("Admin DB client not configured");
    err.status = 500;
    throw err;
  }
  return supabase;
}

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function normalizeJoinMode(value) {
  const normalized = normalizeText(value || "api").toLowerCase();
  return normalized === "link" ? "link" : "api";
}

function hasAnyKey(source, keys) {
  return keys.some((key) => key in source);
}

function readFirstPresentValue(source, keys) {
  for (const key of keys) {
    if (key in source) return source[key];
  }
  return undefined;
}

function writeNormalizedField({
  source,
  row,
  partial,
  sourceKeys,
  targetKey,
  transform = normalizeText,
}) {
  if (partial && !hasAnyKey(source, sourceKeys)) return;
  row[targetKey] = transform(readFirstPresentValue(source, sourceKeys));
}

function mapSessionRow(row) {
  return {
    id: String(row?.id || ""),
    title: normalizeText(row?.title),
    topic: normalizeText(row?.title),
    meetingId: normalizeText(row?.meeting_id),
    passcode: normalizeText(row?.passcode),
    registrationLink: normalizeText(row?.registration_link),
    time: normalizeText(row?.session_time),
    days: normalizeText(row?.days),
    afterButtonNote: normalizeText(row?.after_button_note),
    enabled: row?.is_active === true,
    joinMode: normalizeJoinMode(row?.join_mode),
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  };
}

function normalizeSessionWritePayload(payload, { partial = false } = {}) {
  const source = payload && typeof payload === "object" ? payload : {};
  const row = {};

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["title", "topic"],
    targetKey: "title",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["days"],
    targetKey: "days",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["meetingId", "meeting_id"],
    targetKey: "meeting_id",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["passcode"],
    targetKey: "passcode",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["time", "session_time"],
    targetKey: "session_time",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["registrationLink", "registration_link"],
    targetKey: "registration_link",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["afterButtonNote", "after_button_note"],
    targetKey: "after_button_note",
  });

  writeNormalizedField({
    source,
    row,
    partial,
    sourceKeys: ["joinMode", "join_mode"],
    targetKey: "join_mode",
    transform: normalizeJoinMode,
  });

  if (!partial || hasAnyKey(source, ["enabled", "is_active"])) {
    const rawEnabled = "enabled" in source ? source.enabled : source.is_active;
    row.is_active = rawEnabled === true;
  }

  if (!partial) {
    if (!row.title) {
      const err = new Error("title is required");
      err.status = 400;
      throw err;
    }
    if (!row.days) {
      const err = new Error("days is required");
      err.status = 400;
      throw err;
    }
    if (!row.meeting_id) {
      const err = new Error("meetingId is required");
      err.status = 400;
      throw err;
    }
    if (!row.session_time) {
      const err = new Error("time is required");
      err.status = 400;
      throw err;
    }
  }

  return row;
}

function parseActiveDays(daysText) {
  const text = normalizeText(daysText).toLowerCase();
  if (!text || text === "daily") return new Set([0, 1, 2, 3, 4, 5, 6]);

  const days = new Set();
  text
    .split(",")
    .map((part) => normalizeText(part).toLowerCase())
    .forEach((part) => {
      const normalized = part.replaceAll(".", "");
      const matchedKey = Object.keys(DAY_INDEX).find(
        (key) =>
          key.startsWith(normalized) || normalized.startsWith(key.slice(0, 3)),
      );

      if (matchedKey) {
        days.add(DAY_INDEX[matchedKey]);
      }
    });

  return days;
}

function parseClockTime(referenceDate, value) {
  const match = /(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)/i.exec(normalizeText(value));
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

function getSessionJoinAvailability(session, now = new Date()) {
  if (session?.enabled !== true) {
    return {
      canJoin: false,
      message: "Session is currently disabled",
    };
  }

  const activeDays = parseActiveDays(session?.days);
  if (!activeDays.has(now.getDay())) {
    return {
      canJoin: false,
      message:
        "Registration successful. Join will be available only on the session day.",
    };
  }

  const [startText = "", endText = ""] = normalizeText(session?.time).split(
    "to",
  );
  const startAt = parseClockTime(now, normalizeText(startText));
  const endAt = parseClockTime(now, normalizeText(endText));

  if (!startAt) {
    return {
      canJoin: true,
      message: "",
    };
  }

  const joinWindowStart = new Date(startAt.getTime() - 30 * 60 * 1000);
  if (now < joinWindowStart) {
    return {
      canJoin: false,
      message:
        "Registration successful. Join will be enabled 30 minutes before the session starts.",
    };
  }

  if (endAt && now > endAt) {
    return {
      canJoin: false,
      message: "Registration successful. This session has ended for today.",
    };
  }

  return {
    canJoin: true,
    message: "",
  };
}

async function listDailySessions() {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("daily_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map(mapSessionRow);
}

async function getDailySessionById(sessionId) {
  const normalizedSessionId = normalizeText(sessionId);
  if (!normalizedSessionId) return null;

  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("id", normalizedSessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapSessionRow(data);
}

async function createDailySession(payload, { updatedBy } = {}) {
  const supabase = getWriteClient();
  const row = normalizeSessionWritePayload(payload, { partial: false });

  row.updated_at = new Date().toISOString();
  if (updatedBy) {
    row.created_by = updatedBy;
    row.updated_by = updatedBy;
  }

  const { data, error } = await supabase
    .from("daily_sessions")
    .insert([row])
    .select("*")
    .single();

  if (error) throw error;
  return mapSessionRow(data);
}

async function updateDailySession(sessionId, payload, { updatedBy } = {}) {
  const normalizedSessionId = normalizeText(sessionId);
  if (!normalizedSessionId) {
    const err = new Error("session id is required");
    err.status = 400;
    throw err;
  }

  const row = normalizeSessionWritePayload(payload, { partial: true });
  if (Object.keys(row).length === 0) {
    const err = new Error("No fields provided for update");
    err.status = 400;
    throw err;
  }

  row.updated_at = new Date().toISOString();
  if (updatedBy) {
    row.updated_by = updatedBy;
  }

  const supabase = getWriteClient();
  const { data, error } = await supabase
    .from("daily_sessions")
    .update(row)
    .eq("id", normalizedSessionId)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    const err = new Error("Session not found");
    err.status = 404;
    throw err;
  }

  return mapSessionRow(data);
}

async function updateDailySessionStatus(
  sessionId,
  enabled,
  { updatedBy } = {},
) {
  return updateDailySession(
    sessionId,
    { enabled: enabled === true },
    { updatedBy },
  );
}

async function updateDailySessionsSettings(payload, { updatedBy } = {}) {
  const incoming = Array.isArray(payload?.sessions) ? payload.sessions : null;
  if (!incoming) {
    const err = new Error("sessions array is required");
    err.status = 400;
    throw err;
  }

  const supabase = getWriteClient();

  for (const session of incoming) {
    const normalizedSessionId = normalizeText(session?.id);
    if (!normalizedSessionId) continue;

    const row = normalizeSessionWritePayload(session, { partial: true });
    if (Object.keys(row).length === 0) continue;

    row.updated_at = new Date().toISOString();
    if (updatedBy) {
      row.updated_by = updatedBy;
    }

    const { error } = await supabase
      .from("daily_sessions")
      .update(row)
      .eq("id", normalizedSessionId);

    if (error) throw error;
  }

  return listDailySessions();
}

module.exports = {
  listDailySessions,
  getDailySessionById,
  createDailySession,
  updateDailySession,
  updateDailySessionStatus,
  updateDailySessionsSettings,
  getSessionJoinAvailability,
};
