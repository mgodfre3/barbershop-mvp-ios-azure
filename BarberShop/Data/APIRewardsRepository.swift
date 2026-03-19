import Foundation

struct APIRewardsRepository: RewardsRepository {
    let client: APIClient

    func fetchRewardSummary() async throws -> RewardSummary {
        let dto: RewardSummaryDTO = try await client.get("/rewards/summary")
        return dto.toDomain()
    }
}
