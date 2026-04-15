import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiPhone,
  FiUser,
} from "react-icons/fi";
import AuthInput from "../../components/auth/AuthInput";
import Button from "../../components/common/Button";
import Footer from "../../components/common/Footer";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";
import { showError, showInfo } from "../../utils/alerts";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const passwordScore = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const passwordStrength =
    passwordScore <= 1
      ? { label: "Weak", width: "w-1/4", tone: "bg-red-400" }
      : passwordScore <= 2
        ? { label: "Fair", width: "w-2/4", tone: "bg-amber-400" }
        : passwordScore === 3
          ? { label: "Good", width: "w-3/4", tone: "bg-blue-500" }
          : { label: "Strong", width: "w-full", tone: "bg-emerald-500" };

  const validate = () => {
    const nextErrors = {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    };

    if (!fullName.trim()) {
      nextErrors.fullName = "Full name is required";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!phone.trim()) {
      nextErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(phone.trim())) {
      nextErrors.phone = "Enter a valid 10-digit phone number";
    }

    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some(Boolean);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await signup({
        fullName,
        email,
        phone,
        password,
        role: ROLES.STUDENT,
      });
      if (result?.hasSession) {
        navigate("/complete-profile");
        return;
      }
      await showInfo("Signup successful. Please login to continue.", "Success");
      navigate("/login");
    } catch (err) {
      await showError(err?.message || "Signup failed", "Signup Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl overflow-hidden rounded-3xl bg-white shadow-lg lg:grid-cols-2">
          <section className="order-2 relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white sm:p-10 lg:order-1 lg:p-12 auth-fade-in">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.32),transparent_42%),radial-gradient(circle_at_82%_6%,rgba(255,255,255,0.2),transparent_36%),radial-gradient(circle_at_30%_78%,rgba(255,255,255,0.16),transparent_40%)]" />
            <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-white/20 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-white/35 bg-white/15 px-4 py-1 text-xs font-semibold tracking-[0.18em] text-blue-100 backdrop-blur-lg">
                PLACEMENT PLATFORM
              </span>

              <h1 className="mt-6 max-w-xl text-2xl font-extrabold leading-snug sm:text-3xl lg:text-4xl auth-fade-up">
                Empowering students with real-world skills and career
                opportunities.
              </h1>

              <p className="mt-5 max-w-xl text-sm text-blue-100 sm:text-base auth-fade-up-delayed">
                Why Choose MicroDegree
              </p>

              <div className="mt-8 rounded-2xl border border-white/35 bg-white/15 p-5 shadow-lg backdrop-blur-md sm:p-6">
                <h2 className="text-lg font-semibold text-white">
                  About MicroDegree
                </h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-blue-50 marker:text-blue-200 sm:text-base">
                  <li>
                    Kannadiga first approach - Making Kannadigas global tech
                    talent
                  </li>
                  <li>Build 20+ real world capstone projects</li>
                  <li>
                    Showcase 5+ year work Experience in Cloud &amp; DevOps
                  </li>
                  <li>Learn 10x Faster in Kannada</li>
                  <li>Get Trained Directly by Industry experts</li>
                  <li>Flexibility of Changing batches up-to 1 year</li>
                </ul>
              </div>
            </div>

            <p className="relative mt-12 text-xs text-blue-100/90 sm:text-sm">
              Join microdegree.work and unlock your career potential.
            </p>
          </section>

          <section className="order-1 flex items-center justify-center bg-white p-6 sm:p-10 lg:order-2 lg:p-12">
            <div className="w-full max-w-md auth-fade-up">
              <div className="mb-8">
                <div className="inline-flex items-center">
                  <img
                    src="https://www.microdegree.work/static/media/MicroDegree%20Pink.5777a8ffd9ff3026b011.png"
                    alt="MicroDegree"
                    className="h-12 w-auto object-contain"
                  />
                </div>

                <h2 className="mt-6 text-3xl font-bold text-slate-900">
                  Create your account
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Start your placement journey in less than a minute.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <AuthInput
                  label="Full Name"
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  icon={FiUser}
                  autoComplete="name"
                  error={errors.fullName}
                  required
                />

                <AuthInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  icon={FiMail}
                  autoComplete="email"
                  error={errors.email}
                  required
                />

                <AuthInput
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(event) =>
                    setPhone(
                      event.target.value.replace(/[^0-9]/g, "").slice(0, 10),
                    )
                  }
                  placeholder="10-digit phone number"
                  icon={FiPhone}
                  autoComplete="tel"
                  error={errors.phone}
                  required
                />

                <AuthInput
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a strong password"
                  icon={FiLock}
                  autoComplete="new-password"
                  error={errors.password}
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

                {password ? (
                  <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${passwordStrength.width} ${passwordStrength.tone}`}
                      />
                    </div>
                    <p className="text-xs text-slate-600">
                      Password strength:{" "}
                      <span className="font-semibold">
                        {passwordStrength.label}
                      </span>
                    </p>
                  </div>
                ) : null}

                <AuthInput
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  icon={FiLock}
                  autoComplete="new-password"
                  error={errors.confirmPassword}
                  rightSlot={
                    <button
                      type="button"
                      className="rounded-md p-1 text-slate-500 transition hover:text-slate-700"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
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

                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting ? "Creating account..." : "Sign up"}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-700 transition hover:text-blue-800"
                >
                  Login
                </Link>
              </p>

              {/* <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
              <a href="#" className="transition hover:text-slate-700">
                Privacy Policy
              </a>
              <span className="text-slate-300">|</span>
              <a href="#" className="transition hover:text-slate-700">
                Terms of Service
              </a>
              <span className="text-slate-300">|</span>
              <a href="mailto:support@microdegree.work" className="transition hover:text-slate-700">
                Help Center
              </a>
            </div> */}
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
}
