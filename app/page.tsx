"use client"

import Image from "next/image"
import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, ChevronDown, Menu, Play, Sparkles, X } from "lucide-react"

const modules = [
  { number: "01", title: "Companions", description: "Build a private presence with memory, voice, visual identity, and a personality that grows with you.", href: "/ai-girlfriend-chat", image: "/veloura-companion.png", tone: "coral" },
  { number: "02", title: "Image studio", description: "Turn a sentence into a scene. Remix, refine, upscale, and keep every detail on your terms.", href: "/ai-image-generator-no-filter", image: "/veloura-create.png", tone: "violet" },
  { number: "03", title: "Motion lab", description: "Give still images a pulse with short-form video, camera direction, and expressive movement.", href: "/ai-video-generator", image: "/veloura-hero.png", tone: "cream" },
]

const faqs = [
  ["What is Veloura?", "Veloura is a private creative platform for adults to explore AI companions, images, video, voice, roleplay, and custom models in one expressive workspace."],
  ["Can I create my own character?", "Yes. Start from a template or shape a completely original companion with a custom personality, memories, voice, and visual style."],
  ["Are projects private?", "Your workspace is private by default. You choose what to save, share, or keep only for yourself."],
  ["What can I make?", "Conversations, scenes, portraits, short videos, voice moments, roleplay rooms, and private character models."],
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  return (
    <main className="veloura-shell">
      <div className="grain" aria-hidden="true" />
      <header className="site-header">
        <a href="#top" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></a>
        <nav className={menuOpen ? "site-nav is-open" : "site-nav"}>
          <a href="/ai-apps">Discover</a><a href="#modules">Create</a><a href="/ai-girlfriend-chat">Companions</a><a href="#manifesto">About</a>
        </nav>
        <div className="header-actions"><a href="/login" className="quiet-link">Log in</a><a href="/register" className="header-button">Enter studio <ArrowUpRight size={15} /></a><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button></div>
      </header>

      <section className="new-hero" id="top">
        <div className="hero-visual"><Image src="/veloura-hero.png" alt="Abstract cinematic creative artwork" fill priority sizes="(max-width: 900px) 100vw, 58vw" /><div className="hero-visual-overlay" /><div className="hero-caption"><span>VEL / 001</span><span>PRIVATE CREATIVE SYSTEM</span></div></div>
        <div className="hero-copy-new"><p className="eyebrow"><span /> A new room for imagination</p><h1>Make room<br /><i>for more.</i></h1><p className="hero-lede">Veloura is an expressive AI studio for adults who want their stories, characters, and fantasies to feel fully their own.</p><div className="hero-actions"><a className="button-primary" href="/register">Start creating <ArrowUpRight size={17} /></a><a className="play-link" href="#manifesto"><span><Play size={13} fill="currentColor" /></span> See the world</a></div><div className="hero-meta"><span>18+ creative space</span><span>Private by default</span><span>Free to begin</span></div></div>
        <div className="hero-side-note">SCROLL TO EXPLORE <span>↓</span></div>
      </section>

      <section className="ticker" aria-label="Veloura features"><div>COMPANIONS <b>✦</b> IMAGES <b>✦</b> VIDEO <b>✦</b> VOICE <b>✦</b> ROLEPLAY <b>✦</b> PRIVATE MODELS <b>✦</b></div><div>COMPANIONS <b>✦</b> IMAGES <b>✦</b> VIDEO <b>✦</b> VOICE <b>✦</b> ROLEPLAY <b>✦</b> PRIVATE MODELS <b>✦</b></div></section>

      <section className="manifesto" id="manifesto"><div className="section-index">00 / THE PREMISE</div><div className="manifesto-grid"><h2>Not another<br /><em>content filter.</em></h2><div><p>Some ideas need space before they need an answer. Veloura brings your conversation, character, image, video, and voice tools into one intimate creative system.</p><a className="arrow-link" href="/ai-apps">Explore the studio <ArrowUpRight size={17} /></a></div></div><div className="manifesto-stamp">MAKE<br />IT<br /><span>YOURS</span></div></section>

      <section className="module-section" id="modules"><div className="section-index">01 / THE STUDIO</div><div className="section-heading"><h2>One place.<br /><em>Many ways in.</em></h2><p>Move from a thought to a conversation, from a frame to a world. Everything is connected.</p></div><div className="module-grid">{modules.map((module, index) => <motion.a href={module.href} className={`module-card ${module.tone}`} key={module.number} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * .12 }}><div className="module-image"><Image src={module.image} alt="" fill sizes="(max-width: 800px) 100vw, 33vw" /><div className="module-number">{module.number}</div><ArrowUpRight className="module-arrow" /></div><div className="module-copy"><h3>{module.title}</h3><p>{module.description}</p><span>Open module <ArrowUpRight size={15} /></span></div></motion.a>)}</div></section>

      <section className="statement"><div className="statement-orb" /><div className="section-index">02 / THE DIFFERENCE</div><h2>Your imagination<br /><span>without the apology.</span></h2><p>Explore characters who remember. Create images that stay in the scene. Build a world that does not disappear when the tab closes.</p><a className="button-primary" href="/register">Claim your space <ArrowUpRight size={17} /></a></section>

      <section className="faq-new"><div className="section-index">03 / QUESTIONS</div><div className="faq-layout"><h2>Good to<br /><em>know.</em></h2><div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-row" key={question}><button onClick={() => setOpenFaq(openFaq === index ? null : index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown className={openFaq === index ? "faq-chevron open" : "faq-chevron"} /></button><motion.div className="faq-answer-new" animate={{ height: openFaq === index ? "auto" : 0, opacity: openFaq === index ? 1 : 0 }}><p>{answer}</p></motion.div></div>)}</div></div></section>

      <section className="final-cta"><p className="eyebrow"><span /> Your door is open</p><h2>Make something<br /><i>only you can.</i></h2><a className="button-primary" href="/register">Enter Veloura <ArrowUpRight size={17} /></a></section>
      <footer className="site-footer"><a href="#top" className="wordmark"><span className="wordmark-dot" />veloura<span>/ai</span></a><span>© 2026 Veloura. Made for imagination.</span><div><a href="/ai-apps">Studio</a><a href="/login">Account</a><a href="mailto:hello@veloura.ai">Contact</a></div></footer>
    </main>
  )
}
