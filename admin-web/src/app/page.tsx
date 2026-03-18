const sections = [
  { title: "Appointments", description: "View, approve, and manage appointment queue" },
  { title: "Customers (CRM)", description: "Search, notes, tags, and retention status" },
  { title: "Rewards", description: "Adjust points and review ledger history" },
  { title: "Schedules", description: "Configure barber working hours and time off" },
  { title: "Square Sync", description: "Webhook status and order reconciliation" },
];

export default function HomePage() {
  return (
    <main style={{ padding: "32px 24px", maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 8px 0" }}>BarberShop Admin Portal (MVP Scaffold)</h1>
      <p style={{ margin: "0 0 24px 0", color: "#666" }}>
        Connect to API at <code>{process.env.NEXT_PUBLIC_API_BASE_URL}</code>
      </p>

      <section>
        <h2>Available Sections</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {sections.map((section) => (
            <li
              key={section.title}
              style={{
                padding: "16px",
                marginBottom: "12px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              }}
            >
              <h3 style={{ margin: "0 0 4px 0" }}>{section.title}</h3>
              <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
                {section.description}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: "32px", padding: "16px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
        <h3>Next Steps</h3>
        <ul>
          <li>Wire auth flow with Microsoft Entra External ID</li>
          <li>Fetch appointments, customers, and rewards from backend API</li>
          <li>Build CRM notes and schedule editor components</li>
          <li>Deploy to Azure Static Web Apps</li>
        </ul>
      </section>
    </main>
  );
}
