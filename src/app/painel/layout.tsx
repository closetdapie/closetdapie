import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/lib/auth';
import { LayoutDashboard, Settings, Receipt, Package, Wallet, LogOut, ShoppingBag, ShoppingCart } from 'lucide-react';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/entrar');

  async function sair() {
    'use server';
    await signOut({ redirectTo: '/entrar' });
  }

  const navItems = [
    { href: '/painel', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/painel/pedidos', label: 'Pedidos', icon: ShoppingBag },
    { href: '/painel/produtos', label: 'Produtos (COGS)', icon: Package },
    { href: '/painel/compras', label: 'Compras de coleção', icon: ShoppingCart },
    { href: '/painel/despesas', label: 'Despesas', icon: Receipt },
    { href: '/painel/custos-fixos', label: 'Custos Fixos', icon: Wallet },
    { href: '/painel/configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 bg-white border-r border-[var(--color-border)] flex flex-col">
        <div className="p-5 border-b border-[var(--color-border)]">
          <h1 className="font-bold tracking-tight text-lg">Closet Financeiro</h1>
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)] mt-0.5">
            Painel da Pietra
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-ink-soft)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)]"
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={sair} className="p-3 border-t border-[var(--color-border)]">
          <button className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--color-ink-mute)] hover:text-[var(--color-ink)] w-full">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  );
}
