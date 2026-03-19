import Foundation

protocol ServicesRepository {
    func fetchServices() async throws -> [ServiceMenuItem]
}

protocol BarbersRepository {
    func fetchBarbers() async throws -> [Barber]
}

protocol AppointmentsRepository {
    func fetchAppointments() async throws -> [Appointment]
    func requestAppointment(customerId: String, barberId: String, serviceId: String, startDate: Date, notes: String) async throws -> Appointment
    func updateAppointmentStatus(appointmentId: String, status: AppointmentStatus) async throws -> Appointment
}

protocol RewardsRepository {
    func fetchRewardSummary() async throws -> RewardSummary
}

protocol AvailabilityRepository {
    func fetchSlots(serviceId: String, barberId: String?, days: Int) async throws -> [AvailabilitySlot]
}
