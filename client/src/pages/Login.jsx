import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { Briefcase } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

// Rendered at both /company/admin/login and /company/employee/login —
// same component, different `portal` prop, per the spec's "different login
// portals make the experience cleaner and more secure."
export default function Login({ portal }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function onSubmit({ email, password }) {
    try {
      const user = await login(email, password);
      if (portal === "admin" && user.role !== "admin") {
        return notify("This account isn't an admin account. Use the employee login instead.", "warning");
      }
      if (portal === "employee" && user.role === "admin") {
        return notify("This is an admin account. Use the admin login instead.", "warning");
      }
      navigate(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      notify(err.response?.data?.error || "Login failed", "error");
    }
  }

  const otherPortal = portal === "admin" ? "employee" : "admin";

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md bg-teal flex items-center justify-center">
            <Briefcase size={18} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg text-ink">DISPATCH — CRM</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-xl p-8">
          <p className="text-center text-xs uppercase tracking-wide text-gray-500 font-semibold mb-4">{portal} login</p>

          <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
          <input type="email" {...register("email", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-1 mt-1" placeholder="you@company.com" />
          {errors.email && <p className="text-red-600 text-xs mb-3">Email is required</p>}

          <label className="text-xs text-gray-500 uppercase tracking-wide">Password</label>
          <input type="password" {...register("password", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-1 mt-1" placeholder="••••••••" />
          {errors.password && <p className="text-red-600 text-xs mb-3">Password is required</p>}

          <div className="text-right mb-4">
            <Link to="/forgot-password" className="text-xs text-gray-500 underline">Forgot password?</Link>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full bg-ink text-white rounded-md py-2 font-semibold disabled:opacity-60">
            {isSubmitting ? "Logging in..." : `Log in as ${portal}`}
          </button>

          {portal === "admin" ? (
            <p className="text-xs text-gray-500 text-center mt-4">
              Setting up for the first time?{" "}
              <Link to="/register-admin" className="text-ink font-semibold underline">Create an admin account</Link>
            </p>
          ) : (
            <p className="text-xs text-gray-500 text-center mt-4">
              Don't have an account? Ask your admin to add you under Employees.
            </p>
          )}
          <p className="text-xs text-gray-400 text-center mt-2">
            <Link to={`/company/${otherPortal}/login`} className="underline">Switch to {otherPortal} login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
