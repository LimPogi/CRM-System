import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Building2, Search, ChevronRight } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";
import Badge, { customerTone } from "../../components/Badge";
import CustomerTimeline from "../../components/CustomerTimeline";

// Defaults from the spec — admins can widen this list; the backend accepts
// any string for `status`, this dropdown just seeds the common set.
const CUSTOMER_STATUSES = ["New Lead", "Contacted", "Follow Up", "In Progress", "Waiting for Client", "Completed", "Cancelled", "Archived"];

export default function AdminCustomers() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState([]);
  const [openTimeline, setOpenTimeline] = useState(null);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: employees = [] } = useQuery({ queryKey: ["employees-list"], queryFn: () => api.get("/employees").then((r) => r.data) });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api.get("/customers", { params: { q: query || undefined } }).then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/customers", payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["customers"] }); reset(); notify(`${res.data.firstname} ${res.data.lastname} added as a new lead.`, "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't add customer", "error"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/customers/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
    onError: (err) => notify(err.response?.data?.error || "Couldn't update status", "error"),
  });

  function onSubmit(data) {
    if (!data.firstName || !data.lastName) return notify("First name and last name are required.", "warning");
    addMutation.mutate({ ...data, assignedTo: data.assignedTo ? Number(data.assignedTo) : null });
  }

  const columns = useMemo(() => [
    { accessorKey: "customer_code", header: "Code" },
    { id: "name", header: "Name", accessorFn: (c) => `${c.firstname} ${c.lastname}`, cell: (c) => c.getValue() },
    { accessorKey: "company", header: "Company" },
    { accessorKey: "assigned_name", header: "Assigned to", cell: (c) => c.getValue() || "Unassigned" },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => (
        <select
          value={row.original.status}
          onChange={(e) => statusMutation.mutate({ id: row.original.id, status: e.target.value })}
          className="text-xs border-none bg-transparent font-semibold"
          style={{ color: "inherit" }}
        >
          {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone", header: "Phone" },
    {
      id: "timeline", header: "",
      cell: ({ row }) => (
        <button onClick={() => setOpenTimeline(openTimeline === row.original.id ? null : row.original.id)} className="text-gray-400">
          <ChevronRight size={14} className={`transition-transform ${openTimeline === row.original.id ? "rotate-90" : ""}`} />
        </button>
      ),
    },
  ], [openTimeline]);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-teal" /> Add customer
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <input placeholder="First name" {...register("firstName", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Last name" {...register("lastName", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Company" {...register("company")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Phone" {...register("phone")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Email" {...register("email")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <select {...register("assignedTo")} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Unassigned</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.fullname}</option>)}
          </select>
          <input placeholder="Address" {...register("address")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="City" {...register("city")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Country" {...register("country")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Notes" {...register("notes")} className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" />
          <button type="submit" disabled={isSubmitting} className="bg-ink text-white rounded-md py-2 font-semibold text-sm disabled:opacity-60">
            Add customer
          </button>
        </form>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-display uppercase text-sm tracking-wide flex items-center gap-2">
            <Building2 size={16} className="text-teal" /> Customers ({customers.length})
          </h3>
          <div className="flex items-center gap-2 border border-gray-300 rounded-md px-2 py-1.5">
            <Search size={14} className="text-gray-400" />
            <input placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} className="text-xs outline-none" />
          </div>
        </div>
        <DataTable columns={columns} data={customers} sorting={sorting} onSortingChange={setSorting} />
        {openTimeline && (
          <div className="mt-4 pl-4 border-l-2 border-gray-200">
            <CustomerTimeline customerId={openTimeline} />
          </div>
        )}
      </div>
    </div>
  );
}
