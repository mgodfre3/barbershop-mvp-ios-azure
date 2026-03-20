export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export type Service = {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
};

export type Barber = {
  id: string;
  name: string;
  specialty: string;
  isAvailableToday?: boolean;
};

export type Appointment = {
  id: string;
  customerId?: string;
  teamMemberId?: string;
  serviceId: string;
  serviceVariationId?: string;
  startAt: string;
  status: AppointmentStatus;
  notes?: string;
};

export type AvailabilitySlot = {
  teamMemberId: string;
  teamMemberName?: string;
  serviceVariationId: string;
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

export type LedgerEntryType = "holding_fee" | "service_payment" | "refund" | "cancellation_fee";

export type LedgerEntry = {
  id: string;
  customerId: string;
  appointmentId?: string;
  type: LedgerEntryType;
  amount: number;
  description?: string;
  squarePaymentId?: string;
  createdAt: string;
};

export type CustomerSummary = {
  customerId: string;
  totalPayments: number;
  totalSpent: number;
  recentPayments: LedgerEntry[];
};
