import { NextRequest, NextResponse } from 'next/server'
import { emailSchema } from '@/lib/validators'
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabaseAdmin'
import { promises as fs } from 'fs'
import { join } from 'path'

// In-memory rate limiting
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const MAX_REQUESTS = 5

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

async function saveToLocalFile(email: string) {
  const dataDir = join(process.cwd(), 'data')
  const filePath = join(dataDir, 'waitlist.json')

  try {
    await fs.mkdir(dataDir, { recursive: true })
  } catch (error) {
    // Directory might already exist
  }

  let signups: Array<{ email: string; timestamp: string }> = []

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    signups = JSON.parse(fileContent)
  } catch (error) {
    // File might not exist yet
  }

  signups.push({
    email,
    timestamp: new Date().toISOString(),
  })

  await fs.writeFile(filePath, JSON.stringify(signups, null, 2))
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Honeypot check
    if (body.honeypot) {
      return NextResponse.json(
        { error: 'Invalid submission' },
        { status: 400 }
      )
    }

    // Validate email
    const validation = emailSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0]?.message || 'Invalid email' },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Try to save to Supabase first
    if (isSupabaseConfigured() && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('waitlist_signups')
        .insert([
          {
            email,
            created_at: new Date().toISOString(),
          },
        ])

      if (error) {
        console.error('Supabase error:', error)
        // Fall back to local file
        await saveToLocalFile(email)
      }
    } else {
      // Save to local file
      await saveToLocalFile(email)
    }

    return NextResponse.json(
      { success: true, message: "You're on the list." },
      { status: 200 }
    )
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
