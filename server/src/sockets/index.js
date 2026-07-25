const { Server } = require("socket.io");

let io;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN || "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    // Admin dashboards join a shared room; each employee joins a room keyed
    // to their own user id so we can notify them individually (e.g. "you
    // were assigned a new job") without broadcasting to everyone.
    socket.on("join-admin", () => socket.join("admins"));
    socket.on("join-user", (userId) => socket.join(`user-${userId}`));
  });

  return io;
}

function emitToAdmins(event, payload) {
  if (!io) return;
  io.to("admins").emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user-${userId}`).emit(event, payload);
}

module.exports = { initSocket, emitToAdmins, emitToUser };
