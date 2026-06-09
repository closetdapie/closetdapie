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
  { href: '/painel', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/painel/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { href: '/painel/produtos', label: 'Produtos', icon: Package },
  { href: '/painel/compras', label: 'Compras', icon: ShoppingCart },
  { href: '/painel/despesas', label: 'Despesas', icon: Receipt },
  { href: '/painel/custos-fixos', label: 'Custos Fixos', icon: Wallet },
  { href: '/painel/configuracoes', label: 'Configurações', icon: Settings },
];

export function Sidebar({ sairAction }: { sairAction: (formData: FormData) => Promise<void> }) {
  const pathname = usePathname();
  const [hover, setHover] = useState<string | null>(null);

  return (
    <aside className="w-[260px] shrink-0 border-r border-[rgba(229,228,226,0.08)] bg-gradient-to-b from-[rgba(11,11,14,0.7)] to-[rgba(5,5,7,0.7)] backdrop-blur-xl flex flex-col">
      {/* Brand */}
      <div className="px-7 pt-8 pb-7 border-b border-[rgba(229,228,226,0.06)]">
        <Link href="/painel" className="block group">
          <p className="text-eyebrow mb-1.5 transition-opacity group-hover:opacity-100" style={{ opacity: 0.6 }}>
            Pietra · Admin
          </p>
          <h1 className="font-display text-3xl tracking-tight text-[var(--color-pearl)] leading-none">
            CLOSET
            <br />
            FINANCEIRO
          </h1>
        </Link>
      </div>

      {/* Nav */}
      <nav
        className="flex-1 py-5 px-3.5 space-y-0.5 relative"
        onMouseLeave={() => setHover(null)}
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          const isHovered = hover === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHover(item.href)}
              className="relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[13px] font-medium tracking-wide"
              style={{
                color: active ? 'var(--color-snow)' : 'var(--color-steel)',
                transition: 'color 0.4s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {/* highlight pill animado */}
              {(active || isHovered) && (
                <motion.span
                  layoutId="sidebar-pill"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, rgba(229,228,226,0.13), rgba(229,228,226,0.04))'
                      : 'rgba(229,228,226,0.05)',
                    border: active ? '1px solid rgba(229,228,226,0.15)' : '1px solid transparent',
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{item.label}</span>
              {active && (
                <motion.span
                  className="ml-auto w-1 h-1 rounded-full bg-[var(--color-platinum)] relative z-10"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sair */}
      <form action={sairAction} className="px-3.5 pb-6 pt-4 border-t border-[rgba(229,228,226,0.06)]">
        <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[12px] text-[var(--color-iron)] hover:text-[var(--color-pearl)] tracking-wide transition-colors">
          <LogOut className="w-3.5 h-3.5" />
          Sair
        </button>
      </form>
    </aside>
  );
}
