import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

/**
 * Builds a generic REST router for a Mongoose model:
 *   GET    /            list (with optional ?employeeId=&date=&limit=)
 *   GET    /:id         get one (by `id` field, not _id)
 *   POST   /            create (auto-fills `id` if missing)
 *   PATCH  /:id         partial update
 *   DELETE /:id         delete
 *
 * `filterFields` whitelist which query params can be used to filter list().
 */
export function crudRouter(Model, { filterFields = [], sort = { createdAt: -1 }, allowDelete = true } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get("/", async (req, res, next) => {
    try {
      const filter = {};
      for (const f of filterFields) {
        if (req.query[f]) filter[f] = req.query[f];
      }
      const limit = Math.min(Number(req.query.limit) || 1000, 5000);
      const docs = await Model.find(filter).sort(sort).limit(limit).lean();
      res.json({ items: docs });
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findOne({ id: req.params.id }).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json({ item: doc });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", async (req, res, next) => {
    try {
      const payload = { ...req.body };
      if (!payload.id) {
        payload.id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      }
      const doc = await Model.create(payload);
      res.status(201).json({ item: doc.toObject() });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ error: "Duplicate id" });
      next(err);
    }
  });

  router.patch("/:id", async (req, res, next) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { id: req.params.id },
        { $set: req.body },
        { new: true },
      ).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });
      res.json({ item: doc });
    } catch (err) {
      next(err);
    }
  });

  if (allowDelete) {
    router.delete("/:id", async (req, res, next) => {
      try {
        const r = await Model.deleteOne({ id: req.params.id });
        if (r.deletedCount === 0) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}
