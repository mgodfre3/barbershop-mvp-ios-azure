//
//  ContentView.swift
//  BarberShop
//
//  Created by Michael Godfrey on 3/17/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @StateObject private var viewModel = MVPScreenViewModel()

    var body: some View {
        TabView {
            HomeView(data: viewModel.data)
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            BookingView(data: viewModel.data, viewModel: viewModel)
                .tabItem {
                    Label("Book", systemImage: "calendar.badge.plus")
                }

            RewardsView(summary: viewModel.data.rewards)
                .tabItem {
                    Label("Rewards", systemImage: "star.fill")
                }

            ProfileView(customer: viewModel.data.customer, preferredBarber: viewModel.data.barbers.first { $0.id == viewModel.data.customer.preferredBarberID })
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle")
                }
        }
        .tint(.brown)
        .task {
            await viewModel.load()
        }
    }
}

private struct HomeView: View {
    let data: MVPData

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    heroCard
                    appointmentsCard
                    servicesSection
                    barbersSection
                }
                .padding()
            }
            .navigationTitle("BarberShop MVP")
        }
    }

    private var heroCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Welcome back, \(data.customer.fullName.components(separatedBy: " ").first ?? data.customer.fullName)")
                .font(.title2.weight(.bold))
            Text("Your next reward unlocks in \(data.rewards.pointsToNextReward) points.")
                .foregroundStyle(.secondary)

            HStack {
                statPill(title: "Tier", value: data.rewards.tier)
                statPill(title: "Points", value: "\(data.rewards.pointsBalance)")
                statPill(title: "Barber", value: data.barbers.first(where: { $0.id == data.customer.preferredBarberID })?.name ?? "Any")
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.brown.opacity(0.12), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var appointmentsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upcoming appointments")
                .font(.headline)

            ForEach(data.upcomingAppointments) { appointment in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(appointment.service.name)
                            .font(.subheadline.weight(.semibold))
                        Spacer()
                        Text(appointment.status.displayName)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(statusColor(for: appointment.status).opacity(0.15), in: Capsule())
                    }
                    Text("\(appointment.barber.name) • \(appointment.startDate, format: Date.FormatStyle(date: .abbreviated, time: .shortened))")
                        .foregroundStyle(.secondary)
                    if !appointment.notes.isEmpty {
                        Text(appointment.notes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        }
    }

    private var servicesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Popular services")
                .font(.headline)

            ForEach(data.services) { service in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(service.name)
                            .font(.subheadline.weight(.semibold))
                        Text(service.description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(service.price, format: .currency(code: "USD"))
                            .font(.subheadline.weight(.semibold))
                        Text("\(service.durationMinutes) min")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private var barbersSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Meet the barbers")
                .font(.headline)

            ForEach(data.barbers) { barber in
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(barber.name)
                            .font(.subheadline.weight(.semibold))
                        Spacer()
                        Label(barber.isAvailableToday ? "Available today" : "Booked today", systemImage: barber.isAvailableToday ? "checkmark.circle.fill" : "clock.fill")
                            .font(.caption)
                            .foregroundStyle(barber.isAvailableToday ? .green : .orange)
                    }
                    Text("\(barber.specialty) • \(barber.yearsExperience) years")
                        .foregroundStyle(.secondary)
                    Text(barber.bio)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(.background, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(.brown.opacity(0.15), lineWidth: 1)
                )
            }
        }
    }

    private func statPill(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.subheadline.weight(.semibold))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func statusColor(for status: AppointmentStatus) -> Color {
        switch status {
        case .requested: return .orange
        case .confirmed: return .green
        case .completed: return .blue
        case .cancelled: return .red
        }
    }
}

private struct BookingView: View {
    let data: MVPData
    @ObservedObject var viewModel: MVPScreenViewModel
    @State private var selectedBarberID: UUID?
    @State private var selectedServiceID: UUID?
    @State private var notes: String = ""
    @State private var showConfirmation = false
    @State private var showCardEntry = false
    @State private var bookingError: String?
    @State private var paymentSuccess = false
    @State private var lastBookedAppointmentId: String?

    private let paymentRepo: PaymentRepository = APIPaymentRepository(client: APIClient())

    var body: some View {
        NavigationStack {
            Form {
                Section("Choose a barber") {
                    Picker("Barber", selection: $selectedBarberID) {
                        Text("No preference").tag(UUID?.none)
                        ForEach(data.barbers) { barber in
                            Text(barber.name).tag(Optional(barber.id))
                        }
                    }
                }

                Section("Choose a service") {
                    Picker("Service", selection: $selectedServiceID) {
                        ForEach(data.services) { service in
                            Text("\(service.name) • \(service.durationMinutes) min").tag(Optional(service.id))
                        }
                    }
                }

                Section("Notes for your barber") {
                    TextField("e.g. Keep the top textured", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Next available") {
                    ForEach(recommendedAppointments) { appointment in
                        VStack(alignment: .leading, spacing: 6) {
                            Text("\(appointment.service.name) with \(appointment.barber.name)")
                                .font(.subheadline.weight(.semibold))
                            Text(appointment.startDate, format: Date.FormatStyle(date: .abbreviated, time: .shortened))
                                .foregroundStyle(.secondary)
                            Text(appointment.notes)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section {
                    Button {
                        Task { await bookAppointment() }
                    } label: {
                        if viewModel.isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity, alignment: .center)
                        } else {
                            Text("Request Appointment")
                                .frame(maxWidth: .infinity, alignment: .center)
                        }
                    }
                    .disabled(selectedServiceID == nil || viewModel.isLoading)
                }
            }
            .navigationTitle("Book Appointment")
            .onAppear {
                selectedBarberID = data.customer.preferredBarberID
                selectedServiceID = data.services.first?.id
            }
            .alert("Appointment Requested!", isPresented: $showConfirmation) {
                Button("Pay Now") { showCardEntry = true }
                Button("Pay Later", role: .cancel) {}
            } message: {
                Text("Your appointment has been submitted. Would you like to pay now?")
            }
            .alert("Payment Successful!", isPresented: $paymentSuccess) {
                Button("Done") {}
            } message: {
                Text("Your payment has been processed through Square.")
            }
            .alert("Booking Failed", isPresented: .init(
                get: { bookingError != nil },
                set: { if !$0 { bookingError = nil } }
            )) {
                Button("OK") {}
            } message: {
                Text(bookingError ?? "Something went wrong. Please try again.")
            }
            .sheet(isPresented: $showCardEntry) {
                CardEntryView(
                    amount: selectedServicePrice,
                    onNonceReceived: { nonce in
                        Task { await processPayment(nonce: nonce) }
                    },
                    onCancel: { showCardEntry = false }
                )
            }
        }
    }

    private var selectedServicePrice: Decimal {
        filteredService?.price ?? 0
    }

    private func bookAppointment() async {
        guard let serviceID = selectedServiceID else { return }

        let barberID = selectedBarberID ?? data.barbers.first(where: { $0.isAvailableToday })?.id ?? data.barbers.first?.id
        guard let barberID else { return }

        let slot = recommendedAppointments.first(where: { $0.barber.id == barberID })
        let startDate = slot?.startDate ?? Calendar.current.date(byAdding: .hour, value: 24, to: Date()) ?? Date()

        do {
            try await viewModel.requestAppointment(
                barberId: barberID,
                serviceId: serviceID,
                startDate: startDate,
                notes: notes
            )
            lastBookedAppointmentId = data.upcomingAppointments.last?.id.uuidString
            notes = ""
            showConfirmation = true
        } catch {
            bookingError = error.localizedDescription
        }
    }

    private func processPayment(nonce: String) async {
        showCardEntry = false
        do {
            _ = try await paymentRepo.processPayment(
                nonce: nonce,
                amount: selectedServicePrice,
                customerId: data.customer.id.uuidString,
                appointmentId: lastBookedAppointmentId ?? ""
            )
            paymentSuccess = true
        } catch {
            bookingError = error.localizedDescription
        }
    }

    private var filteredBarber: Barber? {
        guard let selectedBarberID else { return nil }
        return data.barbers.first(where: { $0.id == selectedBarberID })
    }

    private var filteredService: ServiceMenuItem? {
        guard let selectedServiceID else { return data.services.first }
        return data.services.first(where: { $0.id == selectedServiceID })
    }

    private var recommendedAppointments: [Appointment] {
        let service = filteredService ?? data.services[0]
        let candidateBarbers = filteredBarber.map { [$0] } ?? data.barbers

        return candidateBarbers.enumerated().map { index, barber in
            Appointment(
                id: UUID(),
                service: service,
                barber: barber,
                startDate: Calendar.current.date(byAdding: .hour, value: 24 + (index * 2), to: Date()) ?? Date(),
                status: .requested,
                notes: barber.isAvailableToday ? "Recommended based on current availability." : "Good fit based on your selected service."
            )
        }
        .filter(BookingRules.isBookable)
    }
}

private struct RewardsView: View {
    let summary: RewardSummary

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("\(summary.pointsBalance) points")
                            .font(.largeTitle.weight(.bold))
                        Text("\(summary.pointsToNextReward) points until your next reward")
                            .foregroundStyle(.secondary)
                        ProgressView(value: BookingRules.progressTowardNextReward(pointsBalance: summary.pointsBalance, pointsToNextReward: summary.pointsToNextReward))
                            .tint(.brown)
                        Label("\(summary.tier) tier", systemImage: "crown.fill")
                            .foregroundStyle(.brown)
                    }
                    .padding(.vertical, 8)
                }

                Section("Recent activity") {
                    ForEach(summary.recentActivity) { activity in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(activity.title)
                                Text(activity.activityDate, format: Date.FormatStyle(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("+\(activity.points)")
                                .font(.headline)
                                .foregroundStyle(.green)
                        }
                    }
                }
            }
            .navigationTitle("Rewards")
        }
    }
}

private struct ProfileView: View {
    let customer: CustomerProfile
    let preferredBarber: Barber?

    var body: some View {
        NavigationStack {
            List {
                Section("Customer") {
                    profileRow(title: "Name", value: customer.fullName)
                    profileRow(title: "Email", value: customer.email)
                    profileRow(title: "Phone", value: customer.phoneNumber)
                    profileRow(title: "Tier", value: customer.loyaltyTier)
                    profileRow(title: "Preferred barber", value: preferredBarber?.name ?? "Not selected")
                }

                Section("Preferences") {
                    Label(customer.marketingOptIn ? "Promotions enabled" : "Promotions disabled", systemImage: customer.marketingOptIn ? "bell.badge.fill" : "bell.slash")
                        .foregroundStyle(customer.marketingOptIn ? .green : .secondary)
                    Text("Azure plan: customer accounts will move to Microsoft Entra External ID, while preferences and CRM notes will live in Azure SQL.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Profile")
        }
    }

    private func profileRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
            Spacer()
            Text(value)
                .foregroundStyle(.secondary)
        }
    }
}

#Preview {
    ContentView()
}
