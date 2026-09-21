import Link from "next/link"
import { AuthForm } from "@/components/auth-form"

export default function RegisterPage() {
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></Link><p className="eyebrow"><span /> Private beta</p><h1>Make room for<br /><i>more.</i></h1><AuthForm mode="register" /><Link href="/login">Already have an account?</Link></div></main>
}
