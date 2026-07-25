import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import api from "../api/axios";
import { socket } from "../api/socket";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const unread = notifs.filter((n) => !n.is_read).length;

  async function refresh() {
    const { data } = await api.get("/notifications");
    setNotifs(data);
  }

  useEffect(() => {
    refresh();
    socket.connect();
    socket.emit("join-user", user?.id);
    const onNotification = (n) => setNotifs((list) => [n, ...list]);
    socket.on("notification", onNotification);
    return () => { socket.off("notification", onNotification); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markOne(id) {
    await api.put(`/notifications/${id}/read`);
    setNotifs((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }
  async function markAll() {
    await api.put("/notifications/read-all");
    setNotifs((list) => list.map((n) => ({ ...n, is_read: true })));
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative bg-white/10 text-white rounded-lg px-2.5 py-1.5">
        <Bell size={15} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-[115%] right-0 bg-white rounded-lg shadow-xl w-72 z-50 text-ink">
          <div className="flex justify-between items-center px-3 py-2.5 border-b border-gray-200">
            <span className="font-bold text-xs">Notifications</span>
            <button onClick={markAll} className="text-indigo-600 text-[11px] font-semibold">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.map((n) => (
              <div key={n.id} onClick={() => markOne(n.id)}
                className={`px-3 py-2.5 border-b border-gray-100 cursor-pointer text-xs ${n.is_read ? "bg-white" : "bg-teal/10"}`}
                style={{ background: n.is_read ? "#fff" : "#D9EDEA" }}>
                <p className="font-semibold m-0">{n.title}</p>
                <p className="text-gray-500 m-0 mt-0.5">{n.body}</p>
              </div>
            ))}
            {notifs.length === 0 && <p className="p-3 text-gray-400 text-xs">You're all caught up.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
