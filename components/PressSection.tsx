'use client'
import React from 'react'

export function PressSection() {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-semibold mb-4">Press</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md glass bg-background-tertiary">As featured in TechDaily</div>
        <div className="p-4 rounded-md glass bg-background-tertiary">Mentioned on AIWeek</div>
        <div className="p-4 rounded-md glass bg-background-tertiary">Spotlight: Startup Journal</div>
      </div>
    </section>
  )
}
