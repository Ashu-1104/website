'use client'
import React from 'react'

export function FeaturesSection() {
  const features = [
    { title: 'Custom personalities', desc: 'Create companions with unique traits.' },
    { title: 'Safe & Moderated', desc: 'Built-in moderation and safety filters.' },
    { title: 'Real-time chat', desc: 'Low-latency conversational experience.' },
  ]
  return (
    <section id="features" className="py-8">
      <h2 className="text-2xl font-semibold mb-4">Features</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {features.map((f) => (
          <div key={f.title} className="p-4 rounded-md glass bg-background-tertiary">
            <div className="font-semibold">{f.title}</div>
            <div className="text-sm text-gray-400">{f.desc}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
