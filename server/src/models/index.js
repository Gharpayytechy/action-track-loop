import mongoose from "mongoose";

const { Schema } = mongoose;

// --- User (auth) ---
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    employeeId: { type: String, index: true }, // links to Employee.id
    role: {
      type: String,
      enum: ["admin", "hr", "manager", "employee"],
      default: "employee",
    },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// --- Employee ---
const EmployeeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // stable id used by frontend (e1..e15)
    name: { type: String, required: true },
    role: { type: String, required: true }, // Floor Lead / Operator / TCM / HR / etc
    title: String,
    avatarColor: String,
    managerId: String,
    hubId: String,
    email: String,
    phone: String,
    joinedAt: Number,
    birthday: String,
    skills: [String],
  },
  { timestamps: true },
);

// --- Attendance ---
const AttendanceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    checkInAt: Number,
    checkOutAt: Number,
    status: { type: String, enum: ["present", "late", "absent", "leave"], default: "present" },
    selfieUrl: String,
    note: String,
    minutesWorked: Number,
  },
  { timestamps: true },
);
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

// --- Task ---
const TaskSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    assigneeId: { type: String, index: true },
    createdById: String,
    dueAt: Number,
    priority: { type: String, enum: ["low", "med", "high", "urgent"], default: "med" },
    status: { type: String, enum: ["todo", "doing", "done", "blocked"], default: "todo" },
    tags: [String],
    completedAt: Number,
  },
  { timestamps: true },
);

// --- Leave ---
const LeaveSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    employeeId: { type: String, required: true, index: true },
    type: { type: String, enum: ["Casual", "Sick", "Earned", "Unpaid", "WFH"], required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    reason: String,
    appliedAt: Number,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedById: String,
    reviewNote: String,
  },
  { timestamps: true },
);

// --- Kudos ---
const KudoSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    fromId: { type: String, required: true },
    toId: { type: String, required: true, index: true },
    tag: String,
    message: String,
    ts: Number,
  },
  { timestamps: true },
);

// --- Calendar event ---
const CalEventSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ["shift", "tour", "task", "leave", "holiday", "birthday", "1:1", "town_hall", "anniversary"],
      required: true,
    },
    title: String,
    startAt: Number,
    endAt: Number,
    ownerId: String,
    note: String,
  },
  { timestamps: true },
);

// --- Notification ---
const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    kind: {
      type: String,
      enum: ["approval", "task", "kudos", "attendance", "mention", "coach", "calendar", "system"],
      required: true,
    },
    toId: { type: String, required: true, index: true },
    fromId: String,
    title: String,
    body: String,
    actionLabel: String,
    actionTo: String,
    ts: Number,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// --- 1:1 ---
const ActionItemSchema = new Schema(
  {
    id: String,
    text: String,
    ownerId: String,
    dueAt: Number,
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const OneOnOneSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    managerId: { type: String, required: true, index: true },
    reportId: { type: String, required: true, index: true },
    scheduledAt: Number,
    durationMin: { type: Number, default: 30 },
    status: { type: String, enum: ["scheduled", "completed", "cancelled"], default: "scheduled" },
    sentiment: { type: String, enum: ["green", "amber", "red"] },
    agenda: String,
    notes: String,
    privateNotes: String,
    actionItems: [ActionItemSchema],
  },
  { timestamps: true },
);

// --- Recruiting ---
const CandidateNoteSchema = new Schema(
  { id: String, authorId: String, body: String, ts: Number },
  { _id: false },
);

const CandidateSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
    role: String, // role they're applying for
    source: String,
    recruiterId: { type: String, index: true },
    stage: {
      type: String,
      enum: ["applied", "screen", "interview", "offer", "hired", "rejected"],
      default: "applied",
    },
    rejectReason: String,
    appliedAt: Number,
    notes: [CandidateNoteSchema],
  },
  { timestamps: true },
);

// --- Console (per-day per-actor playbook progress) ---
const ConsoleStateSchema = new Schema(
  {
    id: { type: String, required: true, unique: true }, // `${actorId}:${date}`
    actorId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    sprintsDone: [String],
    kpis: { type: Map, of: Number, default: {} },
    sentWindows: [String],
    eodDraft: String,
    hardDecisions: String,
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
export const Employee = mongoose.model("Employee", EmployeeSchema);
export const Attendance = mongoose.model("Attendance", AttendanceSchema);
export const Task = mongoose.model("Task", TaskSchema);
export const Leave = mongoose.model("Leave", LeaveSchema);
export const Kudo = mongoose.model("Kudo", KudoSchema);
export const CalEvent = mongoose.model("CalEvent", CalEventSchema);
export const Notification = mongoose.model("Notification", NotificationSchema);
export const OneOnOne = mongoose.model("OneOnOne", OneOnOneSchema);
export const Candidate = mongoose.model("Candidate", CandidateSchema);
export const ConsoleState = mongoose.model("ConsoleState", ConsoleStateSchema);
