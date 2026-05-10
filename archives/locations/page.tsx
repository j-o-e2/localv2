import type { Metadata } from "next"
import Link from "next/link"

const LOCATION_PAGES = [
  { slug: "nairobi", name: "Nairobi" },
  { slug: "mombasa", name: "Mombasa" },
  { slug: "kisumu", name: "Kisumu" },
  { slug: "eldoret", name: "Eldoret" },
  { slug: "nyeri", name: "Nyeri" },
]

export const metadata: Metadata = {
  title: "LocalFix Kenya Locations | Local home services in Nairobi, Mombasa and more",
  description:
    "Browse LocalFix Kenya location hubs for trusted local services, jobs, and providers across major Kenyan cities.",
  openGraph: {
    title: "LocalFix Kenya Locations",
    description:
      "Browse location-specific local services and jobs in Nairobi, Mombasa, Kisumu, Eldoret and more.",
  },
}

export default function LocationsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-[#1e3a8a]">LocalFix Kenya</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">Location-based services in Kenya</h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Find trusted local professionals, jobs, and service providers in your city. Select one of the top locations below to view nearby jobs and services.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATION_PAGES.map((location) => (
            <Link
              key={location.slug}
              href={`/locations/${location.slug}`}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <h2 className="text-xl font-semibold text-slate-900">{location.name}</h2>
              <p className="mt-2 text-slate-500">Explore jobs and services in {location.name}.</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
