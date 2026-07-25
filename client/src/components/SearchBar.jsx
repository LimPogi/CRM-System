import React, { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import api from "../api/axios";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState({ customers: [], jobs: [], employees: [] });

  useEffect(() => {
    if (!q.trim()) { setResults({ customers: [], jobs: [], employees: [] }); return; }
    const handle = setTimeout(() => {
      api.get("/search", { params: { q } }).then((r) => setResults(r.data));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const hasResults = results.customers.length || results.jobs.length || results.employees.length;

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5 min-w-[220px]">
        <Search size={14} className="text-teal-100" />
        <input
          placeholder="Search customers, jobs, employees..."
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="bg-transparent border-none outline-none text-white text-xs w-full placeholder:text-teal-100/70"
        />
        {q && <X size={13} className="text-teal-100 cursor-pointer" onClick={() => { setQ(""); setOpen(false); }} />}
      </div>
      {open && q.trim() && (
        <div onMouseLeave={() => setOpen(false)} className="absolute top-[110%] left-0 right-0 bg-white rounded-lg shadow-xl p-2.5 z-50 text-xs min-w-[280px] text-ink">
          {!hasResults && <p className="text-gray-400 m-1">No matches for "{q}".</p>}
          {results.customers.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Customers</p>
              {results.customers.map((c) => (
                <div key={c.id} className="px-1.5 py-1 rounded hover:bg-gray-50">
                  {c.firstname} {c.lastname} <span className="text-gray-500">· {c.company}</span>
                </div>
              ))}
            </div>
          )}
          {results.jobs.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Jobs</p>
              {results.jobs.map((j) => (
                <div key={j.id} className="px-1.5 py-1 rounded hover:bg-gray-50">
                  <span className="font-mono text-[11px]">{j.code}</span> {j.title}
                </div>
              ))}
            </div>
          )}
          {results.employees.length > 0 && (
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Employees</p>
              {results.employees.map((e) => (
                <div key={e.id} className="px-1.5 py-1 rounded hover:bg-gray-50">
                  {e.fullname} <span className="text-gray-500">· {e.position}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
