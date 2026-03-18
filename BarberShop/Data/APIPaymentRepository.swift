import Foundation

struct APIPaymentRepository: PaymentRepository {
    let client: APIClient

    func processPayment(nonce: String, amount: Decimal, customerId: String, appointmentId: String) async throws -> PaymentResult {
        let payload = PaymentProcessPayload(
            nonce: nonce,
            amount: NSDecimalNumber(decimal: amount).doubleValue,
            currency: "USD",
            appointmentId: appointmentId,
            customerId: customerId
        )

        let response: PaymentProcessResponse = try await client.post("/payments/process", body: payload)

        return PaymentResult(
            transactionId: response.squarePaymentId ?? UUID().uuidString,
            status: response.status ?? "unknown",
            amount: amount,
            timestamp: Date(),
            squarePaymentId: response.squarePaymentId
        )
    }
}

private struct PaymentProcessPayload: Encodable {
    let nonce: String
    let amount: Double
    let currency: String
    let appointmentId: String?
    let customerId: String?
}

private struct PaymentProcessResponse: Decodable {
    let ok: Bool
    let squarePaymentId: String?
    let status: String?
    let amount: Double?
}
