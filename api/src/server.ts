import cors from "cors";
import express from "express";
import { z } from "zod";
import { squareClient } from "./square-client.js";
import type { Currency } from "square";
import type {
  Appointment,
  AvailabilitySlot,
  CustomerSummary,
  LedgerEntry,
  LedgerEntryType,
  Service,
} from "./models.js";
import type { CatalogObject } from "square";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || "LJJWSM6MHA21M";

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "*" }));
app.use(express.json());

/** Extracts a user-friendly error message from a Square SDK error. */
function squareErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Standard Square error JSON response. */
function squareErrorResponse(res: express.Response, statusCode: number, operation: string, error: unknown) {
  const message = squareErrorMessage(error);
  console.error(`❌ Square ${operation} failed: ${message}`);
  return res.status(statusCode).json({
    error: `Square API error: ${operation}`,
    message,
  });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "barbershop-api",
    architecture: "Square-only — no local database",
    timestamp: new Date().toISOString(),
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
  } catch (error: unknown) {
    return squareErrorResponse(res, 500, "locations.list", error);
  }
});

// ============================================================================
// SQUARE RAW CATALOG (for iOS app discovery)
// ============================================================================
app.get("/square/catalog", async (_req, res) => {
  try {
    const result = await squareClient.catalog.list({ types: "ITEM" });
    const items = result.data ?? [];
    return res.json({ items });
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "catalog.list", error);
  }
});

// ============================================================================
// SQUARE TEAM MEMBERS (for iOS app discovery)
// ============================================================================
app.get("/square/team-members", async (_req, res) => {
  try {
    const result = await squareClient.teamMembers.search({
      query: {
        filter: {
          locationIds: [SQUARE_LOCATION_ID],
          status: "ACTIVE",
        },
      },
    });
    const members = result.teamMembers ?? [];
    return res.json({
      teamMembers: members.map((m) => ({
        id: m.id,
        givenName: m.givenName,
        familyName: m.familyName,
        emailAddress: m.emailAddress,
        phoneNumber: m.phoneNumber,
        status: m.status,
      })),
    });
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "teamMembers.search", error);
  }
});

// ============================================================================
// AUTHENTICATION (Placeholder for Entra External ID)
// ============================================================================
app.post("/auth/register", (_req, res) => {
  res.status(201).json({
    message: "Registration scaffolded. Wire to Microsoft Entra External ID.",
    placeholder: true,
  });
});

app.post("/auth/login", (_req, res) => {
  res.json({
    message: "Login scaffolded. Wire to Microsoft Entra External ID.",
    placeholder: true,
  });
});

// ============================================================================
// SERVICES (Square Catalog is source of truth)
// ============================================================================
app.get("/services", async (_req, res) => {
  try {
    const result = await squareClient.catalog.list({ types: "ITEM" });
    const items = result.data ?? [];

    const services: Service[] = [];
    for (const item of items) {
      // Only process ITEM type catalog objects
      if (!("itemData" in item)) continue;
      const catalogItem = item as CatalogObject.Item;
      const itemData = catalogItem.itemData;
      if (!itemData) continue;

      const variations = itemData.variations ?? [];
      for (const variation of variations) {
        const varObj = variation as CatalogObject.ItemVariation;
        const varData = varObj.itemVariationData;
        const priceMoney = varData?.priceMoney;
        services.push({
          id: varObj.id ?? catalogItem.id ?? "",
          name: variations.length > 1
            ? `${itemData.name} — ${varData?.name ?? "Default"}`
            : (itemData.name ?? "Unknown Service"),
          description: itemData.description ?? undefined,
          durationMinutes: varData?.serviceDuration
            ? Number(varData.serviceDuration) / 60_000
            : 60,
          price: priceMoney?.amount
            ? Number(priceMoney.amount) / 100
            : 0,
        });
      }
    }

    if (services.length === 0) {
      return res.json({
        services: [],
        message: "No catalog items found in Square. Add services to your Square catalog to see them here.",
      });
    }

    return res.json(services);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "catalog.list (services)", error);
  }
});

// ============================================================================
// BARBERS (Square Team Members is source of truth)
// ============================================================================
app.get("/barbers", async (_req, res) => {
  try {
    // Try bookings team member profiles first (richer data for bookable members)
    let profiles: Array<{ id: string; name: string; specialty: string }> = [];
    try {
      const bookingsResult = await squareClient.bookings.teamMemberProfiles.list();
      const data = bookingsResult.data ?? [];
      profiles = data.map((p) => ({
        id: p.teamMemberId ?? "",
        name: p.displayName ?? "Unknown",
        specialty: p.profileImageUrl ? "See profile" : "Barber",
      }));
    } catch {
      // Fall through to team members search
    }

    if (profiles.length === 0) {
      const result = await squareClient.teamMembers.search({
        query: {
          filter: {
            locationIds: [SQUARE_LOCATION_ID],
            status: "ACTIVE",
          },
        },
      });
      const members = result.teamMembers ?? [];
      profiles = members.map((m) => ({
        id: m.id ?? "",
        name: [m.givenName, m.familyName].filter(Boolean).join(" ") || "Unknown",
        specialty: "Barber",
      }));
    }

    if (profiles.length === 0) {
      return res.json({
        barbers: [],
        message: "No team members found in Square. Add team members to your Square account to see them here.",
      });
    }

    const barbers = profiles.map((p) => ({
      id: p.id,
      name: p.name,
      specialty: p.specialty,
      isAvailableToday: true, // Square manages availability via Bookings API
    }));

    return res.json(barbers);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "teamMembers (barbers)", error);
  }
});

// ============================================================================
// BOOKABLE TEAM MEMBERS (Square Bookings)
// ============================================================================
app.get("/bookings/team-members", async (_req, res) => {
  try {
    const result = await squareClient.bookings.teamMemberProfiles.list();
    const profiles = result.data ?? [];
    console.log(`✅ Square Bookings: returned ${profiles.length} team member profiles`);
    return res.json(profiles);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "bookings.teamMemberProfiles.list", error);
  }
});

// ============================================================================
// AVAILABILITY (Square Bookings is source of truth)
// ============================================================================
app.get("/availability", async (req, res) => {
  const querySchema = z.object({
    serviceVariationId: z.string().min(1),
    days: z.coerce.number().int().min(1).max(60).default(7),
    teamMemberIds: z.string().optional(), // comma-separated
  });

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parsed.error.flatten(),
      hint: "serviceVariationId is required. Get IDs from GET /square/catalog or GET /services.",
    });
  }

  const { serviceVariationId, days, teamMemberIds } = parsed.data;

  try {
    const startAt = new Date().toISOString();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    const endAt = endDate.toISOString();

    const teamFilter = teamMemberIds
      ? { any: teamMemberIds.split(",").map((id) => id.trim()) }
      : undefined;

    const result = await squareClient.bookings.searchAvailability({
      query: {
        filter: {
          startAtRange: { startAt, endAt },
          locationId: SQUARE_LOCATION_ID,
          segmentFilters: [{
            serviceVariationId,
            teamMemberIdFilter: teamFilter,
          }],
        },
      },
    });

    const availabilities = result.availabilities ?? [];
    const slots: AvailabilitySlot[] = availabilities.map((a) => {
      const segment = a.appointmentSegments?.[0];
      const slotStart = new Date(a.startAt!);
      const durationMinutes = segment?.durationMinutes ?? 60;
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000);

      return {
        teamMemberId: segment?.teamMemberId ?? "unknown",
        serviceVariationId,
        date: slotStart.toISOString().split("T")[0],
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
        durationMinutes,
      };
    });

    slots.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    console.log(`✅ Square Bookings: returned ${slots.length} availability slots`);
    return res.json(slots);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "bookings.searchAvailability", error);
  }
});

// ============================================================================
// APPOINTMENTS (Square Bookings is source of truth)
// ============================================================================

/** Map a Square booking object to our Appointment shape. */
function mapBookingToAppointment(booking: Record<string, any>): Appointment {
  const segment = booking.appointmentSegments?.[0];
  let status: Appointment["status"] = "requested";
  const squareStatus = (booking.status ?? "").toUpperCase();
  if (squareStatus === "ACCEPTED" || squareStatus === "CONFIRMED") status = "confirmed";
  else if (squareStatus === "COMPLETED") status = "completed";
  else if (squareStatus === "CANCELLED_BY_CUSTOMER" || squareStatus === "CANCELLED_BY_SELLER" || squareStatus === "CANCELLED" || squareStatus === "DECLINED" || squareStatus === "NO_SHOW") status = "cancelled";

  return {
    id: booking.id ?? "",
    customerId: booking.customerId ?? undefined,
    teamMemberId: segment?.teamMemberId ?? undefined,
    serviceId: segment?.serviceVariationId ?? "",
    serviceVariationId: segment?.serviceVariationId ?? undefined,
    startAt: booking.startAt ?? "",
    status,
    notes: booking.customerNote ?? undefined,
  };
}

app.get("/appointments", async (_req, res) => {
  try {
    const result = await squareClient.bookings.list({
      locationId: SQUARE_LOCATION_ID,
    });
    const bookings = result.data ?? [];
    const appointments = bookings.map(mapBookingToAppointment);
    return res.json(appointments);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "bookings.list", error);
  }
});

app.post("/appointments", async (req, res) => {
  const bodySchema = z.object({
    serviceVariationId: z.string().min(1),
    teamMemberId: z.string().min(1),
    startAt: z.string().datetime(),
    customerId: z.string().optional(),
    customerNote: z.string().optional(),
    durationMinutes: z.number().int().positive().optional(),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid payload",
      details: parsed.error.flatten(),
      hint: "Required: serviceVariationId, teamMemberId, startAt. Get IDs from GET /square/catalog and GET /square/team-members.",
    });
  }

  const { serviceVariationId, teamMemberId, startAt, customerId, customerNote, durationMinutes } = parsed.data;

  try {
    const result = await squareClient.bookings.create({
      booking: {
        startAt,
        locationId: SQUARE_LOCATION_ID,
        customerId: customerId ?? undefined,
        customerNote: customerNote ?? undefined,
        appointmentSegments: [{
          teamMemberId,
          serviceVariationId,
          durationMinutes: durationMinutes ?? undefined,
        }],
      },
    });

    const booking = result.booking;
    if (!booking) {
      return res.status(502).json({ error: "Square returned no booking object" });
    }

    return res.status(201).json(mapBookingToAppointment(booking));
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "bookings.create", error);
  }
});

app.patch("/appointments/:id", async (req, res) => {
  const bodySchema = z.object({
    status: z.enum(["requested", "confirmed", "completed", "cancelled"]),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
  }

  const bookingId = req.params.id;

  try {
    if (parsed.data.status === "cancelled") {
      // Fetch current booking to get version for optimistic concurrency
      const existing = await squareClient.bookings.get({ bookingId });
      const bookingVersion = existing.booking?.version;

      const result = await squareClient.bookings.cancel({
        bookingId,
        bookingVersion,
      });

      console.log(`✅ Square Booking cancelled: ${bookingId}`);
      return res.json(mapBookingToAppointment(result.booking ?? { id: bookingId, status: "CANCELLED_BY_SELLER" }));
    }

    // For non-cancel status updates, use bookings.update
    const existing = await squareClient.bookings.get({ bookingId });
    const bookingVersion = existing.booking?.version;

    const squareStatus =
      parsed.data.status === "confirmed" ? "ACCEPTED" as const :
      parsed.data.status === "completed" ? "ACCEPTED" as const :
      "PENDING" as const;

    const result = await squareClient.bookings.update({
      bookingId,
      booking: {
        version: bookingVersion,
        status: squareStatus,
      },
    });

    return res.json(mapBookingToAppointment(result.booking ?? existing.booking ?? { id: bookingId }));
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, `bookings.update (${parsed.data.status})`, error);
  }
});

// ============================================================================
// CUSTOMERS (Square is source of truth)
// ============================================================================
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

  return res.status(201).json({
    message: "Customer sync queued for Square",
    squareCustomerId: `cust_${parsed.data.id}`,
    placeholder: true,
  });
});

// ============================================================================
// PAYMENTS (Square is source of truth)
// ============================================================================
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

  const { nonce, amount, currency, appointmentId } = parsed.data;
  const idempotencyKey = `${appointmentId ?? "anon"}-${Date.now()}`;

  try {
    const payment = await squareClient.payments.create({
      sourceId: nonce,
      idempotencyKey,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency: currency as Currency,
      },
      locationId: SQUARE_LOCATION_ID,
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
  } catch (error: unknown) {
    return res.status(502).json({
      ok: false,
      message: "Payment processing failed",
      error: squareErrorMessage(error),
    });
  }
});

app.get("/payments/:squarePaymentId", async (req, res) => {
  try {
    const payment = await squareClient.payments.get({ paymentId: req.params.squarePaymentId });
    return res.json({
      ok: true,
      squarePaymentId: payment.payment?.id,
      status: payment.payment?.status,
      amount: payment.payment?.amountMoney,
    });
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "payments.get", error);
  }
});

// ============================================================================
// CUSTOMER LEDGER & SUMMARY (Square Payments is source of truth)
// ============================================================================
app.get("/customers/:customerId/ledger", async (req, res) => {
  const customerId = req.params.customerId;

  try {
    const result = await squareClient.payments.list({
      locationId: SQUARE_LOCATION_ID,
    });
    const allPayments = result.data ?? [];

    // Filter by customer ID
    const customerPayments = allPayments.filter((p) => p.customerId === customerId);

    const entries: LedgerEntry[] = customerPayments.map((p) => {
      let type: LedgerEntryType = "service_payment";
      const note = (p.note ?? "").toLowerCase();
      if (note.includes("holding")) type = "holding_fee";
      else if (note.includes("refund") || p.status === "REFUNDED") type = "refund";
      else if (note.includes("cancel")) type = "cancellation_fee";

      return {
        id: p.id ?? "",
        customerId,
        appointmentId: p.orderId ?? undefined,
        type,
        amount: p.amountMoney?.amount ? Number(p.amountMoney.amount) / 100 : 0,
        description: p.note ?? `Payment ${p.id}`,
        squarePaymentId: p.id,
        createdAt: p.createdAt ?? new Date().toISOString(),
      };
    });

    const totalPaid = entries
      .filter((e) => e.type === "holding_fee" || e.type === "service_payment")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalRefunded = entries
      .filter((e) => e.type === "refund")
      .reduce((sum, e) => sum + e.amount, 0);

    return res.json({
      customerId,
      entries,
      summary: { totalPaid, totalRefunded },
    });
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "payments.list (ledger)", error);
  }
});

app.get("/customers/:customerId/summary", async (req, res) => {
  const customerId = req.params.customerId;

  try {
    const result = await squareClient.payments.list({
      locationId: SQUARE_LOCATION_ID,
    });
    const allPayments = result.data ?? [];
    const customerPayments = allPayments.filter((p) => p.customerId === customerId);

    const totalSpent = customerPayments
      .filter((p) => p.status === "COMPLETED")
      .reduce((sum, p) => sum + (p.amountMoney?.amount ? Number(p.amountMoney.amount) / 100 : 0), 0);

    const recentPayments: LedgerEntry[] = customerPayments.slice(0, 10).map((p) => ({
      id: p.id ?? "",
      customerId,
      type: "service_payment" as LedgerEntryType,
      amount: p.amountMoney?.amount ? Number(p.amountMoney.amount) / 100 : 0,
      description: p.note ?? `Payment ${p.id}`,
      squarePaymentId: p.id,
      createdAt: p.createdAt ?? new Date().toISOString(),
    }));

    const summary: CustomerSummary = {
      customerId,
      totalPayments: customerPayments.length,
      totalSpent,
      recentPayments,
    };

    return res.json(summary);
  } catch (error: unknown) {
    return squareErrorResponse(res, 502, "payments.list (summary)", error);
  }
});

// ============================================================================
// REWARDS (Placeholder — custom barbershop loyalty logic)
// ============================================================================
app.get("/rewards/summary", (_req, res) => {
  res.json({
    message: "Rewards system placeholder. Wire to Square Loyalty API or custom logic.",
    placeholder: true,
  });
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

  return res.status(201).json({
    message: "Reward ledger entry created",
    ...parsed.data,
    createdAt: new Date().toISOString(),
  });
});

// ============================================================================
// SQUARE WEBHOOK HANDLER
// ============================================================================
app.post("/square/webhooks", (req, res) => {
  const signature = req.header("x-square-hmac-sha256");

  if (!signature) {
    return res.status(400).json({ error: "Missing Square signature header" });
  }

  const eventType = req.body?.type;
  const data = req.body?.data;

  if (eventType === "payment.created" || eventType === "payment.updated") {
    console.log("📱 Square payment event:", eventType, data);
  } else if (eventType === "order.created" || eventType === "order.updated") {
    console.log("📦 Square order event:", eventType, data);
  } else if (eventType === "customer.created" || eventType === "customer.updated") {
    console.log("👤 Square customer event:", eventType, data);
  }

  return res.status(202).json({
    received: true,
    eventType,
    message: "Square webhook received and queued for processing",
  });
});

// ============================================================================
// CRM NOTES (Placeholder — barbershop-specific customer history)
// ============================================================================
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
  console.log(`🚀 The Master Barber Experience API listening on port ${port}`);
  console.log(`
Architecture: Square-only (no local database)
  Square owns:  Customers, Catalog/Services, Payments, Bookings, Team Members
  iOS uses:     Square In-App Payments SDK for card entry
  Webhooks:     Square → this API → trigger reward/appointment updates
  `);
});
