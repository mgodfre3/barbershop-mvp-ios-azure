import Foundation

struct ServiceDTO: Codable {
    let id: String
    let name: String
    let durationMinutes: Int
    let price: Double
    let description: String?

    func toDomain() -> ServiceMenuItem {
        ServiceMenuItem(
            id: UUID(uuidString: id) ?? UUID(),
            name: name,
            durationMinutes: durationMinutes,
            price: Decimal(price),
            description: description ?? ""
        )
    }
}

struct BarberDTO: Codable {
    let id: String
    let name: String
    let specialty: String
    let isAvailableToday: Bool

    func toDomain() -> Barber {
        Barber(
            id: UUID(uuidString: id) ?? UUID(),
            name: name,
            specialty: specialty,
            yearsExperience: 5,
            bio: "",
            isAvailableToday: isAvailableToday
        )
    }
}

struct AppointmentDTO: Codable {
    let id: String
    let customerId: String
    let barberId: String
    let serviceId: String
    let startAt: String
    let status: String
    let notes: String?
}

struct RewardSummaryDTO: Codable {
    let customerId: String
    let pointsBalance: Int
    let pointsToNextReward: Int
    let tier: String

    func toDomain() -> RewardSummary {
        RewardSummary(
            pointsBalance: pointsBalance,
            pointsToNextReward: pointsToNextReward,
            tier: tier,
            recentActivity: []
        )
    }
}

struct AppointmentRequestPayload: Codable {
    let customerId: String
    let barberId: String
    let serviceId: String
    let startAt: String
    let notes: String?
}

struct AppointmentStatusUpdatePayload: Codable {
    let status: String
}

struct AvailabilitySlotDTO: Codable {
    let barberId: String
    let barberName: String
    let serviceId: String
    let date: String
    let startAt: String
    let endAt: String
    let durationMinutes: Int
}
