import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BarberShop Admin",
  description: "Admin portal for appointments, CRM, rewards, and barber schedules.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
