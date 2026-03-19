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
    var apiId: String
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

struct AvailabilitySlot: Identifiable, Hashable {
    let id: String       // barberId + startAt for uniqueness
    let barberId: String
    let barberName: String
    let serviceId: String
    let date: String     // YYYY-MM-DD
    let startDate: Date
    let endDate: Date
}

struct MVPData {
    let customer: CustomerProfile
    let barbers: [Barber]
    let services: [ServiceMenuItem]
    var upcomingAppointments: [Appointment]
    let rewards: RewardSummary

    static let preview: MVPData = {
        let barberEdwin = Barber(
            id: UUID(uuidString: "11111111-1111-1111-1111-111111111111") ?? UUID(),
            name: "Edwin",
            specialty: "Master Barber",
            yearsExperience: 15,
            bio: "Master Barber Edwin, featured in GQ. Expert in luxury grooming and signature experiences.",
            isAvailableToday: true
        )
        let barberMarcus = Barber(
            id: UUID(uuidString: "22222222-2222-2222-2222-222222222222") ?? UUID(),
            name: "Marcus",
            specialty: "Precision cuts & styling",
            yearsExperience: 10,
            bio: "Specializes in modern styles and precision grooming.",
            isAvailableToday: true
        )
        let barberDevon = Barber(
            id: UUID(uuidString: "33333333-3333-3333-3333-333333333333") ?? UUID(),
            name: "Devon",
            specialty: "Classic grooming",
            yearsExperience: 8,
            bio: "Expert in traditional barbering techniques and hot towel shaves.",
            isAvailableToday: false
        )
        let barberRico = Barber(
            id: UUID(uuidString: "44444444-4444-4444-4444-444444444444") ?? UUID(),
            name: "Rico",
            specialty: "Fades & edge work",
            yearsExperience: 7,
            bio: "Known for crisp fades and precision lineups.",
            isAvailableToday: true
        )

        let signatureExperience = ServiceMenuItem(
            id: UUID(uuidString: "55555555-5555-5555-5555-555555555555") ?? UUID(),
            name: "The MBE Signature Experience",
            durationMinutes: 90,
            price: 85,
            description: "Our signature service: precision cut, hot towel, beard sculpting, and premium styling."
        )
        let groomingExperience = ServiceMenuItem(
            id: UUID(uuidString: "66666666-6666-6666-6666-666666666666") ?? UUID(),
            name: "Grooming Experience",
            durationMinutes: 60,
            price: 65,
            description: "Full haircut with hot towel treatment and styling."
        )
        let shavingExperience = ServiceMenuItem(
            id: UUID(uuidString: "77777777-7777-7777-7777-777777777777") ?? UUID(),
            name: "Shaving Experience",
            durationMinutes: 45,
            price: 55,
            description: "Luxury hot towel shave with premium products."
        )
        let classicHaircut = ServiceMenuItem(
            id: UUID(uuidString: "88888888-8888-8888-8888-888888888888") ?? UUID(),
            name: "Classic Haircut",
            durationMinutes: 45,
            price: 45,
            description: "Classic haircut with precision and attention to detail."
        )
        let edgeUp = ServiceMenuItem(
            id: UUID(uuidString: "99999999-9999-9999-9999-999999999999") ?? UUID(),
            name: "Edge-Up / Lineup",
            durationMinutes: 20,
            price: 25,
            description: "Crisp lineup and edge work."
        )
        let kidsHaircut = ServiceMenuItem(
            id: UUID(uuidString: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa") ?? UUID(),
            name: "Kid's Haircut",
            durationMinutes: 30,
            price: 35,
            description: "Haircut for children 12 and under."
        )
        let waxing = ServiceMenuItem(
            id: UUID(uuidString: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb") ?? UUID(),
            name: "Ear & Nose Wax",
            durationMinutes: 15,
            price: 15,
            description: "Professional ear and nose waxing."
        )
        let beardTrim = ServiceMenuItem(
            id: UUID(uuidString: "cccccccc-cccc-cccc-cccc-cccccccccccc") ?? UUID(),
            name: "Beard Trim",
            durationMinutes: 25,
            price: 30,
            description: "Precision beard sculpting and trim."
        )

        let upcoming = [
            Appointment(
                id: UUID(uuidString: "dddddddd-dddd-dddd-dddd-dddddddddddd") ?? UUID(),
                apiId: "preview-1",
                service: signatureExperience,
                barber: barberEdwin,
                startDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                status: .confirmed,
                notes: "Looking forward to the full experience."
            ),
            Appointment(
                id: UUID(uuidString: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee") ?? UUID(),
                apiId: "preview-2",
                service: beardTrim,
                barber: barberMarcus,
                startDate: Calendar.current.date(byAdding: .day, value: 9, to: Date()) ?? Date(),
                status: .requested,
                notes: "Shape and line up the beard."
            )
        ]

        return MVPData(
            customer: CustomerProfile(
                id: UUID(uuidString: "88888888-8888-8888-8888-888888888888") ?? UUID(),
                fullName: "Michael Godfrey",
                email: "michael@example.com",
                phoneNumber: "(555) 012-3000",
                preferredBarberID: barberEdwin.id,
                loyaltyTier: "Platinum",
                marketingOptIn: true
            ),
            barbers: [barberEdwin, barberMarcus, barberDevon, barberRico],
            services: [signatureExperience, groomingExperience, shavingExperience, classicHaircut, edgeUp, kidsHaircut, waxing, beardTrim],
            upcomingAppointments: upcoming,
            rewards: RewardSummary(
                pointsBalance: 180,
                pointsToNextReward: 20,
                tier: "Platinum",
                recentActivity: [
                    RewardActivity(
                        id: UUID(),
                        title: "Completed Signature Experience",
                        points: 30,
                        activityDate: Calendar.current.date(byAdding: .day, value: -6, to: Date()) ?? Date()
                    ),
                    RewardActivity(
                        id: UUID(),
                        title: "VIP Loyalty bonus",
                        points: 15,
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
