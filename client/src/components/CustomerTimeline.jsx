import React, { useEffect, useState } from "react";
import { History } from "lucide-react";
import api from "../api/axios";

export default function CustomerTimeline({ customerId }) {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!customerId) return;
    api.get(`/customers/${customerId}/timeline`).then((r) => setEntries(r.data));
  }, [customerId]);

  return (
    <div>
      <p className="font-bold text-xs mt-2.5 mb-1.5 flex items-center gap-1.5">
        <History size={13} /> Timeline
      </p>
      {entries.length === 0 && <p className="text-gray-400 text-xs">No activity logged yet.</p>}
      <div className="flex flex-col">
        {entries.map((a, i) => (
          <div key={a.id} className="flex gap-2 pb-2">
            <div className="flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-teal mt-1" />
              {i < entries.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-0.5" />}
            </div>
            <div className="text-xs">
              <p className="text-gray-500 text-[10px] m-0">{new Date(a.created_at).toLocaleString()}</p>
              <p className="m-0">{a.action}{a.description ? ` — ${a.description}` : ""}{a.actor_name ? ` (${a.actor_name})` : ""}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
