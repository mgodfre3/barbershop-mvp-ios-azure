//
//  Item.swift
//  BarberShop
//
//  Created by Michael Godfrey on 3/17/26.
//

import Foundation
import SwiftData

@Model
final class AppSession {
    var currentCustomerName: String
    var loyaltyPoints: Int
    var preferredBarberName: String
    var nextAppointmentDate: Date?

    init(
        currentCustomerName: String = "Michael",
        loyaltyPoints: Int = 120,
        preferredBarberName: String = "Jordan",
        nextAppointmentDate: Date? = nil
    ) {
        self.currentCustomerName = currentCustomerName
        self.loyaltyPoints = loyaltyPoints
        self.preferredBarberName = preferredBarberName
        self.nextAppointmentDate = nextAppointmentDate
    }
}

struct CustomerProfile: Identifiable, Hashable {
    let id: UUID
    var fullName: String
    var email: String
    var phoneNumber: String
    var preferredBarberID: UUID?
    var loyaltyTier: String
    var marketingOptIn: Bool
}

struct Barber: Identifiable, Hashable {
    let id: UUID
    var name: String
    var specialty: String
    var yearsExperience: Int
    var bio: String
    var isAvailableToday: Bool
}

struct ServiceMenuItem: Identifiable, Hashable {
    let id: UUID
    var name: String
    var durationMinutes: Int
    var price: Decimal
    var description: String
}

enum AppointmentStatus: String, CaseIterable, Codable {
    case requested
    case confirmed
    case completed
    case cancelled

    var displayName: String {
        rawValue.capitalized
    }
}

struct Appointment: Identifiable, Hashable {
    let id: UUID
    var service: ServiceMenuItem
    var barber: Barber
    var startDate: Date
    var status: AppointmentStatus
    var notes: String

    var endDate: Date {
        Calendar.current.date(byAdding: .minute, value: service.durationMinutes, to: startDate) ?? startDate
    }
}

struct RewardActivity: Identifiable, Hashable {
    let id: UUID
    var title: String
    var points: Int
    var activityDate: Date
}

struct RewardSummary: Hashable {
    var pointsBalance: Int
    var pointsToNextReward: Int
    var tier: String
    var recentActivity: [RewardActivity]
}

struct MVPData {
    let customer: CustomerProfile
    let barbers: [Barber]
    let services: [ServiceMenuItem]
    var upcomingAppointments: [Appointment]
    let rewards: RewardSummary

    static let preview: MVPData = {
        let barberJordan = Barber(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111111") ?? UUID(),
            name: "Jordan",
            specialty: "Fades & tapers",
            yearsExperience: 8,
            bio: "Known for clean fades and quick lineup touch-ups.",
            isAvailableToday: true
        )
        let barberAlex = Barber(
            id: UUID(uuidString: "22222222-2222-2222-2222-222222222222") ?? UUID(),
            name: "Alex",
            specialty: "Beard design",
            yearsExperience: 6,
            bio: "Specializes in beard shaping and premium grooming packages.",
            isAvailableToday: false
        )

        let classicCut = ServiceMenuItem(
            id: UUID(uuidString: "33333333-3333-3333-3333-333333333333") ?? UUID(),
            name: "Classic Cut",
            durationMinutes: 45,
            price: 35,
            description: "Classic haircut with neck shave and style finish."
        )
        let beardTrim = ServiceMenuItem(
            id: UUID(uuidString: "44444444-4444-4444-4444-444444444444") ?? UUID(),
            name: "Beard Trim",
            durationMinutes: 25,
            price: 20,
            description: "Precision beard cleanup with line detail."
        )
        let premiumPackage = ServiceMenuItem(
            id: UUID(uuidString: "55555555-5555-5555-5555-555555555555") ?? UUID(),
            name: "Premium Package",
            durationMinutes: 60,
            price: 55,
            description: "Cut, beard trim, hot towel, and styling."
        )

        let upcoming = [
            Appointment(
                id: UUID(uuidString: "66666666-6666-6666-6666-666666666666") ?? UUID(),
                service: classicCut,
                barber: barberJordan,
                startDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                status: .confirmed,
                notes: "Please keep the top textured."
            ),
            Appointment(
                id: UUID(uuidString: "77777777-7777-7777-7777-777777777777") ?? UUID(),
                service: beardTrim,
                barber: barberAlex,
                startDate: Calendar.current.date(byAdding: .day, value: 9, to: Date()) ?? Date(),
                status: .requested,
                notes: "Shape and shorten mustache."
            )
        ]

        return MVPData(
            customer: CustomerProfile(
                id: UUID(uuidString: "88888888-8888-8888-8888-888888888888") ?? UUID(),
                fullName: "Michael Godfrey",
                email: "michael@example.com",
                phoneNumber: "(555) 012-3000",
                preferredBarberID: barberJordan.id,
                loyaltyTier: "Gold",
                marketingOptIn: true
            ),
            barbers: [barberJordan, barberAlex],
            services: [classicCut, beardTrim, premiumPackage],
            upcomingAppointments: upcoming,
            rewards: RewardSummary(
                pointsBalance: 120,
                pointsToNextReward: 30,
                tier: "Gold",
                recentActivity: [
                    RewardActivity(
                        id: UUID(),
                        title: "Completed Premium Package",
                        points: 20,
                        activityDate: Calendar.current.date(byAdding: .day, value: -6, to: Date()) ?? Date()
                    ),
                    RewardActivity(
                        id: UUID(),
                        title: "Loyalty bonus",
                        points: 10,
                        activityDate: Calendar.current.date(byAdding: .day, value: -18, to: Date()) ?? Date()
                    )
                ]
            )
        )
    }()
}

enum BookingRules {
    static func isBookable(_ appointment: Appointment) -> Bool {
        appointment.startDate > Date() && appointment.status != .cancelled
    }

    static func progressTowardNextReward(pointsBalance: Int, pointsToNextReward: Int) -> Double {
        let total = max(pointsBalance + pointsToNextReward, 1)
        return min(max(Double(pointsBalance) / Double(total), 0), 1)
    }
}
