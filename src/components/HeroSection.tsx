'use client'
import React from 'react'

export default function HeroSection() {
  return (
    <section className="py-12">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Meet your virtual companion</h1>
          <p className="text-gray-300 max-w-lg">AI-powered companions with unique personalities. Chat, roleplay, and enjoy immersive interactions.</p>
          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 text-white">Explore Characters</button>
            <button className="px-4 py-2 rounded-md border border-gray-700 text-gray-200">Learn More</button>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="rounded-lg h-56 bg-gradient-to-tr from-purple-700 to-pink-500" />
        </div>
      </div>
    </section>
  )
}
