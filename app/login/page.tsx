import Link from "next/link"
import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></Link><p className="eyebrow"><span /> Welcome back</p><h1>Return to<br /><i>your world.</i></h1><AuthForm mode="login" /><Link href="/register">Create an account</Link></div></main>
}
