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
    <div className="flex min-h-screen bg-[var(--color-onyx)] relative">
      {/* Background grid global */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" style={{ maskImage: 'radial-gradient(ellipse at center, #000 0%, transparent 70%)' }} />
      <Sidebar sairAction={sair} />
      <main className="flex-1 px-8 lg:px-12 py-10 overflow-x-auto relative z-10">{children}</main>
    </div>
  );
}
