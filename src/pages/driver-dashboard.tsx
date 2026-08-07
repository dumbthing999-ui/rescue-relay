import Link from "next/link";
import { Timer, MapPin, CheckCircle2 } from "lucide-react";

export default function DriverDashboard() {
  const trip = { id: "trip-1", route: "Downtown → Westside", status: "active", pickup: "2:30 PM", delivery: "3:15 PM" };
  const claims = [
    { id: "c1", item: "Fresh produce box", pickup: "1400 Oak Ave", delivery: "2200 Pine Rd", checkedIn: false },
    { id: "c2", item: "Frozen meals (5)", pickup: "800 Elm St", delivery: "900 Cedar Ln", checkedIn: true },
  ];
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <section>
        <h1 className="text-2xl font-bold">Driver Dashboard</h1>
        <div className="mt-3 p-4 rounded-xl border bg-white shadow-sm">
          <h2 className="font-semibold">Active Trip</h2>
          <p className="text-sm text-gray-600">{trip.route}</p>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>Pickup: {trip.pickup}</span>
            <span>Delivery: {trip.delivery}</span>
          </div>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Claim List</h2>
        <div className="mt-3 grid gap-3">
          {claims.map((c) => (
            <article key={c.id} className="p-4 rounded-xl border bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{c.item}</h3>
                {c.checkedIn ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Checked in</span>
                ) : (
                  <Link href={`/dashboard/driver/check-in/${c.id}`} className="text-xs font-semibold text-blue-600 hover:underline">Check in</Link>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500"><MapPin className="inline h-3 w-3" /> {c.pickup} → {c.delivery}</p>
            </article>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Check-in Links</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {claims.map((c) => (
            <Link key={c.id} href={`/check-in/${c.id}`} className="px-3 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">Check-in {c.id}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}
