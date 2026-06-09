import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { Sidebar } from '@/components/sidebar';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/entrar');

  async function sair() {
    'use server';
    await signOut({ redirectTo: '/entrar' });
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--color-canvas)]">
      <Sidebar sairAction={sair} />
      <main className="flex-1 overflow-x-auto">{children}</main>
    </div>
  );
}
