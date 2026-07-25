import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, ClipboardList, LayoutGrid } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";
import KanbanBoard from "../../components/KanbanBoard";
import ProgressBar from "../../components/ProgressBar";
import Badge, { jobTone, priorityTone } from "../../components/Badge";

const STATUS_TABS = ["All", "To Do", "In Progress", "Review", "Completed"];

export default function AdminJobs() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [view, setView] = useState("board");
  const [filter, setFilter] = useState("All");
  const [sorting, setSorting] = useState([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: customers = [] } = useQuery({ queryKey: ["customers", ""], queryFn: () => api.get("/customers").then((r) => r.data) });
  const { data: employees = [] } = useQuery({ queryKey: ["employees-list"], queryFn: () => api.get("/employees").then((r) => r.data) });
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs", filter],
    queryFn: () => api.get("/jobs", { params: filter === "All" ? {} : { status: filter } }).then((r) => r.data),
  });

  const assignMutation = useMutation({
    mutationFn: (payload) => api.post("/jobs", payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["jobs"] }); reset(); notify(`${res.data.code} assigned.`, "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't assign job", "error"),
  });
  const moveMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/jobs/${id}/status`, { status }),
    onSuccess: (res, { status }) => { qc.invalidateQueries({ queryKey: ["jobs"] }); notify(`${res.data.code} moved to ${status}.`, "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't move job", "warning"),
  });

  function onSubmit(data) {
    if (!data.title || !data.customerId || !data.deadline) return notify("Title, customer, and due date are required.", "warning");
    assignMutation.mutate({ ...data, customerId: Number(data.customerId), assignedTo: data.assignedTo ? Number(data.assignedTo) : null });
  }

  const columns = useMemo(() => [
    { accessorKey: "code", header: "ID" },
    { accessorKey: "title", header: "Title" },
    { id: "customer", header: "Customer", accessorFn: (j) => j.customer_company || `${j.customer_firstname} ${j.customer_lastname}` },
    { accessorKey: "assigned_name", header: "Assigned", cell: (c) => c.getValue() || "Unassigned" },
    { accessorKey: "priority", header: "Priority", cell: (c) => <Badge tone={priorityTone(c.getValue())}>{c.getValue()}</Badge> },
    { accessorKey: "progress", header: "Progress", cell: (c) => <div className="w-20"><ProgressBar value={c.getValue()} /></div> },
    { accessorKey: "deadline", header: "Due" },
    { accessorKey: "status", header: "Status", cell: (c) => <Badge tone={jobTone(c.getValue())}>{c.getValue()}</Badge> },
  ], []);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
          <Briefcase size={16} className="text-teal" /> Assign a job
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input placeholder="Job title" {...register("title", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Description" {...register("description")} className="border border-gray-300 rounded-md px-3 py-2 text-sm lg:col-span-2" />
          <select {...register("customerId", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.company || `${c.firstname} ${c.lastname}`}</option>)}
          </select>
          <select {...register("assignedTo")} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {employees.filter((e) => e.status === "Active").map((e) => <option key={e.id} value={e.id}>{e.fullname}</option>)}
          </select>
          <select {...register("priority")} defaultValue="Medium" className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            {["Low", "Medium", "High"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <input type="date" {...register("deadline", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button type="submit" disabled={isSubmitting} className="bg-ink text-white rounded-md py-2 font-semibold text-sm disabled:opacity-60">
            Assign job
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h3 className="font-display uppercase text-sm tracking-wide flex items-center gap-2">
            <ClipboardList size={16} className="text-teal" /> Jobs
          </h3>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[["board", LayoutGrid], ["table", ClipboardList]].map(([v, Icon]) => (
              <button key={v} onClick={() => setView(v)} className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${view === v ? "bg-white" : ""}`}>
                <Icon size={12} /> {v === "board" ? "Board" : "Table"}
              </button>
            ))}
          </div>
        </div>

        {view === "board" ? (
          <KanbanBoard jobs={jobs} onMove={(id, status) => moveMutation.mutate({ id, status })} />
        ) : (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {STATUS_TABS.map((t) => (
                <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === t ? "bg-ink text-white border-ink" : "bg-white border-gray-300 text-ink"}`}>
                  {t}
                </button>
              ))}
            </div>
            <DataTable columns={columns} data={jobs} sorting={sorting} onSortingChange={setSorting} />
          </>
        )}
      </div>
    </div>
  );
}
