import React from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { BarChart3, ClipboardList, Users, TrendingUp, FileDown } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";

const STATUS_COLORS = { "To Do": "#5B6B76", "In Progress": "#E0A458", Review: "#3E5C86", Completed: "#2C8C82" };

export default function AdminReports() {
  const { notify } = useToast();
  const { data: overview } = useQuery({ queryKey: ["overview"], queryFn: () => api.get("/reports/overview").then((r) => r.data) });
  const { data: trend = [] } = useQuery({ queryKey: ["completed-trend"], queryFn: () => api.get("/reports/completed-trend").then((r) => r.data) });
  const { data: statusMix = [] } = useQuery({ queryKey: ["status-breakdown"], queryFn: () => api.get("/reports/status-breakdown").then((r) => r.data) });
  const { data: perEmployee = [] } = useQuery({ queryKey: ["jobs-per-employee"], queryFn: () => api.get("/reports/jobs-per-employee").then((r) => r.data) });
  const { data: growth = [] } = useQuery({ queryKey: ["customer-growth"], queryFn: () => api.get("/reports/customer-growth").then((r) => r.data) });

  async function exportReport(format) {
    if (format !== "csv") {
      notify(`${format.toUpperCase()} export isn't wired up yet — downloading CSV instead. See the README for adding exceljs/pdfkit.`, "info");
    }
    const res = await api.get("/reports/export", { params: { format }, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url; a.download = "jobs-report.csv"; a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end gap-2">
        {["csv", "excel", "pdf"].map((fmt) => (
          <button key={fmt} onClick={() => exportReport(fmt)} className="flex items-center gap-2 bg-ink text-white rounded-md px-4 py-2 text-sm font-semibold uppercase">
            <FileDown size={14} /> {fmt}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ["Completed jobs", overview?.completed_jobs ?? "—"],
          ["Pending jobs", overview?.pending_jobs ?? "—"],
          ["Customers", overview?.customers ?? "—"],
          ["Active employees", overview?.active_employees ?? "—"],
        ].map(([label, val]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
            <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
            <p className="font-mono text-xl">{val}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-teal" /> Jobs completed per week
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis dataKey="completed" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="completed" stroke="#2C8C82" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <ClipboardList size={16} className="text-teal" /> Job status mix
          </h3>
          <div style={{ height: 190 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusMix} dataKey="count" nameKey="status" innerRadius={42} outerRadius={70} paddingAngle={2}>
                  {statusMix.map((s, i) => <Cell key={i} fill={STATUS_COLORS[s.status] || "#999"} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <Users size={16} className="text-teal" /> Jobs per employee
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perEmployee}>
                <CartesianGrid stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="fullname" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="open" fill="#E0A458" radius={[4, 4, 0, 0]} name="Open" />
                <Bar dataKey="done" fill="#2C8C82" radius={[4, 4, 0, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-teal" /> Customer growth (6 months)
          </h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growth}>
                <CartesianGrid stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="new_customers" fill="#3E5C86" radius={[4, 4, 0, 0]} name="New customers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
