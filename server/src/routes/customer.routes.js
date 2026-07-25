const express = require("express");
const pool = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { emitToAdmins, emitToUser } = require("../sockets");
const { logActivity } = require("../services/activity.service");
const { notify } = require("../services/notification.service");

const router = express.Router();
router.use(requireAuth);

function customerCode(id) {
  return `CUS-${1000 + Number(id)}`;
}
function withCode(row) {
  return row && { ...row, customer_code: customerCode(row.id) };
}

// Employees only see their assigned customers; admins see everyone.
// ?q= searches name/company/phone/email/job id (the "search customers" requirement).
router.get("/", async (req, res) => {
  const { q } = req.query;
  const isAdmin = req.user.role === "admin";
  const { rows } = await pool.query(
    `SELECT c.*, u.fullname AS assigned_name
     FROM customers c
     LEFT JOIN users u ON u.id = c.assigned_to
     WHERE ($1::int IS NULL OR c.assigned_to = $1)
       AND ($2::text IS NULL OR
            c.firstname ILIKE '%' || $2 || '%' OR c.lastname ILIKE '%' || $2 || '%' OR
            c.company ILIKE '%' || $2 || '%' OR c.email ILIKE '%' || $2 || '%' OR c.phone ILIKE '%' || $2 || '%')
     ORDER BY c.created_at DESC`,
    [isAdmin ? null : req.user.id, q || null]
  );
  res.json(rows.map(withCode));
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT c.*, u.fullname AS assigned_name FROM customers c LEFT JOIN users u ON u.id = c.assigned_to WHERE c.id = $1`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: "Customer not found" });
  if (req.user.role !== "admin" && rows[0].assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This customer isn't assigned to you" });
  }
  res.json(withCode(rows[0]));
});

// Full activity trail for one customer — the "Customer Timeline" feature.
router.get("/:id/timeline", async (req, res) => {
  const { id } = req.params;
  const customer = await pool.query(`SELECT assigned_to FROM customers WHERE id = $1`, [id]);
  if (!customer.rows.length) return res.status(404).json({ error: "Customer not found" });
  if (req.user.role !== "admin" && customer.rows[0].assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This customer isn't assigned to you" });
  }
  const { rows } = await pool.query(
    `SELECT a.*, u.fullname AS actor_name FROM activity_logs a
     LEFT JOIN users u ON u.id = a.user_id
     WHERE a.entity_type = 'customer' AND a.entity_id = $1
     ORDER BY a.created_at ASC`,
    [id]
  );
  res.json(rows);
});

router.post("/", requireAdmin, async (req, res) => {
  const { firstName, lastName, company, email, phone, address, city, country, notes, assignedTo } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: "firstName and lastName are required" });

  const { rows } = await pool.query(
    `INSERT INTO customers (firstname, lastname, company, email, phone, address, city, country, notes, assigned_to, created_by, last_contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
     RETURNING *`,
    [firstName, lastName, company || null, email || null, phone || null, address || null, city || null, country || null, notes || null, assignedTo || null, req.user.id]
  );
  const customer = withCode(rows[0]);

  await logActivity({ userId: req.user.id, action: "Customer created", entityType: "customer", entityId: customer.id, description: "Customer created" });
  if (assignedTo) {
    await logActivity({ userId: req.user.id, action: "Assigned customer", entityType: "customer", entityId: customer.id, description: `Assigned to user #${assignedTo}` });
    await notify(assignedTo, "New customer assigned", `${firstName} ${lastName} (${company || "no company"}) is now yours`);
  }
  emitToAdmins("customer-added", customer);
  res.json(customer);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query(`SELECT * FROM customers WHERE id = $1`, [id]);
  if (!existing.rows.length) return res.status(404).json({ error: "Customer not found" });
  if (req.user.role !== "admin" && existing.rows[0].assigned_to !== req.user.id) {
    return res.status(403).json({ error: "This customer isn't assigned to you" });
  }

  const { firstName, lastName, company, email, phone, address, city, country, notes, status, assignedTo, lastContact } = req.body;
  const { rows } = await pool.query(
    `UPDATE customers SET
       firstname = COALESCE($1, firstname), lastname = COALESCE($2, lastname),
       company = COALESCE($3, company), email = COALESCE($4, email), phone = COALESCE($5, phone),
       address = COALESCE($6, address), city = COALESCE($7, city), country = COALESCE($8, country),
       notes = COALESCE($9, notes), status = COALESCE($10, status),
       assigned_to = CASE WHEN $11::int IS NOT NULL THEN $11 ELSE assigned_to END,
       last_contact = COALESCE($12, last_contact)
     WHERE id = $13 RETURNING *`,
    [firstName || null, lastName || null, company || null, email || null, phone || null, address || null,
      city || null, country || null, notes || null, status || null,
      req.user.role === "admin" ? assignedTo || null : null, lastContact || null, id]
  );
  const customer = withCode(rows[0]);

  if (status && status !== existing.rows[0].status) {
    await logActivity({ userId: req.user.id, action: "Status changed", entityType: "customer", entityId: customer.id, description: `Status changed to ${status}` });
  }
  if (assignedTo && assignedTo !== existing.rows[0].assigned_to) {
    await logActivity({ userId: req.user.id, action: "Assigned customer", entityType: "customer", entityId: customer.id, description: `Reassigned to user #${assignedTo}` });
    await notify(assignedTo, "Customer reassigned", `${customer.firstname} ${customer.lastname} is now yours`);
  }
  emitToAdmins("customer-updated", customer);
  res.json(customer);
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(`DELETE FROM customers WHERE id = $1 RETURNING id`, [id]);
  if (!rows.length) return res.status(404).json({ error: "Customer not found" });
  res.json({ ok: true });
});

module.exports = router;
