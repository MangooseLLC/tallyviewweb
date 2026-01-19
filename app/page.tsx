'use client'

import { useState, FormEvent } from 'react'
import Image from 'next/image'

export default function Home() {
  const [email, setEmail] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, honeypot }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: data.message })
        setEmail('')
      } else {
        setMessage({ type: 'error', text: data.error || 'Something went wrong' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-white">
      <div className="w-full max-w-lg space-y-12 text-center">
        {/* Logo - Using the actual brand asset */}
        <div className="flex justify-center">
          <Image
            src="/tallyview-logo.svg"
            alt="Tallyview"
            width={320}
            height={91}
            priority
            className="w-72 md:w-80 h-auto"
          />
        </div>

        {/* Tagline */}
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl text-gray-800 font-light tracking-wide">
            Follow the money.
          </h1>
          {/* Gold accent dot */}
          <div className="flex justify-center items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-gold"></div>
          </div>
          <p className="text-sm md:text-base text-gray-500 font-light max-w-md mx-auto">
            Public transparency. Onchain.
          </p>
        </div>

        {/* Waitlist Form */}
        <div className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot field - hidden from real users */}
            <input
              type="text"
              name="honeypot"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              className="absolute opacity-0 pointer-events-none"
              aria-hidden="true"
            />

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading || message?.type === 'success'}
                className="w-full px-5 py-4 text-base text-center border-2 border-gray-200 rounded-lg focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors placeholder:text-gray-400"
              />

              <button
                type="submit"
                disabled={loading || message?.type === 'success'}
                className="w-full px-8 py-4 text-base font-medium tracking-wide text-white bg-brand-navy rounded-lg hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                {loading ? 'Joining...' : message?.type === 'success' ? '✓ Joined' : 'Join Waitlist'}
              </button>
            </div>

            {/* Success/Error Messages */}
            {message && (
              <div
                className={`text-sm font-medium pt-1 ${
                  message.type === 'success' ? 'text-brand-gold' : 'text-red-600'
                }`}
              >
                {message.text}
              </div>
            )}
          </form>

          {/* Microcopy */}
          <p className="mt-6 text-sm text-gray-400 font-light">
            Early access to auditable, real-time capital markets data.
          </p>
        </div>
      </div>
    </main>
  )
}
