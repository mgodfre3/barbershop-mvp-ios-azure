import {
  type Appointment,
  type AvailabilitySlot,
  type Barber,
  type ScheduleOverride,
  type Service,
} from "./models.js";

/**
 * Compute available slots for a barber over a date range,
 * accounting for their schedule, time-off, schedule overrides,
 * and existing appointments.
 *
 * Slots are generated in increments of the service's durationMinutes.
 * Overrides take priority over the weekly recurring schedule.
 */
export function computeAvailability(
  barber: Barber,
  service: Service,
  appointments: Appointment[],
  startDate: Date,
  endDate: Date,
  overrides: ScheduleOverride[] = [],
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const now = new Date();
  const slotDuration = service.durationMinutes;

  const barberAppointments = appointments.filter(
    (a) => a.barberId === barber.id && a.status !== "cancelled",
  );

  const timeOffDates = new Set(barber.timeOff.map((t) => t.date));

  // Index overrides by date for O(1) lookup
  const overridesByDate = new Map<string, ScheduleOverride>();
  for (const o of overrides) {
    overridesByDate.set(o.date, o);
  }

  // Iterate day by day
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    const dayOfWeek = current.getDay(); // 0=Sun ... 6=Sat
    const dateStr = current.toISOString().split("T")[0]; // YYYY-MM-DD

    // Determine work hours for this day: override > time-off > weekly schedule
    let startHour: number;
    let endHour: number;

    const override = overridesByDate.get(dateStr);
    if (override) {
      // Override exists — if both hours are 0, barber is off
      if (override.startHour === 0 && override.endHour === 0) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      startHour = override.startHour;
      endHour = override.endHour;
    } else if (timeOffDates.has(dateStr)) {
      // Barber has time off this day
      current.setDate(current.getDate() + 1);
      continue;
    } else {
      // Fall back to weekly recurring schedule
      const daySchedule = barber.schedule.find((s) => s.day === dayOfWeek);
      if (!daySchedule) {
        current.setDate(current.getDate() + 1);
        continue;
      }
      startHour = daySchedule.startHour;
      endHour = daySchedule.endHour;
    }

    // Generate slots in increments of the service duration
    const dayStart = new Date(current);
    dayStart.setHours(startHour, 0, 0, 0);

    const dayEnd = new Date(current);
    dayEnd.setHours(endHour, 0, 0, 0);

    const slotStart = new Date(dayStart);

    while (slotStart < dayEnd) {
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + slotDuration);

      // Slot must fit within work hours
      if (slotEnd > dayEnd) break;

      // Skip slots in the past
      if (slotStart <= now) {
        slotStart.setMinutes(slotStart.getMinutes() + slotDuration);
        continue;
      }

      // Check for conflicts with existing appointments
      const hasConflict = barberAppointments.some((appt) => {
        const apptStart = new Date(appt.startAt);
        const apptEnd = new Date(apptStart);
        apptEnd.setMinutes(apptEnd.getMinutes() + slotDuration);

        // Overlap check: [A, B) and [C, D) overlap if A < D && C < B
        return slotStart < apptEnd && apptStart < slotEnd;
      });

      if (!hasConflict) {
        slots.push({
          barberId: barber.id,
          barberName: barber.name,
          serviceId: service.id,
          date: dateStr,
          startAt: slotStart.toISOString(),
          endAt: slotEnd.toISOString(),
          durationMinutes: slotDuration,
        });
      }

      slotStart.setMinutes(slotStart.getMinutes() + slotDuration);
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

/**
 * Check if a proposed appointment time conflicts with existing bookings.
 * Returns true if there IS a conflict (slot is NOT available).
 * Schedule overrides take priority over the weekly recurring schedule.
 */
export function hasScheduleConflict(
  barber: Barber,
  service: Service,
  proposedStart: Date,
  appointments: Appointment[],
  overrides: ScheduleOverride[] = [],
): { conflict: boolean; reason?: string } {
  const dateStr = proposedStart.toISOString().split("T")[0];
  const dayOfWeek = proposedStart.getDay();

  // Check override first
  const override = overrides.find((o) => o.date === dateStr);

  let startHour: number;
  let endHour: number;

  if (override) {
    if (override.startHour === 0 && override.endHour === 0) {
      return { conflict: true, reason: `${barber.name} is off on ${dateStr} (schedule override)` };
    }
    startHour = override.startHour;
    endHour = override.endHour;
  } else {
    // Check time-off
    if (barber.timeOff.some((t) => t.date === dateStr)) {
      return { conflict: true, reason: `${barber.name} is off on ${dateStr}` };
    }

    // Check work hours from weekly schedule
    const daySchedule = barber.schedule.find((s) => s.day === dayOfWeek);
    if (!daySchedule) {
      return { conflict: true, reason: `${barber.name} doesn't work on this day` };
    }
    startHour = daySchedule.startHour;
    endHour = daySchedule.endHour;
  }

  const hour = proposedStart.getHours();
  if (hour < startHour || hour >= endHour) {
    return {
      conflict: true,
      reason: `${barber.name} works ${startHour}:00–${endHour}:00 on this day`,
    };
  }

  // Ensure the service fits within work hours
  const proposedEnd = new Date(proposedStart);
  proposedEnd.setMinutes(proposedEnd.getMinutes() + service.durationMinutes);

  const workEnd = new Date(proposedStart);
  workEnd.setHours(endHour, 0, 0, 0);

  if (proposedEnd > workEnd) {
    return {
      conflict: true,
      reason: `Service doesn't fit before end of work hours (${endHour}:00)`,
    };
  }

  // Check appointment overlap using actual service duration
  const barberAppointments = appointments.filter(
    (a) => a.barberId === barber.id && a.status !== "cancelled",
  );

  const overlapping = barberAppointments.find((appt) => {
    const apptStart = new Date(appt.startAt);
    const apptEnd = new Date(apptStart);
    apptEnd.setMinutes(apptEnd.getMinutes() + service.durationMinutes);
    return proposedStart < apptEnd && apptStart < proposedEnd;
  });

  if (overlapping) {
    return { conflict: true, reason: `${barber.name} already has a booking at this time` };
  }

  return { conflict: false };
}
