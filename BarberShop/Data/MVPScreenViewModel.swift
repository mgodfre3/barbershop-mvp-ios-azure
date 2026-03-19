import Combine
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
        servicesRepository: ServicesRepository? = nil,
        barbersRepository: BarbersRepository? = nil,
        appointmentsRepository: AppointmentsRepository? = nil,
        rewardsRepository: RewardsRepository? = nil
    ) {
        let client = APIClient()
        self.servicesRepository = servicesRepository ?? APIServicesRepository(client: client)
        self.barbersRepository = barbersRepository ?? APIBarbersRepository(client: client)
        self.appointmentsRepository = appointmentsRepository ?? APIAppointmentsRepository(client: client)
        self.rewardsRepository = rewardsRepository ?? APIRewardsRepository(client: client)
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let services = servicesRepository.fetchServices()
            async let barbers = barbersRepository.fetchBarbers()
            async let appointments = appointmentsRepository.fetchAppointments()
            async let rewards = rewardsRepository.fetchRewardSummary()

            let (svc, bar, apt, rwd) = try await (services, barbers, appointments, rewards)

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

    func requestAppointment(barberId: String, serviceId: String, startDate: Date, notes: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let appointment = try await appointmentsRepository.requestAppointment(
            customerId: data.customer.id.uuidString,
            barberId: barberId,
            serviceId: serviceId,
            startDate: startDate,
            notes: notes
        )
        data.upcomingAppointments.append(appointment)
    }
}
