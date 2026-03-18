import Foundation

@MainActor
final class MVPScreenViewModel: ObservableObject {
    @Published private(set) var data: MVPData = .preview
    @Published var isLoading = false

    private let servicesRepository: ServicesRepository
    private let barbersRepository: BarbersRepository
    private let appointmentsRepository: AppointmentsRepository
    private let rewardsRepository: RewardsRepository

    init(
        servicesRepository: ServicesRepository = MockServicesRepository(),
        barbersRepository: BarbersRepository = MockBarbersRepository(),
        appointmentsRepository: AppointmentsRepository = MockAppointmentsRepository(),
        rewardsRepository: RewardsRepository = MockRewardsRepository()
    ) {
        self.servicesRepository = servicesRepository
        self.barbersRepository = barbersRepository
        self.appointmentsRepository = appointmentsRepository
        self.rewardsRepository = rewardsRepository
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let services = servicesRepository.fetchServices()
            async let barbers = barbersRepository.fetchBarbers()
            async let appointments = appointmentsRepository.fetchAppointments()
            async let rewards = rewardsRepository.fetchRewardSummary()

            let (svc, bar, apt, rwd) = await (services, barbers, appointments, rewards)

            data = MVPData(
                customer: MVPData.preview.customer,
                barbers: bar,
                services: svc,
                upcomingAppointments: apt,
                rewards: rwd
            )
        } catch {
            // Keep preview fallback in MVP scaffold; add logging in production
        }
    }

    func requestAppointment(barberId: UUID, serviceId: UUID, startDate: Date, notes: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let appointment = try await appointmentsRepository.requestAppointment(
                customerId: data.customer.id,
                barberId: barberId,
                serviceId: serviceId,
                startDate: startDate,
                notes: notes
            )
            data.upcomingAppointments.append(appointment)
        } catch {
            // Handle error in production
        }
    }
}
