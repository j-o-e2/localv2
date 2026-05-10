"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MapPin, Search, ArrowLeft, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

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
  client_id: string
  profiles?: {
    full_name: string
    avatar_url: string | null
  }
}

export default function JobsPage() {
  const [search, setSearch] = useState("")
  const [searchLocation, setSearchLocation] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [hidingJobIds, setHidingJobIds] = useState<Set<string>>(() => new Set<string>())

  const categories = ["All", "Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning", "Landscaping", "HVAC", "Roofing", "Masonry", "Other"]

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const locationParam = params.get("location") || ""
    if (locationParam.trim()) {
      setSearchLocation(locationParam.trim())
    }
  }, [])

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        let query = supabase
          .from('jobs')
          .select(`
            *,
            profiles:client_id (
              full_name,
              avatar_url
            )
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })

        if (selectedCategory !== 'All') {
          query = query.eq('category', selectedCategory)
        }

        // If user is a worker, exclude their hidden jobs
        if (user?.user_metadata?.role === 'worker') {
          const { data: hiddenJobs, error: hiddenError } = await supabase
            .from('user_hidden_jobs')
            .select('job_id')
            .eq('user_id', user.id)

          if (!hiddenError && hiddenJobs && hiddenJobs.length > 0) {
            const hiddenJobIds = hiddenJobs.map(h => h.job_id)
            query = query.not('id', 'in', `(${hiddenJobIds.join(',')})`)
          }
        }

        const { data, error } = await query

        if (error) {
          console.error('Error fetching jobs:', error)
          setJobs([])
        } else {
          let filteredJobs = (data || []).filter(job => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            return job.id && typeof job.id === 'string' && uuidRegex.test(job.id)
          })
          
          if (search) {
            filteredJobs = filteredJobs.filter(
              (job) =>
                job.title.toLowerCase().includes(search.toLowerCase()) ||
                job.description.toLowerCase().includes(search.toLowerCase()) ||
                job.location.toLowerCase().includes(search.toLowerCase())
            )
          }

          if (searchLocation) {
            filteredJobs = filteredJobs.filter((job) =>
              job.location.toLowerCase().includes(searchLocation.toLowerCase())
            )
          }
          setJobs(filteredJobs)
        }
      } catch (error) {
        console.error('Error:', error)
        setJobs([])
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()
  }, [selectedCategory, search, user])

  const handleHideJob = async (jobId: string) => {
    if (!jobId || !user) return
    if (!confirm('Hide this job from your view? You can browse all jobs from your dashboard to find it again.')) return

    setHidingJobIds(prev => new Set(prev).add(jobId))

    try {
      const { data: { session } = {} as any } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
      const token = session?.access_token || (session as any)?.accessToken || null

      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/hide`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })

      const { ok, status, statusText, data: body, raw } = await parseApiResponse(res)

      if (!ok) {
        const routeHint = status === 404 ? `API route not found or wrong endpoint` : null
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
        })

        alert(errMsg)
        setHidingJobIds(prev => {
          const next = new Set(prev)
          next.delete(jobId)
          return next
        })
        return
      }

      // Remove the job from the current jobs list
      setJobs(prev => prev.filter(j => j.id !== jobId))
      alert('Job hidden from your view')
    } catch (err) {
      console.error('Error hiding job:', err)
      alert('Failed to hide job')
      setHidingJobIds(prev => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={user?.user_metadata?.role === 'worker' ? '/dashboard/worker' : user?.user_metadata?.role === 'client' ? '/dashboard/client' : '/'}>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-slate-900">Latest Jobs in Kenya</h1>
          <p className="mt-2 text-sm text-slate-600">Browse open jobs and apply to the ones that fit your skills.</p>
          {searchLocation && (
            <p className="mt-2 text-sm text-slate-500">Showing jobs near <strong>{searchLocation}</strong>.</p>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search jobs by title, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                style={selectedCategory !== cat ? { borderColor: '#e2e8f0', color: '#475569' } : {}}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-500">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">No jobs found. Try adjusting your search or category.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium px-2 py-1 bg-[#eff6ff] text-[#1e3a8a] rounded-full">{job.category}</span>
                </div>
                <h3 className="font-semibold text-slate-900">{job.title}</h3>
                <p className="text-sm text-slate-500 mt-1">by {job.profiles?.full_name || 'Client'}</p>
                <p className="text-sm text-slate-600 mt-3 line-clamp-2">{job.description}</p>
                <div className="flex items-center gap-2 mt-3 text-sm text-slate-500">
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                  <span className="font-semibold text-slate-900">KSh {job.budget.toLocaleString()}</span>
                  <div className="flex gap-2">
                    {user?.user_metadata?.role === 'worker' && (
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
                    )}
                    {user ? (
                      <Button asChild size="sm" className="bg-[#1e3a8a] hover:bg-[#0f172a] text-white">
                        <Link href={`/jobs/${job.id}`}>View and Apply</Link>
                      </Button>
                    ) : (
                      <Button asChild size="sm" variant="outline" className="border-[#1e3a8a] text-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white">
                        <Link href="/signup?role=worker">View and Apply</Link>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
