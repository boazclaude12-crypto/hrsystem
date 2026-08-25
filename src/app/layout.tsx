import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "HR System",
  description: "Employee, attendance, leave and payroll management.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
