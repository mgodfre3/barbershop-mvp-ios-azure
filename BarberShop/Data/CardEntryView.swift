import SwiftUI

/// Card entry view — uses test nonce for simulator/development.
/// On real device builds, re-add SquareInAppPaymentsSDK and use the
/// real SQIPCardEntryViewController instead.
struct CardEntryView: View {
    let amount: Decimal
    let onNonceReceived: (String) -> Void
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 48))
                .foregroundStyle(.brown)
            Text("Card Entry")
                .font(.title2.bold())
            Text(String(format: "Amount: $%.2f", NSDecimalNumber(decimal: amount).doubleValue))
                .foregroundStyle(.secondary)
            Text("On a real device, a secure Square card form appears here. Tap below to use a sandbox test nonce.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
            Button("Use Test Card") {
                onNonceReceived("cnon:card-nonce-ok")
            }
            .buttonStyle(.borderedProminent)
            .tint(.brown)
            Button("Cancel", role: .cancel) {
                onCancel()
            }
        }
        .padding()
    }
}
