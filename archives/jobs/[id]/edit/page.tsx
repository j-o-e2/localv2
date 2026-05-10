"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface JobPayload {
  title?: string
  description?: string
  category?: string
  required_skills?: string[]
  budget?: number
  budget_type?: 'fixed price' | 'hourly rate'
  location?: string
  duration?: string
}

const CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Carpentry",
  "Painting",
  "Cleaning",
  "Landscaping",
  "HVAC",
  "Roofing",
  "Masonry",
  "Welding",
  "Other",
]

const normalizeBudgetType = (input: any): "fixed price" | "hourly rate" => {
  if (input && typeof input === "object") {
    if ("value" in input) input = input.value
    else if ("label" in input) input = input.label
    else input = ""
  }

  const raw = String(input || "fixed")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z]/g, "")

  if (raw.includes("hourly") || raw.includes("hour")) return "hourly rate"
  if (raw.includes("fixed") || raw.includes("fix")) return "fixed price"
  
  return "fixed price"
}

const COMMON_SKILLS = [
  "Plumbing",
  "Electrical Work",
  "Carpentry",
  "Painting",
  "Tile Work",
  "Drywall",
  "Flooring",
  "Roofing",
  "HVAC",
  "Welding",
  "Masonry",
  "Landscaping",
  "Cleaning",
  "Handyman",
  "Problem Solving",
]

export default function EditJobPage() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [customSkill, setCustomSkill] = useState("")
  const [customDuration, setCustomDuration] = useState("")

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    budgetType: "fixed",
    location: "",
    duration: "one-time"
  })

  useEffect(() => {
    const loadJob = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.push("/login")
          return
        }

        const { data: job, error: fetchError } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single()

        if (fetchError || !job) {
          setError("Job not found")
          return
        }

        // Check if user owns this job
        if (job.client_id !== user.id && job.poster_id !== user.id) {
          setError("You don't have permission to edit this job")
          return
        }

        // Populate form with existing job data
        const budgetTypeValue = job.budget_type === 'hourly rate' ? 'hourly' : 'fixed'
        
        setFormData({
          title: job.title || "",
          description: job.description || "",
          category: job.category || "",
          budget: job.budget?.toString() || "",
          budgetType: budgetTypeValue,
          location: job.location || "",
          duration: job.duration || "one-time"
        })

        setSelectedSkills(job.required_skills || [])
        setLoading(false)
      } catch (err) {
        console.error("Error loading job:", err)
        setError("Failed to load job")
        setLoading(false)
      }
    }

    loadJob()
  }, [jobId, router])

  const makePrintable = (err: any) => {
    if (!err) return "Unknown error"
    if (typeof err === "string") return err
    if (err?.message) return err.message
    try {
      const names = Object.getOwnPropertyNames(err)
      const data: Record<string, any> = {}
      names.forEach((n) => (data[n] = err[n]))
      return JSON.stringify(data)
    } catch (e) {
      return String(err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      // Validate required fields
      if (!formData.title?.trim() || !formData.description?.trim() || !formData.category || !formData.location?.trim()) {
        setError("Please fill in all required fields")
        setSubmitting(false)
        return
      }
    
      const budget = parseFloat(formData.budget)
      if (isNaN(budget) || budget <= 0) {
        setError("Please enter a valid budget amount greater than 0")
        setSubmitting(false)
        return
      }

      if (formData.duration === 'custom' && !customDuration.trim()) {
        setError('Please provide a custom timeline for the job')
        setSubmitting(false)
        return
      }

      const normalizedBudgetType = normalizeBudgetType(formData.budgetType)
      const jobPayload: JobPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        required_skills: selectedSkills.length > 0 ? selectedSkills : [],
        budget: budget,
        budget_type: normalizedBudgetType,
        location: formData.location.trim(),
        duration: formData.duration === 'custom' ? (customDuration || formData.duration) : formData.duration,
      }
      
      console.log("Sending job update payload to API:", JSON.stringify(jobPayload, null, 2))

      const {
        data: { session },
      } = await supabase.auth.getSession()
      const token = session?.access_token
      
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify(jobPayload),
      })

      const result = await response.json()

      if (!response.ok) {
        const errorMsg = result.error || `Failed to update job (HTTP ${response.status})`
        setError(errorMsg)
        setSubmitting(false)
        return
      }

      alert("Job updated successfully!")
      router.push(`/dashboard/client`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading job...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Edit Job</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Kitchen Renovation"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Job Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the job in detail..."
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground min-h-32"
                required
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Budget (KES) *
                </label>
                <input
                  type="number"
                  name="budget"
                  value={formData.budget}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Budget Type *
                </label>
                <select
                  name="budgetType"
                  value={formData.budgetType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                  required
                >
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Rate</option>
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Nairobi, Kenya"
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Timeline
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              >
                <option value="one-time">One-time</option>
                <option value="ongoing">Ongoing</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {formData.duration === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Custom Timeline
                </label>
                <input
                  type="text"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  placeholder="e.g., 2 weeks, 1 month"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
                />
              </div>
            )}

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Required Skills
              </label>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {COMMON_SKILLS.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedSkills.includes(skill)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
                
                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                    {selectedSkills.map((skill) => (
                      <div
                        key={skill}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className="ml-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6">
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? "Updating..." : "Update Job"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
