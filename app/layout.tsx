import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Veloura.ai — Your fantasy. Your rules.",
  description: "An expressive AI creative platform for companions, images, video, voice, and private character models.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
