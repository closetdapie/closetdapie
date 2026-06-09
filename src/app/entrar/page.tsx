import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';
import { AuroraBackground } from '@/components/cinema/aurora-bg';
import { SplitText, SplitChars } from '@/components/cinema/split-text';
import { Reveal } from '@/components/cinema/reveal';
import { Magnetic } from '@/components/cinema/magnetic';

export default async function EntrarPage() {
  const session = await auth();
  if (session) redirect('/painel');

  async function entrar(formData: FormData) {
    'use server';
    const senha = String(formData.get('senha') || '');
    await signIn('credentials', { senha, redirectTo: '/painel' });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-onyx)] flex flex-col">
      <AuroraBackground watermark="CLOSET" />

      {/* Top bar minimal */}
      <header className="relative z-10 px-8 py-7 flex items-center justify-between">
        <span className="text-eyebrow">
          <SplitText text="Closet • Financeiro" />
        </span>
        <span className="text-eyebrow tabular hidden md:inline">
          <SplitText text="V 1.0 · 2026" delay={0.4} />
        </span>
      </header>

      {/* Hero + Form */}
      <section className="relative z-10 flex-1 grid place-items-center px-6 py-12">
        <div className="text-center max-w-3xl">
          <Reveal delay={0.1}>
            <p className="text-eyebrow mb-8">Bem-vinda de volta</p>
          </Reveal>

          <h1 className="text-hero text-platinum-grad mb-2">
            <SplitChars text="PIETRA" delay={0.3} />
          </h1>

          <Reveal delay={1.1} y={20}>
            <p className="font-display text-2xl md:text-3xl text-[var(--color-steel)] tracking-wide">
              VEJA QUANTO REALMENTE LUCROU.
            </p>
          </Reveal>

          {/* Hairline */}
          <Reveal delay={1.4}>
            <div className="hairline max-w-xs mx-auto my-12" />
          </Reveal>

          {/* Form */}
          <Reveal delay={1.5}>
            <form action={entrar} className="max-w-sm mx-auto">
              <label className="label text-center" htmlFor="senha">
                Acesso restrito
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                required
                autoFocus
                className="input text-center"
                placeholder="••••••••"
              />
              <div className="mt-10 flex justify-center">
                <Magnetic strength={0.3}>
                  <button type="submit" className="btn">
                    <span>Entrar no painel</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </button>
                </Magnetic>
              </div>
            </form>
          </Reveal>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="relative z-10 px-8 py-7 flex items-center justify-between text-eyebrow">
        <span><SplitText text="© 2026 Closet da Piê" delay={1.8} /></span>
        <span className="hidden md:inline"><SplitText text="Powered by LPG" delay={2} /></span>
      </footer>
    </main>
  );
}
