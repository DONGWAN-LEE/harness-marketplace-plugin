import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Benchmark Seed App',
  description: 'Reference project for harness-marketplace A/B pilot',
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
