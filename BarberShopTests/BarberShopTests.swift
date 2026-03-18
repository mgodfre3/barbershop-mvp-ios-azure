//
//  BarberShopTests.swift
//  BarberShopTests
//
//  Created by Michael Godfrey on 3/17/26.
//

import XCTest
@testable import BarberShop

final class BarberShopTests: XCTestCase {

    func testBookableAppointmentRequiresFutureDateAndActiveStatus() {
        let service = MVPData.preview.services[0]
        let barber = MVPData.preview.barbers[0]

        let futureAppointment = Appointment(
            id: UUID(),
            service: service,
            barber: barber,
            startDate: Calendar.current.date(byAdding: .hour, value: 2, to: Date()) ?? Date(),
            status: .confirmed,
            notes: ""
        )
        let pastAppointment = Appointment(
            id: UUID(),
            service: service,
            barber: barber,
            startDate: Calendar.current.date(byAdding: .hour, value: -2, to: Date()) ?? Date(),
            status: .confirmed,
            notes: ""
        )
        let cancelledAppointment = Appointment(
            id: UUID(),
            service: service,
            barber: barber,
            startDate: Calendar.current.date(byAdding: .hour, value: 3, to: Date()) ?? Date(),
            status: .cancelled,
            notes: ""
        )

        XCTAssertTrue(BookingRules.isBookable(futureAppointment))
        XCTAssertFalse(BookingRules.isBookable(pastAppointment))
        XCTAssertFalse(BookingRules.isBookable(cancelledAppointment))
    }

    func testRewardProgressClampsIntoValidRange() {
        XCTAssertEqual(BookingRules.progressTowardNextReward(pointsBalance: 120, pointsToNextReward: 30), 0.8, accuracy: 0.001)
        XCTAssertEqual(BookingRules.progressTowardNextReward(pointsBalance: 0, pointsToNextReward: 0), 0)
        XCTAssertEqual(BookingRules.progressTowardNextReward(pointsBalance: 400, pointsToNextReward: -50), 1)
    }

    func testPreviewDataContainsCustomerBarbersServicesAndAppointments() {
        let preview = MVPData.preview

        XCTAssertFalse(preview.customer.fullName.isEmpty)
        XCTAssertGreaterThanOrEqual(preview.barbers.count, 2)
        XCTAssertGreaterThanOrEqual(preview.services.count, 3)
        XCTAssertFalse(preview.upcomingAppointments.isEmpty)
        XCTAssertEqual(preview.rewards.tier, preview.customer.loyaltyTier)
    }
}
