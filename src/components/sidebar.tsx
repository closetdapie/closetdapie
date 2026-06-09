'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import {
  LayoutDashboard, Settings, Receipt, Package, Wallet,
  LogOut, ShoppingBag, ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';

const NAV = [
  { href: '/painel', label: 'Dashboard', icon: LayoutDashboard, group: 'Visão' },
  { href: '/painel/pedidos', label: 'Pedidos', icon: ShoppingBag, group: 'Vendas' },
  { href: '/painel/produtos', label: 'Produtos', icon: Package, group: 'Vendas' },
  { href: '/painel/compras', label: 'Compras', icon: ShoppingCart, group: 'Caixa' },
  { href: '/painel/despesas', label: 'Despesas', icon: Receipt, group: 'Caixa' },
  { href: '/painel/custos-fixos', label: 'Custos fixos', icon: Wallet, group: 'Caixa' },
  { href: '/painel/configuracoes', label: 'Configurações', icon: Settings, group: 'Ajustes' },
];

export function Sidebar({ sairAction }: { sairAction: (formData: FormData) => Promise<void> }) {
  const pathname = usePathname();
  const [hover, setHover] = useState<string | null>(null);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <aside className="w-[240px] shrink-0 bg-[var(--color-surface)] border-r border-[var(--color-line)] flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-[var(--color-line)]">
        <Link href="/painel" className="flex items-center gap-2.5 group">
          <span className="w-8 h-8 rounded-lg bg-[var(--color-ink)] grid place-items-center transition-transform group-hover:scale-105">
            <span className="font-display text-white text-lg leading-none translate-y-px">C</span>
          </span>
          <span>
            <p className="font-display text-base tracking-wide leading-tight text-[var(--color-ink)]">
              Closet
            </p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-ink-3)] leading-none font-semibold mt-0.5">
              Financeiro
            </p>
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 py-4 px-3 overflow-y-auto"
        onMouseLeave={() => setHover(null)}
      >
        {groups.map((group, gi) => {
          const items = NAV.filter((n) => n.group === group);
          return (
            <div key={group} className={gi > 0 ? 'mt-4' : ''}>
              <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-[var(--color-ink-4)]">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  const isHovered = hover === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setHover(item.href)}
                      className="relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium tracking-tight"
                      style={{
                        color: active ? 'var(--color-ink)' : 'var(--color-ink-2)',
                        transition: 'color 0.25s cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      {(active || isHovered) && (
                        <motion.span
                          layoutId="sb-pill"
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: active
                              ? 'var(--color-surface-2)'
                              : 'var(--color-surface-2)',
                            border: active ? '1px solid var(--color-line-2)' : '1px solid var(--color-line)',
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      <Icon className="w-4 h-4 relative z-10 shrink-0" />
                      <span className="relative z-10 truncate">{item.label}</span>
                      {active && (
                        <motion.span
                          className="ml-auto w-1 h-1 rounded-full bg-[var(--color-blush-ink)] relative z-10"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Profile + Sair */}
      <div className="px-3 pb-4 pt-3 border-t border-[var(--color-line)]">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1">
          <span className="w-7 h-7 rounded-full bg-[var(--color-blush)] grid place-items-center text-[var(--color-blush-deep)] font-display text-sm leading-none">
            P
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-[var(--color-ink)] truncate leading-tight">Pietra</p>
            <p className="text-[10px] text-[var(--color-ink-4)] truncate">closetdapie@gmail.com</p>
          </div>
        </div>
        <form action={sairAction}>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-surface-2)] transition-colors">
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
