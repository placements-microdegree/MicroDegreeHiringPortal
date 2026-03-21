const { getSupabaseAdmin, getSupabaseUser } = require("../config/db");

function getClient(jwt) {
  return getSupabaseAdmin() || getSupabaseUser(jwt);
}

async function trackResumeBuilderClick({ jwt, studentId }) {
  const supabase = getClient(jwt);

  const { data, error } = await supabase
    .from("resume_builder_clicks")
    .insert({
      student_id: studentId,
      clicked_at: new Date().toISOString(),
    })
    .select("id, clicked_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    clickedAt: data.clicked_at,
  };
}

async function getResumeBuilderAnalytics({ jwt }) {
  const supabase = getClient(jwt);

  const [{ count, error: totalError }, { data: latestRow, error: latestError }, { data: clickRows, error: rowsError }] =
    await Promise.all([
      supabase
        .from("resume_builder_clicks")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("resume_builder_clicks")
        .select("clicked_at")
        .order("clicked_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("resume_builder_clicks")
        .select("student_id, clicked_at, profiles:student_id(full_name, email)"),
    ]);

  if (totalError) throw totalError;
  if (latestError) throw latestError;
  if (rowsError) throw rowsError;

  const perStudent = new Map();
  (clickRows || []).forEach((row) => {
    const studentId = row.student_id;
    const clickedAt = row.clicked_at || null;
    const profile = row.profiles || {};

    if (!studentId) return;

    const existing = perStudent.get(studentId) || {
      studentId,
      fullName: profile.full_name || "Unknown",
      email: profile.email || "-",
      clickCount: 0,
      lastClickedAt: null,
    };

    existing.clickCount += 1;
    if (!existing.lastClickedAt || new Date(clickedAt).getTime() > new Date(existing.lastClickedAt).getTime()) {
      existing.lastClickedAt = clickedAt;
    }

    perStudent.set(studentId, existing);
  });

  const topStudents = Array.from(perStudent.values()).sort((a, b) => {
    if (b.clickCount !== a.clickCount) return b.clickCount - a.clickCount;
    return new Date(b.lastClickedAt || 0).getTime() - new Date(a.lastClickedAt || 0).getTime();
  });

  return {
    totalClicks: Number(count || 0),
    uniqueStudents: topStudents.length,
    lastClickedAt: latestRow?.clicked_at || null,
    topStudent: topStudents[0] || null,
    topStudents,
  };
}

module.exports = {
  trackResumeBuilderClick,
  getResumeBuilderAnalytics,
};
