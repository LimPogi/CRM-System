import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Users, Camera } from "lucide-react";
import api from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import DataTable from "../../components/DataTable";
import Badge from "../../components/Badge";

export default function AdminEmployees() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [sorting, setSorting] = useState([]);
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: employees = [] } = useQuery({ queryKey: ["employees-list"], queryFn: () => api.get("/employees").then((r) => r.data) });

  const addMutation = useMutation({
    mutationFn: (payload) => api.post("/employees", payload),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["employees-list"] }); reset(); notify(`${res.data.fullname} added — share their login to get started.`, "success"); },
    onError: (err) => notify(err.response?.data?.error || "Couldn't add employee", "error"),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.put(`/employees/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employees-list"] }),
    onError: (err) => notify(err.response?.data?.error || "Couldn't update status", "error"),
  });
  const avatarMutation = useMutation({
    mutationFn: ({ id, file }) => {
      const form = new FormData();
      form.append("file", file);
      return api.post(`/employees/${id}/avatar`, form, { headers: { "Content-Type": "multipart/form-data" } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees-list"] }); notify("Profile picture updated.", "success"); },
    onError: (err) => notify(err.response?.data?.error || "Upload failed", "error"),
  });

  function onSubmit(data) {
    if (!data.fullname || !data.email || !data.password) return notify("Name, email, and password are required.", "warning");
    addMutation.mutate(data);
  }
  function handleAvatarChange(id, e) {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate({ id, file });
    e.target.value = "";
  }

  const columns = useMemo(() => [
    {
      id: "avatar", header: "",
      cell: ({ row }) => (
        <label className="relative cursor-pointer block w-7 h-7">
          {row.original.avatar_url ? (
            <img src={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/files/employee/${row.original.id}/avatar`}
              alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400"><Camera size={12} /></span>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarChange(row.original.id, e)} />
        </label>
      ),
    },
    { accessorKey: "fullname", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "department", header: "Department" },
    { accessorKey: "position", header: "Position" },
    { accessorKey: "open_jobs", header: "Open jobs" },
    { accessorKey: "completed_jobs", header: "Completed" },
    { accessorKey: "status", header: "Status", cell: (c) => <Badge tone={c.getValue() === "Active" ? "teal" : "slate"}>{c.getValue()}</Badge> },
    {
      id: "actions", header: "",
      cell: ({ row }) => (
        <button onClick={() => statusMutation.mutate({ id: row.original.id, status: row.original.status === "Active" ? "Inactive" : "Active" })} className="text-indigo-600 font-semibold text-xs">
          {row.original.status === "Active" ? "Deactivate" : "Reactivate"}
        </button>
      ),
    },
  ], []);

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-teal" /> Add employee
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-3">
          <input placeholder="Full name" {...register("fullname", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Email" {...register("email", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Temporary password" type="password" {...register("password", { required: true })} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Department" {...register("department")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input placeholder="Position" {...register("position")} className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button type="submit" disabled={isSubmitting} className="bg-ink text-white rounded-md py-2 font-semibold text-sm disabled:opacity-60">
            Create employee account
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2">Profile pictures can be added afterward from the table below.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="font-display uppercase text-sm tracking-wide mb-4 flex items-center gap-2">
          <Users size={16} className="text-teal" /> Employees
        </h3>
        <DataTable columns={columns} data={employees} sorting={sorting} onSortingChange={setSorting} />
      </div>
    </div>
  );
}
