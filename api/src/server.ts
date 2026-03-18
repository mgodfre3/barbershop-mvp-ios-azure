import cors from "cors";
import express from "express";
import { z } from "zod";
import { squareClient } from "./square-client.js";
import type { Currency } from "square";
import {
  mockAppointments,
  mockBarbers,
  mockRewards,
  mockServices,
  type Appointment,
  type AppointmentStatus,
  type DayOfWeek,
} from "./models.js";
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
  res.json(mockServices);
});

// ============================================================================
// BARBERS (Azure-owned: barbershop-specific metadata)
// ============================================================================
app.get("/barbers", (_req, res) => {
  // Include computed isAvailableToday based on schedule
  const today = new Date().getDay();
  const enriched = mockBarbers.map((b) => ({
    ...b,
    isAvailableToday: b.schedule.some((s) => s.day === today),
  }));
  res.json(enriched);
});

// ============================================================================
// BARBER SCHEDULE MANAGEMENT (Azure-owned)
// ============================================================================
const dayOfWeekSchema = z.number().int().min(0).max(6);

app.put("/barbers/:id/schedule", (req, res) => {
  const barber = mockBarbers.find((b) => b.id === req.params.id);
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

  barber.schedule = parsed.data.schedule.map((s) => ({
    day: s.day as DayOfWeek,
    startHour: s.startHour,
    endHour: s.endHour,
  }));

  return res.json({ message: "Schedule updated", barber });
});

app.get("/barbers/:id/time-off", (req, res) => {
  const barber = mockBarbers.find((b) => b.id === req.params.id);
  if (!barber) return res.status(404).json({ error: "Barber not found" });
  return res.json(barber.timeOff);
});

app.post("/barbers/:id/time-off", (req, res) => {
  const barber = mockBarbers.find((b) => b.id === req.params.id);
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
    id: `to-${barber.timeOff.length + 1}`,
    barberId: barber.id,
    ...parsed.data,
  };
  barber.timeOff.push(entry);

  return res.status(201).json(entry);
});

// ============================================================================
// AVAILABILITY (Azure-owned: real scheduling engine)
// ============================================================================
app.get("/availability", (req, res) => {
  const querySchema = z.object({
    serviceId: z.string().min(1),
    barberId: z.string().optional(),
    days: z.coerce.number().int().min(1).max(30).default(7),
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const { serviceId, barberId, days } = parsed.data;
  const service = mockServices.find((s) => s.id === serviceId);
  if (!service) {
    return res.status(404).json({ error: "Service not found" });
  }

  const candidates = barberId
    ? mockBarbers.filter((b) => b.id === barberId)
    : mockBarbers;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  const allSlots = candidates.flatMap((barber) =>
    computeAvailability(barber, service, mockAppointments, startDate, endDate)
  );

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
  res.json(mockAppointments);
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
  const barber = mockBarbers.find((b) => b.id === parsed.data.barberId);
  if (!barber) return res.status(404).json({ error: "Barber not found" });

  const service = mockServices.find((s) => s.id === parsed.data.serviceId);
  if (!service) return res.status(404).json({ error: "Service not found" });

  // Check schedule conflict
  const proposedStart = new Date(parsed.data.startAt);
  const conflict = hasScheduleConflict(barber, service, proposedStart, mockAppointments);
  if (conflict.conflict) {
    return res.status(409).json({ error: "Schedule conflict", reason: conflict.reason });
  }

  const appointment: Appointment = {
    id: `appt-${mockAppointments.length + 1}`,
    status: "requested",
    ...parsed.data,
  };
  mockAppointments.push(appointment);

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

  const appointment = mockAppointments.find((item) => item.id === req.params.id);
  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  appointment.status = parsed.data.status as AppointmentStatus;
  return res.json(appointment);
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
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const { nonce, amount, currency, appointmentId, customerId } = parsed.data;
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
  console.log(`🚀 barbershop-api (Square-first) listening on port ${port}`);
  // eslint-disable-next-line no-console
  console.log(`
Architecture:
  Square owns:     Customers, Catalog/Services, Payments, Orders
  Azure owns:      Scheduling, Appointments, Rewards Ledger, CRM
  iOS uses:        Square In-App Payments SDK for card entry
  Webhooks from:   Square → this API → trigger reward/appointment updates
  `);
});
