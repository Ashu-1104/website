import Link from "next/link"

export default function LoginPage() {
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></Link><p className="eyebrow"><span /> Welcome back</p><h1>Return to<br /><i>your world.</i></h1><form className="auth-form" action="/ai-apps"><input aria-label="Email address" placeholder="Email address" type="email" required /><input aria-label="Password" placeholder="Password" type="password" required /><button className="button-primary" type="submit">Enter studio</button></form><Link href="/register">Create an account</Link></div></main>
}
