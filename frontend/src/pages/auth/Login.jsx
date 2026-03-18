import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import RoleDropdown from "../../components/common/RoleDropdown";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";
import { isStudentProfileComplete } from "../../utils/profileChecks";
import { showError } from "../../utils/alerts";
import { resolveApiBaseUrl } from "../../utils/apiBaseUrl";

const ROLE_OPTIONS = [
  { value: "student", label: "Student Login" },
  { value: "team", label: "MicroDegree Team Login" },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, profile, user } = useAuth();
  const API_BASE_URL = resolveApiBaseUrl();

  const [searchParams, setSearchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loginType, setLoginType] = useState("student");

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
    } else if (user.role === ROLES.SUPER_ADMIN) {
      navigate("/superadmin/dashboard", { replace: true });
    } else {
      navigate(
        user.role === ROLES.ADMIN ? "/admin/dashboard" : "/student/dashboard",
        { replace: true },
      );
    }
  }, [user, profile, navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-2">
        <section className="relative hidden overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-7 text-white shadow-xl sm:p-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.24),transparent_45%),radial-gradient(circle_at_85%_5%,rgba(255,255,255,0.18),transparent_38%),radial-gradient(circle_at_30%_85%,rgba(255,255,255,0.1),transparent_45%)]" />

          <div className="relative flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-100">
              PLACEMENT PLATFORM
            </p>

            <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">
              MicroDegree
            </h1>

            <p className="mt-4 max-w-xl text-base text-blue-100 sm:text-lg">
              Empowering students with real-world skills and career
              opportunities.
            </p>

            <div className="mt-8 rounded-2xl border border-white/25 bg-white/15 p-5 shadow-lg backdrop-blur-md sm:p-6">
              <h2 className="text-lg font-semibold text-white">
                About MicroDegree
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-blue-50 sm:text-base">
                <li>Skill-based learning platform</li>
                <li>Industry-aligned training programs</li>
                <li>Direct placement assistance</li>
                <li>Career growth support</li>
              </ul>
            </div>

            <p className="mt-8 text-sm text-blue-100 sm:mt-auto sm:pt-8">
              Join microdegree.work and unlock your career potential.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-xl sm:p-8 lg:p-10">
          <div className="space-y-5">
            <div className="space-y-2">
              <RoleDropdown
                id="loginType"
                label="Login Type"
                value={loginType}
                options={ROLE_OPTIONS}
                onChange={setLoginType}
              />

              <h2 className="text-3xl font-semibold text-slate-900">
                Welcome Back
              </h2>
              <p className="text-sm text-slate-600">
                Access your MicroDegree placement dashboard
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full border-slate-300 py-2.5 hover:border-primary/60 hover:text-primary"
              onClick={onGoogle}
              disabled={submitting}
            >
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold tracking-wider text-slate-500">
                OR
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
              />

              <Input
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                placeholder="Enter your password"
              />

              <Button
                type="submit"
                className="w-full py-2.5"
                disabled={submitting}
              >
                {submitting ? "Logging in..." : "Login"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link
                to="/signup"
                className="font-semibold text-primary transition hover:text-primaryDark"
              >
                Sign up
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
