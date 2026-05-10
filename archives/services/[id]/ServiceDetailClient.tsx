"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import Avatar from "@/components/Avatar"
import { TierBadge } from "@/components/TierBadge"
import WorkImageGallery from "@/components/WorkImageGallery"

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
  profiles: {
    id: string
    full_name: string
    avatar_url: string | null
    location: string
    profile_tier?: string
    phone?: string
    email?: string
  }
}

export default function ServiceDetailClient({ serviceId }: { serviceId: string }) {
  const router = useRouter()

  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchService = async () => {
      if (!serviceId) {
        setError("Service not found")
        setLoading(false)
        return
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("services")
          .select(`
            *,
            profiles:provider_id (
              id,
              full_name,
              avatar_url,
              location,
              profile_tier,
              phone,
              email
            )
          `)
          .eq("id", serviceId)
          .single()

        if (fetchError) {
          console.error("Error fetching service:", fetchError)
          setError("Failed to load service")
        } else {
          setService(data)
        }
      } catch (err) {
        console.error("Error:", err)
        setError("Failed to load service")
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [serviceId])

  const handleBookService = () => {
    if (!service) return
    router.push(`/bookings/new?service_id=${service.id}&provider_id=${service.provider_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading service...</p>
      </div>
    )
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-red-500">{error || "Service not found"}</p>
        <Link href="/services" className="mt-4 text-blue-500 hover:underline">
          Back to Services
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/services" className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-6">
          ← Back to Services
        </Link>

        <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
          <div className="flex items-start gap-4 mb-6">
            <Avatar
              src={service.profiles?.avatar_url || null}
              alt={service.profiles?.full_name || "Provider"}
              size={80}
              tier={service.profiles?.profile_tier as any}
              showBadge={true}
            />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{service.name}</h1>
              <p className="text-slate-600">by {service.profiles?.full_name}</p>
              {service.category && (
                <span className="inline-block mt-2 px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
                  {service.category}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Price</p>
              <p className="text-2xl font-bold text-slate-800">KES {service.price?.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Duration</p>
              <p className="text-2xl font-bold text-slate-800">{service.duration}</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Description</h2>
            <p className="text-slate-600">{service.description || "No description provided."}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Service Provider</h2>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <Avatar
                src={service.profiles?.avatar_url || null}
                alt={service.profiles?.full_name || "Provider"}
                size={48}
                tier={service.profiles?.profile_tier as any}
                showBadge={false}
              />
              <div>
                <p className="font-medium text-slate-800">{service.profiles?.full_name}</p>
                <p className="text-sm text-slate-500">{service.profiles?.location || "Location not specified"}</p>
              </div>
              <Link
                href={`/profile/${service.profiles?.id}`}
                className="ml-auto px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>

          {service.provider_id && (
            <div className="mb-6">
              <WorkImageGallery userId={service.provider_id} showTitle="Provider's Work" />
            </div>
          )}

          <div className="flex gap-4">
            <Link
              href="/services"
              className="flex-1 px-4 py-3 text-center border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Browse More
            </Link>
            <button
              onClick={handleBookService}
              className="flex-1 px-4 py-3 text-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Book This Service
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
