export default function ImpactPage() {
  const entries = [
    { date: "2026-08-05", lbs: 340, meals: 120, rescues: 3 },
    { date: "2026-08-04", lbs: 280, meals: 95, rescues: 2 },
    { date: "2026-08-03", lbs: 410, meals: 140, rescues: 4 },
  ];
  const totals = entries.reduce(
    (s, e) => ({ lbs: s.lbs + e.lbs, meals: s.meals + e.meals, rescues: s.rescues + e.rescues }),
    { lbs: 0, meals: 0, rescues: 0 }
  );
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Impact</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-100 rounded"><p className="text-xs">Total meals</p><p className="text-xl font-bold">{totals.meals}</p></div>
        <div className="p-4 bg-gray-100 rounded"><p className="text-xs">Total lbs</p><p className="text-xl font-bold">{totals.lbs}</p></div>
        <div className="p-4 bg-gray-100 rounded"><p className="text-xs">Total rescues</p><p className="text-xl font-bold">{totals.rescues}</p></div>
      </div>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="border-b"><th className="text-left py-2">Date</th><th className="text-left py-2">Lbs</th><th className="text-left py-2">Meals</th><th className="text-left py-2">Rescues</th></tr></thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.date} className="border-b"><td className="py-2">{e.date}</td><td className="py-2">{e.lbs}</td><td className="py-2">{e.meals}</td><td className="py-2">{e.rescues}</td></tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
