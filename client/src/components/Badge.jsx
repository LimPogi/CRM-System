import React from "react";

const TONES = {
  slate: ["#DDE3E1", "#5B6B76"],
  teal: ["#D9EDEA", "#1F6359"],
  amber: ["#F8E8D2", "#8A5B10"],
  red: ["#F8DCDA", "#D1453D"],
  indigo: ["#DEE4ED", "#3E5C86"],
};

// Kanban columns: To Do -> In Progress -> Review -> Completed
export function jobTone(status) {
  if (status === "Completed") return "teal";
  if (status === "In Progress") return "amber";
  if (status === "Review") return "indigo";
  return "slate"; // To Do
}

// Admin-customizable pipeline; these are the 8 default stages.
export function customerTone(status) {
  if (status === "Completed") return "teal";
  if (["Cancelled", "Waiting for Client"].includes(status)) return "red";
  if (["Contacted", "Follow Up", "In Progress"].includes(status)) return "amber";
  if (status === "New Lead") return "indigo";
  return "slate"; // Archived
}

export function priorityTone(priority) {
  if (priority === "High") return "red";
  if (priority === "Medium") return "amber";
  return "slate";
}

export default function Badge({ children, tone = "slate" }) {
  const [bg, fg] = TONES[tone] || TONES.slate;
  return (
    <span style={{ background: bg, color: fg }} className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
      {children}
    </span>
  );
}
