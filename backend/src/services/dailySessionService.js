const fs = require("fs/promises");
const path = require("path");

const SETTINGS_FILE_PATH = path.join(
  __dirname,
  "../../data/dailySessions.settings.json",
);

const DEFAULT_SESSIONS = [
  {
    id: "daily-tech-session",
    topic: "Daily Tech Quiz Series",
    meetingId: "836 5924 5933",
    passcode: "249030",
    registrationLink:
      "https://us06web.zoom.us/meeting/register/qDJHRDtjROeU-GwBcWCHKA",
    time: "7:00 PM to 8:00 PM",
    days: "Daily",
    afterButtonNote: "",
    enabled: true,
  },
  {
    id: "debugging-session",
    topic: "Debugging Session",
    meetingId: "825 9316 3998",
    passcode: "",
    registrationLink:
      "https://us06web.zoom.us/j/82593163998?pwd=8rIBbevHm9MeLwNlft04YZMIB8RzcW.1",
    time: "8:00 PM to 9:00 PM",
    days: "Wednesday, Thursday",
    afterButtonNote: "Wednesday: Practical Test  • Thursday: Mock Interviews",
    enabled: true,
  },
  {
    id: "weekend-webinar-sessions",
    topic: "Weekend Interview Prep",
    meetingId: "853 4677 5909",
    passcode: "102124",
    registrationLink:
      "https://us06web.zoom.us/j/85346775909?pwd=eOl8xnRzZ5TXi3p1rXOBanwH1X8XgL.1",
    time: "10:00 AM to 12:00 PM",
    days: "Sunday",
    afterButtonNote: "Sunday Mornings (2-hour Technical or HR Interview Prep)",
    enabled: true,
  },
];

function normalizeSessions(inputSessions) {
  const source = Array.isArray(inputSessions) ? inputSessions : [];
  return DEFAULT_SESSIONS.map((defaultSession) => {
    const matching = source.find(
      (item) => String(item?.id || "").trim() === defaultSession.id,
    );

    return {
      ...defaultSession,
      enabled:
        typeof matching?.enabled === "boolean"
          ? matching.enabled
          : defaultSession.enabled,
    };
  });
}

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_FILE_PATH);
  } catch {
    await fs.mkdir(path.dirname(SETTINGS_FILE_PATH), { recursive: true });
    await fs.writeFile(
      SETTINGS_FILE_PATH,
      JSON.stringify({ sessions: DEFAULT_SESSIONS }, null, 2),
      "utf8",
    );
  }
}

async function listDailySessions() {
  await ensureSettingsFile();

  const raw = await fs.readFile(SETTINGS_FILE_PATH, "utf8");
  const parsed = JSON.parse(raw || "{}");
  return normalizeSessions(parsed.sessions);
}

async function updateDailySessionsSettings(payload) {
  const incoming = Array.isArray(payload?.sessions) ? payload.sessions : null;
  if (!incoming) {
    const err = new Error("sessions array is required");
    err.status = 400;
    throw err;
  }

  const nextSessions = normalizeSessions(incoming);

  await ensureSettingsFile();
  await fs.writeFile(
    SETTINGS_FILE_PATH,
    JSON.stringify({ sessions: nextSessions }, null, 2),
    "utf8",
  );

  return nextSessions;
}

module.exports = {
  listDailySessions,
  updateDailySessionsSettings,
};
