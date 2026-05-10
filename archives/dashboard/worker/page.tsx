"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import ReviewModal from "@/components/ui/review-modal"
import { Card } from "@/components/ui/card"
import { LogOut, MapPin, Bell, User, Plus, Pencil, Trash2, Calendar, Check, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import JobChat from "@/components/ui/job-chat"
import ConfirmModal from '@/components/ui/confirm-modal'
import EditProfileModal from "@/components/EditProfileModal"
import AttendanceModal from "@/components/ui/attendance-modal"
import { updateJobStatus } from '@/lib/job-utils'
import { canTransitionJobStatus, getJobStatusColor, type JobStatus } from '@/lib/job-types'
// Input component removed as "Available Jobs" feed is no longer shown here
import { TierBadge } from "@/components/TierBadge"
import WorkImageUploader from "@/components/WorkImageUploader"


interface Job {
  id: string
  title: string
  location: string
  budget: number
  duration: string
  category: string
  client_id?: string
  profiles?: {
    full_name: string
    avatar_url?: string | null
    profile_tier?: string
  }
  status: string  // Make status required
}

interface Application {
  id: string
  job_id: string
  status: string
  proposed_rate: number
  jobs?: Job
  client_contact_revealed?: boolean
}

interface Review {
  id: string
  rating: number
  comment: string
  created_at: string
  client_id?: string
  booking_id?: string
  job_id?: string
  profiles: {
    full_name: string
    avatar_url: string | null
  }
}

interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: string
  provider_id: string
  location?: string
  status?: string
}

interface Booking {
  id: string
  service_id: string
  booking_date: string
  status: string
  notes?: string
  client_id: string
  profiles: {
    full_name: string
    avatar_url: string | null
    email: string
    phone?: string
    location?: string
    profile_tier?: string
  }
  services: {
    name: string
    price: number
    duration: string
  }
}

export default function WorkerDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  // Removed available jobs state (feed removed from worker dashboard)
    // Removed available jobs list (worker no longer sees global available jobs here)
  const [job_applications, setJob_applications] = useState<Application[]>([])
  const [workerServices, setWorkerServices] = useState<Service[]>([])
  // Small "Find Jobs" feed for workers to discover and apply to recent open jobs
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceBookings, setServiceBookings] = useState<Booking[]>([])
  const [recentClientBookings, setRecentClientBookings] = useState<Booking[]>([])
  const [workerReviews, setWorkerReviews] = useState<Review[]>([])
  const [serviceBookingsLoading, setServiceBookingsLoading] = useState(() => new Set<string>())
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [reviewContext, setReviewContext] = useState<{
    type: 'booking' | 'job'
    id: string
    client_id?: string
  } | null>(null)
  const [openChatAppId, setOpenChatAppId] = useState<string | null>(null)
  const [openChatBookingId, setOpenChatBookingId] = useState<string | null>(null)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [notifications, setNotifications] = useState<any[]>([])
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [reviewedBookingIdsWorker, setReviewedBookingIdsWorker] = useState(() => new Set<string>())
  const [reviewedJobIdsWorker, setReviewedJobIdsWorker] = useState(() => new Set<string>())
  const [confirmAction, setConfirmAction] = useState<{
    jobId: string
    newStatus: JobStatus
    title?: string
    message?: string
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingApplicationIds, setDeletingApplicationIds] = useState<Set<string>>(() => new Set<string>())
  const [deletingServiceIds, setDeletingServiceIds] = useState<Set<string>>(() => new Set<string>())
  const [deletingBookingIdsWorker, setDeletingBookingIdsWorker] = useState<Set<string>>(() => new Set<string>())
  const [hidingJobIds, setHidingJobIds] = useState<Set<string>>(() => new Set<string>())
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [attendanceBookingId, setAttendanceBookingId] = useState<string | null>(null)
  const [savingAttendance, setSavingAttendance] = useState(false)

  const makePrintable = (err: any) => {
    if (!err) return 'Unknown error'
    if (typeof err === 'string') return err
    if (err?.message) return err.message
    try {
      const names = Object.getOwnPropertyNames(err)
      const data: Record<string, any> = {}
      names.forEach((n) => (data[n] = err[n]))
      return JSON.stringify(data)
    } catch {
      return String(err)
    }
  }

  const parseApiResponse = async (res: Response) => {
    const raw = await res.text()
    let data: any = null
    try {
      data = raw ? JSON.parse(raw) : null
    } catch {
      data = raw
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, data, raw }
  }

  const isArchivedValue = (value: any) => {
    return value === true || value === 'true' || value === 't' || value === '1'
  }

  // Helper: set service status locally and persist to DB (only for this provider)
  const setAndPersistServiceStatus = async (serviceId: string, newStatus: string) => {
    try {
      // Update local state first for responsive UI
      setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: newStatus } : s)));

      // Persist change to DB (RLS allows provider to update their own services)
      const { data: svcData, error: svcErr } = await supabase
        .from('services')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', serviceId)
        .select('*')
        .single();

      if (svcErr) {
        console.warn('[worker] Failed to persist service status change (client). Falling back to server endpoint', svcErr);
        // Try server-side fallback which uses the service-role key to bypass RLS
        try {
          const resp = await fetch('/api/services/set-status', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceId, status: newStatus }),
          })

          const text = await resp.text().catch(() => '')
          let body: any = null
          try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

          if (!resp.ok) {
            const raw = text || ''
            console.error('[worker] Server fallback failed to persist service status:', { status: resp.status, statusText: resp.statusText, body, raw })
            alert(`Failed to persist service status (server): ${resp.status} ${resp.statusText} - ${JSON.stringify(body) || raw}`)
            return null
          }

          const updatedService = body?.updated || null
          if (updatedService) {
            setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...updatedService } : s)));
            return updatedService
          }
          return null
        } catch (e) {
          console.warn('[worker] Error calling server fallback for service status:', e)
          return null
        }
      }

      // Reflect any DB-normalized fields back into state
      if (svcData) {
        setWorkerServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, ...svcData } : s)));
      }

      return svcData;
    } catch (e) {
      console.warn('[worker] Error persisting service status:', e);
      return null;
    }
  }
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get authenticated user
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
          router.push("/login")
          return
        }

        setUser(authUser)

        // Fetch user profile from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle()

        if (profileError) {
          // Avoid logging opaque empty objects directly. Create a printable representation.
          const printable = makePrintable(profileError)
          console.warn('[v0] Profile fetch issue:', printable)

          // Try server-side fallback which uses the service role key and validates session
          try {
            const resp = await fetch('/api/admin/profile', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              if (body?.data) {
                setProfile(body.data)
              } else {
                console.warn('[v0] server-side profile fallback returned no data')
              }
            } else {
              console.warn('[v0] server-side profile fallback failed:', await resp.text())
            }
          } catch (e) {
            console.warn('[v0] server-side profile fallback error:', makePrintable(e))
          }
        } else {
          setProfile(profileData || null)
        }

        // Fetch notifications for this user via API (bypasses RLS)
        try {
          const response = await fetch('/api/notifications')
          const data = await response.json()
          
          if (!response.ok) {
            console.warn('[worker] notifications API error:', data.error)
          } else {
            // Filter to only show notifications for this user
            const userNotifications = (data.notifications || []).filter(
              (n: any) => n.user_id === authUser.id
            )
            setNotifications(userNotifications)
            const unread = userNotifications.filter((n: any) => !n.is_read).length
            setUnreadNotificationCount(unread)
          }
        } catch (e) {
          console.warn('[worker] error fetching notifications:', e)
        }

        // Global "Available Jobs" feed removed from worker dashboard; we keep job_applications and bookings flows.

        // Fetch user's job_applications from job_applications table
        let applicationsData = null
        let applicationsError = null

        const applicationsResult = await supabase
          .from("job_applications")
          .select("*, jobs(*, profiles(full_name, avatar_url, profile_tier, email, phone, location))")
          .eq("provider_id", authUser.id)
          .neq("archived", true)
          .order("created_at", { ascending: false })

        applicationsData = applicationsResult.data
        applicationsError = applicationsResult.error

        if (applicationsError) {
          const errorMessage = String(applicationsError.message || applicationsError).toLowerCase()
          if (errorMessage.includes('column "archived" does not exist') || errorMessage.includes('invalid column reference') || errorMessage.includes('column archived does not exist')) {
            const fallbackResult = await supabase
              .from("job_applications")
              .select("*, jobs(*, profiles(full_name, avatar_url, profile_tier, email, phone, location))")
              .eq("provider_id", authUser.id)
              .order("created_at", { ascending: false })

            applicationsData = fallbackResult.data
            applicationsError = fallbackResult.error
          }
        }

        if (applicationsError) {
          console.warn('[worker] failed to fetch job applications:', makePrintable(applicationsError))
        }

        setJob_applications(applicationsData || [])

          // Fetch a small, recent list of open jobs for the worker dashboard (limit to 5)
          // LOCATION-BASED FILTERING: Only show jobs matching user's location
          try {
            const userLocation = profileData?.location
            
            // First, fetch hidden job IDs for this user
            const { data: hiddenJobs, error: hiddenError } = await supabase
              .from('user_hidden_jobs')
              .select('job_id')
              .eq('user_id', authUser.id)

            let hiddenJobIds: string[] = []
            if (!hiddenError && hiddenJobs) {
              hiddenJobIds = hiddenJobs.map(h => h.job_id)
            } else if (hiddenError) {
              console.warn('[worker] failed to fetch hidden jobs:', makePrintable(hiddenError))
            }
            
            let jobsQuery = supabase
              .from('jobs')
              .select('id, title, location, budget, duration, status, client_id, profiles(full_name, avatar_url, profile_tier)')
              .eq('status', 'open')
              .neq('archived', true)
              .neq('client_id', authUser.id)
              .order('created_at', { ascending: false })
            
            // Exclude hidden jobs
            if (hiddenJobIds.length > 0) {
              jobsQuery = jobsQuery.not('id', 'in', `(${hiddenJobIds.join(',')})`)
            }
            
            // If user has a location set, filter jobs by that location
            if (userLocation && userLocation.trim()) {
              jobsQuery = jobsQuery.ilike('location', `%${userLocation}%`)
            }
            
            const { data: jobsData, error: jobsError } = await jobsQuery.limit(5)

            if (!jobsError) {
              setAvailableJobs(jobsData || [])
            } else {
              console.warn('[worker] failed to fetch available jobs feed:', makePrintable(jobsError))
            }
          } catch (e) {
            console.warn('[worker] error fetching available jobs feed:', e)
          }

        // Fetch worker's services (include status & location) with retry and server fallback
        let servicesData: any = null
        let servicesError: any = null
        try {
          const res = await supabase
            .from('services')
            .select('*')
            .eq('provider_id', authUser.id)
            .neq('archived', true)
            .order('created_at', { ascending: false })
          servicesData = res.data
          servicesError = res.error
        } catch (e: any) {
          servicesError = e
        }

        if (servicesError) {
          console.warn('[worker] initial services read failed, retrying:', servicesError)
          await new Promise((r) => setTimeout(r, 300))
          try {
            const res2 = await supabase
              .from('services')
              .select('*')
              .eq('provider_id', authUser.id)
              .neq('archived', true)
              .order('created_at', { ascending: false })
            servicesData = res2.data
            servicesError = res2.error
          } catch (e: any) {
            servicesError = e
          }
        }

        if (servicesError) {
          // fallback to server-side debug endpoint and filter by provider id and archived status
          try {
            const resp = await fetch('/api/debug/services', { credentials: 'include' })
            if (resp.ok) {
              const body = await resp.json()
              const all = body?.data || []
              servicesData = (all || []).filter((s: any) => s.provider_id === authUser.id && !isArchivedValue(s.archived))
              
              // Filter out maid/cleaning services
              servicesData = (servicesData || []).filter((service: any) => {
                const name = service.name?.toLowerCase() || '';
                const description = service.description?.toLowerCase() || '';
                const combinedText = `${name} ${description}`;
                
                // Keywords to filter out
                const maidKeywords = ['maid', 'cleaning', 'cleaner', 'housekeeping', 'domestic', 'house cleaning', 'office cleaning'];
                
                return !maidKeywords.some(keyword => combinedText.includes(keyword));
              });
            } else {
              console.error('[worker] server-side services fallback failed:', await resp.text())
            }
          } catch (e) {
            console.error('[worker] services fetch failed (all fallbacks):', e)
          }
        }

        if (servicesData) {
          // Filter out maid/cleaning services
          const filteredServices = (servicesData || []).filter((service: any) => {
            const name = service.name?.toLowerCase() || '';
            const description = service.description?.toLowerCase() || '';
            const combinedText = `${name} ${description}`;
            
            // Keywords to filter out
            const maidKeywords = ['maid', 'cleaning', 'cleaner', 'housekeeping', 'domestic', 'house cleaning', 'office cleaning'];
            
            return !maidKeywords.some(keyword => combinedText.includes(keyword));
          });

          // Try to infer service status from recent bookings in case the
          // `services.status` column is stale or wasn't updated (helps when
          // RLS or transient errors prevented persisting status changes).
          try {
            const svcIds = (filteredServices || []).map((s: any) => s.id).filter(Boolean)
            let mergedServices = filteredServices || []
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

              mergedServices = (filteredServices || []).map((svc: any) => {
                const bs = bookingsByService[svc.id] || []
                if (!bs.length) return svc
                const hasApproved = bs.some((b: any) => b.status === 'approved')
                const hasCompleted = bs.some((b: any) => b.status === 'completed')
                if (hasApproved && !hasCompleted) return { ...svc, status: 'closed' }
                if (bs[0] && bs[0].status === 'completed') return { ...svc, status: 'open' }
                return svc
              })
            }

            setWorkerServices(mergedServices)
            // Fetch bookings for these services (use merged so UI reflects inferred status)
            await fetchBookings(mergedServices || [])
          } catch (e) {
            console.warn('[worker] could not infer service status from bookings', e)
            setWorkerServices(filteredServices || [])
            await fetchBookings(filteredServices || [])
          }

          // Fetch reviews for this worker
          const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select(`
              *,
              reviewer:reviewer_id (
                full_name,
                avatar_url
              ),
              reviewee:reviewee_id (
                full_name,
                avatar_url
              )
            `)
            .eq('provider_id', authUser.id)
            .order('created_at', { ascending: false })

          if (reviewsError) {
            console.error('Error fetching reviews:', makePrintable(reviewsError))
            // Fallback: fetch without relationships
            const { data: fallbackReviews, error: fallbackError } = await supabase
              .from('reviews')
              .select('*')
              .eq('provider_id', authUser.id)
              .order('created_at', { ascending: false })
            
            if (!fallbackError) {
              setWorkerReviews(fallbackReviews || [])
            }
          } else {
            setWorkerReviews(reviewsData || [])
            // Create Sets from the review data
            const bookingIds = new Set((reviewsData || [])
              .filter(r => r.booking_id)
              .map(r => r.booking_id))
            const jobIds = new Set((reviewsData || [])
              .filter(r => r.job_id)
              .map(r => r.job_id))
            
            setReviewedBookingIdsWorker(() => new Set(bookingIds))
            setReviewedJobIdsWorker(() => new Set(jobIds))
          }
        }
      } catch (err) {
        console.error("[v0] Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Realtime subscriptions for jobs and bookings
    let sub: any = null
    // removed job update handler; workers no longer receive a global available-jobs feed here
      // Workers no longer subscribe to global job insert/update events for an "Available Jobs" feed.

    const handleBookingChange = async (payload: any) => {
      try {
        const booking = payload.new
        if (!booking) return

        // Fetch related profile and service data
        const [{ data: profileData }, { data: serviceData }] = await Promise.all([
          supabase.from('profiles').select('id, full_name, avatar_url, email, profile_tier').eq('id', booking.client_id),
          supabase.from('services').select('id, provider_id, name, price, duration').eq('id', booking.service_id)
        ])

        const enrichedBooking = {
          ...booking,
          profiles: (profileData || [])[0] || null,
          services: (serviceData || [])[0] || null
        }

        // Update recent bookings list
        setRecentClientBookings(prev => {
          const exists = prev.find(b => b.id === booking.id)
          if (exists) {
            return prev.map(b => b.id === booking.id ? enrichedBooking : b)
          }
          return [enrichedBooking, ...prev.slice(0, 9)] // Keep last 10
        })

        // Also update service bookings if the service belongs to this worker
        const serviceRow = (serviceData || [])[0] || null
        if (serviceRow && serviceRow.provider_id === user?.id) {
          setServiceBookings(prev => {
            const exists = prev.find(b => b.id === booking.id)
            if (exists) {
              return prev.map(b => b.id === booking.id ? enrichedBooking : b)
            }
            return [enrichedBooking, ...prev]
          })

          // If booking status implies a service status change, update it
          try {
            if (booking.status === 'approved') {
              // When a booking is approved, mark the service as closed/booked
              await setAndPersistServiceStatus(serviceRow.id, 'closed')
            } else if (booking.status === 'completed' || booking.status === 'rejected' || booking.status === 'cancelled') {
              // When completed/rejected/cancelled, free the service back to open
              await setAndPersistServiceStatus(serviceRow.id, 'open')
            }
          } catch (e) {
            console.warn('Error updating service status from booking change:', e)
          }
        }
      } catch (err) {
        console.error('Error handling booking change:', err)
      }
    }

    // Feature-detect newer channel API vs older from().on() subscription
      try {
      if ((supabase as any).channel) {
        // Subscribe to all booking changes for real-time updates (no global jobs feed here)
        const bookingsSub = (supabase as any)
          .channel("public:bookings")
          .on("postgres_changes", 
            { event: "*", schema: "public", table: "bookings" },
            async (payload: any) => {
              try {
                // Handle all booking changes
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                  const bookingRow = payload.new;
                  await handleBookingChange(payload);

                  // Also update service-specific bookings if applicable
                  const myServiceIds = workerServices.map((s: Service) => s.id);
                  if (bookingRow && myServiceIds.includes(bookingRow.service_id)) {
                    const [profileRes, serviceRes] = await Promise.all([
                      supabase.from('profiles').select('id, full_name, avatar_url, email').eq('id', bookingRow.client_id),
                      supabase.from('services').select('id, provider_id, name, price, duration').eq('id', bookingRow.service_id),
                    ]);

                    const profileRow = profileRes?.data?.[0] ?? null;
                    const serviceRow = serviceRes?.data?.[0] ?? null;

                    // If service belongs to this worker, update service bookings
                    if (serviceRow && serviceRow.provider_id === user?.id) {
                      const enrichedBooking = {
                        ...bookingRow,
                        profiles: profileRow || null,
                        services: serviceRow || null,
                      };

                      setServiceBookings((current) =>
                        current.some((b) => b.id === enrichedBooking.id)
                          ? current.map((b) => (b.id === enrichedBooking.id ? enrichedBooking : b))
                          : [enrichedBooking, ...current]
                      );

                      // Also ensure service status is kept in sync with booking status
                      try {
                        if (bookingRow.status === 'approved') {
                          await setAndPersistServiceStatus(serviceRow.id, 'closed')
                        } else if (bookingRow.status === 'completed' || bookingRow.status === 'rejected' || bookingRow.status === 'cancelled') {
                          await setAndPersistServiceStatus(serviceRow.id, 'open')
                        }
                      } catch (e) {
                        console.warn('[worker] could not persist service status from realtime payload', e)
                      }
                    }
                  }
                } else if (payload.eventType === 'DELETE') {
                  setServiceBookings((current) => current.filter((b) => b.id !== payload.old.id));
                  setRecentClientBookings((current) => current.filter((b) => b.id !== payload.old.id));
                }
              } catch (e) {
                console.error('Error handling booking realtime payload:', makePrintable(e));
              }
            }
          )
          .subscribe()

        sub = { bookingsSub }
      } else if ((supabase as any).from) {
        // older API: subscribe only to bookings changes (skip jobs)
        const bookingsInsert = (supabase as any)
          .from("bookings")
          .on("INSERT", (payload: any) => {
            handleBookingChange(payload)
          })
          .subscribe()

        const bookingsUpdate = (supabase as any)
          .from("bookings")
          .on("UPDATE", (payload: any) => {
            handleBookingChange(payload)
          })
          .subscribe()

        sub = { bookingsInsert, bookingsUpdate }
      }
    } catch (e) {
      console.warn("Realtime subscription failed:", e)
    }

    // Subscribe to notifications table for real-time updates
    try {
      if ((supabase as any).channel) {
        const notificationsSub = (supabase as any)
          .channel("public:notifications")
          .on("postgres_changes",
            { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user?.id}` },
            async (payload: any) => {
              try {
                if (payload.eventType === 'INSERT') {
                  const newNotification = payload.new
                  setNotifications((prev) => [newNotification, ...prev])
                  if (!newNotification.is_read) {
                    setUnreadNotificationCount((prev) => prev + 1)
                  }
                }
              } catch (e) {
                console.error('Error handling notification realtime payload:', makePrintable(e))
              }
            }
          )
          .subscribe()

        // Store subscription for cleanup
        sub = { ...sub, notificationsSub }
      }
    } catch (e) {
      console.warn("Notifications realtime subscription failed:", e)
    }

    return () => {
      // cleanup realtime subscriptions
      try {
        if (!sub) return
        if ((supabase as any).channel && sub.unsubscribe) {
          sub.unsubscribe()
        } else if (sub.insertSub || sub.updateSub) {
          sub.insertSub.unsubscribe()
          sub.updateSub.unsubscribe()
        }
      } catch (e) {
        console.warn("Error unsubscribing realtime:", e)
      }
    }
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        alert('Error deleting account: ' + (data.error || 'Unknown error'))
        setDeleting(false)
        setShowDeleteConfirm(false)
        return
      }

      alert('Your account has been permanently deleted.')
      window.location.href = '/'
    } catch (err: any) {
      alert('Error deleting account: ' + err.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleEditService = (service: Service) => {
    router.push(`/services/offer?edit=${service.id}`)
  }

  // applyToJob removed — worker dashboard no longer shows the global available jobs feed

    const handleToggleServiceStatus = async (serviceId: string, isOpen: boolean) => {
      try {
        const newStatus = isOpen ? 'open' : 'closed';
        const { data, error } = await supabase
          .from('services')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', serviceId)
          .eq('provider_id', user?.id)
          .select('*')
          .single();

        if (error) {
          console.error('Error toggling service status:', makePrintable(error));
          alert(`Failed to update service status: ${error.message || String(error)}`);
          return;
        }

        if (data) {
          setWorkerServices((prev) => prev.map((service) => (service.id === serviceId ? { ...service, status: newStatus } : service)));
          alert(`Service ${newStatus} successfully`);
        }
      } catch (err: any) {
        console.error('Error toggling service:', err?.message || err);
        alert('An unexpected error occurred while updating service status');
      }
    };

    const fetchWorkerBookingsFallback = async (serviceIds: string[]) => {
      try {
        const query = new URLSearchParams();
        query.set('service_ids', serviceIds.join(','));

        const res = await fetch(`/api/bookings?${query.toString()}`);
        if (!res.ok) {
          const body = await res.text();
          console.warn('Worker bookings fallback failed:', res.status, body);
          return null;
        }

        const data = await res.json();
        return Array.isArray(data) ? data : null;
      } catch (err) {
        console.error('Worker bookings fallback network error:', err);
        return null;
      }
    };

    const fetchBookings = async (services: Service[]) => {
      if (!services.length) return;

      const serviceIds = services.map((s) => s.id);
      try {
        // Fetch bookings for worker's services with joined profile/service data
        console.log('Debug: fetching bookings, user id =', user?.id, 'serviceIds =', serviceIds);
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            profiles:client_id (
              id,
              full_name,
              avatar_url,
              email, phone, location, 
              profile_tier
            ),
            services (
              id,
              provider_id,
              name,
              price,
              duration
            )
          `)
          .in('service_id', serviceIds)
          .neq('archived', true)
          .order('booking_date', { ascending: false });

        let allBookings = bookingsData || [];

        if (bookingsError) {
          console.error('Error fetching bookings:', makePrintable(bookingsError));
          const fallbackBookings = await fetchWorkerBookingsFallback(serviceIds);
          if (fallbackBookings) {
            allBookings = fallbackBookings;
          } else {
            return;
          }
        }

        // If the batched .in() returned nothing, try per-service fetch to help debugging (RLS may block batched query)
        if ((!allBookings || allBookings.length === 0) && serviceIds.length > 0) {
          console.warn('Batched fetch returned no bookings — trying per-service fetch as fallback for debugging');
          const perServiceResults = await Promise.all(
            serviceIds.map((sid) =>
              supabase
                .from('bookings')
                .select(`
                  *,
                  profiles:client_id (
                    id,
                    full_name,
                    avatar_url,
                    email, phone, location, 
                    profile_tier
                  ),
                  services (
                    id,
                    provider_id,
                    name,
                    price,
                    duration
                  )
                `)
                .eq('service_id', sid)
                .order('booking_date', { ascending: false })
                .then((r) => ({ sid, ...r }))
            )
          );

          perServiceResults.forEach((r: any) => {
            if (r.error) {
              console.warn('Per-service fetch error for', r.sid, makePrintable(r.error));
            } else if (r.data && r.data.length) {
              allBookings = allBookings.concat(r.data);
            }
          });
        }

        if (allBookings && allBookings.length) {
          const filtered = allBookings.filter((b: any) =>
            b.services && services.some((s) => s.id === b.services.id)
          );

          setServiceBookings(filtered);

          const recentBookings = [...filtered]
            .sort((a: any, b: any) => new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime())
            .slice(0, 10);

          setRecentClientBookings(recentBookings);
        } else {
          console.info('No bookings found for services:', serviceIds);
        }
      } catch (err) {
        console.error('Error fetching bookings:', makePrintable(err));
      }
    };

    const handleApproveBooking = async (bookingId: string) => {
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const bodyPayload: any = { bookingId };
        if (token) bodyPayload.accessToken = token;

        const res = await fetch('/api/bookings/approve', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        const updated = await res.json();

        if (!res.ok) {
          const errorMessage = updated?.error 
            ? `${updated.error}${updated.details ? `: ${updated.details}` : ''}`
            : 'Unknown error';
          console.error('Failed to approve booking:', errorMessage);
          alert(`Failed to approve booking: ${errorMessage}`);
          return;
        }

        setServiceBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
        setRecentClientBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));

        // Update local service status: when booking is approved, mark service as 'closed' (booked)
        try {
          const svcId = updated?.services?.id || updated?.service_id
          if (svcId) {
            setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, status: 'closed' } : s)));
            // Persist status change to DB so it doesn't remain pending on the server
            try {
              const { data: svcData, error: svcErr } = await supabase
                .from('services')
                .update({ status: 'closed', updated_at: new Date().toISOString() })
                .eq('id', svcId)
                .eq('provider_id', user?.id)
                .select('*')
                .single()

              if (svcErr) {
                console.warn('Failed to persist service status change after booking approval', svcErr)
              } else if (svcData) {
                setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, ...svcData } : s)));
              }
            } catch (e) {
              console.warn('Error persisting service status after approval', e)
            }
          }
        } catch (e) {
          console.warn('Failed to update service status locally after approval', e)
        }

        alert('Booking approved successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error approving booking:', err);
        alert(`Failed to approve booking: ${errorMessage}`);
      }
    };

    const handleRejectBooking = async (bookingId: string) => {
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const bodyPayload: any = { status: 'rejected' };
        if (token) bodyPayload.accessToken = token;

        const res = await fetch(`/api/bookings/${bookingId}/status`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        const updated = await res.json();

        if (!res.ok) {
          const errorMessage = updated?.error 
            ? `${updated.error}${updated.details ? `: ${updated.details}` : ''}`
            : 'Unknown error';
          console.error('Failed to reject booking:', errorMessage);
          alert(`Failed to reject booking: ${errorMessage}`);
          return;
        }

        setServiceBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
        setRecentClientBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));

        // Update local service status: keep service open after rejection
        try {
          const svcId = updated?.services?.id || updated?.service_id
          if (svcId) {
            setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, status: 'open' } : s)));
            // Persist status change to DB so it remains open for new bookings
            try {
              const { data: svcData, error: svcErr } = await supabase
                .from('services')
                .update({ status: 'open', updated_at: new Date().toISOString() })
                .eq('id', svcId)
                .eq('provider_id', user?.id)
                .select('*')
                .single()

              if (svcErr) {
                console.warn('Failed to persist service status change after booking rejection', svcErr)
              } else if (svcData) {
                setWorkerServices((prev) => prev.map((s) => (s.id === svcId ? { ...s, ...svcData } : s)));
              }
            } catch (e) {
              console.warn('Error persisting service status after rejection', e)
            }
          }
        } catch (e) {
          console.warn('Failed to update service status locally after rejection', e)
        }

        alert('Booking rejected successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error rejecting booking:', err);
        alert(`Failed to reject booking: ${errorMessage}`);
      }
    };

    const handleCompleteBooking = async (bookingId: string) => {
      try {
        const res = await fetch('/api/bookings/approve', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId, status: 'completed' }),
        });

        const updated = await res.json();

        if (!res.ok) {
          const errorMessage = updated?.error 
            ? `${updated.error}${updated.details ? `: ${updated.details}` : ''}`
            : 'Unknown error';
          console.error('Failed to complete booking:', errorMessage);
          alert(`Failed to complete booking: ${errorMessage}`);
          return;
        }

        setServiceBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
        setRecentClientBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));

        alert('Booking completed successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        console.error('Error completing booking:', err);
        alert(`Failed to complete booking: ${errorMessage}`);
      }
    };

    const handleAttendanceSubmit = async (data: { bookingId: string; attended: boolean; notes: string; attendanceDate: string }) => {
      setSavingAttendance(true);
      try {
        // Format the notes with the date
        const formattedNotes = data.notes 
          ? `[${data.attendanceDate}] ${data.notes}`
          : `[${data.attendanceDate}] ${data.attended ? 'Attended' : 'Absent'}`;

        // Update the booking with attendance status and notes
        const res = await fetch(`/api/bookings/${data.bookingId}/update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            notes: formattedNotes,
            attended: data.attended,
            attendance_date: data.attendanceDate
          }),
        });

        const body = await res.text().catch(() => '');
        let updated: any = null;
        try { updated = body ? JSON.parse(body) : null } catch (e) { updated = body }

        if (!res.ok) {
          const message = updated?.error || updated?.message || body || `Failed to save attendance (status ${res.status})`;
          console.error('Error saving attendance:', res.status, String(message).slice(0, 2000));
          alert('Failed to save attendance: ' + message);
          return;
        }

        if (updated) {
          setServiceBookings((prev) => prev.map((b) => b.id === data.bookingId ? updated : b));
          setRecentClientBookings((prev) => prev.map((b) => b.id === data.bookingId ? updated : b));
        }

        alert('Attendance saved successfully!');
        setAttendanceModalOpen(false);
        setAttendanceBookingId(null);
      } catch (err) {
        console.error('Error saving attendance:', err);
        alert('Failed to save attendance: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setSavingAttendance(false);
      }
    };

    const handleDeleteApplication = async (applicationId: string) => {
      if (!applicationId) return;
      if (!confirm('Permanently delete this application? This cannot be undone.')) return;
      setDeletingApplicationIds(prev => new Set(prev).add(applicationId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/job-applications/${encodeURIComponent(applicationId)}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const endpoint = `/api/job-applications/${encodeURIComponent(applicationId)}`
        const { ok, status, statusText, data: body, raw } = await parseApiResponse(res)

        if (!ok) {
          const routeHint = status === 404 ? `API route not found or wrong endpoint: ${endpoint}` : null
          const errMsg =
            body?.error ||
            body?.details ||
            (typeof body === 'object' ? JSON.stringify(body) : body) ||
            raw ||
            statusText ||
            routeHint ||
            `Failed to delete application (status ${status})`

          console.error('Delete application failed:', {
            status,
            statusText,
            body,
            raw,
            endpoint,
          })

          alert(errMsg)
          return
        }

        setJob_applications(prev => (prev || []).filter(a => a.id !== applicationId));
        if (openChatAppId === applicationId) {
          setOpenChatAppId(null);
        }
        alert('Application deleted');
      } catch (err) {
        console.error('Error deleting application:', err);
        alert('Failed to delete application: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingApplicationIds(prev => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });
      }
    };

    const handleHideJob = async (jobId: string) => {
      if (!jobId) return;
      if (!confirm('Hide this job from your dashboard? You can browse all jobs to find it again.')) return;
      setHidingJobIds(prev => new Set(prev).add(jobId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/hide`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const endpoint = `/api/jobs/${encodeURIComponent(jobId)}/hide`
        const { ok, status, statusText, data: body, raw } = await parseApiResponse(res)

        if (!ok) {
          const routeHint = status === 404 ? `API route not found or wrong endpoint: ${endpoint}` : null
          const errMsg =
            body?.error ||
            body?.details ||
            (typeof body === 'object' ? JSON.stringify(body) : body) ||
            raw ||
            statusText ||
            routeHint ||
            `Failed to hide job (status ${status})`

          console.error('Hide job failed:', {
            status,
            statusText,
            body,
            raw,
            endpoint,
          })

          alert(errMsg)
          return
        }

        // Remove the job from available jobs
        setAvailableJobs(prev => (prev || []).filter(j => j.id !== jobId));
        alert('Job hidden from your dashboard');
      } catch (err) {
        console.error('Error hiding job:', err);
        alert('Failed to hide job: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setHidingJobIds(prev => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
      }
    };

    const handleDeleteService = async (serviceId: string) => {
      if (!serviceId) return;
      if (!confirm('Permanently delete this service? This cannot be undone.')) return;
      setDeletingServiceIds(prev => new Set(prev).add(serviceId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/services/${serviceId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

        if (!res.ok) {
          const printable = makePrintable(body ?? text ?? { status: res.status });
          console.error(`Delete service failed: ${res.status} ${res.statusText || ''} - ${printable}`);
          alert(printable || `Failed to delete service (status ${res.status})`);
          return;
        }

        setWorkerServices(prev => (prev || []).filter(s => s.id !== serviceId));
        alert('Service deleted');
      } catch (err) {
        console.error('Error deleting service:', err);
        alert('Failed to delete service: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingServiceIds(prev => {
          const next = new Set(prev);
          next.delete(serviceId);
          return next;
        });
      }
    };

    const handleDeleteBookingWorker = async (bookingId: string) => {
      if (!bookingId) return;
      if (!confirm('Permanently delete this booking? This cannot be undone.')) return;
      setDeletingBookingIdsWorker(prev => new Set(prev).add(bookingId));
      try {
        const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
        const token = session?.access_token || (session as any)?.accessToken || null;

        const res = await fetch(`/api/bookings/${bookingId}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });

        const text = await res.text();
        let body: any = null;
        try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

        if (!res.ok) {
          // Handle empty responses or malformed error objects
          let errMsg = 'Failed to delete booking';
          if (body && typeof body === 'object' && Object.keys(body).length > 0) {
            errMsg = body.error || body.details || body.message || JSON.stringify(body);
          } else if (typeof body === 'string' && body.trim()) {
            errMsg = body;
          } else if (text && text.trim()) {
            errMsg = text;
          }
          
          console.error('Delete booking (worker) failed:', {
            status: res.status,
            statusText: res.statusText,
            body,
            raw: text,
            bookingId,
            bodyType: typeof body,
            bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A'
          });
          alert(errMsg);
          return;
        }

        setServiceBookings(prev => (prev || []).filter(b => b.id !== bookingId));
        setRecentClientBookings(prev => (prev || []).filter(b => b.id !== bookingId));
        if (openChatBookingId === bookingId) {
          setOpenChatBookingId(null);
        }
        alert('Booking deleted successfully');
      } catch (err) {
        console.error('Error deleting booking (worker):', err);
        alert('Failed to delete booking: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setDeletingBookingIdsWorker(prev => {
          const next = new Set(prev);
          next.delete(bookingId);
          return next;
        });
      }
    };

    const handleConfirmAction = async () => {
      if (!confirmAction) return;
      const jobApp = job_applications.find((app) => app.job_id === confirmAction.jobId);
      const currentStatus = (jobApp?.jobs?.status || 'open') as JobStatus;

      if (!canTransitionJobStatus(currentStatus, confirmAction.newStatus, true)) {
        alert('This job cannot be updated from its current status.');
        setConfirmAction(null);
        return;
      }

      const result = await updateJobStatus(confirmAction.jobId, confirmAction.newStatus);
      if (!result.success) {
        alert(result.error || 'Failed to update job status.');
        return;
      }

      setJob_applications((prev) => prev.map((app) =>
        app.job_id === confirmAction.jobId
          ? { ...app, jobs: { ...app.jobs, status: confirmAction.newStatus } }
          : app
      ));
      setConfirmAction(null);
      alert('Job status updated successfully.');
    };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Gradient Header with Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5wYXRoIi48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjxwYXRoIGQ9Ik0zNiAwQzU3LjUgMCA3NSAxNy41IDc1IDM1YzAgMTcuNS0xNy41IDM1LTM5IDM1UzI3IDUyLjUgMjAgMzVjLTE3LjUgMC0zNS0xNy41LTM1LTM1YzAtMTcuNSAxNy41LTM1IDM1LTM1eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">Provider Dashboard</p>
              <h1 className="mt-3 text-4xl font-bold text-white drop-shadow-lg">Welcome back, {profile?.full_name || 'Worker'}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/90">
                Manage services, approve bookings, and build client trust from one organized dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/services/offer">
                <Button className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4" /> Add Service
                </Button>
              </Link>
              <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 font-semibold transition-all" onClick={() => setEditProfileOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Profile
              </Button>
              <Button variant="destructive" className="flex items-center gap-2" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Account
              </Button>
              <Button className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 font-semibold transition-all" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          </div>

          {/* Summary Cards with Glassmorphism */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Services offered</p>
                  <p className="mt-1 text-3xl font-bold text-white">{workerServices?.length || 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Active bookings</p>
                  <p className="mt-1 text-3xl font-bold text-white">{serviceBookings.filter((b) => b.status === 'approved').length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Pending bookings</p>
                  <p className="mt-1 text-3xl font-bold text-white">{serviceBookings.filter((b) => b.status === 'pending').length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Recent reviews</p>
                  <p className="mt-1 text-3xl font-bold text-white">{workerReviews.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            {/* My Services */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">My services</h2>
                    <p className="text-sm text-slate-500">Manage availability and performance.</p>
                  </div>
                </div>
                <Link href="/services/offer">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> New service
                  </Button>
                </Link>
              </div>

              {workerServices?.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600">No services yet</p>
                  <p className="text-sm text-slate-500 mt-1">Create your first service to start getting bookings!</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {workerServices.map((service) => (
                    <Card key={service.id} className="p-4 bg-background">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{service.name}</h3>
                          <p className="text-sm text-muted-foreground">KES {service.price.toLocaleString()} • {service.duration}</p>
                          {service.location && (
                            <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="w-4 h-4" />{service.location}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-start md:items-end">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${service.status === 'open' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {service.status?.toUpperCase() || 'PENDING'}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleToggleServiceStatus(service.id, service.status === 'closed')}
                              variant={service.status === 'open' ? 'destructive' : 'default'}
                            >
                              {service.status === 'open' ? 'Close' : 'Open'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/services/offer?edit=${service.id}`)}
                              disabled={serviceBookings.some((b) => b.service_id === service.id && b.status === 'approved')}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteService(service.id)}
                              disabled={deletingServiceIds.has(service.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {/* Booking Requests */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Booking Requests</h2>
                    <p className="text-sm text-slate-500">Approve or reject client bookings.</p>
                  </div>
                </div>
              </div>

              {serviceBookings.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600">No booking requests</p>
                  <p className="text-sm text-slate-500 mt-1">Clients will book your services here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {serviceBookings.map((booking) => (
                    <Card key={booking.id} className="p-4 bg-slate-50">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground">{booking.services?.name || 'Service'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.profiles?.full_name || 'Client'} • {new Date(booking.booking_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm font-medium text-primary mt-1">
                            KES {booking.services?.price?.toLocaleString() || 0}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-start md:items-end">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            booking.status === 'approved' ? 'bg-green-100 text-green-800' :
                            booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {booking.status?.toUpperCase() || 'PENDING'}
                          </span>
                          {booking.status === 'pending' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleApproveBooking(booking.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectBooking(booking.id)}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {booking.status === 'approved' && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCompleteBooking(booking.id)}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Mark Complete
                              </Button>
                              <Button
                                size="sm"
                                className="bg-primary"
                                onClick={() => setOpenChatBookingId(booking.id)}
                              >
                                Chat
                              </Button>
                            </div>
                          )}
                          {booking.status === 'completed' && (
                            <div className="flex flex-col gap-2 mt-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => setOpenChatBookingId(booking.id)}
                                >
                                  Chat
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-primary flex-1"
                                  onClick={() => {
                                    setReviewContext({ type: 'booking', id: booking.id, client_id: booking.client_id });
                                    setReviewModalOpen(true);
                                  }}
                                >
                                  Review Client
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="w-full"
                                onClick={() => handleDeleteBookingWorker(booking.id)}
                                disabled={deletingBookingIdsWorker.has(booking.id)}
                              >
                                {deletingBookingIdsWorker.has(booking.id) ? 'Deleting...' : 'Delete Booking'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Chat for approved/completed bookings */}
                      {openChatBookingId === booking.id && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <JobChat
                            bookingId={booking.id}
                            recipientId={booking.client_id || ''}
                            recipientName={booking.profiles?.full_name || 'Client'}
                            currentUserId={user?.id || ''}
                            onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [booking.id]: count }))}
                          />
                          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setOpenChatBookingId(null)}>Close chat</Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            {/* Available Jobs Feed */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Available jobs</h2>
                    <p className="text-sm text-slate-500">Recent open jobs that match your location.</p>
                  </div>
                </div>
                <Link href="/jobs">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                    Browse all
                  </Button>
                </Link>
              </div>
              {availableJobs.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                    <Bell className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600">No jobs available</p>
                  <p className="text-sm text-slate-500 mt-1">Check back soon for new opportunities 👀</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableJobs.map((job) => {
                    const statusStyle = getJobStatusColor(job.status);
                    return (
                      <Card key={job.id} className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-foreground">{job.title}</h3>
                            <p className="text-sm text-muted-foreground">{job.location} • KES {job.budget.toLocaleString()}</p>
                          </div>
                          <span className={`${statusStyle.bg} ${statusStyle.text} rounded-full px-3 py-1 text-xs font-semibold`}>{job.status.toUpperCase()}</span>
                        </div>
                        <div className="mt-4 flex justify-between gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleHideJob(job.id)}
                            disabled={hidingJobIds.has(job.id)}
                          >
                            {hidingJobIds.has(job.id) ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                Hiding...
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Trash2 className="w-3 h-3" />
                                Hide
                              </div>
                            )}
                          </Button>
                          <Link href={`/jobs/${job.id}`}>
                            <Button size="sm" className="bg-primary text-white">View / Apply</Button>
                          </Link>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* My Applications */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">My applications</h2>
              </div>
              {job_applications.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-12 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-lg font-semibold text-slate-600">No applications yet</p>
                  <p className="text-sm text-slate-500 mt-1">Start applying to jobs to see them here!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {job_applications.map((application) => (
                    <Card key={application.id} className="p-4 bg-background">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className="font-semibold text-foreground">{application.jobs?.title || 'Job application'}</p>
                          <p className="text-sm text-muted-foreground">Proposed rate: KES {application.proposed_rate.toLocaleString()}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${application.status === 'accepted' ? 'bg-green-100 text-green-700' : application.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{application.status}</span>
                      </div>

                      {/* Show client info for accepted applications */}
                      {application.status === 'accepted' && application.jobs?.profiles && (
                        <div className="mb-4 pb-4 border-b border-border">
                          <p className="text-xs text-muted-foreground mb-2">Client info</p>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {application.jobs.profiles.avatar_url ? (
                                <img src={application.jobs.profiles.avatar_url} alt="Client" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{application.jobs.profiles.full_name}</p>
                              {application.jobs.profiles.email && <p className="text-xs text-muted-foreground">{application.jobs.profiles.email}</p>}
                              {application.jobs.profiles.phone && <p className="text-xs text-muted-foreground">{application.jobs.profiles.phone}</p>}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-2 sm:grid-cols-3">
                        {application.status === 'accepted' && application.jobs?.status === 'open' && (
                          <Button
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setConfirmAction({ jobId: application.job_id, newStatus: 'completed', title: 'Complete Job', message: 'Mark this job as completed? This will allow client reviews.' })}
                          >
                            Mark completed
                          </Button>
                        )}
                        {application.status === 'accepted' && application.jobs?.status === 'completed' && !reviewedJobIdsWorker.has(application.job_id) && (
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-white"
                            onClick={() => {
                              setReviewContext({ type: 'job', id: application.job_id, client_id: application.jobs?.client_id });
                              setReviewModalOpen(true);
                            }}
                          >
                            Review client
                          </Button>
                        )}
                        {application.status === 'accepted' && (
                          openChatAppId === application.id ? (
                            <div className="col-span-1 sm:col-span-3 space-y-2">
                              <JobChat
                                jobId={application.job_id}
                                jobApplicationId={application.id}
                                recipientId={application.jobs?.client_id || ''}
                                recipientName={application.jobs?.profiles?.full_name || 'Client'}
                                currentUserId={user?.id || ''}
                                onUnreadCountChange={(count) => setUnreadCounts(prev => ({ ...prev, [application.id]: count }))}
                              />
                              <Button size="sm" variant="outline" className="w-full" onClick={() => setOpenChatAppId(null)}>Close chat</Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="w-full bg-primary text-white relative"
                              onClick={() => setOpenChatAppId(application.id)}
                            >
                              Chat
                              {unreadCounts[application.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                  {unreadCounts[application.id]}
                                </span>
                              )}
                            </Button>
                          )
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleDeleteApplication(application.id)}
                          disabled={deletingApplicationIds.has(application.id)}
                        >
                          {deletingApplicationIds.has(application.id) ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 xl:col-span-1 xl:sticky xl:top-24">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-slate-500">Signed in as</p>
                  <p className="font-bold text-slate-800 text-lg">{profile?.full_name || 'No Name'}</p>
                  <p className="text-sm text-slate-500">{profile?.email || user?.email}</p>
                </div>
              </div>
              {profile?.profile_tier && (
                <div className="mb-4">
                  <TierBadge tier={profile.profile_tier as any} size="sm" showLabel />
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">★</span>
                    <p className="text-sm text-slate-500">Rating</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-800">{profile?.avg_rating?.toFixed(1) || '0.0'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">💬</span>
                    <p className="text-sm text-slate-500">Reviews</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-800">{profile?.total_reviews || 0}</p>
                </div>
              </div>
              <Link href="/profile?edit=1">
                <Button className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                  <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </Link>
            </Card>

            {profile?.id && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Portfolio images</h3>
                </div>
                <WorkImageUploader userId={profile.id} />
              </Card>
            )}

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Quick stats</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Services</span>
                  <span className="font-bold text-slate-800">{workerServices?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-600">Job applications</span>
                  <span className="font-bold text-slate-800">{job_applications.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-green-50">
                  <span className="text-green-700">Accepted</span>
                  <span className="font-bold text-green-600">{job_applications.filter((a) => a.status === 'accepted').length}</span>
                </div>
                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-blue-50">
                  <span className="text-blue-700">Active bookings</span>
                  <span className="font-bold text-blue-600">{serviceBookings.filter(b => b.status === 'approved').length}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl cursor-pointer hover:shadow-2xl transition-all" onClick={() => setNotificationPanelOpen(true)}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Notifications</h3>
                </div>
                {unreadNotificationCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {unreadNotificationCount}
                  </span>
                )}
              </div>
              {notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notification: any) => (
                    <div key={notification.id} className={`p-3 rounded-lg ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
                      <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                      <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(notification.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <p className="text-sm text-green-700 font-medium">✨ You're all caught up!</p>
                  <p className="text-xs text-green-600 mt-1">Check back for new booking requests.</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4 border-destructive/50">
            <h2 className="text-2xl font-bold text-destructive mb-2">⚠️ Delete Account Permanently</h2>
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <p className="text-foreground font-semibold mb-2">This action is IRREVERSIBLE!</p>
              <ul className="text-sm text-foreground space-y-1 list-disc list-inside">
                <li>Your account will be permanently deleted</li>
                <li>All your services and data will be erased</li>
                <li>You cannot recover this account</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="outline" className="flex-1" disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={handleDeleteAccount} variant="destructive" className="flex-1" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete Forever'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm Modal for Job Actions */}
      {confirmAction && (
        <ConfirmModal
          open={true}
          title={confirmAction.title || 'Confirm action'}
          message={confirmAction.message || 'Are you sure?'}
          confirmLabel="Confirm"
          onClose={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <ReviewModal
          open={reviewModalOpen}
          title="Review Client"
          revieweeId={reviewContext?.client_id || ''}
          onClose={() => {
            setReviewModalOpen(false)
            setReviewContext(null)
          }}
          onSubmit={async (payload: { rating: number; comment: string; revieweeId: string }) => {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              if (!session?.user?.id) {
                alert('Please log in to submit a review')
                return
              }

              if (!reviewContext?.id || !reviewContext?.client_id) {
                alert('Missing required review information.')
                setReviewModalOpen(false)
                return
              }

              const token = session?.access_token || (session as any)?.accessToken || null
              let bodyPayload: any = { revieweeId: reviewContext.client_id, rating: payload.rating, comment: payload.comment, reviewerRole: 'provider' }
              if (reviewContext.type === 'booking') bodyPayload.bookingId = reviewContext.id
              if (reviewContext.type === 'job') bodyPayload.jobId = reviewContext.id
              if (token) bodyPayload.accessToken = token

              const res = await fetch('/api/reviews', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(bodyPayload),
              })

              const text = await res.text()
              let result: any = null
              try { result = text ? JSON.parse(text) : null } catch (e) { result = text }

              if (!res.ok) {
                // More robust error handling
                let errorMessage = 'Failed to submit review'
                if (result) {
                  if (result.error) {
                    errorMessage = result.error
                  } else if (result.details?.message) {
                    errorMessage = result.details.message
                  } else if (result.message) {
                    errorMessage = result.message
                  }
                }
                console.error('[worker review] Error submitting review (server):', { status: res.status, body: result, rawText: text, errorMessage })
                throw new Error(errorMessage)
              }

              const reviewData = result?.data || result
              if (reviewData && reviewContext.client_id) {
                const { data: profileData } = await supabase
                  .from('profiles')
                  .select('id, full_name, avatar_url')
                  .eq('id', reviewContext.client_id)
                  .single()
                if (profileData) reviewData.profiles = profileData
              }

              setWorkerReviews((prev) => [reviewData, ...(prev || [])])
              if (reviewContext.type === 'booking') {
                setReviewedBookingIdsWorker((prev) => new Set(Array.from(prev).concat([reviewContext.id])))
              }
              if (reviewContext.type === 'job') {
                setReviewedJobIdsWorker((prev) => new Set(Array.from(prev).concat([reviewContext.id])))
              }

              setReviewModalOpen(false)
              setReviewContext(null)
              alert('Thank you for your review!')
            } catch (error: any) {
              alert(error?.message || 'Failed to submit review')
            }
          }}
        />
      )}

      {/* Attendance Modal */}
      <AttendanceModal
        open={attendanceModalOpen}
        bookingId={attendanceBookingId || ''}
        onClose={() => {
          setAttendanceModalOpen(false)
          setAttendanceBookingId(null)
        }}
        onSubmit={handleAttendanceSubmit}
        isLoading={savingAttendance}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        profile={profile}
        onSave={(updatedProfile) => {
          setProfile(updatedProfile)
          // When profile is updated (especially location), refresh available jobs with new location filter
          const refreshJobsFeed = async () => {
            try {
              const userLocation = updatedProfile?.location
              
              let jobsQuery = supabase
                .from('jobs')
                .select('id, title, location, budget, duration, status, client_id, profiles(full_name, avatar_url, profile_tier)')
                .eq('status', 'open')
                .neq('client_id', user?.id)
                .order('created_at', { ascending: false })
              
              // If user has a location set, filter jobs by that location
              if (userLocation && userLocation.trim()) {
                jobsQuery = jobsQuery.ilike('location', `%${userLocation}%`)
              }
              
              const { data: jobsData, error: jobsError } = await jobsQuery.limit(5)

              if (!jobsError) {
                setAvailableJobs(jobsData || [])
              } else {
                console.warn('[worker] failed to refresh available jobs feed after profile update:', makePrintable(jobsError))
              }
            } catch (e) {
              console.warn('[worker] error refreshing available jobs feed after profile update:', e)
            }
          }
          refreshJobsFeed()
        }}
        backButtonClass="text-white hover:text-white/90"
      />

      {/* Notification Panel Modal */}
      {notificationPanelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setNotificationPanelOpen(false)}>
          <div className="bg-background rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">Notifications</h2>
              <div className="flex gap-2">
                {unreadNotificationCount > 0 && (
                  <Button size="sm" variant="outline" onClick={async () => {
                    try {
                      await fetch('/api/notifications', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ markAllRead: true })
                      })
                      setNotifications((prev) => prev.map((n: any) => ({ ...n, is_read: true })))
                      setUnreadNotificationCount(0)
                    } catch (e) {
                      console.error('Error marking all as read:', e)
                    }
                  }}>
                    Mark all read
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setNotificationPanelOpen(false)}>Close</Button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${notification.is_read ? 'bg-muted/50 hover:bg-muted' : 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-500'}`}
                    onClick={async () => {
                      if (!notification.is_read) {
                        try {
                          await fetch('/api/notifications', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ notificationId: notification.id })
                          })
                          setNotifications((prev) => prev.map((n: any) => n.id === notification.id ? { ...n, is_read: true } : n))
                          setUnreadNotificationCount((prev) => Math.max(0, prev - 1))
                        } catch (e) {
                          console.error('Error marking notification as read:', e)
                        }
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-foreground">{notification.title}</p>
                      {!notification.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                    </div>
                    {notification.message && <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}





