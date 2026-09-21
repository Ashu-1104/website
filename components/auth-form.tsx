"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { createAuthClient } from "@neondatabase/auth/next"

const authClient = createAuthClient()

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    const result = mode === "register"
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError("We could not complete that request. Check your details and try again.")
      return
    }
    router.push("/ai-apps")
    router.refresh()
  }

  async function continueWithGoogle() {
    setPending(true)
    setError("")
    const result = await authClient.signIn.social({ provider: "google", callbackURL: "/ai-apps" })
    if (result.error) {
      setPending(false)
      setError("Google sign-in is not configured for this environment yet.")
    }
  }

  return <form className="auth-form" onSubmit={submit}>
    {mode === "register" && <input aria-label="Name" placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} required />}
    <input aria-label="Email address" placeholder="Email address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
    <input aria-label="Password" placeholder="Password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button-primary" type="submit" disabled={pending}>{pending ? "Opening studio…" : mode === "register" ? "Create account" : "Enter studio"}</button>
    <div className="auth-divider"><span />or<span /></div>
    <button className="button-secondary" type="button" onClick={continueWithGoogle} disabled={pending}>Continue with Google</button>
  </form>
}
