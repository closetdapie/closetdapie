import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const SENHA_ADMIN = process.env.SENHA_ADMIN || 'closet2026';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'senha',
      credentials: {
        senha: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const senha = String(credentials?.senha || '');
        if (senha === SENHA_ADMIN) {
          return { id: 'pietra', name: 'Pietra', email: 'pietra@closetdapie.com.br' };
        }
        return null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/entrar' },
});
