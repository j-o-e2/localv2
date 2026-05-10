"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import Avatar from "@/components/Avatar"
import { TierBadge } from "@/components/TierBadge"

interface Service {
  id: string
  name: string
  category: string
  price: number
  duration: string
  description: string
  provider_id: string
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

interface UserProfile {
  id: string
  full_name: string
  email?: string
  phone?: string
  location?: string
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewBookingContent />
    </Suspense>
  )
}

function NewBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const serviceId = searchParams.get('service_id')
  const providerId = searchParams.get('provider_id')
  
  const [service, setService] = useState<Service | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [bookingDate, setBookingDate] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      if (!serviceId) {
        setError("No service selected")
        setLoading(false)
        return
      }

      try {
        // Fetch service details
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
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
          .eq('id', serviceId)
          .single()

        if (serviceError) {
          console.error('Error fetching service:', serviceError)
          setError('Failed to load service')
        } else {
          setService(serviceData)
        }

        // Fetch current user profile
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          // User not authenticated, redirect to login
          router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      } catch (err) {
        console.error('Error:', err)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [serviceId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!serviceId || !profile?.id) {
      setError('Missing required information')
      return
    }

    if (!bookingDate) {
      setError('Please select a booking date')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token || (session as any)?.accessToken || null

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          service_id: serviceId,
          client_id: profile.id,
          booking_date: bookingDate,
          notes: notes || null,
          status: 'pending'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to create booking')
        return
      }

      // Success - redirect to dashboard
      alert('Booking created successfully!')
      router.push('/dashboard/client')
    } catch (err: any) {
      console.error('Booking error:', err)
      setError(err.message || 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (error && !service) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-red-500">{error}</p>
        <Link href="/services" className="mt-4 text-blue-500 hover:underline">
          Back to Services
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          href="/dashboard/client" 
          className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-6"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-slate-800 mb-6">Book Service</h1>

        {/* Service Summary Card */}
        {service && (
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl mb-6">
            <div className="flex items-start gap-4">
              <Avatar 
                src={service.profiles?.avatar_url || null} 
                alt={service.profiles?.full_name || 'Provider'} 
                size={64} 
                tier={service.profiles?.profile_tier as any} 
                showBadge={true} 
              />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800">{service.name}</h2>
                <p className="text-slate-600">by {service.profiles?.full_name}</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-lg font-semibold text-indigo-600">
                    KES {service.price?.toLocaleString()}
                  </span>
                  <span className="text-slate-500">• {service.duration}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Booking Form */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Booking Date *
              </label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or details for the service..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-4">
              <Link 
                href="/services"
                className="flex-1 px-4 py-3 text-center border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </Link>
              <button 
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-3 text-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
              >
                {submitting ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}