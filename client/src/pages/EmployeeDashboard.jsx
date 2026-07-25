import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Users, Search, MessageSquare, Upload, Download, FileText,
  ChevronRight, Mail, Phone, MapPin, ClipboardList, LayoutGrid
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Badge, { jobTone, customerTone, priorityTone } from "../components/Badge";
import ProgressBar from "../components/ProgressBar";
import KanbanBoard from "../components/KanbanBoard";
import NotificationBell from "../components/NotificationBell";
import SearchBar from "../components/SearchBar";
import CustomerTimeline from "../components/CustomerTimeline";

const JOB_STATUSES = ["To Do", "In Progress", "Review", "Completed"];

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
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
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="font-display text-2xl font-bold text-ink mb-6">Welcome back, {user?.fullname}</h1>
        <MyJobs />
        <MyCustomers />
      </div>
    </div>
  );
}

function MyJobs() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState("list");
  const [noteDrafts, setNoteDrafts] = useState({});

  const { data: jobs = [] } = useQuery({ queryKey: ["my-jobs"], queryFn: () => api.get("/jobs").then((r) => r.data) });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/jobs/${id}/status`, { status }),
    onSuccess: (_, { status }) => { qc.invalidateQueries({ queryKey: ["my-jobs"] }); notify(`Moved to ${status}.`, "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't update status", "warning"),
  });
  const noteMutation = useMutation({
    mutationFn: ({ id, note }) => api.post(`/jobs/${id}/notes`, { note }),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: ["my-jobs"] }); setNoteDrafts((d) => ({ ...d, [id]: "" })); notify("Note added.", "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't add note", "warning"),
  });

  function move(id, status) { statusMutation.mutate({ id, status }); }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display uppercase text-sm tracking-wide flex items-center gap-2">
          <Briefcase size={16} className="text-teal" /> My jobs
        </h3>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[["list", ClipboardList], ["board", LayoutGrid]].map(([v, Icon]) => (
            <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${view === v ? "bg-white" : ""}`}>
              <Icon size={12} /> {v === "list" ? "List" : "Board"}
            </button>
          ))}
        </div>
      </div>

      {view === "board" ? (
        <KanbanBoard jobs={jobs} onMove={move} />
      ) : (
        <div className="flex flex-col gap-3">
          {jobs.map((j) => (
            <div key={j.id} className="border border-dashed border-gray-300 rounded-lg p-4">
              <div className="flex justify-between flex-wrap gap-2">
                <div>
                  <span className="font-mono text-xs text-gray-500">{j.code}</span>
                  <p className="font-semibold text-sm mt-0.5 mb-1">{j.title}</p>
                  {j.description && <p className="text-xs text-gray-500 mb-1">{j.description}</p>}
                  <p className="text-xs text-gray-500">{j.customer_company || `${j.customer_firstname} ${j.customer_lastname}`} · Due {j.deadline || "—"}</p>
                </div>
                <div className="flex gap-1.5 flex-wrap items-start">
                  <Badge tone={jobTone(j.status)}>{j.status}</Badge>
                  <Badge tone={priorityTone(j.priority)}>{j.priority}</Badge>
                </div>
              </div>
              <div className="my-2"><ProgressBar value={j.progress} /></div>
              <div className="flex gap-2 flex-wrap">
                {JOB_STATUSES.map((s) => (
                  <button key={s} onClick={() => move(j.id, s)}
                    disabled={j.status === s || j.status === "Completed"}
                    className={`text-xs font-semibold rounded-md px-2.5 py-1.5 bg-gray-100 ${j.status === s || j.status === "Completed" ? "opacity-40" : ""}`}>
                    Move to {s}
                  </button>
                ))}
              </div>
              {j.notes?.length > 0 && (
                <div className="mt-2.5 text-xs text-gray-500">
                  {j.notes.map((n, i) => <div key={i} className={`py-1 ${i === 0 ? "border-t border-gray-200" : ""}`}>"{n.note}"</div>)}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <input placeholder="Leave a note..." value={noteDrafts[j.id] || ""} onChange={(e) => setNoteDrafts((d) => ({ ...d, [j.id]: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-xs" />
                <button
                  onClick={() => (noteDrafts[j.id] || "").trim() ? noteMutation.mutate({ id: j.id, note: noteDrafts[j.id] }) : notify("Write a note before adding it.", "warning")}
                  className="flex items-center gap-1 bg-ink text-white rounded-md px-3 py-1.5 text-xs font-semibold">
                  <MessageSquare size={13} /> Add
                </button>
              </div>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-gray-400">No jobs assigned yet.</p>}
        </div>
      )}
    </div>
  );
}

function MyCustomers() {
  const { notify } = useToast();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["my-customers", query],
    queryFn: () => api.get("/customers", { params: { q: query || undefined } }).then((r) => r.data),
  });
  const { data: files = [] } = useQuery({
    queryKey: ["files", open],
    queryFn: () => api.get("/files", { params: { customerId: open } }).then((r) => r.data),
    enabled: Boolean(open),
  });

  const qc = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: ({ customerId, file }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("customerId", customerId);
      return api.post("/files/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["files", open] }); notify("File uploaded.", "success"); },
    onError: (err) => notify(err.response?.data?.error || "Upload failed", "error"),
  });

  function handleUpload(customerId, e) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate({ customerId, file });
    e.target.value = "";
  }
  async function handleDownload(file) {
    const res = await api.get(`/files/${file.id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url; a.download = file.filename; a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-display uppercase text-sm tracking-wide flex items-center gap-2">
          <Users size={16} className="text-teal" /> My customers
        </h3>
        <div className="flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1.5">
          <Search size={14} className="text-gray-400" />
          <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="text-xs outline-none" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {customers.map((c) => (
          <div key={c.id}>
            <div onClick={() => setOpen(open === c.id ? null : c.id)}
              className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <div>
                <p className="font-semibold text-sm">{c.firstname} {c.lastname} <span className="text-gray-400 font-normal text-xs">{c.customer_code}</span></p>
                <p className="text-xs text-gray-500">{c.company}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={customerTone(c.status)}>{c.status}</Badge>
                <ChevronRight size={15} className={`text-gray-400 transition-transform ${open === c.id ? "rotate-90" : ""}`} />
              </div>
            </div>
            {open === c.id && (
              <div className="p-3 border border-t-0 border-gray-200 rounded-b-lg text-xs">
                <div className="flex gap-4 text-gray-500 mb-1.5 flex-wrap">
                  <span className="flex items-center gap-1"><Mail size={12} /> {c.email || "—"}</span>
                  <span className="flex items-center gap-1"><Phone size={12} /> {c.phone || "—"}</span>
                </div>
                <p className="flex items-center gap-1 text-gray-500 mb-2">
                  <MapPin size={12} /> {[c.address, c.city, c.country].filter(Boolean).join(", ") || "—"}
                </p>
                {c.notes && <p className="bg-paper rounded-md p-2 mb-2.5">{c.notes}</p>}

                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold">Files</span>
                  <label className="flex items-center gap-1 font-semibold rounded-md px-2 py-1 cursor-pointer" style={{ background: "#D9EDEA", color: "#1F6359" }}>
                    <Upload size={12} /> Upload
                    <input type="file" className="hidden" onChange={(e) => handleUpload(c.id, e)} />
                  </label>
                </div>
                {files.length === 0 && <p className="text-gray-400 mb-2">No files yet.</p>}
                {files.map((f) => (
                  <div key={f.id} className="flex justify-between py-1">
                    <span className="flex items-center gap-1"><FileText size={12} />{f.filename}</span>
                    <button onClick={() => handleDownload(f)} className="flex items-center gap-1 text-indigo-600 font-semibold">
                      <Download size={12} /> Download
                    </button>
                  </div>
                ))}
                <CustomerTimeline customerId={c.id} />
              </div>
            )}
          </div>
        ))}
        {customers.length === 0 && <p className="text-sm text-gray-400">No customers assigned yet.</p>}
      </div>
    </div>
  );
}
