import React from "react";

export default function ProgressBar({ value }) {
  return (
    <div className="bg-gray-200 rounded-full h-1.5 w-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: value === 100 ? "#2C8C82" : "#E0A458" }}
      />
    </div>
  );
}
