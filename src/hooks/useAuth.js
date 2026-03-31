import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [sendingLink, setSendingLink] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  const sendMagicLink = async (email) => {
    setSendingLink(true)
    setAuthError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },  // invite-only: only existing users can sign in
    })
    setSendingLink(false)
    if (error) { setAuthError(error.message); return false }
    setLinkSent(true)
    return true
  }

  const signOut = () => supabase.auth.signOut()

  return {
    session,
    user: session?.user ?? null,
    loading: session === undefined,
    sendMagicLink,
    sendingLink,
    linkSent,
    authError,
    signOut,
  }
}
