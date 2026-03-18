export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
};

export type Barber = {
  id: string;
  name: string;
  specialty: string;
  isAvailableToday: boolean;
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

export const mockBarbers: Barber[] = [
  { id: "barber-jordan", name: "Jordan", specialty: "Fades & tapers", isAvailableToday: true },
  { id: "barber-alex", name: "Alex", specialty: "Beard design", isAvailableToday: false }
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
