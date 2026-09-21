"use client"

import { useState } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import { ArrowRight, Check, ChevronDown, Menu, Play, Sparkles, X, Zap } from "lucide-react"

const tools = [
  { label: "01 / Companion", title: "She remembers. She evolves. She\u2019s yours.", body: "A private AI companion with persistent memory, a personality shaped around you, and conversations that build over time.", tags: ["Persistent memory", "Custom personality", "Voice & photos"] },
  { label: "02 / Image studio", title: "Type it. See it. Own it.", body: "A multi-model canvas for creating photoreal, illustrative, and character-led imagery from a single prompt.", tags: ["Flux · SDXL · Pony", "Text → image", "4K output"] },
  { label: "03 / Motion lab", title: "When still isn\u2019t enough.", body: "Transform prompts and images into living scenes with text-to-video, image motion, and precise face replacement tools.", tags: ["Text → video", "Image → video", "HD output"] },
  { label: "04 / Creative suite", title: "Every tool. One fluid canvas.", body: "Edit, upscale, inpaint, remix, compose, clone voices, and explore a growing library of creative apps.", tags: ["15+ tools", "Voice & audio", "AI apps"] },
]

const models = ["Flux", "SDXL", "Pony", "Illustrious", "Z Image Turbo", "Qwen"]
const faqs = [
  ["What can I create?", "Chat with a custom companion, create images and video, edit assets, work with voice, and train a private character model from your own references."],
  ["Is there a free plan?", "Yes. Start with the free forever plan and explore the core experience before deciding whether you want more creative capacity."],
  ["What happens to my data?", "Your private creative work stays yours. Training references are private by default and are never used to train public models."],
  ["Who is this for?", "For curious adults, storytellers, roleplayers, artists, and creators who want one expressive space for their imagination."],
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [faq, setFaq] = useState<number | null>(null)
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -280])

  return (
    <main className="app-shell">
      <div className="noise" aria-hidden="true" />
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark">◈</span> veloura<span>.art</span></a>
        <nav className={menuOpen ? "nav open" : "nav"}>
          <a href="/ai-apps" onClick={() => setMenuOpen(false)}>Explore</a><a href="/ai-image-generator-no-filter" onClick={() => setMenuOpen(false)}>Create</a><a href="/ai-girlfriend-chat" onClick={() => setMenuOpen(false)}>Companions</a><a href="/ai-roleplay" onClick={() => setMenuOpen(false)}>Roleplay</a>
        </nav>
        <div className="top-actions"><a className="login" href="#contact">Log in</a><a className="small-cta" href="#contact">Create free account <ArrowRight size={15} /></a><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X /> : <Menu />}</button></div>
      </header>

      <section className="hero" id="top">
        <motion.div className="hero-orb orb-a" style={{ y }} /><motion.div className="hero-orb orb-b" style={{ y: useTransform(scrollYProgress, [0, 1], [0, 180]) }} />
        <div className="hero-grid" />
        <div className="hero-copy"><div className="pill"><span /> The all-in-one veloura AI platform</div><h1>Your fantasy.<br /><i>Your rules.</i><br /><strong>Nothing held back.</strong></h1><p>The creative space where your imagination sets the brief. Chat with a companion who remembers you, generate images and video, and make every idea feel real.</p><div className="hero-buttons"><a className="primary" href="#tools">Meet your AI partner <ArrowRight size={18} /></a><a className="secondary" href="#models"><Play size={15} fill="currentColor" /> See how it works</a></div><div className="trust"><span><Check size={14} /> Free forever plan</span><span><Check size={14} /> No credit card</span><span><Check size={14} /> Ready in 2 minutes</span></div></div>
        <div className="hero-card"><div className="card-top"><span className="live"><span /> LIVE PREVIEW</span><span>01 / 04</span></div><div className="portrait"><div className="portrait-ring" /><div className="portrait-glow" /><span className="portrait-label">create your<br /><b>own world</b></span></div><div className="card-bottom"><span>Meet someone<br /><b>made for you.</b></span><ArrowRight /></div></div>
        <div className="scroll-cue">Scroll to explore <span>↓</span></div>
      </section>

      <section className="stats"><div><b>1,000+</b><span>AI COMPANIONS</span></div><div><b>6</b><span>IMAGE MODELS</span></div><div><b>15+</b><span>CREATIVE TOOLS</span></div><div><b>0</b><span>LIMITS ON IDEAS</span></div></section>

      <section className="switch section"><div className="section-kicker">01 / Why people switch</div><div className="split-heading"><h2>Tired of AI<br />that keeps<br /><em>saying no?</em></h2><div><p>Every other AI was trained to refuse. We were built to give you room to explore, create, and stay in the moment.</p><a href="#contact" className="text-link">Start exploring <ArrowRight size={16} /></a></div></div><div className="compare"><div><span>EVERYWHERE ELSE</span>{["Content blocked by default", "Roleplay cut short", "Characters forget you", "One narrow tool", "Conversations feel sanitized"].map(x => <p key={x}><X size={15} /> {x}</p>)}</div><div className="compare-good"><span>UNCENSOREDART.AI</span>{["Every topic open to adults", "Roleplay that stays in character", "Memory that grows with every chat", "Chat, image, video, voice & more", "Raw, personal, yours"].map(x => <p key={x}><Check size={15} /> {x}</p>)}</div></div></section>

      <section className="tools section" id="tools"><div className="section-kicker">02 / Everything you need. One login.</div><div className="section-title"><h2>One platform.<br /><em>Infinite possibilities.</em></h2><p>Seven creative tools stitched into one fluid experience. No tab juggling. No subscription stacking. No compromises.</p></div><div className="tool-grid">{tools.map((tool, i) => <motion.article className={`tool-card card-${i + 1}`} key={tool.label} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: i * .08 }}><div className="tool-art"><Sparkles size={20} /><span>{tool.label}</span><div className="art-lines" /></div><div className="tool-body"><h3>{tool.title}</h3><p>{tool.body}</p><div className="tag-row">{tool.tags.map(tag => <span key={tag}>{tag}</span>)}</div><a href="#contact">Explore <ArrowRight size={15} /></a></div></motion.article>)}</div></section>

      <section className="models section" id="models"><div className="section-kicker">03 / The model zoo</div><div className="section-title"><h2>Six engines.<br /><em>One veloura canvas.</em></h2><p>Switch models on the fly. Choose photorealism, anime, illustration, or cinematic depending on where the idea takes you.</p></div><div className="model-list">{models.map((model, i) => <motion.div className="model-row" key={model} whileHover={{ x: 14 }}><span>0{i + 1}</span><h3>{model}</h3><p>{["Photoreal portraits and cinematic scenes.", "All-purpose generation and composability.", "Expressive character art and stylised scenes.", "Clean linework and vibrant illustration.", "Near-real-time drafts for rapid iteration.", "Complex prompts and compound scenes."][i]}</p><ArrowRight /></motion.div>)}</div></section>

      <section className="feature-section section" id="training"><div className="feature-copy"><div className="section-kicker">04 / LoRA training</div><h2>Train AI on your fantasy.<br /><em>Render it. Forever.</em></h2><p>Upload 10–30 reference images. Create a private custom model in minutes, then keep your character consistent across every scene and style.</p><div className="feature-points">{["Minutes, not hours", "Face, character, or style", "Plugs into every model", "Private by default"].map(point => <span key={point}><Check size={16} /> {point}</span>)}</div><a className="primary" href="#contact">Train your model <ArrowRight size={18} /></a></div><div className="training-art"><div className="scanline" /><div className="training-center"><Zap size={28} /><span>SAME FACE.<br /><b>EVERY FRAME.</b></span></div><div className="training-chip chip-one">10–30 images</div><div className="training-chip chip-two">PRIVATE MODEL</div><div className="training-chip chip-three">~10 MINUTES</div></div></section>

      <section className="manifesto section"><div className="section-kicker">05 / Your creative space</div><div className="manifesto-line">Make more<br /><em>of what-if.</em></div><p>For adults who want a little more room to imagine. For creators who want their tools to keep up. For ideas that do not fit inside a template.</p><a className="primary" href="#contact">Claim your free tokens <ArrowRight size={18} /></a></section>

      <section className="faq section" id="faq"><div className="section-kicker">06 / Frequently asked</div><h2>Good questions.<br /><em>Honest answers.</em></h2><div className="faq-list">{faqs.map(([q, a], i) => <div className="faq-item" key={q}><button onClick={() => setFaq(faq === i ? null : i)} aria-expanded={faq === i}><span>{q}</span><ChevronDown className={faq === i ? "rotated" : ""} /></button><motion.div className="faq-answer" initial={false} animate={{ height: faq === i ? "auto" : 0, opacity: faq === i ? 1 : 0 }}><p>{a}</p></motion.div></div>)}</div></section>

      <section className="contact section" id="contact"><div className="contact-glow" /><div className="section-kicker">07 / The open door</div><h2>Ready to make<br /><em>something yours?</em></h2><p>Start free. Explore at your own pace. Your next idea is waiting.</p><a className="primary" href="mailto:hello@example.com">Create your free account <ArrowRight size={18} /></a></section>
      <footer><a className="brand" href="#top"><span className="brand-mark">◈</span> veloura<span>.art</span></a><span>© 2024 UncensoredArt.ai / Made for imagination.</span><div><a href="#contact">Instagram</a><a href="#contact">Discord</a><a href="#contact">X</a></div></footer>
    </main>
  )
}
