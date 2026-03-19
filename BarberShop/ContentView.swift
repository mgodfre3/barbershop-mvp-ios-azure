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
    @State private var selectedAppointment: Appointment?

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
            .sheet(item: $selectedAppointment) { appointment in
                AppointmentDetailView(appointment: appointment)
            }
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
                Button {
                    selectedAppointment = appointment
                } label: {
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
                .buttonStyle(.plain)
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
    @State private var availableSlots: [AvailabilitySlot] = []
    @State private var selectedSlot: AvailabilitySlot?
    @State private var isLoadingSlots = false
    @State private var selectedDate: Date = Date()

    private let availabilityRepo: AvailabilityRepository = APIAvailabilityRepository(client: APIClient())
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

                Section("Available times") {
                    if isLoadingSlots {
                        ProgressView("Checking availability…")
                            .frame(maxWidth: .infinity, alignment: .center)
                    } else if availableSlots.isEmpty {
                        Text("No slots available. Try a different barber or service.")
                            .foregroundStyle(.secondary)
                    } else {
                        VStack(alignment: .leading, spacing: 16) {
                            // Date strip
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 12) {
                                    ForEach(availableDates, id: \.self) { date in
                                        DatePillButton(
                                            date: date,
                                            isSelected: Calendar.current.isDate(date, inSameDayAs: selectedDate),
                                            action: {
                                                withAnimation(.easeInOut(duration: 0.2)) {
                                                    selectedDate = date
                                                    selectedSlot = nil
                                                }
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal, 4)
                            }
                            
                            // Time grid for selected date
                            let slotsForSelectedDate = slotsForDate(selectedDate)
                            if slotsForSelectedDate.isEmpty {
                                VStack(spacing: 8) {
                                    Text("No availability on this date")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Text("Try selecting another day")
                                        .font(.caption)
                                        .foregroundStyle(Color.secondary.opacity(0.6))
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 20)
                            } else {
                                if selectedBarberID == nil {
                                    // Group by barber when "No preference"
                                    ForEach(groupSlotsByBarber(slotsForSelectedDate), id: \.barberName) { group in
                                        VStack(alignment: .leading, spacing: 8) {
                                            Text(group.barberName)
                                                .font(.caption.weight(.semibold))
                                                .foregroundStyle(.secondary)
                                            
                                            FlowLayout(spacing: 8) {
                                                ForEach(group.slots) { slot in
                                                    TimeSlotCard(
                                                        slot: slot,
                                                        isSelected: selectedSlot?.id == slot.id,
                                                        action: { selectedSlot = slot }
                                                    )
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    // Single barber selected
                                    FlowLayout(spacing: 8) {
                                        ForEach(slotsForSelectedDate) { slot in
                                            TimeSlotCard(
                                                slot: slot,
                                                isSelected: selectedSlot?.id == slot.id,
                                                action: { selectedSlot = slot }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
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
                    .disabled(selectedSlot == nil || viewModel.isLoading)
                }
            }
            .navigationTitle("Book Appointment")
            .onAppear {
                selectedBarberID = data.customer.preferredBarberID
                selectedServiceID = data.services.first?.id
            }
            .onChange(of: selectedServiceID) { loadSlots() }
            .onChange(of: selectedBarberID) { loadSlots() }
            .onChange(of: availableSlots) {
                if !availableSlots.isEmpty && availableDates.contains(where: { Calendar.current.isDate($0, inSameDayAs: selectedDate) }) == false {
                    selectedDate = availableDates.first ?? Date()
                }
            }
            .task { loadSlots() }
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

    // MARK: - Slot grouping and filtering

    private struct BarberGroup {
        let barberName: String
        let slots: [AvailabilitySlot]
    }
    
    private var availableDates: [Date] {
        let calendar = Calendar.current
        let dates = availableSlots.compactMap { slot -> Date? in
            calendar.startOfDay(for: slot.startDate)
        }
        return Array(Set(dates)).sorted()
    }
    
    private func slotsForDate(_ date: Date) -> [AvailabilitySlot] {
        let calendar = Calendar.current
        return availableSlots.filter { slot in
            calendar.isDate(slot.startDate, inSameDayAs: date)
        }.sorted { $0.startDate < $1.startDate }
    }
    
    private func groupSlotsByBarber(_ slots: [AvailabilitySlot]) -> [BarberGroup] {
        let grouped = Dictionary(grouping: slots, by: \.barberName)
        return grouped.map { BarberGroup(barberName: $0.key, slots: $0.value.sorted { $0.startDate < $1.startDate }) }
            .sorted { $0.barberName < $1.barberName }
    }

    // MARK: - Data loading

    private func loadSlots() {
        guard let serviceID = selectedServiceID else { return }

        Task {
            isLoadingSlots = true
            selectedSlot = nil
            do {
                let slots = try await availabilityRepo.fetchSlots(
                    serviceId: findAPIServiceId(for: serviceID),
                    barberId: selectedBarberID.flatMap { findAPIBarberId(for: $0) },
                    days: 60
                )
                availableSlots = slots
            } catch {
                availableSlots = []
            }
            isLoadingSlots = false
        }
    }

    private func findAPIServiceId(for uuid: UUID) -> String {
        let name = data.services.first(where: { $0.id == uuid })?.name ?? ""
        switch name {
        case "Classic Cut": return "svc-classic"
        case "Beard Trim": return "svc-beard"
        case "Premium Package": return "svc-premium"
        default: return uuid.uuidString
        }
    }

    private func findAPIBarberId(for uuid: UUID) -> String {
        let name = data.barbers.first(where: { $0.id == uuid })?.name ?? ""
        switch name {
        case "Jordan": return "barber-jordan"
        case "Alex": return "barber-alex"
        default: return uuid.uuidString
        }
    }

    private var selectedServicePrice: Decimal {
        data.services.first(where: { $0.id == selectedServiceID })?.price ?? 0
    }

    // MARK: - Actions

    private func bookAppointment() async {
        guard let slot = selectedSlot,
              let serviceID = selectedServiceID else { return }

        let barberID = data.barbers.first(where: { $0.name == slot.barberName })?.id
            ?? data.barbers.first?.id
        guard let barberID else { return }

        do {
            try await viewModel.requestAppointment(
                barberId: barberID,
                serviceId: serviceID,
                startDate: slot.startDate,
                notes: notes
            )
            lastBookedAppointmentId = data.upcomingAppointments.last?.id.uuidString
            notes = ""
            selectedSlot = nil
            showConfirmation = true
            loadSlots()
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
}

// Simple flow layout for slot buttons
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, offset) in result.offsets.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + offset.x, y: bounds.minY + offset.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (offsets: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var offsets: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            offsets.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return (offsets, CGSize(width: maxX, height: y + rowHeight))
    }
}

// MARK: - Date Pill Button
private struct DatePillButton: View {
    let date: Date
    let isSelected: Bool
    let action: () -> Void
    
    private var dayName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }
    
    private var dayNumber: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text(dayName)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(isSelected ? .white : .secondary)
                Text(dayNumber)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(isSelected ? .white : .primary)
            }
            .frame(width: 60, height: 60)
            .background(isSelected ? Color.brown : Color.brown.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Time Slot Card
private struct TimeSlotCard: View {
    let slot: AvailabilitySlot
    let isSelected: Bool
    let action: () -> Void
    
    private var timeString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: slot.startDate)
    }
    
    private var durationString: String {
        let calendar = Calendar.current
        let minutes = calendar.dateComponents([.minute], from: slot.startDate, to: slot.endDate).minute ?? 0
        return "\(minutes) min"
    }
    
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 4) {
                Text(timeString)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(isSelected ? .white : .primary)
                Text(slot.barberName)
                    .font(.caption)
                    .foregroundStyle(isSelected ? .white.opacity(0.9) : .secondary)
                Text(durationString)
                    .font(.caption2)
                    .foregroundStyle(isSelected ? .white.opacity(0.8) : Color.secondary.opacity(0.6))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(minWidth: 100, alignment: .leading)
            .background(isSelected ? Color.brown : Color.brown.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(isSelected ? Color.brown : Color.brown.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Appointment Detail View

private struct AppointmentDetailView: View {
    let appointment: Appointment
    @Environment(\.dismiss) private var dismiss
    @State private var showCardEntry = false
    @State private var paymentSuccess = false
    @State private var paymentError: String?

    private let paymentRepo: PaymentRepository = APIPaymentRepository(client: APIClient())

    var body: some View {
        NavigationStack {
            List {
                Section("Service") {
                    LabeledContent("Service", value: appointment.service.name)
                    LabeledContent("Duration", value: "\(appointment.service.durationMinutes) min")
                    LabeledContent("Price", value: String(format: "$%.2f", NSDecimalNumber(decimal: appointment.service.price).doubleValue))
                }

                Section("Appointment") {
                    LabeledContent("Barber", value: appointment.barber.name)
                    LabeledContent("Date", value: appointment.startDate.formatted(date: .abbreviated, time: .shortened))
                    LabeledContent("Status") {
                        Text(appointment.status.displayName)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(statusColor(for: appointment.status).opacity(0.15), in: Capsule())
                    }
                }

                if !appointment.notes.isEmpty {
                    Section("Notes") {
                        Text(appointment.notes)
                    }
                }

                Section {
                    Button {
                        showCardEntry = true
                    } label: {
                        Label("Pay Now", systemImage: "creditcard.fill")
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                    .disabled(appointment.status == .cancelled)
                }
            }
            .navigationTitle("Appointment Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(isPresented: $showCardEntry) {
                CardEntryView(
                    amount: appointment.service.price,
                    onNonceReceived: { nonce in
                        Task { await processPayment(nonce: nonce) }
                    },
                    onCancel: { showCardEntry = false }
                )
            }
            .alert("Payment Successful!", isPresented: $paymentSuccess) {
                Button("Done") { dismiss() }
            } message: {
                Text("Your payment has been processed through Square.")
            }
            .alert("Payment Failed", isPresented: .init(
                get: { paymentError != nil },
                set: { if !$0 { paymentError = nil } }
            )) {
                Button("OK") {}
            } message: {
                Text(paymentError ?? "Something went wrong.")
            }
        }
    }

    private func processPayment(nonce: String) async {
        showCardEntry = false
        do {
            _ = try await paymentRepo.processPayment(
                nonce: nonce,
                amount: appointment.service.price,
                customerId: "customer-1",
                appointmentId: appointment.id.uuidString
            )
            paymentSuccess = true
        } catch {
            paymentError = error.localizedDescription
        }
    }

    private func statusColor(for status: AppointmentStatus) -> Color {
        switch status {
        case .requested: return .orange
        case .confirmed: return .blue
        case .completed: return .green
        case .cancelled: return .red
        }
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
