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
    description TEXT,
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
  const insertService = db.prepare("INSERT INTO services (id, name, description, durationMinutes, price) VALUES (?, ?, ?, ?, ?)");
  const insertSchedule = db.prepare("INSERT INTO barber_schedules (barberId, day, startHour, endHour) VALUES (?, ?, ?, ?)");
  const insertAppt = db.prepare("INSERT INTO appointments (id, customerId, barberId, serviceId, startAt, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)");

  const seedTx = db.transaction(() => {
    // Barbers - The Master Barber Experience Team
    insertBarber.run("barber-edwin", "Edwin", "Signature experiences, straight razor shaves, luxury grooming");
    insertBarber.run("barber-marcus", "Marcus", "Fades, modern styles, beard design");
    insertBarber.run("barber-devon", "Devon", "Classic cuts, kids haircuts, edge-ups");
    insertBarber.run("barber-rico", "Rico", "Textured cuts, hot towel shaves");

    // Edwin: Tue-Sat (Monday CLOSED)
    // Tue & Wed: 9-17
    insertSchedule.run("barber-edwin", 2, 9, 17);
    insertSchedule.run("barber-edwin", 3, 9, 17);
    // Thu: 9-18
    insertSchedule.run("barber-edwin", 4, 9, 18);
    // Fri & Sat: 9-19
    insertSchedule.run("barber-edwin", 5, 9, 19);
    insertSchedule.run("barber-edwin", 6, 9, 19);

    // Marcus: Tue-Sat (Monday CLOSED)
    insertSchedule.run("barber-marcus", 2, 9, 17);
    insertSchedule.run("barber-marcus", 3, 9, 17);
    insertSchedule.run("barber-marcus", 4, 9, 18);
    insertSchedule.run("barber-marcus", 5, 9, 19);
    insertSchedule.run("barber-marcus", 6, 9, 19);

    // Devon: Wed-Sun (Monday & Tuesday CLOSED)
    insertSchedule.run("barber-devon", 3, 9, 17);
    insertSchedule.run("barber-devon", 4, 9, 18);
    insertSchedule.run("barber-devon", 5, 9, 19);
    insertSchedule.run("barber-devon", 6, 9, 19);
    insertSchedule.run("barber-devon", 0, 10, 17); // Sunday

    // Rico: Thu-Sun (Monday-Wednesday CLOSED)
    insertSchedule.run("barber-rico", 4, 9, 18);
    insertSchedule.run("barber-rico", 5, 9, 19);
    insertSchedule.run("barber-rico", 6, 9, 19);
    insertSchedule.run("barber-rico", 0, 10, 17); // Sunday

    // Services - The Master Barber Experience
    insertService.run(
      "svc-signature",
      "The MBE Signature Experience",
      "Haircut, scalp treatment, hot towel, shampoo, condition, facial wash, scrub, cleanse, shave, hot scented towel, rose water eye pads, clay facial mask, ears & nose wax. With bourbon or wine.",
      90,
      125
    );
    insertService.run(
      "svc-grooming",
      "Grooming Experience",
      "Haircut, shampoo, conditioning, hot towel, facial, beard trim, blow dry, neck cleanup, ear/nose/eyebrow grooming.",
      60,
      75
    );
    insertService.run(
      "svc-shaving",
      "Shaving Experience",
      "Haircut, shampoo, conditioning, hot towel, traditional shave with pre-shave oil, hot lather, chilled scented towel.",
      75,
      95
    );
    insertService.run(
      "svc-haircut",
      "Classic Haircut",
      "Standalone haircut with styling.",
      45,
      45
    );
    insertService.run(
      "svc-edgeup",
      "Edge-Up / Lineup",
      "Quick edge cleanup.",
      20,
      25
    );
    insertService.run(
      "svc-kids",
      "Kid's Haircut",
      "For children under 12.",
      30,
      30
    );
    insertService.run(
      "svc-wax",
      "Ear & Nose Wax",
      "Quick grooming.",
      15,
      15
    );
    insertService.run(
      "svc-beard",
      "Beard Trim",
      "Standalone beard shaping.",
      30,
      35
    );

    // Seed appointment
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    insertAppt.run("appt-1", "customer-1", "barber-edwin", "svc-signature", tomorrow, "confirmed", "First-time client");
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
  return db.prepare("SELECT id, name, description, durationMinutes, price FROM services").all() as Service[];
}

export function getServiceById(id: string): Service | undefined {
  return db.prepare("SELECT id, name, description, durationMinutes, price FROM services WHERE id = ?").get(id) as Service | undefined;
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
