import Link from "next/link"

export default function RegisterPage() {
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></Link><p className="eyebrow"><span /> Private beta</p><h1>Make room for<br /><i>more.</i></h1><form className="auth-form" action="/ai-apps"><input aria-label="Name" placeholder="Name" required /><input aria-label="Email address" placeholder="Email address" type="email" required /><input aria-label="Password" placeholder="Password" type="password" minLength={8} required /><button className="button-primary" type="submit">Create account</button></form><Link href="/login">Already have an account?</Link></div></main>
}
