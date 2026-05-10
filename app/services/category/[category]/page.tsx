import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { CheckCircle2, MapPin, Star, ArrowRight, Briefcase, Shield } from "lucide-react"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const capitalize = (value: string) =>
  value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")

const categoryInfo: Record<string, { name: string; title: string; description: string; services: string[]; locations: string[] }> = {
  plumbing: {
    name: "Plumbing",
    title: "Hire Professional Plumbers Near You",
    description: "Need plumbing services? LocalFix Kenya helps you find experienced plumbers across Kenya.",
    services: [
      "Pipe repairs",
      "Water leaks",
      "Bathroom installations",
      "Emergency plumbing",
      "Water tank installation",
      "Tap replacement",
      "Drain cleaning",
    ],
    locations: ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Meru", "Nakuru"],
  },
  electrical: {
    name: "Electrical",
    title: "Hire Professional Electricians Near You",
    description: "Need electrical services? LocalFix Kenya helps you find experienced electricians across Kenya.",
    services: [
      "Electrical repairs",
      "Wiring installation",
      "Light fixture installation",
      "Emergency electrical services",
      "Switch installation",
      "Appliance repairs",
      "Circuit breaker maintenance",
    ],
    locations: ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Meru", "Nakuru"],
  },
  cleaning: {
    name: "Cleaning",
    title: "Hire Professional Cleaners Near You",
    description: "Need cleaning services? LocalFix Kenya helps you find trusted cleaners across Kenya.",
    services: [
      "House cleaning",
      "Office cleaning",
      "Deep cleaning",
      "Window cleaning",
      "Carpet cleaning",
      "Post-construction cleaning",
      "Eco-friendly cleaning",
    ],
    locations: ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Meru", "Nakuru"],
  },
  masonry: {
    name: "Masonry",
    title: "Hire Professional Masons Near You",
    description: "Need masonry services? LocalFix Kenya helps you find experienced masons across Kenya.",
    services: [
      "Brick laying",
      "Wall construction",
      "Concrete work",
      "Masonry repair",
      "Stone work",
      "Foundation work",
      "Wall finishing",
    ],
    locations: ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Meru", "Nakuru"],
  },
  maid: {
    name: "Maid/Domestic Help",
    title: "Hire Trusted Maid & Domestic Help Near You",
    description: "Need domestic help (maid/mamafua)? LocalFix Kenya helps you find reliable professionals across Kenya.",
    services: [
      "House cleaning",
      "Laundry services",
      "Cooking assistance",
      "Childcare",
      "Pet care",
      "Ironing services",
      "General housekeeping",
    ],
    locations: ["Nairobi", "Mombasa", "Kisumu", "Eldoret", "Meru", "Nakuru"],
  },
}

export default async function CategoryPage({ params }: { params: { category: string } }) {
  const category = params.category.toLowerCase()
  const info = categoryInfo[category] || categoryInfo.plumbing
  const categoryName = info.name

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  let services: Array<{ id: string; name: string; price: number; provider_id: string; profiles?: { full_name: string } }> = []

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const { data: serviceData } = await supabase
        .from("services")
        .select("id,name,price,provider_id,profiles:provider_id (full_name)")
        .ilike("category", `${categoryName}%`)
        .limit(6)

      services = Array.isArray(serviceData) ? serviceData : []
    } catch (error) {
      console.error("Category page fetch error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <p className="text-sm uppercase tracking-[0.3em] text-[#1e3a8a] font-semibold">{categoryName} Services</p>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold text-slate-950 mb-4">{info.title}</h1>
          <p className="text-lg text-slate-600 max-w-3xl mb-6">{info.description}</p>
        </div>

        {/* Services We Offer */}
        <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950 mb-6">Our platform connects you with professionals who can handle:</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {info.services.map((service, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3">
                <CheckCircle2 className="h-5 w-5 text-[#16a34a] mt-1 flex-shrink-0" />
                <span className="text-slate-700">{service}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-slate-600">
            Post your {categoryName.toLowerCase()} job and get matched with qualified professionals near your location.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1e3a8a] mx-auto mb-4">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-950 mb-2">Verified Professionals</h3>
            <p className="text-sm text-slate-600">All professionals are background checked and verified for quality service.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316] mx-auto mb-4">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-950 mb-2">Fast Response</h3>
            <p className="text-sm text-slate-600">Get matched with available professionals quickly and receive responses within hours.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0fdf4] text-[#16a34a] mx-auto mb-4">
              <Star className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-950 mb-2">Affordable Pricing</h3>
            <p className="text-sm text-slate-600">Compare quotes from multiple professionals and choose the best price for your needs.</p>
          </div>
        </div>

        {/* Why Choose LocalFix Kenya */}
        <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950 mb-6">Why choose LocalFix Kenya?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-950 mb-2">Verified Professionals</h3>
                <p className="text-slate-600">Every {categoryName.toLowerCase()} professional is thoroughly vetted and background checked.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-950 mb-2">Fast Response</h3>
                <p className="text-slate-600">Post your job and get responses from professionals within minutes or hours.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-950 mb-2">Affordable Pricing</h3>
                <p className="text-slate-600">Compare quotes and choose the best professional within your budget.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-slate-950 mb-2">Secure Payments</h3>
                <p className="text-slate-600">Pay safely through our secure platform with guaranteed transactions.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Professionals */}
        {services.length > 0 && (
          <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-950">Featured {categoryName} Professionals</h2>
              <Link href={`/services?category=${category}`} className="text-[#1e3a8a] font-medium hover:underline flex items-center gap-2">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <div key={service.id} className="rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition-shadow">
                  <h3 className="font-semibold text-slate-950">{service.name}</h3>
                  <p className="text-sm text-slate-600 mb-2">by {service.profiles?.full_name || "Professional"}</p>
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-lg font-semibold text-slate-950 mb-3">KES {service.price.toLocaleString()}</p>
                  <button className="w-full bg-[#1e3a8a] text-white py-2 rounded-xl font-semibold hover:bg-[#162e5c]">
                    Book Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        <div className="mb-12 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950 mb-6">Find {categoryName} Services in Your City</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {info.locations.map((location) => (
              <Link
                key={location}
                href={`/locations/${location.toLowerCase()}?category=${category}`}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:border-[#1e3a8a] hover:bg-[#eff6ff] transition-colors"
              >
                <MapPin className="h-5 w-5 text-[#1e3a8a] flex-shrink-0" />
                <span className="font-medium text-slate-900">{categoryName} in {location}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-3xl bg-gradient-to-r from-[#1e3a8a] to-[#0f172a] text-white p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Find a {categoryName} Professional Today</h2>
          <p className="text-slate-200 mb-6 max-w-2xl mx-auto">
            Post your {categoryName.toLowerCase()} job now and connect with verified, trusted professionals ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/signup?role=client&category=${category}`}>
              <button className="bg-[#f97316] text-white px-8 py-3 rounded-2xl font-semibold hover:bg-[#ea580c] transition-colors">
                Post a {categoryName} Job
              </button>
            </Link>
            <Link href={`/signup?role=worker&category=${category}`}>
              <button className="border-2 border-white text-white px-8 py-3 rounded-2xl font-semibold hover:bg-white/10 transition-colors">
                Offer {categoryName} Services
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
