'use client'
import React from 'react'

export function PricingSection() {
  const plans = [
    { name: 'Basic', price: '$4.99/mo', perks: ['1 companion', 'Basic voices'] },
    { name: 'Pro', price: '$12.99/mo', perks: ['5 companions', 'Priority responses'] },
    { name: 'Unlimited', price: '$29.99/mo', perks: ['Unlimited companions', 'Premium voices'] },
  ]
  return (
    <section id="pricing" className="py-8">
      <h2 className="text-2xl font-semibold mb-4">Pricing</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div key={p.name} className="p-6 rounded-md glass bg-background-tertiary text-center">
            <div className="text-lg font-semibold">{p.name}</div>
            <div className="text-2xl font-bold my-2">{p.price}</div>
            <ul className="text-sm text-gray-400 mb-4">
              {p.perks.map((x) => (<li key={x}>{x}</li>))}
            </ul>
            <button className="px-4 py-2 rounded-md bg-gradient-to-r from-pink-500 to-purple-500 text-white">Choose</button>
          </div>
        ))}
      </div>
    </section>
  )
}
