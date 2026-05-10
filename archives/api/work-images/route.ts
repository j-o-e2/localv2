import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const bucketName = process.env.WORK_IMAGES_BUCKET || 'work-images'

async function ensureBucketExists(supabase: ReturnType<typeof createClient>) {
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName)

  if (bucketError && bucketError.message?.toLowerCase().includes('not found')) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    })

    if (createError) {
      throw new Error(`Unable to create storage bucket: ${createError.message}`)
    }
  }

  if (!bucketData && !bucketError) {
    throw new Error('Bucket metadata could not be loaded')
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const singleFile = formData.get('file') as File
    const title = formData.get('title') as string
    const description = formData.get('description') as string

    const uploadFiles = singleFile ? [singleFile] : files

    if (!uploadFiles.length) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const maxSize = 10 * 1024 * 1024

    for (const file of uploadFiles) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' }, { status: 400 })
      }
      if (file.size > maxSize) {
        return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 })
      }
    }

    await ensureBucketExists(supabase)

    const rows = []
    const uploadedPaths: string[] = []

    for (const [index, file] of uploadFiles.entries()) {
      const timestamp = Date.now()
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}/${user.id}-${timestamp}-${index}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        if (uploadedPaths.length) {
          await supabase.storage.from(bucketName).remove(uploadedPaths)
        }
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
      }

      uploadedPaths.push(filePath)
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath)
      const imageUrl = publicUrlData.publicUrl

      rows.push({
        user_id: user.id,
        title: title || null,
        description: description || null,
        image_url: imageUrl,
        image_path: filePath,
      })
    }

    const { data: dbData, error: dbError } = await supabase
      .from('work_images')
      .insert(rows)
      .select()

    if (dbError) {
      if (uploadedPaths.length) {
        await supabase.storage.from(bucketName).remove(uploadedPaths)
      }
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: dbData })
  } catch (error: any) {
    console.error('Work image upload error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('work_images')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ images: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const authHeader = request.headers.get('authorization')

    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('id')

    if (!imageId) {
      return NextResponse.json({ error: 'Image ID required' }, { status: 400 })
    }

    const { data: image, error: fetchError } = await supabase
      .from('work_images')
      .select('*')
      .eq('id', imageId)
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 })
    }

    if (image.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this image' }, { status: 403 })
    }

    await supabase.storage.from(bucketName).remove([image.image_path])

    const { error: deleteError } = await supabase
      .from('work_images')
      .delete()
      .eq('id', imageId)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
