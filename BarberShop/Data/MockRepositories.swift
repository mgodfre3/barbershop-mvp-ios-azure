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
        customerId: UUID,
        barberId: UUID,
        serviceId: UUID,
        startDate: Date,
        notes: String
    ) async throws -> Appointment {
        try await Task.sleep(nanoseconds: 300_000_000)

        guard let barber = MVPData.preview.barbers.first(where: { $0.id == barberId }),
              let service = MVPData.preview.services.first(where: { $0.id == serviceId }) else {
            throw NSError(domain: "MockAppointmentsRepository", code: 404, userInfo: [NSLocalizedDescriptionKey: "Barber or service not found"])
        }

        let appointment = Appointment(
            id: UUID(),
            service: service,
            barber: barber,
            startDate: startDate,
            status: .requested,
            notes: notes
        )
        appointments.append(appointment)
        return appointment
    }

    func updateAppointmentStatus(appointmentId: UUID, status: AppointmentStatus) async throws -> Appointment {
        try await Task.sleep(nanoseconds: 200_000_000)

        guard let index = appointments.firstIndex(where: { $0.id == appointmentId }) else {
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
