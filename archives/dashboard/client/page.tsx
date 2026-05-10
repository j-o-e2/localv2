"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReviewModal from "@/components/ui/review-modal";
import ConfirmModal from "@/components/ui/confirm-modal";
import { Card } from "@/components/ui/card";
import { LogOut, Plus, MapPin, Trash2, User, Bell, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import EditProfileModal from "@/components/EditProfileModal";
import JobChat from "@/components/ui/job-chat";
import { TierBadge } from "@/components/TierBadge";
import Avatar from '@/components/Avatar'
import WorkImageUploader from "@/components/WorkImageUploader"
import WorkImageGallery from "@/components/WorkImageGallery"

interface JobApplication {
  id: string;
  job_id: string;
  provider_id: string;
  status: string;
  proposed_rate: number;
  provider: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string;
    profile_tier?: string;
    avg_rating?: number;
    total_reviews?: number;
  };
  jobs?: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    budget?: number;
  };
}

interface Job {
  id: string;
  title: string;
  description?: string;
  location: string;
  budget: number;
  duration: string;
  status: string;
  created_at: string;
  client_id: string;
  job_applications: JobApplication[];
}

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  duration: string;
  description: string;
  provider_id: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string;
    profile_tier?: string;
    email?: string;
    phone?: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  client_id: string;
  booking_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  location?: string;
  profile_tier?: string;
  role?: string;
  avatar_url?: string | null;
}

interface Booking {
  id: string;
  service_id: string;
  booking_date: string;
  status: string;
  notes?: string;
  services: {
    name: string;
    price: number;
    duration: string;
    provider_id: string;
    profiles: {
      id: string;
      full_name: string;
      avatar_url: string | null;
      profile_tier?: string;
      email?: string;
      phone?: string;
      location?: string;
    };
  };
}

const ClientDashboard = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<Job[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewContext, setReviewContext] = useState<{
    type: "booking" | "job";
    id: string;
    provider_id?: string;
  } | null>(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set());
  const [reviewedJobIds, setReviewedJobIds] = useState<Set<string>>(new Set());
  const [openBookingChatId, setOpenBookingChatId] = useState<string | null>(null);
  const [openJobChatAppId, setOpenJobChatAppId] = useState<string | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [loadingAppIds, setLoadingAppIds] = useState<Set<string>>(new Set());
  // Confirmation modal state for job actions
  // Confirmation modal state for rejecting applications
  const [rejectConfirm, setRejectConfirm] = useState<{
    jobId: string;
    applicationId: string;
    providerName: string;
  } | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingJobIds, setDeletingJobIds] = useState<Set<string>>(new Set());
  const [updatingJobIds, setUpdatingJobIds] = useState<Set<string>>(new Set());
  const [deletingBookingIds, setDeletingBookingIds] = useState<Set<string>>(new Set());
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const makePrintable = (err: any) => {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    if (err?.message) return err.message;
    try {
      const names = Object.getOwnPropertyNames(err);
      const data: Record<string, any> = {};
      names.forEach((n) => (data[n] = err[n]));
      return JSON.stringify(data);
    } catch {
      return String(err);
    }
  };

  const parseApiResponse = async (res: Response) => {
    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }
    return { ok: res.ok, status: res.status, statusText: res.statusText, data, raw };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      // ✅ Fetch available services (with retry and server-side fallback)
      let servicesData: any = null
      let servicesError: any = null

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
          .limit(3)

        servicesData = res.data
        servicesError = res.error
      } catch (e: any) {
        servicesError = e
      }

      // If client-side read failed, retry once, then fall back to server endpoint
      if (servicesError) {
        const printable = makePrintable(servicesError)
        console.warn('[dashboard] initial services read failed, retrying:', printable)
        // small backoff
        await new Promise((r) => setTimeout(r, 300))
        try {
          const res2 = await supabase
            .from('services')
            .select(`*, profiles:provider_id ( full_name, avatar_url, location )`)
            .order('created_at', { ascending: false })
            .limit(3)
          servicesData = res2.data
          servicesError = res2.error
        } catch (e: any) {
          servicesError = e
        }
      }

      if (servicesError) {
        // Final fallback to server-side debug endpoint which uses the service role key
        try {
          const resp = await fetch('/api/debug/services', { credentials: 'include' })
          if (resp.ok) {
            const body = await resp.json()
            setServices(body?.data || [])
          } else {
            console.error('[dashboard] server-side services fallback failed:', await resp.text())
            setServices([])
          }
        } catch (e) {
          console.error('Error fetching services (all fallbacks failed):', makePrintable(e))
          setServices([])
        }
      } else {
        setServices(servicesData || [])
      }

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.push("/login");
          return;
        }

        // Get session to ensure we're authenticated
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        // ✅ Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", makePrintable(profileError));
          setLoading(false);
          router.push("/login");
          return;
        }

        if (!profileData) {
          console.warn("No profile found for user", user.id);
          setLoading(false);
          router.push("/profile");
          return;
        }

        if (profileData.role !== "client") {
          router.push("/dashboard");
          return;
        }

        setProfile(profileData);

        // Fetch notifications for this user via API (bypasses RLS)
        try {
          const response = await fetch('/api/notifications')
          const data = await response.json()
          
          if (!response.ok) {
            console.warn('[client] notifications API error:', data.error)
          } else {
            // Filter to only show notifications for this user
            const userNotifications = (data.notifications || []).filter(
              (n: any) => n.user_id === user.id
            )
            setNotifications(userNotifications)
            const unread = userNotifications.filter((n: any) => !n.is_read).length
            setUnreadNotificationCount(unread)
          }
        } catch (e) {
          console.warn('[client] error fetching notifications:', e)
        }

        // ✅ Ensure jobs are fetched for the logged-in client using the correct column name
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select(`
            *,
            job_applications (
              id,
              job_id,
              status,
              proposed_rate,
              profiles!job_applications_provider_id_fkey (
                id,
                full_name,
                avatar_url,
                location,
                profile_tier,
                avg_rating,
                total_reviews
              )
            )
          `)
          .eq('client_id', user.id)
          .neq('archived', true)
          .order("created_at", { ascending: false });

        if (jobsError) {
          console.error("Error fetching jobs for client dashboard:", makePrintable(jobsError));
          setMyJobs([]);
        } else {
          // Transform job_applications to rename 'profiles' to 'provider' for UI compatibility
          const transformedJobs = (jobsData || []).map((job: any) => ({
            ...job,
            job_applications: (job.job_applications || []).map((app: any) => ({
              ...app,
              provider: app.profiles  // Rename the nested FK expand from 'profiles' to 'provider'
            }))
          }));
          setMyJobs(transformedJobs);
        }

        // ✅ Fetch client's bookings with retry and robust error handling
        const fetchBookingsWithRetries = async (attempts = 2) => {
          let lastErr: any = null
          for (let i = 0; i < attempts; i++) {
            try {
              const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select('*')
                .eq('client_id', user.id)
                .neq('archived', true)
                .order('booking_date', { ascending: false });

              if (bookingsError) {
                lastErr = bookingsError
                const printable = makePrintable(bookingsError)
                // If it's a transient network error, retry once
                if (/networkerror|failed to fetch|network request failed|TypeError: NetworkError/i.test(printable)) {
                  console.warn(`[dashboard] transient network error fetching bookings (attempt ${i + 1}):`, printable)
                  // small backoff
                  await new Promise((r) => setTimeout(r, 300 * (i + 1)))
                  continue
                }

                // Non-network error: log and return empty set
                console.error('[dashboard] Error fetching bookings:', { message: printable, raw: bookingsError })
                return []
              }

              const bookings = bookingsData || []
              if (!bookings.length) return []

              // fetch related services/providers in bulk
              const svcIds = Array.from(new Set(bookings.map((b: any) => b.service_id)))
              const { data: servicesData, error: servicesErr } = await supabase
                .from('services')
                .select('id, provider_id, name, price, duration')
                .in('id', svcIds || [])

              if (servicesErr) {
                console.warn('[dashboard] Warning: failed to bulk-fetch services:', makePrintable(servicesErr))
              }

              const providerIds = Array.from(new Set((servicesData || []).map((s: any) => s.provider_id).filter(Boolean)))
              const { data: providersData, error: providersErr } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, email, phone, location, profile_tier')
                .in('id', providerIds || [])

              if (providersErr) {
                console.warn('[dashboard] Warning: failed to bulk-fetch provider profiles:', makePrintable(providersErr))
              }

              const servicesMap: Record<string, any> = {};
              (servicesData || []).forEach((s: any) => (servicesMap[s.id] = s));
              const providersMap: Record<string, any> = {};
              (providersData || []).forEach((p: any) => (providersMap[p.id] = p));

              const enriched = bookings.map((b: any) => ({
                ...b,
                services: servicesMap[b.service_id] || null,
              }))

              // attach provider profile to services
              enriched.forEach((b: any) => {
                if (b.services && providersMap[b.services.provider_id]) {
                  b.services.profiles = providersMap[b.services.provider_id]
                }
              })

              return enriched
            } catch (e: any) {
              lastErr = e
              const printable = makePrintable(e)
              if (/networkerror|failed to fetch|network request failed|TypeError: NetworkError/i.test(printable)) {
                console.warn(`[dashboard] fetch exception (attempt ${i + 1}), will retry:`, printable)
                await new Promise((r) => setTimeout(r, 300 * (i + 1)))
                continue
              }
              console.error('[dashboard] Unexpected exception fetching bookings:', printable)
              return []
            }
          }
          console.error('[dashboard] Failed to fetch bookings after retries:', makePrintable(lastErr))
          return []
        }

        const enrichedBookings = await fetchBookingsWithRetries(2)
        setBookings(enrichedBookings || [])

        // ✅ Fetch other users
        const { data: usersData, error: usersError } = await supabase
          .from("profiles")
          .select("id, full_name, email, role, avatar_url, profile_tier")
          .neq("id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (usersError) {
          console.error("Error fetching users:", makePrintable(usersError));
        } else {
          setUsers(usersData || []);
        }

        // Fetch reviews submitted by this client (so we can know which bookings/jobs they've reviewed)
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            profiles:reviewee_id ( id, full_name, avatar_url )
          `)
          .eq('client_id', user.id)
          .order('created_at', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', makePrintable(reviewsError));
          setReviews([]);
        } else {
          setReviews(reviewsData || []);
          // populate reviewed id sets
          const b = new Set<string>();
          const j = new Set<string>();
          (reviewsData || []).forEach((r: any) => {
            if (r.booking_id) b.add(r.booking_id);
            if (r.job_id) j.add(r.job_id);
          });
          setReviewedBookingIds(b);
          setReviewedJobIds(j);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", makePrintable(err));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [router]);

  // Subscribe to notifications table for real-time updates
  useEffect(() => {
    if (!user?.id) return;

    let sub: any = null;

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

        sub = notificationsSub
      }
    } catch (e) {
      console.warn("Notifications realtime subscription failed:", e)
    }

    return () => {
      try {
        if (sub && sub.unsubscribe) {
          sub.unsubscribe()
        }
      } catch (e) {
        console.warn("Error unsubscribing notifications:", e)
      }
    }
  }, [user?.id])

  const handleApproveApplication = async (jobId: string, applicationId: string) => {
    try {
      setLoadingAppIds(prev => new Set(prev).add(applicationId));
      // Use the server-side API which validates ownership and handles RLS
      console.log('Approving application:', { jobId, applicationId });
      
      // Include credentials/token so server can authenticate the client
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;
      const bodyPayload: any = { status: 'accepted' };
      if (token) bodyPayload.accessToken = token;

      const res = await fetch(`/api/job-applications/${encodeURIComponent(applicationId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(bodyPayload)
      });

      const endpoint = `/api/job-applications/${encodeURIComponent(applicationId)}`
      const { ok, status, statusText, data: response, raw } = await parseApiResponse(res);
      
      if (!ok) {
        const routeHint = status === 404 ? `API route not found or wrong endpoint: ${endpoint}` : null
        const detailedError = response?.details ? JSON.stringify(response.details) : (response?.error || response || raw || routeHint || `Failed to approve application (status ${status})`);
        console.error('Error approving application:', {
          status,
          statusText,
          error: makePrintable(detailedError),
          response,
          raw,
          endpoint,
        });

        const errorMessage = response?.error
          ? `${response.error}${response.details ? `: ${response.details}` : ''}`
          : detailedError;

        alert(errorMessage);
        return;
      }

      if (!response || !response.id) {
        console.warn('Invalid response data:', response);
        alert('Received invalid response from server. Please refresh and try again.');
        return;
      }

      // When a client approves an application, the job should move into progress
      const jobStatusRes = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: 'in-progress' }),
      });
      if (!jobStatusRes.ok) {
        const jobStatusText = await jobStatusRes.text();
        console.warn('Job status update failed:', jobStatusRes.status, jobStatusText);
      }

      // Update local state
      setMyJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            status: 'in-progress',
            job_applications: job.job_applications.map(app => 
              app.id === applicationId 
                ? { ...app, status: 'accepted' }
                : { ...app, status: app.status === 'pending' ? 'rejected' : app.status }
            )
          };
        }
        return job;
      }));

      alert('Application approved successfully!');
    } catch (err) {
      console.error('Error in handleApproveApplication:', makePrintable(err), err);
      alert('An unexpected error occurred: ' + makePrintable(err));
    } finally {
      setLoadingAppIds(prev => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const handleRejectApplication = async (jobId: string, applicationId: string) => {
    try {
      setLoadingAppIds(prev => new Set(prev).add(applicationId));
      console.log('Rejecting application:', { jobId, applicationId });

      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;
      const bodyPayload: any = { status: 'rejected' };
      if (token) bodyPayload.accessToken = token;

      const res = await fetch(`/api/job-applications/${encodeURIComponent(applicationId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(bodyPayload)
      });

      const endpoint = `/api/job-applications/${encodeURIComponent(applicationId)}`
      const { ok, status, statusText, data: response, raw } = await parseApiResponse(res);

      if (!ok) {
        const routeHint = status === 404 ? `API route not found or wrong endpoint: ${endpoint}` : null
        const detailedError = response?.details ? JSON.stringify(response.details) : (response?.error || response || raw || routeHint || `Failed to reject application (status ${status})`);
        console.error('Error rejecting application:', { status, statusText, error: detailedError, response, raw, endpoint });
        alert(response?.error || detailedError);
        return;
      }

      // Update local state
      setMyJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          return {
            ...job,
            job_applications: job.job_applications.map(app => app.id === applicationId ? { ...app, status: 'rejected' } : app)
          };
        }
        return job;
      }));

      alert('Application rejected.');
    } catch (err) {
      console.error('Error in handleRejectApplication:', makePrintable(err));
      alert('An unexpected error occurred: ' + makePrintable(err));
    } finally {
      setLoadingAppIds(prev => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDeleteAccount = async () => {
    if (!profile?.email || deleteEmailConfirm !== profile.email) {
      alert('Please enter your email correctly to confirm account deletion.');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        alert('Error deleting account: ' + (data.error || 'Unknown error'));
        setDeleting(false);
        setShowDeleteConfirm(false);
        setDeleteEmailConfirm('');
        return;
      }

      alert('Your account has been permanently deleted.');
      window.location.href = '/';
    } catch (err: any) {
      alert('Error deleting account: ' + err.message);
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteEmailConfirm('');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!jobId) return;
    if (!confirm(`Permanently delete this job? This cannot be undone.`)) return;
    setDeletingJobIds(prev => new Set(prev).add(jobId));
    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });

      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null } catch (e) { body = text }

      if (!res.ok) {
        // Handle empty responses or malformed error objects
        let errMsg = 'Failed to delete job';
        if (body && typeof body === 'object' && Object.keys(body).length > 0) {
          errMsg = body.error || body.details || body.message || JSON.stringify(body);
        } else if (typeof body === 'string' && body.trim()) {
          errMsg = body;
        } else if (text && text.trim()) {
          errMsg = text;
        }
        
        console.error('Delete job failed:', {
          status: res.status,
          statusText: res.statusText,
          body,
          raw: text,
          jobId,
          bodyType: typeof body,
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A'
        });
        alert(errMsg);
        return;
      }

      setMyJobs(prev => (prev || []).filter(j => j.id !== jobId));
      alert('Job deleted successfully');
    } catch (err) {
      console.error('Error deleting job:', err);
      alert('Failed to delete job: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleUpdateJobStatus = async (jobId: string, newStatus: 'open' | 'closed' | 'in-progress' | 'completed') => {
    if (!jobId) return;
    setUpdatingJobIds(prev => new Set(prev).add(jobId));
    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const token = session?.access_token || (session as any)?.accessToken || null;

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status: newStatus }),
      });

      const text = await res.text();
      let body: any = null;
      try { body = text ? JSON.parse(text) : null } catch (e) { body = text || null }

      if (!res.ok) {
        // Handle empty responses or malformed error objects
        let errMsg = 'Failed to update job status';
        if (body && typeof body === 'object' && Object.keys(body).length > 0) {
          errMsg = body.error || body.details || body.message || JSON.stringify(body);
        } else if (typeof body === 'string' && body.trim()) {
          errMsg = body;
        } else if (text && text.trim()) {
          errMsg = text;
        }

        console.error('Update job status failed:', {
          status: res.status,
          statusText: res.statusText,
          body,
          raw: text,
          jobId,
          newStatus,
          bodyType: typeof body,
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : 'N/A'
        });
        alert(errMsg);
        return;
      }

      // Update local state
      setMyJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, status: newStatus } : job
      ));
      
      let statusText = 'updated';
      if (newStatus === 'closed') statusText = 'closed';
      else if (newStatus === 'open') statusText = 'reopened';
      else if (newStatus === 'in-progress') statusText = 'moved to in-progress';
      else if (newStatus === 'completed') statusText = 'completed';
      alert(`Job ${statusText} successfully`);
    } catch (err) {
      console.error('Error updating job status:', err);
      alert('Failed to update job status: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleCompleteJob = async (jobId: string, providerId?: string) => {
    if (!jobId) return;
    setUpdatingJobIds(prev => new Set(prev).add(jobId));
    try {
      console.log('Starting job completion for:', jobId);

      const res = await fetch('/api/jobs/complete', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      console.log('Fetch response received, status:', res.status);

      if (!res) {
        console.error('Response is null/undefined');
        alert('Failed to complete job: No response from server');
        return;
      }

      // Check if res is actually a Response object
      if (!(res instanceof Response)) {
        console.error('Response is not a Response object:', res);
        alert('Failed to complete job: Invalid response from server');
        return;
      }

      const text = await res.text();
      console.log('Response text length:', text.length);

      let body: any = null;
      try { body = text ? JSON.parse(text) : null } catch (e) { 
        console.log('Failed to parse JSON, using text as body');
        body = text || null;
      }

      if (!res.ok) {
        // Handle empty responses or malformed error objects
        let errMsg = 'Failed to complete job';
        if (body && typeof body === 'object' && Object.keys(body).length > 0) {
          errMsg = body.error || body.details || body.message || JSON.stringify(body);
        } else if (typeof body === 'string' && body.trim()) {
          errMsg = body;
        } else if (text && text.trim()) {
          errMsg = text;
        }

        console.error('Complete job failed:', errMsg);
        alert(`Failed to complete job: ${errMsg}`);
        return;
      }

      // Check for success response
      if (body && typeof body === 'object' && body.success) {
        console.log('Job completed successfully');
        setMyJobs(prev => prev.map(job => job.id === jobId ? { ...job, status: 'completed' } : job));
        alert('Job marked completed.');

        if (providerId) {
          setReviewContext({ type: 'job', id: jobId, provider_id: providerId });
          setReviewModalOpen(true);
        }
      } else {
        console.error('Unexpected response format:', body);
        alert('Job completion response format unexpected');
      }
    } catch (err) {
      console.error('Error completing job:', err);
      alert('Failed to complete job: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUpdatingJobIds(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!bookingId) return;
    if (!confirm(`Permanently delete this booking? This cannot be undone.`)) return;
    setDeletingBookingIds(prev => new Set(prev).add(bookingId));
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
        
        console.error('Delete booking failed:', {
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

      setBookings(prev => (prev || []).filter(b => b.id !== bookingId));
      if (openBookingChatId === bookingId) {
        setOpenBookingChatId(null);
      }
      alert('Booking deleted successfully');
    } catch (err) {
      console.error('Error deleting booking:', err);
      alert('Failed to delete booking: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingBookingIds(prev => {
        const next = new Set(prev);
        next.delete(bookingId);
        return next;
      });
    }
  };

  const handleBookService = async (service: Service) => {
    if (!service || !service.id) {
      alert('Invalid service');
      return;
    }

    if (!profile?.id) {
      alert('Please complete your profile before booking');
      return;
    }

    // Navigate to booking page with service info
    router.push(`/bookings/new?service_id=${service.id}&provider_id=${service.provider_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Gradient Header with Glassmorphism */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5wYXRoIj48ZyBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiPjxwYXRoIGQ9Ik0zNiAwQzU3LjUgMCA3NSAxNy41IDc1IDM1YzAgMTcuNS0xNy41IDM1LTM5IDM1UzI3IDUyLjUgMjAgMzVjLTE3LjUgMC0zNS0xNy41LTM1LTM1YzAtMTcuNSAxNy41LTM1IDM1LTM1eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/80">Client Dashboard</p>
              <h1 className="mt-3 text-4xl font-bold text-white drop-shadow-lg">Welcome back, {profile?.full_name || 'Client'}</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/90">
                View your current job postings, track bookings, and connect with trusted service providers.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/jobs/post">
                <Button className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-lg hover:shadow-xl transition-all">
                  <Plus className="w-4 h-4" /> Post Job
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
                  <p className="text-sm text-white/70">Jobs posted</p>
                  <p className="mt-1 text-3xl font-bold text-white">{myJobs.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Bookings</p>
                  <p className="mt-1 text-3xl font-bold text-white">{bookings.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/20 rounded-lg">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Reviews</p>
                  <p className="mt-1 text-3xl font-bold text-white">{reviews.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-5 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-500/20 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/70">Services seen</p>
                  <p className="mt-1 text-3xl font-bold text-white">{services.length}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">My jobs</h2>
                    <p className="text-sm text-slate-500">Your most recent job requests and incoming applications.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/jobs">
                    <Button size="sm" variant="outline">View all</Button>
                  </Link>
                  <Link href="/jobs/post">
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                      <Plus className="w-4 h-4 mr-2" /> Post job
                    </Button>
                  </Link>
                </div>
              </div>

              {myJobs.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  You have not posted any jobs yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {myJobs.slice(0, 5).map((job) => {
                    const acceptedApplication = job.job_applications.find((app) => app.status === 'accepted');
                    const canMarkComplete = !!acceptedApplication && job.status !== 'completed';
                    return (
                      <div key={job.id} className="rounded-3xl border border-border bg-card p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-base font-semibold text-foreground">{job.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{job.location}</p>
                        </div>
                        <div className="text-sm text-right">
                          <p className="font-semibold text-foreground">KES {job.budget.toLocaleString()}</p>
                          <p className="mt-1 text-muted-foreground">Status: {job.status}</p>
                        </div>
                      </div>

                      {/* Job Management Buttons */}
                      <div className="mt-4 flex flex-wrap gap-2 pb-4 border-b border-border">
                        <Link href={`/jobs/${job.id}/edit`}>
                          <Button size="sm" variant="outline" disabled={deletingJobIds.has(job.id) || updatingJobIds.has(job.id)}>
                            Edit
                          </Button>
                        </Link>
                        {(job.status === 'open' || job.status === 'in-progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateJobStatus(job.id, 'closed')}
                            disabled={deletingJobIds.has(job.id) || updatingJobIds.has(job.id)}
                            className="text-yellow-600 hover:text-yellow-700"
                          >
                            {updatingJobIds.has(job.id) ? 'Closing...' : 'Close Job'}
                          </Button>
                        )}
                        {job.status === 'closed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateJobStatus(job.id, 'open')}
                            disabled={deletingJobIds.has(job.id) || updatingJobIds.has(job.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            {updatingJobIds.has(job.id) ? 'Reopening...' : 'Reopen Job'}
                          </Button>
                        )}
                        {canMarkComplete && acceptedApplication?.provider?.id && (
                          <Button
                            size="sm"
                            className="text-white bg-green-600 hover:bg-green-700"
                            onClick={() => handleCompleteJob(job.id, acceptedApplication.provider.id)}
                            disabled={updatingJobIds.has(job.id)}
                          >
                            {updatingJobIds.has(job.id) ? 'Completing...' : 'Mark as Completed'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteJob(job.id)}
                          disabled={deletingJobIds.has(job.id) || updatingJobIds.has(job.id)}
                        >
                          {deletingJobIds.has(job.id) ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>

                      {job.job_applications.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No applications yet for this job.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <p className="text-sm font-medium text-foreground">
                            {job.job_applications.length} application{job.job_applications.length !== 1 ? 's' : ''}
                          </p>
                          <div className="space-y-3">
                            {job.job_applications.map((application) => (
                              <div key={application.id} className="rounded-3xl border border-border bg-background p-4 shadow-sm">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="flex items-center gap-3">
                                    <Avatar
                                      src={application.provider?.avatar_url || null}
                                      alt={application.provider?.full_name || 'Worker'}
                                      size={40}
                                      tier={application.provider?.profile_tier as any}
                                      showBadge={false}
                                    />
                                    <div>
                                      <p className="font-semibold text-foreground">{application.provider?.full_name || 'Worker'}</p>
                                      <p className="text-sm text-muted-foreground">{application.provider?.location || 'No location'}</p>
                                      {application.provider?.avg_rating !== undefined && (
                                        <p className="text-sm text-muted-foreground">Rating: {application.provider.avg_rating.toFixed(1)} / 5</p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-start gap-2 text-right sm:items-end">
                                    <p className="text-sm text-foreground">Proposed rate</p>
                                    <p className="text-lg font-semibold">KES {application.proposed_rate.toLocaleString()}</p>
                                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{application.status}</span>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedApplication({ ...application, jobs: { id: job.id, title: job.title, description: job.description, location: job.location, budget: job.budget } })}>
                                    View details
                                  </Button>
                                  {application.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleApproveApplication(job.id, application.id)}
                                      disabled={loadingAppIds.has(application.id)}
                                    >
                                      {loadingAppIds.has(application.id) ? 'Approving...' : 'Approve'}
                                    </Button>
                                  )}
                                  {application.status === 'pending' && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => setRejectConfirm({
                                        jobId: job.id,
                                        applicationId: application.id,
                                        providerName: application.provider?.full_name || 'worker',
                                      })}
                                      disabled={loadingAppIds.has(application.id)}
                                    >
                                      Reject
                                    </Button>
                                  )}
                                  {application.status === 'accepted' && application.provider?.id && job.status !== 'completed' && (
                                    <Button
                                      size="sm"
                                      className="text-white bg-green-600 hover:bg-green-700"
                                      onClick={() => handleCompleteJob(job.id, application.provider.id)}
                                      disabled={updatingJobIds.has(job.id)}
                                    >
                                      Mark as Completed
                                    </Button>
                                  )}
                                </div>
                                {application.status === 'accepted' && application.provider?.id && (
                                  <div className="mt-3">
                                    {openJobChatAppId === application.id ? (
                                      <div className="space-y-3">
                                        <JobChat
                                          jobId={job.id}
                                          jobApplicationId={application.id}
                                          recipientId={application.provider.id}
                                          recipientName={application.provider.full_name}
                                          currentUserId={user?.id || ''}
                                          onUnreadCountChange={(count) => setUnreadCounts((prev) => ({ ...prev, [application.id]: count }))}
                                        />
                                        <Button size="sm" variant="outline" className="w-full" onClick={() => setOpenJobChatAppId(null)}>
                                          Close chat
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="relative"
                                        onClick={() => setOpenJobChatAppId(application.id)}
                                      >
                                        Chat
                                        {unreadCounts[application.id] > 0 && (
                                          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                                            {unreadCounts[application.id]}
                                          </span>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {job.status === 'completed' && acceptedApplication?.provider?.id && !reviewedJobIds.has(job.id) && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="w-full text-white bg-primary hover:bg-primary/90"
                            onClick={() => {
                              setReviewContext({ type: 'job', id: job.id, provider_id: acceptedApplication.provider.id });
                              setReviewModalOpen(true);
                            }}
                          >
                            Leave a review for worker
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Recent bookings</h2>
                    <p className="text-sm text-slate-500">Track your latest service requests.</p>
                  </div>
                </div>
              </div>
              {bookings.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  No bookings have been made yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="rounded-3xl border border-border p-4 bg-background">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{booking.services?.name || 'Booking'}</p>
                          <p className="text-sm text-muted-foreground">{booking.status} • {new Date(booking.booking_date).toLocaleDateString()}</p>
                          {booking.services?.profiles && (
                            <p className="mt-2 text-sm text-muted-foreground">Provider: {booking.services.profiles.full_name}</p>
                          )}
                        </div>
                        {booking.services?.profiles && (
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={booking.services.profiles.avatar_url || null}
                              alt={booking.services.profiles.full_name}
                              size={40}
                              tier={booking.services.profiles.profile_tier as any}
                              showBadge={false}
                            />
                            <div className="flex-1">
                              <WorkImageGallery userId={booking.services.profiles.id} showTitle="Provider's Work Gallery" />
                            </div>
                          </div>
                        )}
                      </div>
                      {booking.status === 'pending' && (
                        <div className="mt-4 space-y-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleDeleteBooking(booking.id)}
                            disabled={deletingBookingIds.has(booking.id)}
                          >
                            {deletingBookingIds.has(booking.id) ? 'Deleting...' : 'Delete Booking'}
                          </Button>
                        </div>
                      )}
                      {booking.status === 'approved' && booking.services?.profiles?.id && (
                        <div className="mt-4 space-y-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/bookings/approve', {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ bookingId: booking.id, status: 'completed' }),
                                  });
                                  const result = await res.json();
                                  if (!res.ok) {
                                    alert(result.error || 'Failed to complete booking');
                                    return;
                                  }
                                  setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'completed' } : b));
                                  alert('Booking marked as complete!');
                                } catch (err) {
                                  console.error('Error completing booking:', err);
                                  alert('Failed to complete booking');
                                }
                              }}
                            >
                              Mark Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => setOpenBookingChatId(booking.id)}
                            >
                              Chat
                              {unreadCounts[booking.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                                  {unreadCounts[booking.id]}
                                </span>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      {/* Chat for approved bookings */}
                      {openBookingChatId === booking.id && booking.services?.profiles?.id && (
                        <div className="mt-4">
                          <JobChat
                            bookingId={booking.id}
                            recipientId={booking.services.profiles.id}
                            recipientName={booking.services.profiles.full_name}
                            currentUserId={user?.id || ''}
                            context="booking"
                            onUnreadCountChange={(count) => setUnreadCounts((prev) => ({ ...prev, [booking.id]: count }))}
                          />
                          <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => setOpenBookingChatId(null)}>
                            Close chat
                          </Button>
                        </div>
                      )}
                      {booking.status === 'completed' && booking.services?.profiles?.id && (
                        <div className="mt-4 space-y-2">
                          {!reviewedBookingIds.has(booking.id) && (
                            <Button
                              size="sm"
                              className="w-full bg-primary text-white"
                              onClick={() => {
                                setReviewContext({ type: 'booking', id: booking.id, provider_id: booking.services.profiles.id });
                                setReviewModalOpen(true);
                              }}
                            >
                              Review worker
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleDeleteBooking(booking.id)}
                            disabled={deletingBookingIds.has(booking.id)}
                          >
                            {deletingBookingIds.has(booking.id) ? 'Deleting...' : 'Delete Booking'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6 xl:col-span-1 xl:sticky xl:top-24">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Quick links</h3>
              </div>
              <div className="space-y-2 text-sm text-slate-500">
                <Link href="/dashboard/client">
                  <Button size="sm" className="w-full justify-start bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                    Dashboard home
                  </Button>
                </Link>
                <Link href="/jobs/post">
                  <Button size="sm" className="w-full justify-start bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                    Post new job
                  </Button>
                </Link>
                <Link href="/services">
                  <Button size="sm" className="w-full justify-start bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl">
                    Browse services
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Your profile</h2>
                  <p className="text-sm text-slate-500">Keep your client details up to date.</p>
                </div>
              </div>
              <div className="mt-5 space-y-5">
                <div className="flex items-center gap-4">
                  <Avatar src={profile?.avatar_url || null} alt={profile?.full_name || 'Client'} size={56} tier={profile?.profile_tier as any} />
                  <div>
                    <p className="font-semibold text-slate-800">{profile?.full_name || 'Unknown Client'}</p>
                    <p className="text-sm text-slate-500">{profile?.email || 'No email available'}</p>
                    {profile?.location && <p className="text-sm text-slate-500">{profile.location}</p>}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-sm text-slate-500">Total jobs</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{myJobs.length}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="text-sm text-slate-500">Active bookings</p>
                    <p className="mt-2 text-2xl font-bold text-slate-800">{bookings.length}</p>
                  </div>
                </div>

                <div className="grid gap-3">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl" onClick={() => setEditProfileOpen(true)}>
                    <Pencil className="w-4 h-4 mr-2" /> Edit profile
                  </Button>
                  <Link href="/jobs/post">
                    <Button className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl" variant="outline">
                      Post a job
                    </Button>
                  </Link>
                  <Button className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all rounded-xl" variant="ghost" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                </div>
              </div>
            </Card>

            {profile?.id && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">My work images</h3>
                </div>
                <WorkImageUploader userId={profile.id} />
              </Card>
            )}

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Quick stats</h2>
              </div>
              <div className="space-y-3 text-sm text-slate-500">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Jobs posted</span>
                  <span className="font-bold text-slate-800">{myJobs.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Bookings</span>
                  <span className="font-bold text-slate-800">{bookings.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Reviews</span>
                  <span className="font-bold text-slate-800">{reviews.length}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <span>Services seen</span>
                  <span className="font-bold text-slate-800">{services.length}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl cursor-pointer hover:shadow-2xl transition-all" onClick={() => setNotificationPanelOpen(true)}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
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
                    <div key={notification.id} className={`p-3 rounded-xl ${notification.is_read ? 'bg-slate-50 border-l-4 border-slate-300' : 'bg-blue-50 border-l-4 border-blue-500'}`}>
                      <p className="text-sm font-bold text-slate-800">{notification.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{notification.message}</p>
                      <p className="text-xs text-slate-400 mt-2">{new Date(notification.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <p className="text-sm text-green-700 font-medium">✨ You're all caught up!</p>
                  <p className="text-xs text-green-600 mt-1">Check back for new updates.</p>
                </div>
              )}
            </Card>

            {/* Service Search Section */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Search Services</h2>
              </div>
              
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for services (e.g., plumbing, cleaning, electrical)..."
                    value={serviceSearchQuery}
                    onChange={(e) => {
                      const query = e.target.value;
                      setServiceSearchQuery(query);
                      if (query.trim()) {
                        const filtered = services.filter((service) => {
                          const searchLower = query.toLowerCase();
                          return (
                            service.name?.toLowerCase().includes(searchLower) ||
                            service.category?.toLowerCase().includes(searchLower) ||
                            service.description?.toLowerCase().includes(searchLower) ||
                            service.profiles?.full_name?.toLowerCase().includes(searchLower)
                          );
                        });
                        setFilteredServices(filtered);
                        setIsSearching(true);
                      } else {
                        setFilteredServices([]);
                        setIsSearching(false);
                      }
                    }}
                    className="w-full px-4 py-3 pl-12 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Search Results or Default Services */}
              {serviceSearchQuery.trim() ? (
                isSearching ? (
                  filteredServices.length > 0 ? (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-500 mb-2">Found {filteredServices.length} service(s)</p>
                      {filteredServices.map((service) => (
                        <div key={service.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                          <div className="flex items-start gap-3">
                            <Avatar 
                              src={service.profiles?.avatar_url || null} 
                              alt={service.profiles?.full_name || 'Provider'} 
                              size={48} 
                              tier={service.profiles?.profile_tier as any} 
                              showBadge={false} 
                            />
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{service.name}</p>
                              <p className="text-sm text-slate-500">KES {service.price?.toLocaleString()} • {service.duration}</p>
                              <p className="text-sm text-slate-600">By {service.profiles?.full_name}</p>
                              {service.category && (
                                <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                  {service.category}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Link 
                              href={`/services/${service.id}`}
                              className="flex-1 px-4 py-2 text-center border border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                            >
                              View
                            </Link>
                            <button 
                              onClick={() => handleBookService(service)}
                              className="flex-1 px-4 py-2 text-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                              Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-sm text-slate-500">No services found matching "{serviceSearchQuery}"</p>
                      <p className="text-xs text-slate-400 mt-1">Try different keywords or browse recommended services below</p>
                    </div>
                  )
                ) : null
              ) : (
                <div>
                  <p className="text-sm text-slate-500 mb-3">Browse all available services:</p>
                  {services.length === 0 ? (
                    <p className="text-sm text-slate-500">No services available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {services.slice(0, 5).map((service) => (
                        <div key={service.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                          <div className="flex items-start gap-3">
                            <Avatar 
                              src={service.profiles?.avatar_url || null} 
                              alt={service.profiles?.full_name || 'Provider'} 
                              size={48} 
                              tier={service.profiles?.profile_tier as any} 
                              showBadge={false} 
                            />
                            <div className="flex-1">
                              <p className="font-bold text-slate-800">{service.name}</p>
                              <p className="text-sm text-slate-500">KES {service.price?.toLocaleString()} • {service.duration}</p>
                              <p className="text-sm text-slate-600">By {service.profiles?.full_name}</p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-4">
                            <Link 
                              href={`/services/${service.id}`}
                              className="flex-1 px-4 py-2 text-center border border-indigo-500 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
                            >
                              View
                            </Link>
                            <button 
                              onClick={() => handleBookService(service)}
                              className="flex-1 px-4 py-2 text-center bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                              Book
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Recommended services</h2>
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-slate-500">No services available to recommend yet.</p>
              ) : (
                <div className="space-y-4">
                  {services.map((service) => (
                    <Link key={service.id} href={`/profile/${service.profiles.id}`} className="block">
                      <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Avatar 
                            src={service.profiles.avatar_url || null} 
                            alt={service.profiles.full_name} 
                            size={48} 
                            tier={service.profiles.profile_tier as any} 
                            showBadge={false} 
                          />
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{service.name}</p>
                            <p className="text-sm text-slate-500">KES {service.price.toLocaleString()} • {service.duration}</p>
                            <p className="text-sm text-slate-600">By {service.profiles.full_name}</p>
                          </div>
                        </div>
                        {service.profiles.id && (
                          <div className="mt-3">
                            <WorkImageGallery userId={service.profiles.id} showTitle="Provider's Work" />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Recent visitors</h2>
              </div>
              {users.length === 0 ? (
                <p className="text-sm text-slate-500">No users to show yet.</p>
              ) : (
                <div className="space-y-4">
                  {users.slice(0, 4).map((other) => (
                    <Link key={other.id} href={`/profile/${other.id}`} className="block">
                      <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 bg-slate-50 hover:bg-slate-100 hover:shadow-md transition-all cursor-pointer">
                        <Avatar src={other.avatar_url || null} alt={other.full_name} size={48} tier={other.profile_tier as any} showBadge={false} />
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{other.full_name}</p>
                          <p className="text-sm text-slate-500">{other.location || other.email || 'Client'}</p>
                        </div>
                      </div>
                      {other.id && (
                        <div className="mt-2">
                          <WorkImageGallery userId={other.id} showTitle="Work Gallery" />
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {rejectConfirm && (
        <ConfirmModal
          open={true}
          title="Reject application"
          message={`Reject the application from ${rejectConfirm.providerName}? This action cannot be undone.`}
          confirmLabel="Reject"
          onClose={() => setRejectConfirm(null)}
          onConfirm={() => {
            if (rejectConfirm) {
              handleRejectApplication(rejectConfirm.jobId, rejectConfirm.applicationId);
              setRejectConfirm(null);
            }
          }}
        />
      )}

      {selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-2xl p-6 relative">
            <Button
              variant="ghost"
              className="absolute right-4 top-4"
              onClick={() => setSelectedApplication(null)}
            >
              Close
            </Button>
            <div className="space-y-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-primary">Application details</p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">{selectedApplication.jobs?.title || 'Job application'}</h3>
                <p className="text-sm text-muted-foreground">{selectedApplication.provider?.full_name || 'Provider details'}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-border p-4 bg-background">
                  <p className="text-sm text-muted-foreground">Proposed Rate</p>
                  <p className="mt-2 text-xl font-semibold">KES {selectedApplication.proposed_rate.toLocaleString()}</p>
                </div>
                <div className="rounded-2xl border border-border p-4 bg-background">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="mt-2 text-xl font-semibold capitalize">{selectedApplication.status}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-border p-4 bg-muted/50">
                <p className="text-sm text-muted-foreground">Provider</p>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar
                    src={selectedApplication.provider?.avatar_url || null}
                    alt={selectedApplication.provider?.full_name || 'Provider'}
                    size={48}
                    tier={selectedApplication.provider?.profile_tier as any}
                    showBadge={false}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{selectedApplication.provider?.full_name || 'Unknown provider'}</p>
                    <p className="text-sm text-muted-foreground">{selectedApplication.provider?.location || 'No location provided'}</p>
                  </div>
                </div>
                {selectedApplication.provider?.id && (
                  <div className="mt-4">
                    <WorkImageGallery userId={selectedApplication.provider.id} showTitle="Provider's Work Gallery" />
                  </div>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (selectedApplication) {
                      handleApproveApplication(selectedApplication.job_id, selectedApplication.id);
                      setSelectedApplication(null);
                    }
                  }}
                  disabled={selectedApplication.status !== 'pending' || loadingAppIds.has(selectedApplication.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (selectedApplication) {
                      setRejectConfirm({
                        jobId: selectedApplication.job_id,
                        applicationId: selectedApplication.id,
                        providerName: selectedApplication.provider?.full_name || 'worker',
                      });
                      setSelectedApplication(null);
                    }
                  }}
                  disabled={selectedApplication.status !== 'pending'}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <ReviewModal
        open={reviewModalOpen}
        title="Review Worker"
        revieweeId={reviewContext?.provider_id || ''}
        onClose={() => {
          setReviewModalOpen(false);
          setReviewContext(null);
        }}
        onSubmit={async (payload: { rating: number; comment: string; revieweeId: string }) => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.id) {
              console.error('[client review] No active session found');
              alert('Please log in to submit a review');
              return;
            }

            if (!reviewContext?.id || !reviewContext?.provider_id) {
              console.error('[client review] Invalid review context:', reviewContext);
              alert('Missing required review information. Please try again.');
              setReviewModalOpen(false);
              return;
            }

            const token = session?.access_token || (session as any)?.accessToken || null;
            const bodyPayload: any = { revieweeId: reviewContext.provider_id, rating: payload.rating, comment: payload.comment, reviewerRole: 'client' };
            if (reviewContext.type === 'booking') bodyPayload.bookingId = reviewContext.id;
            if (reviewContext.type === 'job') bodyPayload.jobId = reviewContext.id;
            if (token) bodyPayload.accessToken = token;

            const res = await fetch('/api/reviews', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
              body: JSON.stringify(bodyPayload),
            });

            const text = await res.text();
            let result: any = null;
            try { result = text ? JSON.parse(text) : null; } catch (e) { result = text || null; }

            console.log('[client review] Response received:', { status: res.status, ok: res.ok, resultType: typeof result, resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A' });

            if (!res.ok) {
              // Robust error message extraction
              let errorMessage = `Server error (${res.status}): ${res.statusText || 'Unknown error'}`;
              
              try {
                if (result) {
                  if (typeof result === 'string' && result.trim().length > 0) {
                    errorMessage = result;
                  } else if (typeof result === 'object') {
                    // Try multiple error message sources in order of preference
                    if (result.error && typeof result.error === 'string' && result.error.trim().length > 0) {
                      errorMessage = result.error;
                    } else if (result.details?.message && typeof result.details.message === 'string' && result.details.message.trim().length > 0) {
                      errorMessage = result.details.message;
                    } else if (result.message && typeof result.message === 'string' && result.message.trim().length > 0) {
                      errorMessage = result.message;
                    } else if (result.details && typeof result.details === 'object' && Object.keys(result.details).length > 0) {
                      // Fallback to serialized details if it's a non-empty object
                      const detailsStr = JSON.stringify(result.details);
                      if (detailsStr && detailsStr.length > 2) {
                        errorMessage = detailsStr;
                      }
                    }
                  }
                }
              } catch (e) {
                console.warn('[client review] Error extracting error message:', e);
                // Continue with default error message
              }
              
              // Ensure error message is never empty
              if (!errorMessage || errorMessage.trim().length === 0) {
                errorMessage = `Failed to submit review (HTTP ${res.status})`;
              }
              
              console.error('[client review] Error submitting review (server):', errorMessage);
              throw new Error(errorMessage);
            }

            const reviewData = result?.data || result;
            if (!reviewData || (typeof reviewData === 'object' && Object.keys(reviewData).length === 0)) {
              console.error('[client review] Invalid review data returned from server:', reviewData);
              throw new Error('Server returned empty review data');
            }
            
            if (reviewData) {
              const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .eq('id', reviewContext.provider_id)
                .single();
              if (profileData) reviewData.profiles = profileData;
            }

            setReviews((prev) => [reviewData, ...(prev || [])]);
            if (reviewContext.type === 'booking') {
              setReviewedBookingIds((prev) => new Set(Array.from(prev).concat([reviewContext.id])));
            }
            if (reviewContext.type === 'job') {
              setReviewedJobIds((prev) => new Set(Array.from(prev).concat([reviewContext.id])));
            }

            setReviewModalOpen(false);
            setReviewContext(null);
            alert('Thank you for your review!');
          } catch (error: any) {
            let errorMessage = 'Failed to submit review';
            
            // Extract message from error object with multiple fallbacks
            if (error instanceof Error) {
              if (error.message && typeof error.message === 'string' && error.message.trim().length > 0) {
                errorMessage = error.message;
              }
            } else if (typeof error === 'string' && error.trim().length > 0) {
              errorMessage = error;
            } else if (error && typeof error === 'object') {
              if (error.message && typeof error.message === 'string' && error.message.trim().length > 0) {
                errorMessage = error.message;
              }
            }
            
            // Final check - ensure message is never empty
            if (!errorMessage || errorMessage.trim().length === 0) {
              errorMessage = 'Failed to submit review';
            }
            
            console.error('[client review] Review submission error:', errorMessage);
            alert(errorMessage);
          }
        }}
      />

      {/* Edit Profile Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <Card className="max-w-lg w-full p-6 border-destructive/50">
            <h2 className="text-2xl font-bold text-destructive mb-3">⚠️ Delete Account Permanently</h2>
            <p className="text-sm text-foreground mb-4">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">Confirm your email</label>
              <input
                type="email"
                value={deleteEmailConfirm}
                onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                placeholder="Enter your email to confirm"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1" disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteAccount} className="flex-1" disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editProfileOpen && (
        <EditProfileModal
          isOpen={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          profile={profile}
          onSave={(updatedProfile) => setProfile(updatedProfile)}
        />
      )}

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
  );
};

export default ClientDashboard;
