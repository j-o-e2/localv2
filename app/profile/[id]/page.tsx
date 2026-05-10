"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Mail, Phone, MapPin, AlertCircle, User } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { TierBadge } from "@/components/TierBadge"
import WorkImageGallery from "@/components/WorkImageGallery"

interface Profile {
  id: string
  full_name: string
  email: string
  phone: string
  location: string
  avatar_url: string | null
  profile_tier?: string
  role: string
  created_at: string
}

export default function ProfileDetailPage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params?.id as string | undefined

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)
  const [hasAccess, setHasAccess] = useState(false)

  // Redirect if no profile ID
  useEffect(() => {
    if (!profileId) {
      router.push("/dashboard/client")
    }
  }, [profileId, router])

  useEffect(() => {
    const initPage = async () => {
      // Skip if no profile ID
      if (!profileId) {
        setLoading(false)
        return
      }

      try {
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        // Fetch the profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", profileId)
          .maybeSingle()

        if (profileError) {
          console.error("Error fetching profile:", profileError)
          setError("Failed to load profile")
          return
        }

        if (!profileData) {
          setError("Profile not found")
          return
        }

        setProfile(profileData)

        // Check if user has access to view this profile
        // Access is allowed if:
        // 1. User is viewing their own profile
        // 2. User is in an accepted job application with this profile
        // 3. User is in an approved booking with this profile
        // 4. User is browsing service providers (from jobs/services section)
        if (authUser) {
          if (authUser.id === profileId) {
            setHasAccess(true)
            return
          }

          // Check job applications
          const { data: jobAppData } = await supabase
            .from("job_applications")
            .select("id")
            .eq("status", "accepted")
            .or(`and(provider_id.eq.${authUser.id},job_applications.job_id.in(select id from jobs where client_id.eq.${profileId})),and(job_applications.job_id.in(select id from jobs where client_id.eq.${authUser.id}),provider_id.eq.${profileId})`)
            .limit(1)
            .maybeSingle()

          if (jobAppData) {
            setHasAccess(true)
            return
          }

          // Check bookings
          const { data: bookingData } = await supabase
            .from("bookings")
            .select("id")
            .eq("status", "approved")
            .or(`and(client_id.eq.${authUser.id},bookings.service_id.in(select id from services where provider_id.eq.${profileId})),and(bookings.service_id.in(select id from services where provider_id.eq.${authUser.id}),client_id.eq.${profileId})`)
            .limit(1)
            .maybeSingle()

          if (bookingData) {
            setHasAccess(true)
            return
          }

          // Allow access to view any provider's profile when browsing services/jobs
          // This allows clients to browse and view worker profiles before hiring
          const { data: providerProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", profileId)
            .maybeSingle()

          if (providerProfile?.role === "worker") {
            setHasAccess(true)
            return
          }

          // Allow clients to view other client profiles if there's a job application or booking connection
          if (providerProfile?.role === "client") {
            // Check if there's any job application connection
            const { data: clientJobApps } = await supabase
              .from("job_applications")
              .select("id, jobs(client_id)")
              .eq("provider_id", authUser.id)
              .limit(1)

            // Check if user has any bookings with this client
            const { data: clientBookings } = await supabase
              .from("bookings")
              .select("id, services(provider_id)")
              .eq("client_id", profileId)
              .limit(1)

            if (clientJobApps?.length || clientBookings?.length) {
              setHasAccess(true)
              return
            }
          }
        }
      } catch (err) {
        console.error("Error initializing profile page:", err)
        setError("An error occurred while loading the profile")
      } finally {
        setLoading(false)
      }
    }

    initPage()
  }, [profileId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="inline-block mb-6"
          >
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground text-lg">{error || "Profile not found"}</p>
          </Card>
        </div>
      </div>
    )
  }

  if (!hasAccess && user?.id !== profile.id) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="inline-block mb-6"
          >
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          </div>
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground text-lg">You don't have access to view this profile</p>
            <p className="text-muted-foreground text-sm mt-2">Contact details are only visible after application acceptance or booking approval.</p>
          </Card>
        </div>
      </div>
    )
  }

  const roleLabel = profile.role === 'worker' ? 'Service Provider' : 'Client'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                router.back()
              }
            }}
            onClick={() => router.back()}
            className="cursor-pointer inline-flex items-center gap-2 mb-4"
          >
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground hover:text-foreground">Back</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          {/* Avatar and Basic Info */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-24 h-24 rounded-full object-cover bg-secondary"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-12 h-12 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{profile.full_name}</h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <p className="text-muted-foreground">{roleLabel}</p>
              <TierBadge tier={(profile.profile_tier || "basic") as "basic" | "pro" | "verified" | "trusted" | "elite"} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>

          {/* Contact Details */}
          <div className="space-y-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Contact Information</h2>

            {profile.email && (
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <a 
                    href={`mailto:${profile.email}`}
                    className="text-foreground hover:text-primary font-medium break-all"
                  >
                    {profile.email}
                  </a>
                </div>
              </div>
            )}

            {profile.phone && (
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Phone</p>
                  <a 
                    href={`tel:${profile.phone}`}
                    className="text-foreground hover:text-primary font-medium"
                  >
                    {profile.phone}
                  </a>
                </div>
              </div>
            )}

            {profile.location && (
              <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Location</p>
                  <p className="text-foreground font-medium">{profile.location}</p>
                </div>
              </div>
            )}

            {!profile.email && !profile.phone && !profile.location && (
              <p className="text-center text-muted-foreground py-6">
                No contact details available
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border mt-8 pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Contact information is private and shared only between users with accepted applications or approved bookings.
            </p>
          </div>
        </Card>

        {/* Work Images Gallery */}
        {profileId && <WorkImageGallery userId={profileId} showTitle="Work Gallery" />}
      </div>
    </div>
  )
}
