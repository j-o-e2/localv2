"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Star, MapPin, Search, Wrench } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { TierBadge } from "@/components/TierBadge"

interface Service {
  id: string
  name: string
  category: string
  price: number
  duration: string
  description: string
  provider_id: string
  created_at: string
  image?: string
  rating?: number
  reviews?: number
  location?: string
  profiles: {
    full_name: string
    avatar_url: string | null
    location: string
    profile_tier?: string
  }
}

export default function ServicesPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")
  const [categories, setCategories] = useState<string[]>(["All"])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const handleBookService = async (serviceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // User is logged in, go directly to booking
        router.push(`/bookings/new?service_id=${serviceId}`)
      } else {
        // User not logged in, go to signup
        router.push(`/signup?role=client`)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      // Fallback to signup if auth check fails
      router.push(`/signup?role=client`)
    }
  }

  useEffect(() => {
    const fetchServices = async () => {
      try {
        let data: any = null
        let error: any = null
        try {
          const res = await supabase
            .from('services')
            .select(`
              *,
              profiles:provider_id (
                full_name,
                avatar_url,
                location,
                profile_tier
              )
            `)
            .order('created_at', { ascending: false })
          data = res.data
          error = res.error
        } catch (e: any) {
          error = e
        }

        if (error) {
          console.warn('[services] initial read failed, retrying:', error)
          await new Promise((r) => setTimeout(r, 300))
          try {
            const res2 = await supabase
              .from('services')
              .select(`*, profiles:provider_id ( full_name, avatar_url, location, profile_tier )`)
              .order('created_at', { ascending: false })
            data = res2.data
            error = res2.error
          } catch (e: any) {
            error = e
          }
        }

        if (error) {
          // fallback to server-side endpoint
          try {
            const resp = await fetch('/api/debug/services', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              data = body?.data || []
            } else {
              console.error('[services] server-side services fallback failed:', await resp.text())
              data = []
            }
          } catch (e) {
            console.error('[services] all fallbacks failed:', e)
            data = []
          }
        }

        setServices(data || [])

        // Try to infer service status from recent bookings in case the
        // `services.status` column is stale or wasn't updated (helps when
        // RLS or transient errors prevented persisting status changes).
        try {
          const svcIds = (data || []).map((s: any) => s.id).filter(Boolean)
          if (svcIds.length) {
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('service_id, status, booking_date')
              .in('service_id', svcIds)
              .order('booking_date', { ascending: false })

            const bookingsByService: Record<string, any[]> = {}
            ;(bookingsData || []).forEach((b: any) => {
              bookingsByService[b.service_id] = bookingsByService[b.service_id] || []
              bookingsByService[b.service_id].push(b)
            })

            const merged = (data || []).map((svc: any) => {
              const bs = bookingsByService[svc.id] || []
              if (!bs.length) return svc
              // If there's any approved booking that is not completed, consider service closed/booked
              const hasApproved = bs.some((b: any) => b.status === 'approved')
              const hasCompleted = bs.some((b: any) => b.status === 'completed')
              if (hasApproved && !hasCompleted) {
                return { ...svc, status: 'closed' }
              }
              // If most recent booking is completed, leave the service open
              if (bs[0] && bs[0].status === 'completed') {
                return { ...svc, status: 'open' }
              }
              return svc
            })

            setServices(merged)
          }
        } catch (e) {
          console.warn('[services] could not infer service status from bookings', e)
        }

        // Extract unique categories and add "All" at the beginning
        const uniqueCategories = Array.from(new Set((data || []).map((service: Service) => service.category)))
        setCategories(["All", ...uniqueCategories])
      } catch (err) {
        console.error('Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const locationParam = params.get("location") || ""
    if (locationParam.trim()) {
      setSearchLocation(locationParam.trim())
    }
  }, [])

  useEffect(() => {
    // Subscribe to real-time updates
    const servicesSubscription = supabase
      .channel('services-changes')
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'services'
        }, 
        async (payload) => {
          // Fetch the complete service data including profile information
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const { data: newService } = await supabase
              .from('services')
              .select(`
                *,
                profiles:provider_id (
                  full_name,
                  avatar_url,
                  location,
                  profile_tier
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (newService) {
              if (payload.eventType === 'INSERT') {
                setServices(current => [newService, ...current])
              } else {
                setServices(current => 
                  current.map(service => 
                    service.id === newService.id ? newService : service
                  )
                )
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setServices(current => 
              current.filter(service => service.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    // Also subscribe to profile updates so avatar/name changes reflect in listings
    const profilesSubscription = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        const updatedProfile = payload.new
        if (!updatedProfile) return
        setServices(current =>
          current.map(s =>
            s.provider_id === updatedProfile.id
              ? { ...s, profiles: { ...(s.profiles || {}), full_name: updatedProfile.full_name, avatar_url: updatedProfile.avatar_url, location: updatedProfile.location } }
              : s
          )
        )
      })
      .subscribe()

    return () => {
      servicesSubscription.unsubscribe()
      profilesSubscription.unsubscribe()
    }
  }, [])

  const filteredServices = services.filter((service: Service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase()) ||
      service.category.toLowerCase().includes(search.toLowerCase()) ||
      service.profiles.full_name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = !selectedCategory || selectedCategory === "All" || service.category === selectedCategory
    const matchesLocation =
      !searchLocation ||
      service.location?.toLowerCase().includes(searchLocation.toLowerCase()) ||
      service.profiles.location.toLowerCase().includes(searchLocation.toLowerCase())
    return matchesSearch && matchesCategory && matchesLocation
  })

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard/client" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Back to Dashboard
            </Link>
            <Link href="/dashboard/client" className="flex items-center gap-2 text-slate-900 hover:text-slate-700">
              <div className="w-8 h-8 bg-[#1e3a8a] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">L</span>
              </div>
              <span className="font-bold text-xl">LocalFix Kenya</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-6">Browse Services</h1>
          {searchLocation && (
            <p className="mb-3 text-sm text-slate-500">Showing services near <strong>{searchLocation}</strong>.</p>
          )}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Results */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {categories.map((category, index) => (
            <Button
              key={`${category}-${index}`}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className={selectedCategory === category ? "bg-[#1e3a8a]" : ""}
              style={selectedCategory !== category ? { borderColor: '#e2e8f0', color: '#475569' } : {}}
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading services...</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-slate-500">No services found matching your criteria.</p>
              </div>
            ) : (
              filteredServices.map((service) => (
                <Card key={service.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="h-32 bg-gradient-to-br from-[#eff6ff] to-[#fff7ed] rounded-2xl mb-4 flex items-center justify-center">
                    <Wrench className="h-10 w-10 text-[#1e3a8a]" />
                  </div>
                  <p className="text-xs text-[#f97316] font-medium">{service.category}</p>
                  <h3 className="font-semibold text-slate-900 mt-1">{service.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">by {service.profiles?.full_name || 'Unknown'}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    <span className="font-semibold text-slate-900">KSh {service.price}+</span>
                    <Button 
                      size="sm" 
                      className="bg-[#f97316] hover:bg-[#ea580c] text-white"
                      onClick={() => handleBookService(service.id)}
                    >
                      Book
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </section>

      <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center">
        <p className="text-slate-600">
          Sign up to book services or{" "}
          <Link href="/signup" className="text-[#1e3a8a] font-medium hover:underline">
            become a worker
          </Link>
        </p>
      </div>
    </div>
  )
}
