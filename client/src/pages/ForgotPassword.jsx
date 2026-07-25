import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { KeyRound } from "lucide-react";
import api from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function ForgotPassword() {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();
  const { notify } = useToast();
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState(null);

  async function onSubmit({ email }) {
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      // devToken is only ever present outside production — see auth.routes.js.
      if (data.devToken) setDevLink(`/reset-password?token=${data.devToken}`);
    } catch (err) {
      notify(err.response?.data?.error || "Something went wrong", "error");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper">
      <div className="bg-white border border-gray-200 rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className="w-9 h-9 rounded-md bg-teal flex items-center justify-center">
            <KeyRound size={18} className="text-white" />
          </div>
          <span className="font-display font-semibold text-lg text-ink">Reset your password</span>
        </div>

        {sent ? (
          <div className="text-sm text-gray-600 text-center">
            <p>If that email has an account, a reset link has been sent.</p>
            {devLink && (
              <p className="mt-3 text-xs bg-amber-50 text-amber-800 rounded-md p-2">
                Dev mode (no email provider configured yet): <Link to={devLink} className="underline font-semibold">open your reset link</Link>
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
            <input type="email" {...register("email", { required: true })} className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 mt-1" placeholder="you@company.com" />
            <button type="submit" disabled={isSubmitting} className="w-full bg-ink text-white rounded-md py-2 font-semibold disabled:opacity-60">
              {isSubmitting ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
        <p className="text-xs text-gray-500 text-center mt-4">
          <Link to="/login" className="text-ink font-semibold underline">Back to login</Link>
        </p>
      </div>
    </div>
  );
}
