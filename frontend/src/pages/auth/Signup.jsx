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
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await signup({ fullName, email, password, phone, role: ROLES.STUDENT });
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
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Email"
              className="col-span-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
            />
            <Input
              label="Password"
              className="col-span-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />

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
