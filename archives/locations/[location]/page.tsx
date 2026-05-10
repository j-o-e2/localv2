import type { Metadata } from "next"
import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { CheckCircle2, MapPin, Briefcase, Users, ArrowRight } from "lucide-react"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const capitalize = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const buildLocationName = (slug: string) => {
  return capitalize(slug.replace(/-/g, " ").trim())
}

export function generateMetadata({ params }: { params: { location: string } }): Metadata {
  const locationName = buildLocationName(params.location)
  const title = `Find Jobs and Services in ${locationName} | LocalFix Kenya`
  const description = `Looking for jobs in ${locationName} or need a trusted service provider? LocalFix Kenya connects you with professionals in ${locationName} quickly and easily.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/locations/${params.location}`,
      siteName: "LocalFix Kenya",
    },
    twitter: {
      title,
      description,
    },
  }
}

export default async function LocationPage({ params }: { params: { location: string } }) {
  const locationName = buildLocationName(params.location)

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  let jobs: Array<{ id: string; title: string; category: string; budget: number; location: string }> = []
  let services: Array<{ id: string; name: string; category: string; price: number; duration: string; location?: string }> = []

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("id,title,category,budget,location")
        .eq("status", "open")
        .ilike("location", `${locationName}%`)
        .limit(6)

      const { data: serviceData } = await supabase
        .from("services")
        .select("id,name,category,price,duration,location")
        .ilike("location", `${locationName}%`)
        .limit(6)

      jobs = Array.isArray(jobData) ? jobData : []
      services = Array.isArray(serviceData) ? serviceData : []
    } catch (error) {
      console.error("Location page fetch error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-[#1e3a8a] font-semibold">{locationName}</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-slate-950 mb-4">Find Jobs and Services in {locationName}</h1>
          <p className="text-lg text-slate-600 max-w-3xl mb-6">
            Looking for jobs in {locationName} or need a trusted service provider? LocalFix Kenya connects you with professionals in {locationName} quickly and easily.
          </p>
          <p className="text-slate-600 max-w-3xl">
            Whether you need a plumber, electrician, cleaner, or delivery service, you can find reliable experts near you.
          </p>
        </div>

        {/* Benefits Sections */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* For Job Seekers */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1e3a8a]">
                <Briefcase className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">For Job Seekers</h2>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Find jobs in {locationName} instantly</span> - Browse available opportunities near you</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Apply for local gigs</span> - Submit applications and get hired faster</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Get hired faster</span> - Connect directly with employers in {locationName}</p>
              </div>
            </div>
            <Link href={`/jobs?location=${encodeURIComponent(locationName)}`}>
              <button className="mt-6 w-full bg-[#1e3a8a] text-white font-semibold py-3 rounded-2xl hover:bg-[#162e5c] transition-colors flex items-center justify-center gap-2">
                Browse Jobs in {locationName}
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>

          {/* For Clients */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316]">
                <Users className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950">For Clients</h2>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Post jobs in {locationName}</span> - Create a listing and reach local professionals</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Get matched with skilled workers</span> - Receive quotes from verified professionals</p>
              </div>
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <p className="text-slate-600"><span className="font-semibold text-slate-900">Compare and choose the best</span> - Select based on price, reviews, and availability</p>
              </div>
            </div>
            <Link href={`/signup?role=client`}>
              <button className="mt-6 w-full bg-[#f97316] text-white font-semibold py-3 rounded-2xl hover:bg-[#ea580c] transition-colors flex items-center justify-center gap-2">
                Post a Job
                <ArrowRight className="h-4 w-4" />

        {/* CTA Section */}
        <div className="rounded-3xl bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Start now and connect with trusted professionals in {locationName}</h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Join thousands of satisfied customers and skilled professionals who trust LocalFix Kenya for fast, reliable service bookings in {locationName}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/signup?role=worker`}>
              <button className="bg-[#f97316] text-white px-8 py-3 rounded-2xl font-semibold hover:bg-[#ea580c] transition-colors">
                Sign Up as Professional
              </button>
            </Link>
            <Link href={`/signup?role=client`}>
              <button className="border-2 border-white text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-colors">
                Post a Job
              </button>
            </Link>
          </div>
        </div>
              </button>
            </Link>
          </div>
        </div>

        {/* Popular Searches */}
        <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950 mb-6">Popular searches in {locationName}</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link href={`/jobs?location=${encodeURIComponent(locationName)}`} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff] transition-colors">
              <MapPin className="h-5 w-5 text-[#1e3a8a] flex-shrink-0" />
              <span className="font-medium text-slate-900">Jobs in {locationName}</span>
            </Link>
            <Link href={`/services?category=plumbing&location=${encodeURIComponent(locationName)}`} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff] transition-colors">
              <MapPin className="h-5 w-5 text-[#1e3a8a] flex-shrink-0" />
              <span className="font-medium text-slate-900">Plumbing services {locationName}</span>
            </Link>
            <Link href={`/services?category=cleaning&location=${encodeURIComponent(locationName)}`} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff] transition-colors">
              <MapPin className="h-5 w-5 text-[#1e3a8a] flex-shrink-0" />
              <span className="font-medium text-slate-900">Cleaning services {locationName}</span>
            </Link>
            <Link href={`/services?category=electrical&location=${encodeURIComponent(locationName)}`} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff] transition-colors">
              <MapPin className="h-5 w-5 text-[#1e3a8a] flex-shrink-0" />
              <span className="font-medium text-slate-900">Electricians in {locationName}</span>
            </Link>
          </div>
        </div>

        {/* Jobs & Services Grid */}
        <div className="grid gap-8 lg:grid-cols-2 mb-12">
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Open jobs near {locationName}</h2>
                  <p className="text-sm text-slate-500">Latest local job opportunities in your area.</p>
                </div>
                <Link href={`/jobs?location=${encodeURIComponent(locationName)}`} className="text-sm text-[#1e3a8a] hover:underline">
                  View all
                </Link>
              </div>
              {jobs.length === 0 ? (
                <p className="text-sm text-slate-500">No open jobs found for {locationName} right now.</p>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="rounded-3xl border border-slate-100 p-4 hover:bg-slate-50">
                      <h3 className="font-semibold text-slate-900">{job.title}</h3>
                      <p className="text-sm text-slate-500">{job.category} • {job.location}</p>
                      <p className="mt-2 text-sm text-slate-700">KES {job.budget.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Services near {locationName}</h2>
                  <p className="text-sm text-slate-500">Top service providers offering local work.</p>
                </div>
                <Link href={`/services?location=${encodeURIComponent(locationName)}`} className="text-sm text-[#1e3a8a] hover:underline">
                  View all
                </Link>
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500">No local services found for {locationName} yet.</p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <div key={service.id} className="rounded-3xl border border-slate-100 p-4 hover:bg-slate-50">
                      <h3 className="font-semibold text-slate-900">{service.name}</h3>
                      <p className="text-sm text-slate-500">{service.category} • {service.location || locationName}</p>
                      <p className="mt-2 text-sm text-slate-700">KES {service.price.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">How it works</h2>
            <div className="mt-4 space-y-4 text-slate-600">
              <p>LocalFix Kenya connects clients and workers in your city. Search jobs, browse services, and book trusted help nearby.</p>
              <p>Use the links above to view full location-specific results for jobs and services.</p>
              <p className="text-sm text-slate-500">Tip: refine searches using job category, service type, or your exact neighborhood.</p>
            </div>
          </section>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Start now and connect with trusted professionals in {locationName}</h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Join thousands of satisfied customers and skilled professionals who trust LocalFix Kenya for fast, reliable service bookings in {locationName}.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/signup?role=worker`}>
              <button className="bg-[#f97316] text-white px-8 py-3 rounded-2xl font-semibold hover:bg-[#ea580c] transition-colors">
                Sign Up as Professional
              </button>
            </Link>
            <Link href={`/signup?role=client`}>
              <button className="border-2 border-white text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-colors">
                Post a Job
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
