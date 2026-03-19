import Foundation

struct APIBarbersRepository: BarbersRepository {
    let client: APIClient

    func fetchBarbers() async throws -> [Barber] {
        let dtos: [BarberDTO] = try await client.get("/barbers")
        return dtos.map { $0.toDomain() }
    }
}
