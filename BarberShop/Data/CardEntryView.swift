import SwiftUI
import SquareInAppPaymentsSDK

struct CardEntryView: View {
    let amount: Decimal
    let onNonceReceived: (String) -> Void
    let onCancel: () -> Void

    var body: some View {
        #if targetEnvironment(simulator)
        // Square SDK card entry is not supported on simulator
        VStack(spacing: 20) {
            Image(systemName: "creditcard.fill")
                .font(.system(size: 48))
                .foregroundStyle(.brown)
            Text("Card Entry")
                .font(.title2.bold())
            Text(String(format: "Amount: $%.2f", NSDecimalNumber(decimal: amount).doubleValue))
                .foregroundStyle(.secondary)
            Text("Square card entry is not available on the simulator. On a real device, a secure card form will appear here.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
            Button("Use Test Nonce") {
                onNonceReceived("cnon:card-nonce-ok")
            }
            .buttonStyle(.borderedProminent)
            .tint(.brown)
            Button("Cancel", role: .cancel) {
                onCancel()
            }
        }
        .padding()
        #else
        CardEntryControllerWrapper(amount: amount, onNonceReceived: onNonceReceived, onCancel: onCancel)
        #endif
    }
}

#if !targetEnvironment(simulator)
private struct CardEntryControllerWrapper: UIViewControllerRepresentable {
    let amount: Decimal
    let onNonceReceived: (String) -> Void
    let onCancel: () -> Void

    func makeUIViewController(context: Context) -> SQIPCardEntryViewController {
        let theme = SQIPTheme()
        theme.tintColor = .brown
        theme.saveButtonTitle = String(format: "Pay $%.2f", NSDecimalNumber(decimal: amount).doubleValue)

        let controller = SQIPCardEntryViewController(theme: theme)
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: SQIPCardEntryViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onNonceReceived: onNonceReceived, onCancel: onCancel)
    }

    class Coordinator: NSObject, SQIPCardEntryViewControllerDelegate {
        let onNonceReceived: (String) -> Void
        let onCancel: () -> Void

        init(onNonceReceived: @escaping (String) -> Void, onCancel: @escaping () -> Void) {
            self.onNonceReceived = onNonceReceived
            self.onCancel = onCancel
        }

        func cardEntryViewController(
            _ cardEntryViewController: SQIPCardEntryViewController,
            didObtain cardDetails: SQIPCardDetails,
            completionHandler: @escaping (Error?) -> Void
        ) {
            onNonceReceived(cardDetails.nonce)
            completionHandler(nil)
        }

        func cardEntryViewController(
            _ cardEntryViewController: SQIPCardEntryViewController,
            didCompleteWith status: SQIPCardEntryCompletionStatus
        ) {
            if status == .canceled {
                onCancel()
            }
        }
    }
}
#endif
