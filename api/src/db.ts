import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Appointment,
  AppointmentStatus,
  Barber,
  DayOfWeek,
  DaySchedule,
  ScheduleOverride,
  Service,
  TimeOffEntry,
} from "./models.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "..", "data", "barbershop.db");

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Schema creation
// ---------------------------------------------------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS barbers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    durationMinutes INTEGER NOT NULL,
    price REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS barber_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barberId TEXT NOT NULL REFERENCES barbers(id),
    day INTEGER NOT NULL CHECK(day BETWEEN 0 AND 6),
    startHour INTEGER NOT NULL CHECK(startHour BETWEEN 0 AND 23),
    endHour INTEGER NOT NULL CHECK(endHour BETWEEN 1 AND 24),
    UNIQUE(barberId, day)
  );

  CREATE TABLE IF NOT EXISTS barber_time_off (
    id TEXT PRIMARY KEY,
    barberId TEXT NOT NULL REFERENCES barbers(id),
    date TEXT NOT NULL,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS schedule_overrides (
    id TEXT PRIMARY KEY,
    barberId TEXT NOT NULL REFERENCES barbers(id),
    date TEXT NOT NULL,
    startHour INTEGER NOT NULL,
    endHour INTEGER NOT NULL,
    reason TEXT
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    barberId TEXT NOT NULL REFERENCES barbers(id),
    serviceId TEXT NOT NULL REFERENCES services(id),
    startAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    notes TEXT
  );
`);

// ---------------------------------------------------------------------------
// Seed default data (only when tables are empty)
// ---------------------------------------------------------------------------
function seed(): void {
  const barberCount = (db.prepare("SELECT COUNT(*) as c FROM barbers").get() as any).c;
  if (barberCount > 0) return;

  const insertBarber = db.prepare("INSERT INTO barbers (id, name, specialty) VALUES (?, ?, ?)");
  const insertService = db.prepare("INSERT INTO services (id, name, durationMinutes, price) VALUES (?, ?, ?, ?)");
  const insertSchedule = db.prepare("INSERT INTO barber_schedules (barberId, day, startHour, endHour) VALUES (?, ?, ?, ?)");
  const insertAppt = db.prepare("INSERT INTO appointments (id, customerId, barberId, serviceId, startAt, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");

  const seedTx = db.transaction(() => {
    // Barbers
    insertBarber.run("barber-jordan", "Jordan", "Fades & tapers");
    insertBarber.run("barber-alex", "Alex", "Beard design");

    // Jordan Mon-Fri 9-17
    for (let day = 1; day <= 5; day++) {
      insertSchedule.run("barber-jordan", day, 9, 17);
    }
    // Alex Tue-Sat 10-18
    for (let day = 2; day <= 6; day++) {
      insertSchedule.run("barber-alex", day, 10, 18);
    }

    // Services
    insertService.run("svc-classic", "Classic Cut", 45, 35);
    insertService.run("svc-beard", "Beard Trim", 25, 20);
    insertService.run("svc-premium", "Premium Package", 60, 55);

    // Seed appointment
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    insertAppt.run("appt-1", "customer-1", "barber-jordan", "svc-classic", tomorrow, "confirmed", "Keep the top textured");
  });

  seedTx();
  console.log("🌱 Database seeded with default barbers, services, and schedules.");
}

seed();

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

// -- Services ---------------------------------------------------------------
export function getAllServices(): Service[] {
  return db.prepare("SELECT id, name, durationMinutes, price FROM services").all() as Service[];
}

export function getServiceById(id: string): Service | undefined {
  return db.prepare("SELECT id, name, durationMinutes, price FROM services WHERE id = ?").get(id) as Service | undefined;
}

// -- Barbers ----------------------------------------------------------------
export function getAllBarbers(): Barber[] {
  const rows = db.prepare("SELECT id, name, specialty FROM barbers").all() as { id: string; name: string; specialty: string }[];
  return rows.map((r) => ({
    ...r,
    schedule: getBarberSchedules(r.id),
    timeOff: getBarberTimeOff(r.id),
  }));
}

export function getBarberById(id: string): Barber | undefined {
  const row = db.prepare("SELECT id, name, specialty FROM barbers WHERE id = ?").get(id) as { id: string; name: string; specialty: string } | undefined;
  if (!row) return undefined;
  return {
    ...row,
    schedule: getBarberSchedules(row.id),
    timeOff: getBarberTimeOff(row.id),
  };
}

function getBarberSchedules(barberId: string): DaySchedule[] {
  return db
    .prepare("SELECT day, startHour, endHour FROM barber_schedules WHERE barberId = ? ORDER BY day")
    .all(barberId) as DaySchedule[];
}

function getBarberTimeOff(barberId: string): TimeOffEntry[] {
  return db
    .prepare("SELECT id, barberId, date, reason FROM barber_time_off WHERE barberId = ?")
    .all(barberId) as TimeOffEntry[];
}

export function replaceBarberSchedule(barberId: string, schedule: DaySchedule[]): void {
  const deleteSt = db.prepare("DELETE FROM barber_schedules WHERE barberId = ?");
  const insertSt = db.prepare("INSERT INTO barber_schedules (barberId, day, startHour, endHour) VALUES (?, ?, ?, ?)");

  const tx = db.transaction(() => {
    deleteSt.run(barberId);
    for (const s of schedule) {
      insertSt.run(barberId, s.day, s.startHour, s.endHour);
    }
  });
  tx();
}

export function addTimeOff(entry: TimeOffEntry): void {
  db.prepare("INSERT INTO barber_time_off (id, barberId, date, reason) VALUES (?, ?, ?, ?)").run(
    entry.id,
    entry.barberId,
    entry.date,
    entry.reason ?? null,
  );
}

// -- Schedule Overrides -----------------------------------------------------
export function getBarberOverrides(barberId: string): ScheduleOverride[] {
  return db
    .prepare("SELECT id, barberId, date, startHour, endHour, reason FROM schedule_overrides WHERE barberId = ? ORDER BY date")
    .all(barberId) as ScheduleOverride[];
}

export function addOverride(override: ScheduleOverride): void {
  db.prepare(
    "INSERT INTO schedule_overrides (id, barberId, date, startHour, endHour, reason) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(override.id, override.barberId, override.date, override.startHour, override.endHour, override.reason ?? null);
}

export function deleteOverride(overrideId: string, barberId: string): boolean {
  const result = db.prepare("DELETE FROM schedule_overrides WHERE id = ? AND barberId = ?").run(overrideId, barberId);
  return result.changes > 0;
}

export function getOverridesForDateRange(barberId: string, startDate: string, endDate: string): ScheduleOverride[] {
  return db
    .prepare(
      "SELECT id, barberId, date, startHour, endHour, reason FROM schedule_overrides WHERE barberId = ? AND date >= ? AND date <= ? ORDER BY date",
    )
    .all(barberId, startDate, endDate) as ScheduleOverride[];
}

// -- Appointments -----------------------------------------------------------
export function getAllAppointments(): Appointment[] {
  return db.prepare("SELECT id, customerId, barberId, serviceId, startAt, status, notes FROM appointments").all() as Appointment[];
}

export function getAppointmentById(id: string): Appointment | undefined {
  return db
    .prepare("SELECT id, customerId, barberId, serviceId, startAt, status, notes FROM appointments WHERE id = ?")
    .get(id) as Appointment | undefined;
}

export function getAppointmentsByBarber(barberId: string): Appointment[] {
  return db
    .prepare("SELECT id, customerId, barberId, serviceId, startAt, status, notes FROM appointments WHERE barberId = ?")
    .all(barberId) as Appointment[];
}

export function insertAppointment(appt: Appointment): void {
  db.prepare(
    "INSERT INTO appointments (id, customerId, barberId, serviceId, startAt, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(appt.id, appt.customerId, appt.barberId, appt.serviceId, appt.startAt, appt.status, appt.notes ?? null);
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus): boolean {
  const result = db.prepare("UPDATE appointments SET status = ? WHERE id = ?").run(status, id);
  return result.changes > 0;
}

export function countAppointments(): number {
  return (db.prepare("SELECT COUNT(*) as c FROM appointments").get() as any).c;
}

export function countTimeOff(barberId: string): number {
  return (db.prepare("SELECT COUNT(*) as c FROM barber_time_off WHERE barberId = ?").get(barberId) as any).c;
}

export function countOverrides(barberId: string): number {
  return (db.prepare("SELECT COUNT(*) as c FROM schedule_overrides WHERE barberId = ?").get(barberId) as any).c;
}

export default db;
