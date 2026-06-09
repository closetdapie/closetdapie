import type { Metadata } from 'next';
import './globals.css';
import { SmoothScroll } from '@/components/cinema/smooth-scroll';

export const metadata: Metadata = {
  title: 'Closet Financeiro · Pietra',
  description: 'Controle financeiro do Closet da Piê',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full flex flex-col bg-[var(--color-onyx)] text-[var(--color-pearl)]">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
