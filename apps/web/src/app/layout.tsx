import './globals.css';
import type { Metadata } from 'next';

const appName = 'Customer Account Brief Generator';

export const metadata: Metadata = {
  title: appName,
  description: 'Generate structured customer account briefs with Salesforce and public context.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <main className="mx-auto max-w-5xl px-6 py-10">
          {children}
        </main>
      </body>
    </html>
  );
}
