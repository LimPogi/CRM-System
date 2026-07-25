import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Search } from "lucide-react";
import api from "../../api/axios";

const ENTITY_TYPES = ["All", "customer", "job", "file", "employee"];

export default function AdminActivityLogs() {
  const [q, setQ] = useState("");
  const [entityType, setEntityType] = useState("All");

  const { data: logs = [] } = useQuery({
    queryKey: ["activity-logs", q, entityType],
    queryFn: () => api.get("/activity", { params: { q: q || undefined, entityType: entityType === "All" ? undefined : entityType } }).then((r) => r.data),
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h3 className="font-display uppercase text-sm tracking-wide flex items-center gap-2">
          <History size={16} className="text-teal" /> Activity logs
        </h3>
        <div className="flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input placeholder="Filter" value={q} onChange={(e) => setQ(e.target.value)} className="text-xs outline-none" />
        </div>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {ENTITY_TYPES.map((t) => (
          <button key={t} onClick={() => setEntityType(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize ${entityType === t ? "bg-ink text-white border-ink" : "bg-white border-gray-300 text-ink"}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2 text-sm">
        {logs.map((a) => (
          <div key={a.id} className="flex gap-3 border-t border-gray-100 pt-2">
            <span className="font-mono text-xs text-gray-500 whitespace-nowrap">{new Date(a.created_at).toLocaleString()}</span>
            <span className="whitespace-nowrap text-gray-600">{a.actor_name || "System"}</span>
            <span>{a.action}{a.description ? ` — ${a.description}` : ""}</span>
          </div>
        ))}
        {logs.length === 0 && <p className="text-gray-400">No matching activity.</p>}
      </div>
    </div>
  );
}
