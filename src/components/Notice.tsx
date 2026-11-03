export default function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (error) return <p className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-900">{error}</p>;
  if (ok) return <p className="mb-4 rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900">{ok}</p>;
  return null;
}
