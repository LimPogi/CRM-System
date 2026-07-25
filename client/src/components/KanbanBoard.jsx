import React, { useState } from "react";
import { GripVertical } from "lucide-react";
import Badge, { jobTone } from "./Badge";
import ProgressBar from "./ProgressBar";

const STATUSES = ["To Do", "In Progress", "Review", "Completed"];

export default function KanbanBoard({ jobs, onMove }) {
  const [dragOverCol, setDragOverCol] = useState(null);

  function handleDrop(e, status) {
    e.preventDefault();
    setDragOverCol(null);
    const id = e.dataTransfer.getData("text/job-id");
    if (id) onMove(id, status);
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 overflow-x-auto">
      {STATUSES.map((status) => (
        <div
          key={status}
          onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
          onDragLeave={() => setDragOverCol(null)}
          onDrop={(e) => handleDrop(e, status)}
          className={`rounded-xl p-2.5 min-h-[140px] border border-gray-200 ${dragOverCol === status ? "bg-gray-100" : "bg-paper"}`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-xs">{status}</span>
            <Badge tone={jobTone(status)}>{jobs.filter((j) => j.status === status).length}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {jobs.filter((j) => j.status === status).map((j) => (
              <div
                key={j.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/job-id", j.id)}
                className="bg-white border border-gray-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing"
              >
                <div className="flex justify-between items-start gap-1">
                  <span className="font-mono text-[10px] text-gray-500">{j.code}</span>
                  <GripVertical size={12} className="text-gray-300" />
                </div>
                <p className="font-semibold text-xs my-1">{j.title}</p>
                <ProgressBar value={j.progress} />
                <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
                  <span>{j.assigned_name || "Unassigned"}</span>
                  <span>{j.deadline || "—"}</span>
                </div>
              </div>
            ))}
            {jobs.filter((j) => j.status === status).length === 0 && (
              <p className="text-[11px] text-gray-400 text-center py-2.5">Drop jobs here</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
