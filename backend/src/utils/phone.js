function normalizePhone(value) {
  const digitsOnly = String(value || "").replace(/\D/g, "");
  return digitsOnly || "";
}

module.exports = {
  normalizePhone,
};
