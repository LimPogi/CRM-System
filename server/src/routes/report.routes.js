const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get("/overview", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE role = 'employee') AS total_employees,
       (SELECT COUNT(*) FROM customers) AS customers,
       (SELECT COUNT(*) FROM jobs WHERE status <> 'Completed') AS pending_jobs,
       (SELECT COUNT(*) FROM jobs WHERE status = 'Completed') AS completed_jobs,
       (SELECT COUNT(*) FROM users WHERE role = 'employee' AND status = 'Active') AS active_employees`
  );
  res.json(rows[0]);
});

// Jobs completed per week, last 8 weeks — line chart.
router.get("/completed-trend", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT date_trunc('week', updated_at)::date AS week, COUNT(*) AS completed
     FROM jobs
     WHERE status = 'Completed' AND updated_at >= now() - interval '8 weeks'
     GROUP BY week ORDER BY week`
  );
  res.json(rows);
});

// Job status breakdown — donut chart (To Do / In Progress / Review / Completed).
router.get("/status-breakdown", async (req, res) => {
  const { rows } = await pool.query(`SELECT status, COUNT(*) AS count FROM jobs GROUP BY status`);
  res.json(rows);
});

// Open vs completed jobs per employee — bar chart, doubles as "Employee Productivity".
router.get("/jobs-per-employee", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.fullname,
            COUNT(j.id) FILTER (WHERE j.status <> 'Completed') AS open,
            COUNT(j.id) FILTER (WHERE j.status = 'Completed') AS done
     FROM users u
     LEFT JOIN jobs j ON j.assigned_to = u.id
     WHERE u.role = 'employee'
     GROUP BY u.fullname ORDER BY u.fullname`
  );
  res.json(rows);
});

// New customers per month, last 6 months — feeds the "Customer Count" /
// "Monthly Report" requirement. There's no revenue field in the schema, so
// a "Sales" figure isn't fabricated here — this is customer growth instead.
router.get("/customer-growth", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT date_trunc('month', created_at)::date AS month, COUNT(*) AS new_customers
     FROM customers
     WHERE created_at >= now() - interval '6 months'
     GROUP BY month ORDER BY month`
  );
  res.json(rows);
});

// Lightweight CSV export. Swap in `exceljs` or `pdfkit` here for actual
// Excel/PDF output — the query is already there, only the formatting changes.
router.get("/export", async (req, res) => {
  const { format = "csv" } = req.query;
  const { rows } = await pool.query(
    `SELECT j.id, j.title, c.company AS customer, u.fullname AS assigned_to,
            j.priority, j.status, j.deadline, j.created_at
     FROM jobs j JOIN customers c ON c.id = j.customer_id LEFT JOIN users u ON u.id = j.assigned_to
     ORDER BY j.created_at DESC`
  );

  if (format !== "csv") {
    // Excel/PDF aren't wired up yet — CSV always works so the export button
    // never silently fails; see the README for where to add exceljs/pdfkit.
    console.warn(`Export format "${format}" isn't implemented yet — falling back to CSV`);
  }

  const header = "Job ID,Title,Customer,Assigned To,Priority,Status,Deadline,Created";
  const csv = [header, ...rows.map((r) =>
    [`JOB-${1000 + r.id}`, r.title, r.customer, r.assigned_to, r.priority, r.status, r.deadline, r.created_at]
      .map((v) => `"${v ?? ""}"`).join(",")
  )].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=jobs-report.csv");
  res.send(csv);
});

module.exports = router;
