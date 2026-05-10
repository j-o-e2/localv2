import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function DELETE(req: Request, context: any) {
	try {
		let params = context?.params
		if (params && typeof params.then === 'function') params = await params
		const id = params?.id

		if (!id) {
			return NextResponse.json({ error: 'Missing id' }, { status: 400 })
		}

		const cookieStore = await cookies()
		const supabase = createServerClient(
			process.env.NEXT_PUBLIC_SUPABASE_URL!,
			process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
			{
				cookies: {
					getAll() {
						return cookieStore.getAll()
					},
					setAll(cookiesToSet: any) {
						try {
							cookiesToSet.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options))
						} catch {}
					},
				},
			},
		)

		// Ensure authenticated user
		const { data: { user } } = await supabase.auth.getUser()
		if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

		// Ownership check
		const { data: serviceRow, error: svcErr } = await supabase
			.from('services')
			.select('provider_id')
			.eq('id', id)
			.limit(1)
			.maybeSingle()

		if (svcErr) {
			console.error('[api/services/[id] DELETE] failed fetching service', svcErr)
			return NextResponse.json({ error: 'Failed to fetch service' }, { status: 500 })
		}

		if (!serviceRow || serviceRow.provider_id !== user.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		// Use service role client to perform cascade updates (bypass RLS)
		const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
		const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
		if (!supabaseUrl || !serviceKey) {
			return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
		}

		const svc = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

		// Find bookings tied to this service
		let deletedBookingIds: string[] = []
		try {
			const { data: bookingsData, error: bookingsErr } = await svc
				.from('bookings')
				.select('id')
				.eq('service_id', id)

			if (bookingsErr) {
				console.error('[api/services/[id] DELETE] failed to list bookings for service', id, bookingsErr)
				return NextResponse.json({ error: 'Failed to list bookings for service', details: bookingsErr?.message ?? String(bookingsErr) }, { status: 500 })
			}

			const ids = (bookingsData || []).map((b: any) => b.id).filter(Boolean)
			if (ids.length) {
				// Delete messages related to these bookings
				try {
					const { error: messagesErr } = await svc
						.from('messages')
						.delete()
						.in('booking_id', ids)

					if (messagesErr) {
						console.error('[api/services/[id] DELETE] failed to delete messages for bookings', ids, messagesErr)
						return NextResponse.json({ error: 'Failed to delete messages for bookings', details: messagesErr?.message ?? String(messagesErr) }, { status: 500 })
					}
				} catch (e: any) {
					console.error('[api/services/[id] DELETE] exception deleting messages', e)
					return NextResponse.json({ error: 'Failed to delete messages', details: String(e) }, { status: 500 })
				}

				// Delete reviews related to these bookings
				try {
					const { error: reviewsErr } = await svc
						.from('reviews')
						.delete()
						.in('booking_id', ids)

					if (reviewsErr) {
						console.error('[api/services/[id] DELETE] failed to delete reviews for bookings', ids, reviewsErr)
						return NextResponse.json({ error: 'Failed to delete reviews for bookings', details: reviewsErr?.message ?? String(reviewsErr) }, { status: 500 })
					}
				} catch (e: any) {
					console.error('[api/services/[id] DELETE] exception deleting reviews', e)
					return NextResponse.json({ error: 'Failed to delete reviews', details: String(e) }, { status: 500 })
				}

				// Soft-archive bookings if the schema supports it; otherwise delete them.
				try {
					const { data: archivedBookings, error: archBookingsErr } = await svc
						.from('bookings')
						.update({ archived: true, updated_at: new Date().toISOString() })
						.in('id', ids as any[])
						.select('id')

					if (archBookingsErr) {
						const errMsg = String(archBookingsErr.message || archBookingsErr).toLowerCase()
						if (errMsg.includes('column "archived" does not exist') || errMsg.includes('invalid column reference') || errMsg.includes('column archived does not exist')) {
							const { data: deletedBookings, error: deleteBookingsErr } = await svc
								.from('bookings')
								.delete()
								.in('id', ids as any[])
								.select('id')

							if (deleteBookingsErr) {
								console.error('[api/services/[id] DELETE] failed to delete bookings for service', id, deleteBookingsErr)
								return NextResponse.json({ error: 'Failed to delete bookings for service', details: deleteBookingsErr?.message ?? String(deleteBookingsErr) }, { status: 500 })
							}

							(deletedBookings || []).forEach((b: any) => deletedBookingIds.push(b.id))
						} else {
							console.error('[api/services/[id] DELETE] failed to archive bookings for service', id, archBookingsErr)
							return NextResponse.json({ error: 'Failed to archive bookings for service', details: archBookingsErr?.message ?? String(archBookingsErr) }, { status: 500 })
						}
					} else {
						(archivedBookings || []).forEach((b: any) => deletedBookingIds.push(b.id))
					}
				} catch (e: any) {
					console.error('[api/services/[id] DELETE] exception archiving bookings', e)
					return NextResponse.json({ error: 'Failed to archive bookings', details: String(e) }, { status: 500 })
				}
			}
		} catch (e: any) {
			console.error('[api/services/[id] DELETE] Error listing bookings', e)
			return NextResponse.json({ error: 'Failed to list bookings for service', details: String(e) }, { status: 500 })
		}

		// Soft-archive the service row if supported; otherwise delete it.
		let resp = await svc.from('services').update({ archived: true, updated_at: new Date().toISOString() }).eq('id', id).select().maybeSingle()
		let archivedService = resp.data ?? null
		if (resp.error) {
			const errMsg = String(resp.error.message || resp.error).toLowerCase()
			if (errMsg.includes('column "archived" does not exist') || errMsg.includes('invalid column reference') || errMsg.includes('column archived does not exist')) {
				const deleteResp = await svc.from('services').delete().eq('id', id).select().maybeSingle()
				if (deleteResp.error) {
					console.error('[api/services/[id] DELETE] supabase delete error:', deleteResp.error)
					return NextResponse.json({ error: 'Failed to delete service', details: deleteResp.error?.message ?? String(deleteResp.error) }, { status: 500 })
				}
				archivedService = deleteResp.data ?? null
			} else {
				console.error('[api/services/[id] DELETE] supabase archive error:', resp.error)
				return NextResponse.json({ error: 'Failed to archive service', details: resp.error?.message ?? String(resp.error) }, { status: 500 })
			}
		}

		console.info('[api/services/[id] DELETE] archived/deleted service', id, 'by', user.id, 'archivedBookings=', deletedBookingIds.length, 'also cleaned up related messages and reviews')
		return NextResponse.json({ success: true, archived: archivedService, archivedBookingIds: deletedBookingIds })
	} catch (err: any) {
		console.error('[api/services/[id] DELETE] Error:', err)
		return NextResponse.json({ error: 'Internal server error', details: String(err) }, { status: 500 })
	}
}
