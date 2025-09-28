// src/components/Auth.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the login link!')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-sm mx-auto mt-12 bg-white shadow p-6 rounded-2xl">
      <h2 className="text-lg font-semibold mb-4">Sign in</h2>
      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          className="w-full border rounded p-2"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          className="w-full bg-yellow-700 text-white py-2 rounded"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send magic link'}
        </button>
      </form>
      {message && <p className="text-sm mt-3 text-gray-700">{message}</p>}
    </div>
  )
}
