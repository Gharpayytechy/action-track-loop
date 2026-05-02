import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User, Employee } from "../models/index.js";
import { signToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../lib/validate.js";

const router = Router();

const SignupSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100),
  employeeId: z.string().min(1).max(50).optional(),
});

const LoginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

router.post("/signup", validate(SignupSchema), async (req, res, next) => {
  try {
    const { email, password, name, employeeId } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    // First user becomes admin & auto-approved
    const userCount = await User.countDocuments();
    const isFirst = userCount === 0;

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      passwordHash,
      employeeId,
      role: isFirst ? "admin" : "employee",
      isApproved: isFirst,
    });

    // Optionally create a stub Employee record
    if (employeeId) {
      const emp = await Employee.findOne({ id: employeeId });
      if (!emp) {
        await Employee.create({
          id: employeeId,
          name,
          role: "Operator",
        });
      }
    }

    if (!isFirst) {
      return res.status(201).json({
        message: "Account created. Awaiting admin approval before you can sign in.",
      });
    }

    const token = signToken({ id: user._id, employeeId: user.employeeId, role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/login", validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    if (!user.isApproved) return res.status(403).json({ error: "Account pending approval" });

    const token = signToken({ id: user._id, employeeId: user.employeeId, role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post("/approve/:userId", requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    const u = await User.findByIdAndUpdate(req.params.userId, { isApproved: true }, { new: true });
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(u) });
  } catch (err) {
    next(err);
  }
});

function publicUser(u) {
  return {
    id: u._id,
    email: u.email,
    employeeId: u.employeeId,
    role: u.role,
    isApproved: u.isApproved,
  };
}

export default router;
