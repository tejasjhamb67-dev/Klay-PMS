import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav";

export const metadata: Metadata = {
  title: "Klay Capital · Private Client Portal",
  description: "Portfolio intelligence for Klay Capital private clients.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 px-8 py-8 max-w-6xl">{children}</main>
        </div>
      </body>
    </html>
  );
}
