const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// One box, three result groups — matches the spec's "Search: Customer Name,
// Phone, Email, Job ID, Employee, Company" requirement. Employees only
// search within what they're allowed to see; admins search everything.
router.get("/", async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) return res.json({ customers: [], jobs: [], employees: [] });
  const isAdmin = req.user.role === "admin";
  const term = `%${q}%`;

  const customers = await pool.query(
    `SELECT id, firstname, lastname, company, email, phone FROM customers
     WHERE ($1::int IS NULL OR assigned_to = $1)
       AND (firstname ILIKE $2 OR lastname ILIKE $2 OR company ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
     LIMIT 8`,
    [isAdmin ? null : req.user.id, term]
  );

  // Job IDs are shown as JOB-1042 — accept either the bare number or the
  // full code when matching against id.
  const numericId = q.replace(/\D/g, "");
  const jobs = await pool.query(
    `SELECT j.id, j.title, j.status FROM jobs j
     WHERE ($1::int IS NULL OR j.assigned_to = $1)
       AND (j.title ILIKE $2 OR ($3 <> '' AND j.id::text = $3))
     LIMIT 8`,
    [isAdmin ? null : req.user.id, term, numericId ? String(Number(numericId) - 1000) : ""]
  );

  let employees = { rows: [] };
  if (isAdmin) {
    employees = await pool.query(
      `SELECT id, fullname, email, department, position FROM users
       WHERE role = 'employee' AND (fullname ILIKE $1 OR email ILIKE $1) LIMIT 8`,
      [term]
    );
  }

  res.json({
    customers: customers.rows.map((c) => ({ ...c, customer_code: `CUS-${1000 + c.id}` })),
    jobs: jobs.rows.map((j) => ({ ...j, code: `JOB-${1000 + j.id}` })),
    employees: employees.rows,
  });
});

module.exports = router;
