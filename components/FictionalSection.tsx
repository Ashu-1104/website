'use client'
import React from 'react'

export function FictionalSection() {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-semibold mb-4">Fictional Characters</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-md glass bg-background-tertiary">Fictional A</div>
        <div className="p-4 rounded-md glass bg-background-tertiary">Fictional B</div>
        <div className="p-4 rounded-md glass bg-background-tertiary">Fictional C</div>
      </div>
    </section>
  )
}
