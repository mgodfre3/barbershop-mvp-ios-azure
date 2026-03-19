import Foundation

struct APIAppointmentsRepository: AppointmentsRepository {
    let client: APIClient

    func fetchAppointments() async throws -> [Appointment] {
        let dtos: [AppointmentDTO] = try await client.get("/appointments")
        let services: [ServiceDTO] = try await client.get("/services")
        let barbers: [BarberDTO] = try await client.get("/barbers")
        return dtos.compactMap { dto in hydrate(dto, services: services, barbers: barbers) }
    }

    func requestAppointment(
        customerId: UUID,
        barberId: UUID,
        serviceId: UUID,
        startDate: Date,
        notes: String
    ) async throws -> Appointment {
        let payload = AppointmentRequestPayload(
            customerId: customerId.uuidString,
            barberId: barberId.uuidString,
            serviceId: serviceId.uuidString,
            startAt: ISO8601DateFormatter().string(from: startDate),
            notes: notes.isEmpty ? nil : notes
        )

        let dto: AppointmentDTO = try await client.post("/appointments", body: payload)

        let services: [ServiceDTO] = try await client.get("/services")
        let barbers: [BarberDTO] = try await client.get("/barbers")

        guard let appointment = hydrate(dto, services: services, barbers: barbers) else {
            throw APIError.decodingError(
                NSError(domain: "AppointmentsRepository", code: 0,
                        userInfo: [NSLocalizedDescriptionKey: "Could not hydrate appointment"])
            )
        }
        return appointment
    }

    func updateAppointmentStatus(appointmentId: UUID, status: AppointmentStatus) async throws -> Appointment {
        let payload = AppointmentStatusUpdatePayload(status: status.rawValue)
        let dto: AppointmentDTO = try await client.patch(
            "/appointments/\(appointmentId.uuidString)", body: payload
        )

        let services: [ServiceDTO] = try await client.get("/services")
        let barbers: [BarberDTO] = try await client.get("/barbers")

        guard let appointment = hydrate(dto, services: services, barbers: barbers) else {
            throw APIError.decodingError(
                NSError(domain: "AppointmentsRepository", code: 0,
                        userInfo: [NSLocalizedDescriptionKey: "Could not hydrate appointment"])
            )
        }
        return appointment
    }

    // Map an AppointmentDTO to a fully-hydrated domain Appointment
    private func hydrate(
        _ dto: AppointmentDTO,
        services: [ServiceDTO],
        barbers: [BarberDTO]
    ) -> Appointment? {
        guard let serviceDTO = services.first(where: { $0.id == dto.serviceId }),
              let barberDTO = barbers.first(where: { $0.id == dto.barberId }) else {
            return nil
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let startDate = formatter.date(from: dto.startAt)
            ?? ISO8601DateFormatter().date(from: dto.startAt)
            ?? Date()

        return Appointment(
            id: UUID(uuidString: dto.id) ?? UUID(),
            service: serviceDTO.toDomain(),
            barber: barberDTO.toDomain(),
            startDate: startDate,
            status: AppointmentStatus(rawValue: dto.status) ?? .requested,
            notes: dto.notes ?? ""
        )
    }
}
