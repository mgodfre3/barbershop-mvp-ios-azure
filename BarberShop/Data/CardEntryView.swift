import SwiftUI
import SquareInAppPaymentsSDK

struct CardEntryView: UIViewControllerRepresentable {
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
