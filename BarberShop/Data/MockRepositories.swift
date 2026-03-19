import Foundation

struct MockServicesRepository: ServicesRepository {
    func fetchServices() async throws -> [ServiceMenuItem] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 200_000_000)
        return MVPData.preview.services
    }
}

struct MockBarbersRepository: BarbersRepository {
    func fetchBarbers() async throws -> [Barber] {
        try await Task.sleep(nanoseconds: 200_000_000)
        return MVPData.preview.barbers
    }
}

final class MockAppointmentsRepository: AppointmentsRepository {
    private var appointments: [Appointment] = MVPData.preview.upcomingAppointments

    func fetchAppointments() async throws -> [Appointment] {
        try await Task.sleep(nanoseconds: 200_000_000)
        return appointments
    }

    func requestAppointment(
        customerId: String,
        barberId: String,
        serviceId: String,
        startDate: Date,
        notes: String
    ) async throws -> Appointment {
        try await Task.sleep(nanoseconds: 300_000_000)

        let barber = MVPData.preview.barbers.first ?? MVPData.preview.barbers[0]
        let service = MVPData.preview.services.first ?? MVPData.preview.services[0]

        let appointment = Appointment(
            id: UUID(),
            apiId: "mock-\(UUID().uuidString.prefix(8))",
            service: service,
            barber: barber,
            startDate: startDate,
            status: .requested,
            notes: notes
        )
        appointments.append(appointment)
        return appointment
    }

    func updateAppointmentStatus(appointmentId: String, status: AppointmentStatus) async throws -> Appointment {
        try await Task.sleep(nanoseconds: 200_000_000)

        guard let index = appointments.firstIndex(where: { $0.id.uuidString == appointmentId }) else {
            throw NSError(domain: "MockAppointmentsRepository", code: 404, userInfo: [NSLocalizedDescriptionKey: "Appointment not found"])
        }

        appointments[index].status = status
        return appointments[index]
    }
}

struct MockRewardsRepository: RewardsRepository {
    func fetchRewardSummary() async throws -> RewardSummary {
        try await Task.sleep(nanoseconds: 200_000_000)
        return MVPData.preview.rewards
    }
}
