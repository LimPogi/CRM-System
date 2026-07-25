import React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function RegisterAdmin() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { registerAdmin } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function onSubmit(data) {
    try {
      await registerAdmin(data);
      navigate("/admin");
    } catch (err) {
      notify(err.response?.data?.error || "Could not create the admin account", "error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md bg-teal flex items-center justify-center">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-lg text-ink">Create admin account</span>
        </div>

        <label className="text-xs text-gray-500 uppercase tracking-wide">Full name</label>
        <input {...register("fullname", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 mt-1" placeholder="Grace Tan" />

        <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
        <input type="email" {...register("email", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 mt-1" placeholder="you@company.com" />

        <label className="text-xs text-gray-500 uppercase tracking-wide">Password</label>
        <input type="password" {...register("password", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 mt-1" placeholder="••••••••" />

        <label className="text-xs text-gray-500 uppercase tracking-wide">Setup code (if required)</label>
        <input {...register("setupCode")} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-6 mt-1" placeholder="Optional" />

        <button type="submit" disabled={isSubmitting} className="w-full bg-ink text-white rounded-md py-2 font-semibold disabled:opacity-60">
          {isSubmitting ? "Creating..." : "Create account"}
        </button>
        <p className="text-xs text-gray-500 text-center mt-4">
          Already have an account? <Link to="/company/admin/login" className="text-ink font-semibold underline">Log in</Link>
        </p>
      </form>
    </div>
  );
}
