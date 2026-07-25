import React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { notify } = useToast();
  const navigate = useNavigate();

  async function onSubmit({ newPassword }) {
    try {
      await api.post("/auth/reset-password", { token, newPassword });
      notify("Password updated — log in with your new password.", "success");
      navigate("/login");
    } catch (err) {
      notify(err.response?.data?.error || "Couldn't reset password", "error");
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-sm text-gray-600">
          Missing reset token. <Link to="/forgot-password" className="underline">Request a new link</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md bg-teal flex items-center justify-center">
            <KeyRound size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-lg text-ink">Set a new password</span>
        </div>
        <label className="text-xs text-gray-500 uppercase tracking-wide">New password</label>
        <input type="password" {...register("newPassword", { required: true, minLength: 8 })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 mt-1" placeholder="At least 8 characters" />
        <button type="submit" disabled={isSubmitting} className="w-full bg-ink text-white rounded-md py-2 font-semibold disabled:opacity-60">
          {isSubmitting ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
