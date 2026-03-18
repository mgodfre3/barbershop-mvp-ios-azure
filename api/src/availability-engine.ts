import {
  type Appointment,
  type AvailabilitySlot,
  type Barber,
  type Service,
} from "./models.js";

const SLOT_DURATION_MINUTES = 60;

/**
 * Compute available slots for a barber over a date range,
 * accounting for their schedule, time-off, and existing appointments.
 */
export function computeAvailability(
  barber: Barber,
  service: Service,
  appointments: Appointment[],
  startDate: Date,
  endDate: Date,
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const now = new Date();

  const barberAppointments = appointments.filter(
    (a) => a.barberId === barber.id && a.status !== "cancelled",
  );

  const timeOffDates = new Set(barber.timeOff.map((t) => t.date));

  // Iterate day by day
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0=Sun ... 6=Sat
    const dateStr = current.toISOString().split("T")[0]; // YYYY-MM-DD

    // Skip if barber has time off this day
    if (timeOffDates.has(dateStr)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Find schedule for this day of week
    const daySchedule = barber.schedule.find((s) => s.day === dayOfWeek);
    if (!daySchedule) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    // Generate 1-hour slots within work hours
    for (let hour = daySchedule.startHour; hour < daySchedule.endHour; hour++) {
      const slotStart = new Date(current);
      slotStart.setHours(hour, 0, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES);

      // Skip slots in the past
      if (slotStart <= now) continue;

      // Check the service fits within this slot
      const serviceEnd = new Date(slotStart);
      serviceEnd.setMinutes(serviceEnd.getMinutes() + service.durationMinutes);

      // Check for conflicts with existing appointments
      const hasConflict = barberAppointments.some((appt) => {
        const apptStart = new Date(appt.startAt);
        const apptService = service; // approximate: use requested service duration
        const apptEnd = new Date(apptStart);
        apptEnd.setMinutes(apptEnd.getMinutes() + SLOT_DURATION_MINUTES);

        // Overlap check: two intervals [A, B) and [C, D) overlap if A < D && C < B
        return slotStart < apptEnd && apptStart < serviceEnd;
      });

      if (!hasConflict) {
        slots.push({
          barberId: barber.id,
          barberName: barber.name,
          serviceId: service.id,
          date: dateStr,
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          durationMinutes: SLOT_DURATION_MINUTES,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Check if a proposed appointment time conflicts with existing bookings.
 * Returns true if there IS a conflict (slot is NOT available).
 */
export function hasScheduleConflict(
  barber: Barber,
  service: Service,
  proposedStart: Date,
  appointments: Appointment[],
): { conflict: boolean; reason?: string } {
  const dayOfWeek = proposedStart.getDay();
  const dateStr = proposedStart.toISOString().split("T")[0];

  // Check time-off
  if (barber.timeOff.some((t) => t.date === dateStr)) {
    return { conflict: true, reason: `${barber.name} is off on ${dateStr}` };
  }

  // Check work hours
  const daySchedule = barber.schedule.find((s) => s.day === dayOfWeek);
  if (!daySchedule) {
    return { conflict: true, reason: `${barber.name} doesn't work on this day` };
  }

  const hour = proposedStart.getHours();
  if (hour < daySchedule.startHour || hour >= daySchedule.endHour) {
    return {
      conflict: true,
      reason: `${barber.name} works ${daySchedule.startHour}:00–${daySchedule.endHour}:00 on this day`,
    };
  }

  // Check appointment overlap
  const proposedEnd = new Date(proposedStart);
  proposedEnd.setMinutes(proposedEnd.getMinutes() + service.durationMinutes);

  const barberAppointments = appointments.filter(
    (a) => a.barberId === barber.id && a.status !== "cancelled",
  );

  const overlapping = barberAppointments.find((appt) => {
    const apptStart = new Date(appt.startAt);
    const apptEnd = new Date(apptStart);
    apptEnd.setMinutes(apptEnd.getMinutes() + SLOT_DURATION_MINUTES);
    return proposedStart < apptEnd && apptStart < proposedEnd;
  });

  if (overlapping) {
    return { conflict: true, reason: `${barber.name} already has a booking at this time` };
  }

  return { conflict: false };
}
