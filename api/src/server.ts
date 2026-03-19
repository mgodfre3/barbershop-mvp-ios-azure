import cors from "cors";
import express from "express";
import { z } from "zod";
import { squareClient } from "./square-client.js";
import type { Currency } from "square";
import {
  mockRewards,
  type Appointment,
  type AppointmentStatus,
  type CustomerSummary,
  type DayOfWeek,
  type LedgerEntry,
  type LedgerEntryType,
} from "./models.js";
import {
  getAllServices,
  getServiceById,
  getAllBarbers,
  getBarberById,
  replaceBarberSchedule,
  addTimeOff,
  countTimeOff,
  getAllAppointments,
  getAppointmentById,
  getAppointmentsByBarber,
  getAppointmentsByCustomer,
  insertAppointment,
  updateAppointmentStatus,
  countAppointments,
  getBarberOverrides,
  addOverride,
  deleteOverride,
  getOverridesForDateRange,
  countOverrides,
  insertLedgerEntry,
  getLedgerEntriesByCustomer,
  countLedgerEntries,
} from "./db.js";
import { computeAvailability, hasScheduleConflict } from "./availability-engine.js";

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "barbershop-api",
    architecture: "Square-first with Azure custom logic",
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// SQUARE DIAGNOSTICS (sandbox auth verification)
// ============================================================================
app.get("/square/diagnostics", async (_req, res) => {
  try {
    const response = await squareClient.locations.list();
    const locations = response.locations ?? [];
    return res.json({
      ok: true,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      locationCount: locations.length,
      locationIds: locations.map((l) => l.id).filter(Boolean),
      message: "Square credentials are valid.",
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      environment: process.env.NODE_ENV === "production" ? "production" : "sandbox",
      message: "Square credentials failed.",
      errorType: error?.name ?? "UnknownError",
      errorMessage: error?.message ?? "No message",
    });
  }
});

// ============================================================================
// AUTHENTICATION (Placeholder for Entra External ID)
// ============================================================================
app.post("/auth/register", (_req, res) => {
  res.status(201).json({
    message: "Registration scaffolded. Wire to Microsoft Entra External ID.",
    placeholder: true
  });
});

app.post("/auth/login", (_req, res) => {
  res.json({
    message: "Login scaffolded. Wire to Microsoft Entra External ID.",
    placeholder: true
  });
});

// ============================================================================
// CATALOG (Square is source of truth)
// ============================================================================
// In production, fetch from Square's Catalog API and sync to cache.
// For MVP, return mock data. Real implementation would call catalogApi.
app.get("/services", (_req, res) => {
  // TODO: Call catalogApi.listCatalog() to fetch real services from Square
  res.json(getAllServices());
});

// ============================================================================
// BARBERS (Azure-owned: barbershop-specific metadata)
// ============================================================================
app.get("/barbers", (_req, res) => {
  // Include computed isAvailableToday based on schedule + overrides
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const dayOfWeek = today.getDay();

  const barbers = getAllBarbers();
  const enriched = barbers.map((b) => {
    const overrides = getOverridesForDateRange(b.id, todayStr, todayStr);
    const override = overrides.find((o) => o.date === todayStr);
    let isAvailableToday: boolean;
    if (override) {
      isAvailableToday = !(override.startHour === 0 && override.endHour === 0);
    } else {
      isAvailableToday = b.schedule.some((s) => s.day === dayOfWeek);
    }
    return { ...b, isAvailableToday };
  });
  res.json(enriched);
});

// ============================================================================
// BARBER SCHEDULE MANAGEMENT (Azure-owned)
// ============================================================================
const dayOfWeekSchema = z.number().int().min(0).max(6);

app.put("/barbers/:id/schedule", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const bodySchema = z.object({
    schedule: z.array(z.object({
      day: dayOfWeekSchema,
      startHour: z.number().int().min(0).max(23),
      endHour: z.number().int().min(1).max(24),
    }).refine((s) => s.endHour > s.startHour, { message: "endHour must be after startHour" })),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const schedule = parsed.data.schedule.map((s) => ({
    day: s.day as DayOfWeek,
    startHour: s.startHour,
    endHour: s.endHour,
  }));

  replaceBarberSchedule(barber.id, schedule);
  const updated = getBarberById(barber.id)!;

  return res.json({ message: "Schedule updated", barber: updated });
});

app.get("/barbers/:id/time-off", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });
  return res.json(barber.timeOff);
});

app.post("/barbers/:id/time-off", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const bodySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const entry = {
    id: `to-${countTimeOff(barber.id) + 1}`,
    barberId: barber.id,
    ...parsed.data,
  };
  addTimeOff(entry);

  return res.status(201).json(entry);
});

// ============================================================================
// SCHEDULE OVERRIDES (Azure-owned: one-off date overrides)
// ============================================================================
app.get("/barbers/:id/overrides", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });
  return res.json(getBarberOverrides(barber.id));
});

app.post("/barbers/:id/overrides", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const bodySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(0).max(24),
    reason: z.string().optional(),
  }).refine(
    (d) => (d.startHour === 0 && d.endHour === 0) || d.endHour > d.startHour,
    { message: "endHour must be after startHour (or both 0 for day off)" },
  );

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const override = {
    id: `ovr-${countOverrides(barber.id) + 1}-${Date.now()}`,
    barberId: barber.id,
    ...parsed.data,
  };
  addOverride(override);

  return res.status(201).json(override);
});

app.delete("/barbers/:id/overrides/:overrideId", (req, res) => {
  const barber = getBarberById(req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const deleted = deleteOverride(req.params.overrideId, barber.id);
  if (!deleted) return res.status(404).json({ error: "Override not found" });

  return res.json({ message: "Override deleted" });
});

// ============================================================================
// AVAILABILITY (Azure-owned: real scheduling engine)
// ============================================================================
app.get("/availability", (req, res) => {
  const querySchema = z.object({
    serviceId: z.string().min(1),
    barberId: z.string().optional(),
    days: z.coerce.number().int().min(1).max(60).default(7),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const { serviceId, barberId, days } = parsed.data;
  const service = getServiceById(serviceId);
  if (!service) {
    return res.status(404).json({ error: "Service not found" });
  }

  const candidates = barberId
    ? getAllBarbers().filter((b) => b.id === barberId)
    : getAllBarbers();

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const endDateStr = endDate.toISOString().split("T")[0];
  const startDateStr = startDate.toISOString().split("T")[0];
  const appointments = getAllAppointments();

  const allSlots = candidates.flatMap((barber) => {
    const overrides = getOverridesForDateRange(barber.id, startDateStr, endDateStr);
    return computeAvailability(barber, service, appointments, startDate, endDate, overrides);
  });

  // Sort by date/time
  allSlots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return res.json(allSlots);
});

// ============================================================================
// APPOINTMENTS (Azure-owned: barbershop-specific workflow)
// ============================================================================
// Track appointment lifecycle (requested → confirmed → completed → cancelled)
// This is custom barber business logic, not Square's generic Bookings.
app.get("/appointments", (_req, res) => {
  res.json(getAllAppointments());
});

app.post("/appointments", (req, res) => {
  const bodySchema = z.object({
    customerId: z.string().min(1),
    barberId: z.string().min(1),
    serviceId: z.string().min(1),
    startAt: z.string().datetime(),
    notes: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // Validate barber and service exist
  const barber = getBarberById(parsed.data.barberId);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const service = getServiceById(parsed.data.serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });

  // Check schedule conflict (with overrides)
  const proposedStart = new Date(parsed.data.startAt);
  const dateStr = proposedStart.toISOString().split("T")[0];
  const overrides = getOverridesForDateRange(barber.id, dateStr, dateStr);
  const conflict = hasScheduleConflict(barber, service, proposedStart, getAllAppointments(), overrides);
  if (conflict.conflict) {
    return res.status(409).json({ error: "Schedule conflict", reason: conflict.reason });
  }

  const appointment: Appointment = {
    id: `appt-${countAppointments() + 1}`,
    status: "requested",
    ...parsed.data,
  };
  insertAppointment(appointment);

  return res.status(201).json(appointment);
});

// ...existing code...

app.patch("/appointments/:id", (req, res) => {
  const bodySchema = z.object({
    status: z.enum(["requested", "confirmed", "completed", "cancelled"]),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const appointment = getAppointmentById(req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  updateAppointmentStatus(req.params.id, parsed.data.status as AppointmentStatus);

  // Auto-record cancellation note in ledger
  if (parsed.data.status === "cancelled" && appointment.status !== "cancelled") {
    const ledgerEntry: LedgerEntry = {
      id: `ledger-${countLedgerEntries() + 1}`,
      customerId: appointment.customerId,
      appointmentId: appointment.id,
      type: "cancellation_fee",
      amount: 0,
      description: `Appointment ${appointment.id} cancelled`,
      createdAt: new Date().toISOString(),
    };
    insertLedgerEntry(ledgerEntry);
  }

  return res.json({ ...appointment, status: parsed.data.status });
});

// ============================================================================
// CUSTOMERS (Square is source of truth)
// ============================================================================
// Customers are synced to Square via this endpoint.
// In production, POST here triggers a sync to Square's Customers API.
app.post("/customers/sync", async (req, res) => {
  const bodySchema = z.object({
    id: z.string(),
    givenName: z.string(),
    familyName: z.string(),
    emailAddress: z.string().email().optional(),
    phoneNumber: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // TODO: In production, call customersApi.createCustomer() or updateCustomer()
  // to sync this customer to Square.

  return res.status(201).json({
    message: "Customer sync queued for Square",
    squareCustomerId: `cust_${parsed.data.id}`,
    placeholder: true,
  });
});

// ============================================================================
// PAYMENTS (Square is source of truth)
// ============================================================================
// Process payments via Square's Payments API using a nonce from the In-App Payments SDK.
app.post("/payments/process", async (req, res) => {
  const bodySchema = z.object({
    nonce: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().length(3).default("USD"),
    appointmentId: z.string().optional(),
    customerId: z.string().optional(),
    type: z.enum(["holding_fee", "service_payment", "refund"]).optional(),
    description: z.string().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { nonce, amount, currency, appointmentId, customerId, type, description } = parsed.data;
  const idempotencyKey = `${appointmentId ?? "anon"}-${Date.now()}`;

  try {
    const locationId = process.env.SQUARE_LOCATION_ID || "LJJWSM6MHA21M";
    const payment = await squareClient.payments.create({
      sourceId: nonce,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: currency as Currency,
      },
      locationId,
      note: appointmentId ? `Appointment: ${appointmentId}` : undefined,
    });

    // Auto-record ledger entry on successful payment
    if (customerId && payment.payment?.id) {
      const ledgerEntry: LedgerEntry = {
        id: `ledger-${countLedgerEntries() + 1}`,
        customerId,
        appointmentId,
        type: (type ?? "service_payment") as LedgerEntryType,
        amount,
        description: description ?? `Payment for ${type ?? "service"}`,
        squarePaymentId: payment.payment.id,
        createdAt: new Date().toISOString(),
      };
      insertLedgerEntry(ledgerEntry);
    }

    return res.status(201).json({
      ok: true,
      squarePaymentId: payment.payment?.id,
      status: payment.payment?.status,
      amount: parsed.data.amount,
      currency,
      appointmentId,
    });
  } catch (error: any) {
    return res.status(502).json({
      ok: false,
      message: "Payment processing failed",
      errorType: error?.name ?? "UnknownError",
      errorMessage: error?.message ?? "No message",
    });
  }
});

// Payment status lookup
app.get("/payments/:squarePaymentId", async (req, res) => {
  try {
    const payment = await squareClient.payments.get({ paymentId: req.params.squarePaymentId });
    return res.json({
      ok: true,
      squarePaymentId: payment.payment?.id,
      status: payment.payment?.status,
      amount: payment.payment?.amountMoney,
    });
  } catch (error: any) {
    return res.status(502).json({
      ok: false,
      message: "Payment lookup failed",
      errorType: error?.name ?? "UnknownError",
      errorMessage: error?.message ?? "No message",
    });
  }
});

// ============================================================================
// REWARDS (Azure-owned: custom barbershop loyalty logic)
// ============================================================================
// Rewards are custom to this barbershop: points for visits, tiers, redemptions.
// Square has a Loyalty API, but we use custom logic for barber-specific rewards.
app.get("/rewards/summary", (_req, res) => {
  // TODO: In production, fetch from Azure SQL rewards table
  res.json(mockRewards);
});

app.post("/rewards/ledger", (req, res) => {
  const bodySchema = z.object({
    customerId: z.string(),
    appointmentId: z.string(),
    pointsDelta: z.number().int(),
    reason: z.string(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // TODO: In production, append immutable ledger entry to Azure SQL

  return res.status(201).json({
    message: "Reward ledger entry created",
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});

// ============================================================================
// SQUARE WEBHOOK HANDLER
// ============================================================================
// Receive events from Square (payments, orders, customers) and trigger
// barbershop-specific workflows (update appointment status, award points, etc.).
app.post("/square/webhooks", (req, res) => {
  const signature = req.header("x-square-hmac-sha256");

  if (!signature) {
    return res.status(400).json({ error: "Missing Square signature header" });
  }

  // TODO: Verify signature using SQUARE_WEBHOOK_SIGNATURE_KEY

  const eventType = req.body?.type;
  const data = req.body?.data;

  // Route to specific handlers based on Square event type
  if (eventType === "payment.created" || eventType === "payment.updated") {
    console.log("📱 Square payment event:", eventType, data);
    // TODO: Call /rewards/ledger to award points
    // TODO: Call /appointments/:id PATCH to mark as completed
  } else if (eventType === "order.created" || eventType === "order.updated") {
    console.log("📦 Square order event:", eventType, data);
    // TODO: Sync order status back to appointment
  } else if (eventType === "customer.created" || eventType === "customer.updated") {
    console.log("👤 Square customer event:", eventType, data);
    // TODO: Store Square customer ID mapping in Azure SQL
  }

  return res.status(202).json({
    received: true,
    eventType,
    message: "Square webhook received and queued for processing",
  });
});

// ============================================================================
// CUSTOMER LEDGER & SUMMARY
// ============================================================================
app.get("/customers/:customerId/ledger", (req, res) => {
  const customerId = req.params.customerId;
  const entries = getLedgerEntriesByCustomer(customerId);

  const totalPaid = entries
    .filter((e) => e.type === "holding_fee" || e.type === "service_payment")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalOwed = entries
    .filter((e) => e.type === "refund")
    .reduce((sum, e) => sum - e.amount, 0);

  return res.json({
    customerId,
    entries,
    summary: {
      totalPaid,
      totalOwed,
    },
  });
});

app.get("/customers/:customerId/summary", (req, res) => {
  const customerId = req.params.customerId;
  const appointments = getAppointmentsByCustomer(customerId);
  const ledgerEntries = getLedgerEntriesByCustomer(customerId);

  const totalAppointments = appointments.length;
  const servicesCompleted = appointments.filter((a) => a.status === "completed").length;
  const activeAppointments = appointments.filter((a) => a.status === "requested" || a.status === "confirmed").length;

  const totalSpent = ledgerEntries
    .filter((e) => e.type === "holding_fee" || e.type === "service_payment")
    .reduce((sum, e) => sum + e.amount, 0);

  const holdingFeesPaid = ledgerEntries
    .filter((e) => e.type === "holding_fee")
    .reduce((sum, e) => sum + e.amount, 0);

  const summary: CustomerSummary = {
    customerId,
    totalAppointments,
    totalSpent,
    holdingFeesPaid,
    servicesCompleted,
    activeAppointments,
  };

  return res.json(summary);
});

// ============================================================================
// CRM NOTES (Azure-owned: barbershop-specific customer history)
// ============================================================================
// Store internal notes about customers: no-show status, preferences, follow-ups.
app.post("/crm/notes", (req, res) => {
  const bodySchema = z.object({
    customerId: z.string(),
    note: z.string(),
    tags: z.array(z.string()).optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  // TODO: In production, append to Azure SQL crm_notes table

  return res.status(201).json({
    message: "CRM note created",
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});

// ============================================================================
// Start server
// ============================================================================
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 The Master Barber Experience API listening on port ${port}`);
  // eslint-disable-next-line no-console
  console.log(`
Architecture:
  Square owns:     Customers, Catalog/Services, Payments, Orders
  Azure owns:      Scheduling, Appointments, Rewards Ledger, CRM
  iOS uses:        Square In-App Payments SDK for card entry
  Webhooks from:   Square → this API → trigger reward/appointment updates
  `);
});
