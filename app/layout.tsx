import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NOVA — Digital experiences with a pulse",
  description: "A motion-first digital experience for curious minds and ambitious ideas.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
