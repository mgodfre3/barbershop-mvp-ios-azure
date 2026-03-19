import Foundation

struct APIServicesRepository: ServicesRepository {
    let client: APIClient

    func fetchServices() async throws -> [ServiceMenuItem] {
        let dtos: [ServiceDTO] = try await client.get("/services")
        return dtos.map { $0.toDomain() }
    }
}
