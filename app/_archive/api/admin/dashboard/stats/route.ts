import { NextRequest, NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })

    if (usersError) throw usersError

    // Get active users (users who have logged in recently - last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: activeUsers, error: activeUsersError } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("updated_at", thirtyDaysAgo.toISOString())

    if (activeUsersError) throw activeUsersError

    // Get total jobs
    const { count: totalJobs, error: jobsError } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })

    if (jobsError) throw jobsError

    // Get active jobs (status = 'open')
    const { count: activeJobs, error: activeJobsError } = await supabase
      .from("jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "open")

    if (activeJobsError) throw activeJobsError

    // Get total applications
    const { count: totalApplications, error: applicationsError } = await supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })

    if (applicationsError) throw applicationsError

    // Get pending applications (status = 'pending')
    const { count: pendingApplications, error: pendingApplicationsError } = await supabase
      .from("job_applications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    if (pendingApplicationsError) throw pendingApplicationsError

    // Get total services
    const { count: totalServices, error: servicesError } = await supabase
      .from("services")
      .select("*", { count: "exact", head: true })

    if (servicesError) throw servicesError

    // Get total reviews
    const { count: totalReviews, error: reviewsError } = await supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })

    if (reviewsError) throw reviewsError

    // Calculate average rating
    const { data: reviewsData, error: avgRatingError } = await supabase
      .from("reviews")
      .select("rating")

    if (avgRatingError) throw avgRatingError

    const averageRating = reviewsData && reviewsData.length > 0
      ? reviewsData.reduce((sum, review) => sum + review.rating, 0) / reviewsData.length
      : 0

    // Get top worker by rating
    const { data: topWorkerData, error: topWorkerError } = await supabase
      .from("reviews")
      .select(`
        reviewee_id,
        rating,
        profiles!reviews_reviewee_id_fkey (
          full_name
        )
      `)
      .not("reviewee_id", "is", null)

    if (topWorkerError) throw topWorkerError

    let topWorkerByRating = null
    if (topWorkerData && topWorkerData.length > 0) {
      const ratingMap = new Map<string, { name: string; total: number; count: number }>()

      topWorkerData.forEach((review: any) => {
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

      const topWorker = Array.from(ratingMap.values())
        .map(item => ({
          name: item.name,
          averageRating: item.total / item.count,
        }))
        .sort((a, b) => b.averageRating - a.averageRating)[0]

      topWorkerByRating = topWorker ? topWorker.name : null
    }

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalJobs: totalJobs || 0,
      activeJobs: activeJobs || 0,
      totalApplications: totalApplications || 0,
      pendingApplications: pendingApplications || 0,
      totalServices: totalServices || 0,
      totalReviews: totalReviews || 0,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      topWorkerByRating,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    )
  }
}