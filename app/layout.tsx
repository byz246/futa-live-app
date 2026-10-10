import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FUTA Live | Your Campus, Your Community",
  description:
    "Connect with the FUTA community. Discover campus updates, buy and sell, find accommodation, and share useful information.",
  applicationName: "FUTA Live",
  keywords: [
    "FUTA",
    "Federal University of Technology Akure",
    "campus community",
    "student marketplace",
    "student accommodation",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}