import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nautos",
  description: "Nautos Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
