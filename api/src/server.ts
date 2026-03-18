import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  mockAppointments,
  mockBarbers,
  mockRewards,
  mockServices,
  type Appointment,
  type AppointmentStatus
} from "./models.js";

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "barbershop-api", timestamp: new Date().toISOString() });
});

app.get("/services", (_req, res) => {
  res.json(mockServices);
});

app.get("/barbers", (_req, res) => {
  res.json(mockBarbers);
});

app.get("/availability", (req, res) => {
  const querySchema = z.object({
    serviceId: z.string().min(1),
    barberId: z.string().optional()
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
  }

  const { serviceId, barberId } = parsed.data;
  const candidates = barberId ? mockBarbers.filter((b) => b.id === barberId) : mockBarbers;
  const slots = candidates.map((barber, index) => ({
    barberId: barber.id,
    serviceId,
    startAt: new Date(Date.now() + (24 + index * 2) * 60 * 60 * 1000).toISOString()
  }));

  return res.json(slots);
});

app.get("/appointments", (_req, res) => {
  res.json(mockAppointments);
});

app.post("/appointments", (req, res) => {
  const bodySchema = z.object({
    customerId: z.string().min(1),
    barberId: z.string().min(1),
    serviceId: z.string().min(1),
    startAt: z.string().datetime(),
    notes: z.string().optional()
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const appointment: Appointment = {
    id: `appt-${mockAppointments.length + 1}`,
    status: "requested",
    ...parsed.data
  };
  mockAppointments.push(appointment);

  return res.status(201).json(appointment);
});

app.patch("/appointments/:id", (req, res) => {
  const bodySchema = z.object({
    status: z.enum(["requested", "confirmed", "completed", "cancelled"])
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

app.get("/rewards/summary", (_req, res) => {
  res.json(mockRewards);
});

app.post("/square/webhooks", (req, res) => {
  const signature = req.header("x-square-signature");
  if (!signature) {
    return res.status(400).json({ error: "Missing Square signature" });
  }

  return res.status(202).json({ received: true, eventType: req.body?.type ?? "unknown" });
});

app.post("/auth/register", (_req, res) => {
  res.status(201).json({ message: "Registration endpoint scaffolded" });
});

app.post("/auth/login", (_req, res) => {
  res.json({ message: "Login endpoint scaffolded" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`barbershop-api listening on port ${port}`);
});
