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

export type ScheduleOverride = {
  id: string;
  barberId: string;
  date: string;      // YYYY-MM-DD
  startHour: number; // 0-23; if startHour === endHour === 0, barber is off
  endHour: number;   // 0-24
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

export const mockRewards: RewardSummary = {
  customerId: "customer-1",
  pointsBalance: 120,
  pointsToNextReward: 30,
  tier: "Gold"
};
