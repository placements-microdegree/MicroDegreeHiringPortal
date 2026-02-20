import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";
import { isStudentProfileComplete } from "../../utils/profileChecks";

export default function Login() {
  const navigate = useNavigate();
  const { login, profile, user } = useAuth();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginType, setLoginType] = useState("microdegree");

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

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
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
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const onGoogle = () => {
    globalThis.location.assign(`${API_BASE_URL}/api/auth/google/start`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-bgLight to-white px-4 py-10">
      <div className="mx-auto grid max-w-5xl items-stretch gap-8 lg:grid-cols-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primaryDark p-8 text-white shadow-xl lg:col-span-2">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.22),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_35%)]" />
          <div className="relative flex h-full flex-col gap-6">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.15em] text-white/80">
                Placement Portal
              </div>
              <div className="mt-2 text-3xl font-semibold">MicroDegree</div>
              <p className="mt-3 text-sm text-white/85">
                Seamless access for students of MicroDegree for job posts
              </p>
            </div>
            {/* <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
              <div className="text-sm font-semibold">Why you'll like this:</div>
              <ul className="mt-2 space-y-2 text-sm text-white/80">
                <li>- Google SSO with one click</li>
                <li>- Clean dashboards for students & admins</li>
                <li>- Responsive layout that feels at home on mobile</li>
              </ul>
            </div> */}
            {/* <div className="mt-auto text-xs text-white/70">
              Need an account? Choose Student Login and tap Sign up.
            </div> */}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white/90 p-8 shadow-xl backdrop-blur lg:col-span-3">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-primary">
                {loginType === "microdegree"
                  ? "Placement Access"
                  : "Student Access"}
              </div>
              <div className="text-2xl font-semibold text-slate-900">
                Welcome back
              </div>
              <div className="text-sm text-slate-600">
                Login with email & password or continue with Google.
              </div>
            </div>

            {/* <div className="w-48">
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm"
                value={loginType}
                onChange={(e) => setLoginType(e.target.value)}
              >
                <option value="microdegree">MicroDegree Login</option>
                <option value="student">Student Login</option>
              </select>
              <div className="mt-1 text-[11px] font-medium text-slate-500">
                Switch if you're a student vs. MicroDegree team.
              </div>
            </div> */}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={onGoogle}
              disabled={submitting}
            >
              Continue with Google
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <div className="text-xs font-medium text-slate-500">OR</div>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder={
                loginType === "microdegree"
                  ? "team@microdegree.com"
                  : "student@example.com"
              }
            />
            <Input
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
            />

            {error ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Logging in..." : "Login"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm text-slate-600">
            <span>
              {loginType === "student"
                ? "Don't have an account?"
                : "Need Placement access?"}
            </span>
            <Link to="/signup" className="font-semibold text-primary">
              {loginType === "student" ? "Sign up" : "Go to student sign up"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
