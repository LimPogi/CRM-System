require("dotenv").config();
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");

const { initSocket } = require("./sockets");

const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employee.routes");
const customerRoutes = require("./routes/customer.routes");
const jobRoutes = require("./routes/job.routes");
const fileRoutes = require("./routes/file.routes");
const reportRoutes = require("./routes/report.routes");
const searchRoutes = require("./routes/search.routes");
const notificationRoutes = require("./routes/notification.routes");
const activityRoutes = require("./routes/activity.routes");

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
  credentials: true
}));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

// Fallback error handler so unexpected errors return JSON, not an HTML stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File is too large (25MB max)" });
  res.status(500).json({ error: "Something went wrong on the server" });
});

const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`CRM API listening on port ${PORT}`));
