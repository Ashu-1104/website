"use client"

import { useState } from "react"
import { ArrowDown, ArrowUpRight, Menu, X, Sparkles, Play, Plus, Minus } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"

const projects = [
  { number: "01", title: "Afterglow", type: "Interactive film / 2024", color: "#d9ff4a", shape: "circle" },
  { number: "02", title: "Morrow", type: "Identity system / 2023", color: "#f4b8ff", shape: "square" },
  { number: "03", title: "Tidepool", type: "Digital product / 2023", color: "#a5e8ff", shape: "wave" },
]

const faqs = [
  ["What is this place?", "A small independent studio making expressive digital worlds for people with something to say."],
  ["Do you work with teams?", "Absolutely. We plug into curious teams, ambitious founders, and anyone who wants to make the ordinary feel new."],
  ["Where are you based?", "Somewhere between a notebook and the internet. Available worldwide, always."],
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const { scrollYProgress } = useScroll()
  const orbY = useTransform(scrollYProgress, [0, 1], [0, -420])

  return (
    <main className="site-shell">
      <div className="grain" aria-hidden="true" />
      <header className="nav">
        <a className="wordmark" href="#top" aria-label="NOVA home"><span>N</span>OVA<span className="dot">.</span></a>
        <nav className={`nav-links ${menuOpen ? "is-open" : ""}`}>
          <a href="#manifesto" onClick={() => setMenuOpen(false)}>Manifesto</a>
          <a href="#work" onClick={() => setMenuOpen(false)}>Field notes</a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Say hello</a>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "Close menu" : "Open menu"}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </header>

      <section className="hero" id="top">
        <div className="hero-kicker"><span className="status-dot" /> Independent digital studio <span className="kicker-line" /></div>
        <motion.div className="orb orb-one" style={{ y: orbY }} aria-hidden="true" />
        <motion.div className="orb orb-two" style={{ y: useTransform(scrollYProgress, [0, 1], [0, 260]) }} aria-hidden="true" />
        <div className="hero-title-wrap">
          <p className="eyebrow">For people who refuse to blend in</p>
          <h1><span className="title-outline">Make</span> <em>room</em><br /><span className="indent">for</span> <span className="title-highlight">wonder.</span></h1>
        </div>
        <div className="hero-bottom">
          <p className="hero-intro">We build bold identities, digital experiences, and little moments of magic for the endlessly curious.</p>
          <a href="#manifesto" className="round-link" aria-label="Scroll to manifesto"><ArrowDown size={24} /></a>
          <span className="scroll-label">Scroll to explore <span>↓</span></span>
        </div>
      </section>

      <section className="manifesto section" id="manifesto">
        <div className="section-label">/ 01 — The idea</div>
        <div className="manifesto-copy">
          <h2>Good work<br />should feel like<br /><span>something.</span></h2>
          <div className="manifesto-aside"><Sparkles size={18} /><p>Not just seen.<br />Felt. Remembered.<br />Passed on.</p></div>
        </div>
        <div className="ticker" aria-hidden="true"><div>Curiosity is a strategy <span>✳</span> Curiosity is a strategy <span>✳</span> Curiosity is a strategy <span>✳</span></div></div>
      </section>

      <section className="work section" id="work">
        <div className="section-label">/ 02 — Selected field notes <span>(03)</span></div>
        <div className="work-heading"><h2>Recent <i>signals</i></h2><p>A few things we made<br />with good people.</p></div>
        <div className="project-list">
          {projects.map((project, index) => <motion.a href="#contact" className="project-card" key={project.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ delay: index * 0.1 }}>
            <div className={`project-art ${project.shape}`} style={{ "--accent": project.color } as React.CSSProperties}><span className="art-word">{project.title}</span><span className="art-corner">↗</span></div>
            <div className="project-meta"><span>{project.number}</span><h3>{project.title}</h3><p>{project.type}</p><ArrowUpRight size={18} /></div>
          </motion.a>)}
        </div>
      </section>

      <section className="manifesto manifesto-alt section">
        <div className="section-label">/ 03 — A working principle</div>
        <div className="big-statement"><span>Stay</span><strong>curious</strong><span className="outline-text">always.</span></div>
        <div className="statement-foot"><p>We believe the best ideas live just outside the obvious. So we look closer, ask better questions, and leave room for the unexpected.</p><span>✳</span></div>
      </section>

      <section className="faq section">
        <div className="section-label">/ 04 — Frequently wondered</div>
        <div className="faq-list">{faqs.map(([question, answer], index) => <div className="faq-item" key={question}><button onClick={() => setActiveFaq(activeFaq === index ? null : index)} aria-expanded={activeFaq === index}><span>{question}</span>{activeFaq === index ? <Minus size={20} /> : <Plus size={20} />}</button><motion.div initial={false} animate={{ height: activeFaq === index ? "auto" : 0, opacity: activeFaq === index ? 1 : 0 }} className="faq-answer"><p>{answer}</p></motion.div></div>)}</div>
      </section>

      <section className="contact section" id="contact"><div className="contact-glow" /><div className="section-label">/ 05 — The open door</div><h2>Have a good<br /><i>feeling?</i></h2><a className="contact-link" href="mailto:hello@example.com">hello@example.com <ArrowUpRight size={26} /></a><div className="contact-bottom"><p>New conversations welcome.</p><div className="socials"><a href="#contact">Instagram</a><a href="#contact">LinkedIn</a><a href="#contact">Are.na</a></div></div></section>
      <footer className="footer"><span>© 2024 NOVA / Made with intent.</span><span>Back to top <a href="#top">↑</a></span></footer>
    </main>
  )
}
