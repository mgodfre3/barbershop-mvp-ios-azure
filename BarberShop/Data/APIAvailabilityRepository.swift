import Foundation

struct APIAvailabilityRepository: AvailabilityRepository {
    let client: APIClient

    func fetchSlots(serviceId: String, barberId: String?, days: Int) async throws -> [AvailabilitySlot] {
        var path = "/availability?serviceId=\(serviceId)&days=\(days)"
        if let barberId {
            path += "&barberId=\(barberId)"
        }

        let dtos: [AvailabilitySlotDTO] = try await client.get(path)

        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fallbackFormatter = ISO8601DateFormatter()

        return dtos.compactMap { dto in
            guard let start = isoFormatter.date(from: dto.startAt) ?? fallbackFormatter.date(from: dto.startAt),
                  let end = isoFormatter.date(from: dto.endAt) ?? fallbackFormatter.date(from: dto.endAt)
            else { return nil }

            return AvailabilitySlot(
                id: "\(dto.barberId)-\(dto.startAt)",
                barberId: dto.barberId,
                barberName: dto.barberName,
                serviceId: dto.serviceId,
                date: dto.date,
                startDate: start,
                endDate: end
            )
        }
    }
}
