import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WOWPRO by WowStampa',
  description: 'Area riservata premium per i clienti WowStampa.',
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
