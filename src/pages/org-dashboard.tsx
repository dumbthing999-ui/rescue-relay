// Minimal organization dashboard — org info header, active donations/claims list, brief stats
export default function OrgDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Rescue Relay — Organization</h1>
      <p className="text-sm text-gray-600">Active donations & claims overview.</p>
      <div className="mt-4">
        <h2 className="font-semibold">Active Donations / Claims</h2>
        <ul className="mt-2 text-sm">
          <li>Donation #1 — Claimed (In transit)</li>
          <li>Donation #2 — Available</li>
        </ul>
      </div>
      <p className="mt-4 text-xs text-gray-500">Stats: 2 active, 1 delivered this month.</p>
    </div>
  );
}
