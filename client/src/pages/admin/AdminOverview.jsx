import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, Briefcase, CheckCircle2, LayoutDashboard } from "lucide-react";
import api from "../../api/axios";
import { socket } from "../../api/socket";

export default function AdminOverview() {
  const { data: stats } = useQuery({
    queryKey: ["overview"],
    queryFn: () => api.get("/reports/overview").then((r) => r.data),
  });
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    socket.connect();
    socket.emit("join-admin");
    const events = ["job-created", "job-status-changed", "job-updated", "job-note-added", "customer-added", "customer-updated", "file-uploaded", "employee-status-changed"];
    const handler = (event) => (payload) => {
      const label = describeEvent(event, payload);
      setActivity((a) => [{ id: Date.now() + Math.random(), t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text: label }, ...a].slice(0, 12));
    };
    const handlers = events.map((e) => [e, handler(e)]);
    handlers.forEach(([e, h]) => socket.on(e, h));
    return () => { handlers.forEach(([e, h]) => socket.off(e, h)); socket.disconnect(); };
  }, []);

  function describeEvent(event, payload) {
    switch (event) {
      case "job-created": return `New job ${payload.code} created`;
      case "job-status-changed": return `${payload.code} moved to ${payload.status}`;
      case "job-updated": return `${payload.code} updated`;
      case "job-note-added": return `Note added to JOB-${1000 + payload.jobId}`;
      case "customer-added": return `New customer added: ${payload.firstname} ${payload.lastname}`;
      case "customer-updated": return `Customer updated: ${payload.firstname} ${payload.lastname}`;
      case "file-uploaded": return `File uploaded: ${payload.filename}`;
      case "employee-status-changed": return `${payload.fullname} marked ${payload.status}`;
      default: return event;
    }
  }

  // Matches the spec's dashboard mockup: Total Employees / Customers / Pending Jobs / Completed Jobs.
  const cards = [
    ["Total employees", stats?.total_employees ?? "—", Users],
    ["Customers", stats?.customers ?? "—", Building2],
    ["Pending jobs", stats?.pending_jobs ?? "—", Briefcase],
    ["Completed jobs", stats?.completed_jobs ?? "—", CheckCircle2],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(([label, val, Icon]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <Icon size={18} className="text-teal mx-auto mb-1.5" />
            <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
            <p className="font-mono text-2xl">{val}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <LayoutDashboard size={16} className="text-teal" /> Recent activities
          </h3>
          <div className="flex flex-col gap-2 text-sm">
            {activity.map((a) => (
              <div key={a.id} className="flex gap-3 border-t border-gray-100 pt-2">
                <span className="font-mono text-xs text-gray-500 whitespace-nowrap">{a.t}</span>
                <span>{a.text}</span>
              </div>
            ))}
            {activity.length === 0 && <p className="text-gray-400">Nothing yet — activity will appear here in real time.</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
            <Users size={16} className="text-teal" /> Employees online
          </h3>
          {/* No presence/heartbeat tracking yet — this reuses each employee's
              Active/Inactive account status as a stand-in for "online". A
              real presence indicator would need a small addition: track
              socket connect/disconnect per user and flip a flag. */}
          <div className="flex gap-6 items-center">
            <div className="text-center">
              <p className="font-mono text-3xl text-teal m-0">{stats?.active_employees ?? "—"}</p>
              <p className="text-xs text-gray-500 m-0">🟢 Online</p>
            </div>
            <div className="text-center">
              <p className="font-mono text-3xl text-red-500 m-0">
                {stats ? Math.max(0, stats.total_employees - stats.active_employees) : "—"}
              </p>
              <p className="text-xs text-gray-500 m-0">🔴 Offline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
