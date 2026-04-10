import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiKey, FiLock, FiMail } from "react-icons/fi";
import AuthInput from "../../components/auth/AuthInput";
import Button from "../../components/common/Button";
import {
  resetPasswordWithOtp,
  sendPasswordOtp,
  verifyPasswordOtp,
} from "../../services/authService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStepBadgeClass({ active, done }) {
  if (done) return "bg-emerald-500 text-white";
  if (active) return "bg-blue-600 text-white";
  return "bg-slate-200 text-slate-600";
}

export default function ForgotPasswordOtp() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timerId = globalThis.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => globalThis.clearInterval(timerId);
  }, [resendCooldown]);

  useEffect(() => {
    if (otpExpiryCountdown <= 0) return undefined;
    const timerId = globalThis.setInterval(() => {
      setOtpExpiryCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => globalThis.clearInterval(timerId);
  }, [otpExpiryCountdown]);

  const otpExpiryLabel = useMemo(() => {
    const mins = Math.floor(otpExpiryCountdown / 60);
    const secs = otpExpiryCountdown % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }, [otpExpiryCountdown]);

  const clearAlerts = () => {
    setError("");
    setSuccess("");
  };

  const validateEmail = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Email is required";
    if (!EMAIL_REGEX.test(trimmed)) return "Please enter a valid email";
    return "";
  };

  const validateOtp = () => {
    if (!/^\d{6}$/.test(String(otp).trim()))
      return "OTP must be exactly 6 digits";
    return "";
  };

  const sendOtpHandler = async () => {
    clearAlerts();
    const emailError = validateEmail();
    if (emailError) {
      setError(emailError);
      return;
    }

    setSendingOtp(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await sendPasswordOtp(normalizedEmail);
      setEmail(normalizedEmail);
      setStep(2);
      setOtp("");
      setResendCooldown(60);
      setOtpExpiryCountdown(5 * 60);
      setSuccess("OTP sent. Please check your email inbox.");
    } catch (err) {
      setError(err?.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtpHandler = async () => {
    clearAlerts();
    const emailError = validateEmail();
    const otpError = validateOtp();
    if (emailError) {
      setError(emailError);
      return;
    }
    if (otpError) {
      setError(otpError);
      return;
    }

    setVerifyingOtp(true);
    try {
      await verifyPasswordOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      setStep(3);
      setSuccess("OTP verified. Set your new password.");
    } catch (err) {
      setError(err?.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const resetPasswordHandler = async () => {
    clearAlerts();

    const emailError = validateEmail();
    const otpError = validateOtp();
    if (emailError) {
      setError(emailError);
      return;
    }
    if (otpError) {
      setError(otpError);
      return;
    }

    if (!newPassword) {
      setError("New password is required");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setResettingPassword(true);
    try {
      await resetPasswordWithOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword,
      });

      setSuccess("Password reset successful. Redirecting to login...");
      setOtpExpiryCountdown(0);
      globalThis.setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(err?.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const backToPreviousStep = () => {
    clearAlerts();
    if (step === 2) {
      setStep(1);
      return;
    }
    if (step === 3) {
      setStep(2);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 1, label: "Email" },
      { id: 2, label: "OTP" },
      { id: 3, label: "Reset" },
    ];

    return (
      <div className="mb-8 flex items-center justify-between gap-3">
        {steps.map((item) => {
          const active = item.id === step;
          const done = item.id < step;

          return (
            <div key={item.id} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${getStepBadgeClass(
                  {
                    active,
                    done,
                  },
                )}`}
              >
                {item.id}
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-widest ${
                  active ? "text-blue-700" : "text-slate-500"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(37,99,235,0.18),transparent_40%),radial-gradient(circle_at_90%_90%,rgba(14,165,233,0.14),transparent_35%)]" />
      <div className="relative w-full max-w-lg rounded-3xl border border-white/50 bg-white p-6 shadow-2xl shadow-blue-900/10 backdrop-blur sm:p-8">
        <h1 className="text-2xl font-extrabold text-slate-900">
          Forgot Password
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Secure OTP reset flow. Your code expires in 5 minutes.
        </p>

        {renderStepIndicator()}

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 1) sendOtpHandler();
            if (step === 2) verifyOtpHandler();
            if (step === 3) resetPasswordHandler();
          }}
          className="space-y-4"
        >
          <AuthInput
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            icon={FiMail}
            autoComplete="email"
            required
            className={step === 1 ? "" : "opacity-70"}
          />

          {step >= 2 ? (
            <AuthInput
              label="6-digit OTP"
              type="text"
              value={otp}
              onChange={(event) => {
                const next = event.target.value
                  .replaceAll(/\D/g, "")
                  .slice(0, 6);
                setOtp(next);
              }}
              placeholder="Enter OTP"
              icon={FiKey}
              autoComplete="one-time-code"
              required
            />
          ) : null}

          {step === 2 ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              OTP expires in {otpExpiryLabel}
            </div>
          ) : null}

          {step === 3 ? (
            <>
              <AuthInput
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Minimum 6 characters"
                icon={FiLock}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-500 transition hover:text-slate-700"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                }
                required
              />

              <AuthInput
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                icon={FiLock}
                autoComplete="new-password"
                rightSlot={
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-500 transition hover:text-slate-700"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <FiEyeOff size={18} />
                    ) : (
                      <FiEye size={18} />
                    )}
                  </button>
                }
                required
              />
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={backToPreviousStep}
                disabled={sendingOtp || verifyingOtp || resettingPassword}
              >
                Back
              </Button>
            ) : null}

            {step === 1 ? (
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 py-3 hover:bg-blue-700"
                disabled={sendingOtp}
              >
                {sendingOtp ? "Sending OTP..." : "Send OTP"}
              </Button>
            ) : null}

            {step === 2 ? (
              <>
                <Button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 py-3 hover:bg-blue-700"
                  disabled={verifyingOtp}
                >
                  {verifyingOtp ? "Verifying..." : "Verify OTP"}
                </Button>
                <Button
                  type="button"
                  variant="subtle"
                  className="rounded-xl"
                  disabled={sendingOtp || resendCooldown > 0}
                  onClick={sendOtpHandler}
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend OTP"}
                </Button>
              </>
            ) : null}

            {step === 3 ? (
              <Button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-600 py-3 hover:bg-emerald-700"
                disabled={resettingPassword}
              >
                {resettingPassword ? "Resetting..." : "Reset Password"}
              </Button>
            ) : null}
          </div>
        </form>

        <p className="mt-7 text-center text-sm text-slate-600">
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-semibold text-blue-700 hover:text-blue-800"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
