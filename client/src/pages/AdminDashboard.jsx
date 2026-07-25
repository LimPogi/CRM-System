import React, { useState } from "react";
import { LayoutDashboard, Building2, Users, Briefcase, BarChart3, History } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SearchBar from "../components/SearchBar";
import NotificationBell from "../components/NotificationBell";
import AdminOverview from "./admin/AdminOverview";
import AdminCustomers from "./admin/AdminCustomers";
import AdminEmployees from "./admin/AdminEmployees";
import AdminJobs from "./admin/AdminJobs";
import AdminReports from "./admin/AdminReports";
import AdminActivityLogs from "./admin/AdminActivityLogs";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, Component: AdminOverview },
  { id: "customers", label: "Customers", icon: Building2, Component: AdminCustomers },
  { id: "employees", label: "Employees", icon: Users, Component: AdminEmployees },
  { id: "jobs", label: "Jobs", icon: Briefcase, Component: AdminJobs },
  { id: "reports", label: "Reports", icon: BarChart3, Component: AdminReports },
  { id: "activity", label: "Activity Logs", icon: History, Component: AdminActivityLogs },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("overview");
  const Active = TABS.find((t) => t.id === tab).Component;

  return (
    <div>
      <div className="bg-ink px-6 py-3.5 flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-teal flex items-center justify-center">
            <Briefcase size={16} className="text-white" />
          </div>
          <span className="font-display text-white font-bold text-lg">DISPATCH — CRM</span>
        </div>
        <SearchBar />
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button onClick={logout} className="text-sm text-teal-100">Log out</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <h1 className="font-display text-2xl font-bold text-ink mb-6">Admin — {user?.fullname}</h1>
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border ${
                tab === t.id ? "bg-ink text-white border-ink" : "bg-white border-gray-300 text-ink"
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>
        <Active />
      </div>
    </div>
  );
}
