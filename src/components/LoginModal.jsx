import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function LoginModal({ onClose }) {
  const [email, setEmail] = useState('')

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) alert(error.message)
    else alert('Check your email for the magic link!')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4">Sign in</h2>
        <input
          type="email"
          className="w-full border p-2 rounded mb-3"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white w-full py-2 rounded-lg"
        >
          Send magic link
        </button>
        <button
          onClick={onClose}
          className="mt-2 w-full py-2 rounded-lg border"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
