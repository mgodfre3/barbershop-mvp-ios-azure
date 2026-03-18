import Foundation

protocol PaymentRepository {
    func processPayment(nonce: String, amount: Decimal, customerId: String, appointmentId: String) async throws -> PaymentResult
}

struct PaymentResult: Codable {
    let transactionId: String
    let status: String
    let amount: Decimal
    let timestamp: Date
    let squarePaymentId: String?
}

// Mock implementation for MVP
struct MockPaymentRepository: PaymentRepository {
    func processPayment(nonce: String, amount: Decimal, customerId: String, appointmentId: String) async throws -> PaymentResult {
        // Simulate processing delay
        try await Task.sleep(nanoseconds: 1_000_000_000)
        
        return PaymentResult(
            transactionId: UUID().uuidString,
            status: "completed",
            amount: amount,
            timestamp: Date(),
            squarePaymentId: "sq_pay_\(UUID().uuidString.prefix(16))"
        )
    }
}
