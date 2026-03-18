//
//  BarberShopApp.swift
//  BarberShop
//
//  Created by Michael Godfrey on 3/17/26.
//

import SwiftUI
import SwiftData
import SquareInAppPaymentsSDK

@main
struct BarberShopApp: App {
    init() {
        #if !targetEnvironment(simulator)
        SQIPInAppPaymentsSDK.squareApplicationID = "sq0idp-rVH2MiAbH0PGniY6PwyIZA"
        #endif
    }

    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            AppSession.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}
