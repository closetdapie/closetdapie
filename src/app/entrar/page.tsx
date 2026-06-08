import { redirect } from 'next/navigation';
import { auth, signIn } from '@/lib/auth';

export default async function EntrarPage() {
  const session = await auth();
  if (session) redirect('/painel');

  async function entrar(formData: FormData) {
    'use server';
    const senha = String(formData.get('senha') || '');
    await signIn('credentials', { senha, redirectTo: '/painel' });
  }

  return (
    <main className="min-h-screen grid place-items-center px-5">
      <div className="card w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center">Closet Financeiro</h1>
        <p className="text-center text-sm text-[var(--color-ink-mute)] mt-1 mb-6">
          Bem-vinda, Pietra
        </p>
        <form action={entrar} className="space-y-4">
          <div>
            <label className="label">Senha</label>
            <input
              name="senha"
              type="password"
              required
              autoFocus
              className="input"
              placeholder="Digite sua senha"
            />
          </div>
          <button type="submit" className="btn w-full justify-center">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
