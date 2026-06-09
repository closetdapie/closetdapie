import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { Reveal } from '@/components/cinema/reveal';

export default async function EntrarPage() {
  const session = await auth();
  if (session) redirect('/painel');

  async function entrar(formData: FormData) {
    'use server';
    const senha = String(formData.get('senha') || '');
    await signIn('credentials', { senha, redirectTo: '/painel' });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-canvas)]">
      {/* Decorative blobs */}
      <div className="blob-blush" style={{ width: '50vw', height: '50vw', top: '-15%', left: '-15%', opacity: 0.6 }} />
      <div className="blob-silver" style={{ width: '40vw', height: '40vw', bottom: '-10%', right: '-10%', opacity: 0.8 }} />
      <div className="absolute inset-0 grid-bg-light pointer-events-none" style={{ maskImage: 'radial-gradient(ellipse at center, #000 0%, transparent 75%)' }} />

      {/* Top bar */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between">
        <span className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[var(--color-ink)] grid place-items-center">
            <span className="font-display text-white text-base leading-none translate-y-px">C</span>
          </span>
          <span className="font-display text-lg tracking-wide">CLOSET FINANCEIRO</span>
        </span>
        <span className="text-eyebrow tabular hidden md:inline">v 1.0 · 2026</span>
      </header>

      {/* Centro */}
      <section className="relative z-10 grid place-items-center px-6 py-20">
        <Reveal delay={0.1}>
          <div className="card max-w-md w-full" style={{ padding: '2.4rem 2.2rem' }}>
            <div className="mb-7">
              <span className="pill mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gain)] animate-pulse" />
                Online
              </span>
              <h1 className="text-hero mt-3 mb-2 leading-none">
                Bem-vinda,<br />
                <span style={{ color: 'var(--color-blush-ink)' }}>Pietra</span>
              </h1>
              <p className="text-sm text-[var(--color-ink-3)] leading-relaxed mt-3">
                Veja agora quanto você <strong className="text-[var(--color-ink)]">realmente lucrou</strong> esse mês —
                sem precisar adivinhar.
              </p>
            </div>

            <form action={entrar} className="space-y-4">
              <div>
                <label className="label" htmlFor="senha">Senha de acesso</label>
                <input
                  id="senha"
                  name="senha"
                  type="password"
                  required
                  autoFocus
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="btn w-full justify-center mt-4">
                Entrar no painel
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
            </form>

            <div className="hairline my-6" />

            <p className="text-xs text-[var(--color-ink-4)] text-center">
              Painel interno · uso restrito
            </p>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 px-8 py-6 flex items-center justify-between text-eyebrow">
        <span>© 2026 Closet da Piê</span>
        <span className="hidden md:inline">LPG Digital</span>
      </footer>
    </main>
  );
}
