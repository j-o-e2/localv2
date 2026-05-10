"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabaseClient"
import {
  MapPin,
  Search,
  Star,
  CheckCircle2,
  ShieldCheck,
  Sparkles as SparkleIcon,
  Bolt,
  Wrench,
  Zap,
  Sparkles,
  Hammer,
  Paintbrush,
  Settings,
  Hand,
  ArrowRight,
  Users,
  Briefcase,
  ClipboardCheck,
  Truck,
  MoreHorizontal,
} from "lucide-react"

interface Service {
  id: string
  name: string
  category: string
  price: number
  duration: string
  description: string
  provider_id: string
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

interface Job {
  id: string
  title: string
  description: string
  category: string
  budget: number
  location: string
  duration: string
  status: string
  created_at: string
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  profiles?: {
    full_name: string
  }
}

export default function Home() {
  const [services, setServices] = useState<Service[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [searchResults, setSearchResults] = useState<{services: Service[], jobs: Job[]}>({services: [], jobs: []})
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    setHasSearched(true)
    
    try {
      // Search services
      const servicesRes = await supabase
        .from('services')
        .select('*, profiles:provider_id (full_name, avatar_url)')
        .ilike('name', `%${searchQuery}%`)
        .limit(10)
      
      // Search jobs
      const jobsRes = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .ilike('title', `%${searchQuery}%`)
        .limit(10)
      
      setSearchResults({
        services: servicesRes.data || [],
        jobs: jobsRes.data || []
      })
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults({services: [], jobs: []})
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check authentication
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        if (authUser) {
          const { data: userProfile } = await supabase
            .from("profiles")
            .select("id, role, full_name, avatar_url")
            .eq("id", authUser.id)
            .single()
          setProfile(userProfile || null)
        }

        // Fetch from our API that uses service role to bypass RLS
        const response = await fetch('/api/home-data')
        const data = await response.json()
        
        console.log('Home API response status:', response.status)
        console.log('Home API data:', data)
        
        if (!response.ok || data.error) {
          console.error('Home data fetch error:', data.error || 'Unknown error')
        } else {
          setServices(data.services || [])
          setJobs(data.jobs || [])
          setReviews(data.reviews || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const categories = [
    { icon: Wrench, name: "Plumbing", count: "245 Pros" },
    { icon: Zap, name: "Electrical", count: "189 Pros" },
    { icon: Sparkles, name: "Cleaning", count: "156 Pros" },
    { icon: Hammer, name: "Carpentry", count: "132 Pros" },
    { icon: Paintbrush, name: "Painting", count: "98 Pros" },
    { icon: Settings, name: "Appliance Repair", count: "87 Pros" },
    { icon: Hand, name: "Handyman", count: "200+ Pros" },
  ]

  const featuredCategories = [
    { name: "Plumbing", description: "Fix leaks, install fittings", image: "/plumber-fixing-pipe.png", href: "/services?category=plumbing" },
    { name: "Electrical", description: "Wiring, repair and installation", image: "/electrician-working.png", href: "/services?category=electrical" },
    { name: "Cleaning", description: "Home, office and deep cleaning", image: "/cleaning-supplies.png", href: "/services?category=cleaning" },
  ]

  const steps = [
    {
      step: "1",
      title: "Find Services",
      description: "Search for the service you need in your area.",
      icon: Search,
    },
    {
      step: "2",
      title: "Choose a Pro",
      description: "Browse verified profiles, reviews, and ratings.",
      icon: Users,
    },
    {
      step: "3",
      title: "Book & Confirm",
      description: "Book your preferred pro and confirm details.",
      icon: CheckCircle2,
    },
    {
      step: "4",
      title: "Get it Done",
      description: "Sit back while the job is completed.",
      icon: Briefcase,
    },
  ]

  const stats = [
    { value: "10,000+", label: "Happy Customers" },
    { value: "2,500+", label: "Verified Professionals" },
    { value: "15,000+", label: "Jobs Completed" },
    { value: "4.8/5", label: "Average Rating" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-[#f97316] flex items-center justify-center text-white font-bold">L</div>
                <div>
                  <p className="font-bold text-lg text-slate-900">LocalFixKenya</p>
                  <p className="text-xs text-slate-500">Find. Book. Relax.</p>
                </div>
              </div>
              <div className="hidden xl:flex items-center gap-6 text-sm font-medium text-slate-700">
                <Link href="/" className="text-[#1e3a8a]">Home</Link>
                <Link href="/services" className="hover:text-[#1e3a8a]">Browse Services</Link>
                <Link href="#how-it-works" className="hover:text-[#1e3a8a]">How It Works</Link>
                <Link href="/jobs" className="hover:text-[#1e3a8a]">Browse Jobs</Link>
                <Link href="/signup" className="hover:text-[#1e3a8a]">Become a Pro</Link>
                <Link href="/contact" className="hover:text-[#1e3a8a]">Contact</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-[#1e3a8a]" />
                Nairobi, Kenya
              </div>
              <Link href="/login">
                <Button variant="outline" className="h-11 px-4 text-slate-700 border-slate-300 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button className="h-11 bg-[#f97316] hover:bg-[#ea580c] text-white">Sign Up</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pb-24">
        <section className="relative overflow-hidden bg-white">
          <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-r from-[#eff6ff] via-white to-[#fff7ed] opacity-90 pointer-events-none" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="grid grid-cols-1 gap-12 items-center lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  <span className="text-[#f97316]">#1</span> Local Service Marketplace in Kenya
                </div>
                <div className="max-w-2xl">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-950">
                    Find Jobs & Trusted Service Providers Near You
                  </h1>
                  <p className="mt-4 text-[#f97316] text-2xl font-semibold">Fast. Reliable. Affordable.</p>
                  <p className="mt-6 text-lg leading-8 text-slate-600">
                    LocalFix Kenya is a platform that connects people across Kenya with trusted local professionals. Whether you are looking for a job or need a service, we make it easy to connect.
                  </p>

                  <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
                    <Link href="/services" className="w-full sm:w-auto">
                      <Button className="w-full sm:w-auto bg-[#f97316] hover:bg-[#ea580c] text-white">Browse Services</Button>
                    </Link>
                    <Link href="/jobs" className="w-full sm:w-auto">
                      <Button variant="outline" className="w-full sm:w-auto border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">Browse Jobs</Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr_0.8fr]">
                    <label className="relative block">
                      <Search className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input 
                        placeholder="What service do you need?" 
                        className="pl-11 h-14 rounded-2xl border-slate-200 bg-white"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          if (e.target.value.trim()) {
                            handleSearch()
                          }
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </label>
                    <label className="relative block">
                      <MapPin className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400" />
                      <Input 
                        placeholder="Your location" 
                        className="pl-11 h-14 rounded-2xl border-slate-200 bg-white"
                        value={searchLocation}
                        onChange={(e) => setSearchLocation(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      />
                    </label>
                    <Button 
                      className="h-14 rounded-2xl bg-[#f97316] text-white text-base font-semibold hover:bg-[#ea580c] w-full sm:w-auto"
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      {isSearching ? 'Searching...' : 'Find Services'}
                    </Button>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {categories.slice(0, 5).map((category) => (
                      <button
                        key={category.name}
                        type="button"
                        onClick={() => {
                          setSearchQuery(category.name)
                          handleSearch()
                        }}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-[#f97316] hover:text-[#1e3a8a]"
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>

                  {/* Instant Search Results Dropdown */}
                  {hasSearched && searchResults.services.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <div className="grid gap-4 lg:grid-cols-3">
                        {searchResults.services.slice(0, 3).map((service) => (
                          <Link key={service.id} href="/signup?role=client" className="group">
                            <Card className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-lg transition-all hover:border-[#f97316]">
                              <p className="text-xs text-[#f97316] font-medium">{service.category}</p>
                              <h4 className="font-semibold text-slate-900 mt-1 text-sm group-hover:text-[#f97316]">{service.name}</h4>
                              <p className="text-xs text-slate-500 mt-1">by {service.profiles?.full_name || 'Unknown'}</p>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                <span className="font-semibold text-slate-900 text-sm">KSh {service.price}+</span>
                                <ArrowRight className="h-4 w-4 text-[#f97316] group-hover:translate-x-1 transition-transform" />
                              </div>
                            </Card>
                          </Link>
                        ))}
                      </div>
                      {searchResults.services.length > 3 && (
                        <div className="mt-4 text-center">
                          <Button variant="outline" onClick={() => window.scrollTo({ top: document.getElementById('search-results')?.offsetTop || 0, behavior: 'smooth' })} className="border-[#f97316] text-[#f97316] hover:bg-[#fff7ed]">
                            View all {searchResults.services.length} results
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <ShieldCheck className="h-5 w-5 text-[#1e3a8a] mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Verified Professionals</p>
                        <p className="text-sm text-slate-500">Background checked</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <Bolt className="h-5 w-5 text-[#f97316] mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Fast & Reliable</p>
                        <p className="text-sm text-slate-500">Quick response</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
                      <SparkleIcon className="h-5 w-5 text-[#2563eb] mt-1" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Affordable Prices</p>
                        <p className="text-sm text-slate-500">Best value for money</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="rounded-[2rem] bg-[#f7fbff] p-6 sm:p-8 shadow-2xl ring-1 ring-slate-200">
                  <Image src="/localworker.png" alt="Smiling African technician" width={640} height={640} className="w-full rounded-[1.75rem] object-cover" />
                </div>

                <div className="absolute top-6 right-6 hidden lg:grid gap-4">
                  <div className="rounded-3xl bg-white p-4 shadow-lg border border-slate-200 w-48">
                    <div className="flex items-center gap-3">
                      <Wrench className="h-5 w-5 text-[#1e3a8a]" />
                      <div>
                        <p className="font-semibold text-slate-900">Plumbing</p>
                        <p className="text-sm text-slate-500">Starting from KSh 500</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-white p-4 shadow-lg border border-slate-200 w-48">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-[#f97316]" />
                      <div>
                        <p className="font-semibold text-slate-900">Electrical</p>
                        <p className="text-sm text-slate-500">Starting from KSh 600</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute hidden lg:block bottom-28 left-8 rounded-3xl bg-white p-4 shadow-lg border border-slate-200 w-48">
                  <div className="flex items-center gap-3">
                    <SparkleIcon className="h-5 w-5 text-[#2563eb]" />
                    <div>
                      <p className="font-semibold text-slate-900">Cleaning</p>
                      <p className="text-sm text-slate-500">Starting from KSh 400</p>
                    </div>
                  </div>
                </div>

                <div className="absolute hidden lg:block bottom-10 right-10 rounded-3xl bg-white p-4 shadow-lg border border-slate-200 w-48">
                  <div className="flex items-center gap-3">
                    <Hammer className="h-5 w-5 text-[#1e3a8a]" />
                    <div>
                      <p className="font-semibold text-slate-900">Carpentry</p>
                      <p className="text-sm text-slate-500">Starting from KSh 700</p>
                    </div>
                  </div>
                </div>

                <div className="absolute hidden lg:flex -bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-[#1e3a8a] px-6 py-3 shadow-xl border border-white">
                  <div className="flex items-center gap-3 text-white">
                    <p className="font-semibold">Trusted by 10,000+ Kenyans</p>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 text-yellow-300" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-end md:justify-between mb-6">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[#1e3a8a]">Browse by category</p>
                <h2 className="mt-3 text-3xl md:text-4xl font-bold text-slate-950">Quick service categories</h2>
              </div>
              <p className="text-sm text-slate-600 max-w-xl">Tap a category to see trusted pros near you and book faster.</p>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[900px] sm:min-w-0">
                {featuredCategories.map((item) => (
                  <Link key={item.name} href={item.href} className="min-w-[280px] shrink-0 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-lg">
                    <div className="relative h-40 overflow-hidden rounded-3xl bg-slate-100">
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#1e3a8a]">{item.name}</p>
                      <h3 className="mt-2 text-xl font-semibold text-slate-950">{item.name}</h3>
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Platform Benefits Section - SEO Content */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-950 mb-4">Why Choose LocalFix Kenya?</h2>
              <p className="text-lg text-slate-600">
                We've made it simple for people to find work or hire trusted professionals across Kenya. Here's what makes us different:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950 mb-2">Post jobs and get matched with skilled workers</h3>
                  <p className="text-slate-600">Create a job listing and receive quotes from qualified professionals in your area within minutes.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950 mb-2">Find work near your location</h3>
                  <p className="text-slate-600">Browse local job opportunities in your area and apply directly to employers looking for your skills.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950 mb-2">Hire trusted professionals across Kenya</h3>
                  <p className="text-slate-600">All our professionals are verified and background checked to ensure quality and reliability.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle2 className="h-6 w-6 text-[#16a34a] mt-1" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950 mb-2">Fast, secure, and reliable connections</h3>
                  <p className="text-slate-600">Our platform ensures secure transactions and fast communication between clients and service providers.</p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-600 mb-4">Start today by posting a job or browsing available opportunities near you.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup?role=client">
                  <Button className="h-12 px-8 bg-[#f97316] text-white font-semibold hover:bg-[#ea580c] rounded-2xl">
                    Post a Job
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="h-12 px-8 border-[#1e3a8a] text-[#1e3a8a] font-semibold rounded-2xl hover:bg-[#eff6ff]">
                    Browse Jobs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Popular Services Section - SEO Focused */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-950 mb-4">Popular Services</h2>
              <p className="text-lg text-slate-600">Find trusted professionals for your needs across Kenya:</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Wrench className="h-8 w-8 text-[#1e3a8a] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">Plumbing services in Kenya</h3>
                <p className="text-slate-600 text-sm mb-4">Find certified plumbers for repairs, installations, and maintenance.</p>
                <Link href="/services?category=plumbing" className="text-[#f97316] font-medium text-sm hover:underline">Browse plumbers →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Zap className="h-8 w-8 text-[#f97316] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">Electrical repair services</h3>
                <p className="text-slate-600 text-sm mb-4">Professional electricians for wiring, repairs, and electrical installations.</p>
                <Link href="/services?category=electrical" className="text-[#f97316] font-medium text-sm hover:underline">Browse electricians →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Sparkles className="h-8 w-8 text-[#2563eb] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">Cleaning services</h3>
                <p className="text-slate-600 text-sm mb-4">Professional cleaners for homes, offices, and specialized cleaning needs.</p>
                <Link href="/services?category=cleaning" className="text-[#f97316] font-medium text-sm hover:underline">Browse cleaners →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Truck className="h-8 w-8 text-[#16a34a] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">Moving and delivery services</h3>
                <p className="text-slate-600 text-sm mb-4">Reliable movers and delivery professionals for your relocation needs.</p>
                <Link href="/services?category=moving" className="text-[#f97316] font-medium text-sm hover:underline">Browse movers →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Hand className="h-8 w-8 text-[#ea580c] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">Handyman services</h3>
                <p className="text-slate-600 text-sm mb-4">General maintenance and repair services for all your home needs.</p>
                <Link href="/services?category=handyman" className="text-[#f97316] font-medium text-sm hover:underline">Browse handymen →</Link>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-lg transition-shadow">
                <Settings className="h-8 w-8 text-[#1e3a8a] mb-3" />
                <h3 className="font-semibold text-slate-950 mb-2">And many more services</h3>
                <p className="text-slate-600 text-sm mb-4">Browse our complete directory of services available across Kenya.</p>
                <Link href="/services" className="text-[#f97316] font-medium text-sm hover:underline">View all services →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Search Results Section */}
        {hasSearched && (
          <section id="search-results" className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Search Results</p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-950">
                    Results for "{searchQuery}"
                  </h2>
                  <p className="mt-2 text-slate-600">
                    Found {searchResults.services.length} services and {searchResults.jobs.length} jobs
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setHasSearched(false)
                    setSearchQuery("")
                    setSearchLocation("")
                    setSearchResults({services: [], jobs: []})
                  }}
                >
                  Clear Search
                </Button>
              </div>

              {/* Services Results */}
              {searchResults.services.length > 0 ? (
                <div className="mb-12">
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Services</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.services.map((service) => (
                      <Card key={service.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-xs text-[#f97316] font-medium">{service.category}</p>
                        <h4 className="font-semibold text-slate-900 mt-1">{service.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">by {service.profiles?.full_name || 'Unknown'}</p>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                          <span className="font-semibold text-slate-900">KSh {service.price}+</span>
                          <Link href="/signup?role=client">
                            <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white">Book</Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
                  <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No services found</h3>
                  <p className="text-slate-600 mt-2">
                    We couldn't find any services matching "{searchQuery}". 
                    Try a different search term or{" "}
                    <Link href="/signup?role=worker" className="text-[#1e3a8a] font-medium">
                      become a provider
                    </Link>{" "}
                    to offer your services.
                  </p>
                </div>
              )}

              {/* Jobs Results */}
              {searchResults.jobs.length > 0 ? (
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-4">Jobs</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.jobs.map((job) => (
                      <Card key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium px-2 py-1 bg-[#eff6ff] text-[#1e3a8a] rounded-full">{job.category}</span>
                        </div>
                        <h4 className="font-semibold text-slate-900">{job.title}</h4>
                        <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                          <span className="font-semibold text-[#f97316]">KSh {job.budget?.toLocaleString()}</span>
                          <Button asChild size="sm" variant="outline" className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">
                            <Link href="/signup?role=worker">Apply</Link>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center">
                  <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900">No jobs found</h3>
                  <p className="text-slate-600 mt-2">
                    We couldn't find any jobs matching "{searchQuery}". 
                    Be the first to{" "}
                    <Link href="/signup?role=client" className="text-[#1e3a8a] font-medium">
                      post a job
                    </Link>!
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="bg-[#f97316] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-[2rem] bg-white p-8 lg:p-10 shadow-2xl">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] items-center">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-[#1e3a8a]">Have a job to get done?</p>
                  <h2 className="mt-4 text-3xl md:text-4xl font-bold text-slate-950">Post your job for free and receive quotes from verified professionals.</h2>
                  <p className="mt-4 text-slate-600 text-base max-w-2xl">
                    Share the details, let local pros send offers, and choose the best price, schedule and review score for your job.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Link href="/signup?role=client">
                    <Button className="h-14 rounded-2xl bg-[#f97316] text-white px-8 text-base font-semibold hover:bg-[#ea580c]">
                      Post a Job
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="overflow-x-auto pb-4">
                <div className="mt-8 flex gap-4 min-w-[900px] lg:grid lg:grid-cols-3 lg:gap-4 lg:min-w-0">
                  <div className="min-w-[260px] shrink-0 flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#2563eb]">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">It's Free</p>
                      <p className="text-sm text-slate-500">Post your job at no cost.</p>
                    </div>
                  </div>
                  <div className="min-w-[260px] shrink-0 flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#f97316]">
                      <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Multiple Quotes</p>
                      <p className="text-sm text-slate-500">Compare and choose the best pro.</p>
                    </div>
                  </div>
                  <div className="min-w-[260px] shrink-0 flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eefdf6] text-[#16a34a]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Secure & Reliable</p>
                      <p className="text-sm text-slate-500">Only verified professionals.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Popular Categories</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">Find local pros by category</h2>
              </div>
              <Link href="/services" className="inline-flex items-center gap-2 text-[#1e3a8a] font-medium hover:text-[#0f172a]">
                View all categories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-4">
              {categories.map((category) => (
                <Card key={category.name} className="flex flex-col items-start gap-3 rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm hover:shadow-lg transition-shadow">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1e3a8a]">
                    <category.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    <p className="text-sm text-slate-500">{category.count}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm uppercase tracking-[0.3em] text-[#1e3a8a]">How LocalFixKenya Works</p>
              <h2 className="mt-4 text-3xl md:text-4xl font-bold text-slate-950">4 simple steps to hire local help</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-4">
              {steps.map((step) => (
                <div key={step.title} className="min-w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm lg:min-w-auto">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#1e3a8a] shadow-sm">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Step {step.step}</p>
                  <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-sm text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-[#0f172a] text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 xl:grid-cols-[1.3fr_0.9fr] items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80">
                  <Star className="h-4 w-4 text-yellow-300" />
                  Trusted by thousands across Kenya
                </div>
                <h2 className="text-4xl font-bold tracking-tight">Quality service from trusted local professionals</h2>
                <p className="max-w-2xl text-slate-200">
                  Join a growing community of satisfied customers and skilled professionals who rely on LocalFixKenya for fast, reliable home service bookings.
                </p>
                <Button className="h-14 rounded-2xl bg-[#f97316] px-8 text-white font-semibold hover:bg-[#ea580c]">Get Started</Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-3xl border border-white/10 bg-white p-6">
                    <p className="text-4xl font-bold text-[#f97316]">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-300">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Services Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Featured Services</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">Popular services near you</h2>
              </div>
              <Link href="/services" className="inline-flex items-center gap-2 text-[#1e3a8a] font-medium hover:text-[#0f172a]">
                View all services
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-x-auto pb-4 lg:grid lg:grid-cols-4 gap-6">
              <div className="flex gap-4 min-w-[900px] lg:min-w-0 lg:flex-none">
                {loading ? (
                  <p className="text-slate-500 py-8">Loading services...</p>
                ) : services.length > 0 ? (
                  services.map((service) => (
                    <Card key={service.id} className="min-w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow lg:min-w-0">
                      <div className="h-32 bg-gradient-to-br from-[#eff6ff] to-[#fff7ed] rounded-2xl mb-4 flex items-center justify-center">
                        <Wrench className="h-10 w-10 text-[#1e3a8a]" />
                      </div>
                      <p className="text-xs text-[#f97316] font-medium">{service.category}</p>
                      <h3 className="font-semibold text-slate-900 mt-1">{service.name}</h3>
                      <p className="text-sm text-slate-500 mt-1">by {service.profiles?.full_name || 'Unknown'}</p>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="font-semibold text-slate-900">KSh {service.price}+</span>
                        {user && profile?.role === 'client' ? (
                          <Button asChild size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white">
                            <Link href={`/services/${service.id}`}>Book</Link>
                          </Button>
                        ) : user && profile?.role === 'worker' ? (
                          <span className="text-sm text-slate-500">Offer your services</span>
                        ) : (
                          <Link href="/signup?role=client">
                            <Button size="sm" className="bg-[#f97316] hover:bg-[#ea580c] text-white">Book</Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-500 py-8">No services available yet. Be the first to add one!</p>
                )}
              </div>
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-slate-600">
                Sign up to book services or{" "}
                <Link href="/signup" className="text-[#1e3a8a] font-medium hover:underline">
                  become a worker
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Recent Jobs Section */}
        <section className="py-16 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Latest Jobs</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">Jobs posted by clients</h2>
              </div>
              <Link href="/jobs" className="inline-flex items-center gap-2 text-[#1e3a8a] font-medium hover:text-[#0f172a]">
                View all jobs
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-x-auto pb-4 lg:grid lg:grid-cols-3 gap-6">
              <div className="flex gap-4 min-w-[900px] lg:min-w-0 lg:flex-none">
                {loading ? (
                  <p className="text-slate-500 py-8">Loading jobs...</p>
                ) : jobs.length > 0 ? (
                  jobs.map((job) => (
                    <Card key={job.id} className="min-w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow lg:min-w-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-medium px-2 py-1 bg-[#eff6ff] text-[#1e3a8a] rounded-full">{job.category}</span>
                      </div>
                      <h3 className="font-semibold text-slate-900">{job.title}</h3>
                      <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                        <span className="font-semibold text-[#f97316]">KSh {job.budget?.toLocaleString()}</span>
                        {user && profile?.role === 'worker' ? (
                          <Button asChild size="sm" className="bg-[#1e3a8a] hover:bg-[#0f172a] text-white">
                            <Link href={`/jobs/${job.id}`}>Apply</Link>
                          </Button>
                        ) : user && profile?.role === 'client' ? (
                          <span className="text-sm text-slate-500">Post your own jobs</span>
                        ) : (
                          <Button asChild size="sm" variant="outline" className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">
                            <Link href="/signup?role=worker">Apply</Link>
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-500 py-8">No jobs available yet. Post a job to get started!</p>
                )}
              </div>
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-slate-600">
                Sign up to post jobs or{" "}
                <Link href="/signup" className="text-[#1e3a8a] font-medium hover:underline">
                  apply for jobs
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Customer Reviews Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#1e3a8a]">Testimonials</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">What our customers say</h2>
            </div>

            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[900px] lg:grid lg:grid-cols-3 lg:min-w-0">
                {loading ? (
                  <p className="text-slate-500 py-8">Loading reviews...</p>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Card key={review.id} className="min-w-[260px] shrink-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:min-w-0">
                      <div className="flex gap-1 mb-4">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        ))}
                      </div>
                      <p className="text-slate-600 mb-4">"{review.comment || 'Great service!'}"</p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#eff6ff] flex items-center justify-center text-[#1e3a8a] font-semibold">
                          {review.profiles?.full_name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{review.profiles?.full_name || 'Professional'}</p>
                          <p className="text-sm text-slate-500">Service Provider</p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-500 py-8">No reviews yet. Be the first to leave a review!</p>
                )}
              </div>
            </div>

            <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center">
              <p className="text-slate-600">
                Sign up to leave a review after your service is complete
              </p>
            </div>
          </div>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-40 sm:hidden">
          <div className="mx-4 mb-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Need a local pro now?</p>
                <p className="text-xs text-slate-500">Search services and book in minutes.</p>
              </div>
              <Link href="/signup?role=client">
                <Button className="rounded-full bg-[#f97316] px-4 py-3 text-sm font-semibold text-white">Book Now</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white text-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr]">
              <div>
                <Link href="/" className="inline-flex items-center gap-2 text-xl font-semibold text-slate-900">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f97316] text-white">L</span>
                  LocalFix Kenya
                </Link>
                <p className="mt-4 max-w-lg text-sm text-slate-600">
                  Connect with trusted local professionals for jobs and services across Kenya. Easy booking, fast support, and secure payments.
                </p>
                <div className="mt-6 space-y-2 text-sm text-slate-600">
                  <p>Phone: 0741597088</p>
                  <p>Email: noreply@localfixkenya.com</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">Explore</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link href="/" className="hover:text-[#1e3a8a]">Home</Link>
                  </li>
                  <li>
                    <Link href="/services" className="hover:text-[#1e3a8a]">Browse Services</Link>
                  </li>
                  <li>
                    <Link href="/jobs" className="hover:text-[#1e3a8a]">Post a Job</Link>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-[#1e3a8a]">Dashboard</Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-900">Support</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li>
                    <Link href="/contact" className="hover:text-[#1e3a8a]">Contact</Link>
                  </li>
                  <li>
                    <Link href="/login" className="hover:text-[#1e3a8a]">Login</Link>
                  </li>
                  <li>
                    <Link href="/signup" className="hover:text-[#1e3a8a]">Sign Up</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-500">
              © {new Date().getFullYear()} LocalFix Kenya. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
