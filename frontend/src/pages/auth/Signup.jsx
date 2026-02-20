import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useAuth } from "../../context/authStore";
import { ROLES } from "../../utils/constants";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const EyeIcon = ({ off = false }) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <path d="M4 4l16 16" /> : null}
    </svg>
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await signup({ fullName, email, password, role: ROLES.STUDENT });
      navigate("/complete-profile");
    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bgLight">
      <div className="mx-auto flex min-h-screen w-[560px] items-center">
        <div className="w-full rounded-xl bg-white p-6">
          <div className="text-xl font-semibold text-slate-900">
            Create your account
          </div>
          <div className="mt-1 text-sm text-slate-600">
            student sign up for placement access
          </div>

          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Email"
              className="col-span-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <label className="col-span-2 block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Password
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-11 text-sm outline-none focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
            </label>
            <label className="col-span-2 block">
              <div className="mb-1 text-sm font-medium text-slate-700">
                Confirm Password
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-11 text-sm outline-none focus:border-primary"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type={showConfirmPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  <EyeIcon off={showConfirmPassword} />
                </button>
              </div>
            </label>

            {error ? (
              <div className="col-span-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="col-span-2">
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating..." : "Sign up"}
              </Button>
            </div>
          </form>

          <div className="mt-5 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary">
              Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
