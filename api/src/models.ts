export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

// 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type DaySchedule = {
  day: DayOfWeek;
  startHour: number; // 0-23
  endHour: number;   // 0-23, must be > startHour
};

export type TimeOffEntry = {
  id: string;
  barberId: string;
  date: string;      // YYYY-MM-DD
  reason?: string;
};

export type Barber = {
  id: string;
  name: string;
  specialty: string;
  schedule: DaySchedule[];
  timeOff: TimeOffEntry[];
};

export type Appointment = {
  id: string;
  customerId: string;
  barberId: string;
  serviceId: string;
  startAt: string;
  status: AppointmentStatus;
  notes?: string;
};

export type AvailabilitySlot = {
  barberId: string;
  barberName: string;
  serviceId: string;
  date: string;       // YYYY-MM-DD
  startAt: string;    // ISO 8601
  endAt: string;      // ISO 8601
  durationMinutes: number;
};

export type RewardSummary = {
  customerId: string;
  pointsBalance: number;
  pointsToNextReward: number;
  tier: string;
};

export const mockServices: Service[] = [
  { id: "svc-classic", name: "Classic Cut", durationMinutes: 45, price: 35 },
  { id: "svc-beard", name: "Beard Trim", durationMinutes: 25, price: 20 },
  { id: "svc-premium", name: "Premium Package", durationMinutes: 60, price: 55 }
];

// Seeded schedules: Jordan Mon-Fri 9-17, Alex Tue-Sat 10-18
export const mockBarbers: Barber[] = [
  {
    id: "barber-jordan",
    name: "Jordan",
    specialty: "Fades & tapers",
    schedule: [
      { day: 1, startHour: 9, endHour: 17 },
      { day: 2, startHour: 9, endHour: 17 },
      { day: 3, startHour: 9, endHour: 17 },
      { day: 4, startHour: 9, endHour: 17 },
      { day: 5, startHour: 9, endHour: 17 },
    ],
    timeOff: [],
  },
  {
    id: "barber-alex",
    name: "Alex",
    specialty: "Beard design",
    schedule: [
      { day: 2, startHour: 10, endHour: 18 },
      { day: 3, startHour: 10, endHour: 18 },
      { day: 4, startHour: 10, endHour: 18 },
      { day: 5, startHour: 10, endHour: 18 },
      { day: 6, startHour: 10, endHour: 18 },
    ],
    timeOff: [],
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: "appt-1",
    customerId: "customer-1",
    barberId: "barber-jordan",
    serviceId: "svc-classic",
    startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "confirmed",
    notes: "Keep the top textured"
  }
];

export const mockRewards: RewardSummary = {
  customerId: "customer-1",
  pointsBalance: 120,
  pointsToNextReward: 30,
  tier: "Gold"
};
