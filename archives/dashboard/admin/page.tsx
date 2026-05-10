"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import ConfirmModal from "@/components/ui/confirm-modal"
import { Button } from "@/components/ui/button"
import { Users, Briefcase, FileText, Package, Star, AlertCircle, TrendingUp, LogOut, User, ChevronRight, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"
import EditProfileModal from "@/components/EditProfileModal"

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalJobs: number
  activeJobs: number
  totalApplications: number
  pendingApplications: number
  totalServices: number
  totalReviews: number
  averageRating: number
  topWorkerByRating: string | null
}

interface TopProvider {
  full_name: string
  rating: number
  reviews: number
  service?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [topProviders, setTopProviders] = useState<TopProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle()

        if (isMounted) {
          setProfile(profileData)
          setLoading(true)
        }

        const res = await fetch("/api/admin/dashboard/stats")
        if (!res.ok) throw new Error("Failed to fetch stats")
        const data = await res.json()

        if (isMounted) {
          setStats(data)
        }

        const { data: reviews } = await supabase
          .from("reviews")
          .select("reviewee_id, rating, profiles(full_name)")
          .order("rating", { ascending: false })

        const ratingMap = new Map<string, { name: string; total: number; count: number }>()
        ;(reviews || []).forEach((review: any) => {
          if (review.reviewee_id && review.profiles) {
            if (!ratingMap.has(review.reviewee_id)) {
              ratingMap.set(review.reviewee_id, {
                name: review.profiles.full_name || "Unknown",
                total: 0,
                count: 0,
              })
            }
            const current = ratingMap.get(review.reviewee_id)!
            current.total += review.rating
            current.count += 1
          }
        })

        const topList = Array.from(ratingMap.values())
          .map(item => ({
            full_name: item.name,
            rating: item.total / item.count,
            reviews: item.count,
          }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 4)

        if (isMounted) {
          setTopProviders(topList)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message)
        }
        console.error("Error fetching dashboard data:", err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchDashboardData()

    const subscriptions: any[] = []
    const setupSubscriptions = () => {
      try {
        const tables = ["profiles", "jobs", "job_applications", "bookings", "reviews", "services"]
        tables.forEach(table => {
          const channel = supabase
            .channel(`admin:${table}`)
            .on("postgres_changes", { event: "*", schema: "public", table }, () => {
              fetchDashboardData()
            })
            .subscribe()

          subscriptions.push(channel)
        })
      } catch (subscriptionError) {
        console.error("Error setting up subscriptions:", subscriptionError)
      }
    }

    setupSubscriptions()

    return () => {
      isMounted = false
      subscriptions.forEach(channel => supabase.removeChannel(channel))
    }
  }, [router])

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'Failed to delete account')
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: any) {
      alert('Error deleting account: ' + (err?.message || err))
    } finally {
      setDeletingAccount(false)
    }
  }

  const StatCard = ({ icon: Icon, label, value, trend, href, bgColor }: any) => (
    <Link href={href || "#"}>
      <Card className={`p-6 cursor-pointer hover:shadow-xl transition-shadow border border-slate-800 bg-slate-900/90 ${bgColor}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-300 mb-2">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {trend && <p className="text-xs text-emerald-300 mt-2">↑ {trend}</p>}
          </div>
          <div className="p-3 rounded-2xl bg-white/10 text-slate-100">
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </Card>
    </Link>
  )

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>
  if (error) return <div className="p-6 text-center text-red-600">Error: {error}</div>
  if (!stats) return <div className="p-6 text-center">No data available</div>

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto min-h-screen bg-slate-950 text-slate-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview of platform activity and metrics</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setEditProfileOpen(true)}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            Edit Profile
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
          <Button
            onClick={() => supabase.auth.signOut().then(() => router.push("/login"))}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers}
          trend="+12% from last 30 days"
          href="/dashboard/admin/users"
          bgColor="bg-gradient-to-br from-purple-500/10 to-purple-600/10"
        />
        <StatCard
          icon={Users}
          label="Active Users"
          value={stats.activeUsers}
          trend="+8% from last 30 days"
          href="/dashboard/admin/users"
          bgColor="bg-gradient-to-br from-blue-500/10 to-blue-600/10"
        />
        <StatCard
          icon={Briefcase}
          label="Total Jobs"
          value={stats.totalJobs}
          trend="+20% from last 30 days"
          href="/dashboard/admin/jobs"
          bgColor="bg-gradient-to-br from-green-500/10 to-green-600/10"
        />
        <StatCard
          icon={Briefcase}
          label="Active Jobs"
          value={stats.activeJobs}
          trend="No change"
          href="/dashboard/admin/jobs"
          bgColor="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FileText}
          label="Applications"
          value={stats.totalApplications}
          href="/dashboard/admin/applications"
          bgColor="bg-gradient-to-br from-pink-500/10 to-pink-600/10"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          value={stats.pendingApplications}
          trend="Action needed"
          href="/dashboard/admin/applications"
          bgColor="bg-gradient-to-br from-orange-500/10 to-orange-600/10"
        />
        <StatCard
          icon={Package}
          label="Services"
          value={stats.totalServices}
          trend="+15% from last 30 days"
          href="/dashboard/admin/services"
          bgColor="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={stats.averageRating.toFixed(2)}
          trend={`${stats.totalReviews} reviews`}
          href="/dashboard/admin/reviews"
          bgColor="bg-gradient-to-br from-rose-500/10 to-rose-600/10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-800 bg-slate-900/90 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-cyan-300" />
              Quick Actions
            </h2>
          </div>
          <div className="space-y-3">
            <Link href="/dashboard/admin/users" className="block">
              <div className="w-full text-left p-3 rounded-2xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 transition flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-300" />
                  <span className="font-medium text-slate-100">View All Users</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/dashboard/admin/reviews" className="block">
              <div className="w-full text-left p-3 rounded-2xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 transition flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-300" />
                  <span className="font-medium text-slate-100">Review Ratings</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/dashboard/admin/jobs" className="block">
              <div className="w-full text-left p-3 rounded-2xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 transition flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-sky-300" />
                  <span className="font-medium text-slate-100">Manage Jobs</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
            <Link href="/dashboard/admin/applications" className="block">
              <div className="w-full text-left p-3 rounded-2xl border border-slate-800 bg-slate-950/70 hover:bg-slate-900 transition flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-emerald-300" />
                  <span className="font-medium text-slate-100">View Applications</span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          </div>
        </Card>

        <Card className="p-6 border border-slate-800 bg-slate-900/90 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Top Performers</h2>
            <Link href="/dashboard/admin/reviews" className="text-sm text-cyan-300 hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {topProviders.length > 0 ? (
              topProviders.map((provider, idx) => (
                <div key={idx} className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{provider.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{provider.service || "Service Provider"}</p>
                    </div>
                    <span className="text-xs font-semibold">{provider.rating.toFixed(1)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(provider.rating) ? "fill-yellow-300 text-yellow-300" : "text-slate-600"}`}
                      />
                    ))}
                    <span className="text-xs text-slate-400">{provider.reviews} reviews</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet</p>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-slate-800 bg-slate-900/90 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
              <AlertCircle className="w-5 h-5 text-rose-300" />
              Recent Alerts
            </h2>
          </div>
          <div className="space-y-4">
            {stats.totalReviews === 0 && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm font-medium text-red-700">No reviews yet</p>
                <p className="text-xs text-red-600 mt-1">Encourage user reviews to build trust and engagement</p>
              </div>
            )}
            {stats.pendingApplications > 0 && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm font-medium text-yellow-700">Pending Applications</p>
                <p className="text-xs text-yellow-600 mt-1">You have {stats.pendingApplications} pending applications that need attention</p>
              </div>
            )}
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm font-medium text-blue-700">System Update</p>
              <p className="text-xs text-blue-600 mt-1">All systems are running smoothly</p>
            </div>
            <Link href="#" className="text-sm text-primary hover:underline block mt-4">
              View All Alerts →
            </Link>
          </div>
        </Card>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Account"
        message="This will permanently delete your admin account and all associated data. This action cannot be undone."
        confirmLabel="Delete"
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={async () => {
          await handleDeleteAccount()
        }}
      />
      <EditProfileModal isOpen={editProfileOpen} onClose={() => setEditProfileOpen(false)} profile={profile} onSave={setProfile} />
    </div>
  )
}
