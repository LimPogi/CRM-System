import React from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from "@tanstack/react-table";
import { ChevronUp, ChevronDown } from "lucide-react";

export default function DataTable({ columns, data, sorting, onSortingChange }) {
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id} className="text-left text-xs text-gray-500 uppercase">
            {hg.headers.map((header) => (
              <th
                key={header.id}
                onClick={header.column.getToggleSortingHandler()}
                className="pb-2 pr-4 cursor-pointer select-none"
              >
                <span className="inline-flex items-center gap-1">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === "asc" && <ChevronUp size={12} />}
                  {header.column.getIsSorted() === "desc" && <ChevronDown size={12} />}
                </span>
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="py-2 pr-4">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
        {table.getRowModel().rows.length === 0 && (
          <tr><td colSpan={columns.length} className="py-4 text-center text-gray-400">No records yet.</td></tr>
        )}
      </tbody>
    </table>
  );
}
