import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FcGoogle } from "react-icons/fc";
import { FiEye, FiEyeOff, FiLock, FiMail } from "react-icons/fi";
import AuthInput from "../../components/auth/AuthInput";
import Button from "../../components/common/Button";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";
import { isStudentProfileComplete } from "../../utils/profileChecks";
import { showError } from "../../utils/alerts";
import { resolveApiBaseUrl } from "../../utils/apiBaseUrl";

function resolveSafeRedirect(searchParams) {
  const redirect = String(searchParams.get("redirect") || "").trim();
  if (!redirect) return null;
  if (redirect.startsWith("/student/external-jobs")) return redirect;
  return null;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, profile, user } = useAuth();
  const API_BASE_URL = resolveApiBaseUrl();

  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const safeRedirect = resolveSafeRedirect(searchParams);

  const validate = () => {
    const nextErrors = { email: "", password: "" };

    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required";
    }

    setErrors(nextErrors);
    return !nextErrors.email && !nextErrors.password;
  };

  // Handle OAuth error redirects (e.g. expired state on re-login)
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      const desc =
        searchParams.get("error_description") ||
        "OAuth login failed. Please try again.";
      showError(desc, "Login Failed");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;

    const profileComplete = isStudentProfileComplete(profile, user);
    if (user.role === ROLES.STUDENT && !profileComplete) {
      navigate("/complete-profile", { replace: true });
    } else if (user.role === ROLES.STUDENT && safeRedirect) {
      navigate(safeRedirect, { replace: true });
    } else if (user.role === ROLES.SUPER_ADMIN) {
      navigate("/superadmin/dashboard", { replace: true });
    } else {
      navigate(
        user.role === ROLES.ADMIN ? "/admin/dashboard" : "/student/dashboard",
        { replace: true },
      );
    }
  }, [user, profile, navigate, safeRedirect]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const { session, profile: freshProfile } = await login({
        email,
        password,
      });
      const profileToCheck = freshProfile || profile;
      const needsProfile =
        session.role === ROLES.STUDENT &&
        !isStudentProfileComplete(profileToCheck, { role: session.role });

      if (session.role === ROLES.SUPER_ADMIN) {
        navigate("/superadmin/dashboard");
      } else if (session.role === ROLES.ADMIN) {
        navigate("/admin/dashboard");
      } else if (needsProfile) {
        navigate("/complete-profile");
      } else if (safeRedirect) {
        navigate(safeRedirect);
      } else {
        navigate("/student/dashboard");
      }
    } catch (error) {
      await showError(error?.message || "Login failed", "Login Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = () => {
    globalThis.location.assign(`${API_BASE_URL}/api/auth/google/start`);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-8">
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
                <li>Showcase 5+ year work Experience in Cloud &amp; DevOps</li>
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
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Please enter your credentials to continue your journey.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {/* <RoleDropdown
                id="loginType"
                label="Login Type"
                value={loginType}
                options={ROLE_OPTIONS}
                onChange={setLoginType}
              /> */}

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
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                icon={FiLock}
                autoComplete="current-password"
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

              <div className="-mt-2 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-blue-700 transition hover:text-blue-800"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold tracking-[0.14em] text-slate-400">
                OR LOGIN WITH
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Button
              variant="outline"
              className="w-full rounded-2xl border-slate-200 py-3 shadow-lg"
              onClick={onGoogle}
              disabled={submitting}
            >
              <span className="inline-flex items-center gap-2">
                <FcGoogle className="h-5 w-5" />
                Continue with Google
              </span>
            </Button>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-blue-700 transition hover:text-blue-800"
              >
                Sign up
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
  );
}
