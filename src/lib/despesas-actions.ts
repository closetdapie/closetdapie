'use server';

import { db, despesas, custosFixos } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/* ---- DESPESAS PONTUAIS ---- */
export async function criarDespesa(formData: FormData) {
  const descricao = String(formData.get('descricao') || '').trim();
  const valor = String(formData.get('valor') || '0');
  const categoria = String(formData.get('categoria') || 'outros');
  const data = new Date(String(formData.get('data') || new Date().toISOString().slice(0, 10)));
  const observacao = String(formData.get('observacao') || '').trim() || null;

  if (!descricao || Number(valor) <= 0) return;

  await db.insert(despesas).values({ descricao, valor, categoria, data, observacao });
  revalidatePath('/painel/despesas');
  revalidatePath('/painel');
}

export async function deletarDespesa(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await db.delete(despesas).where(eq(despesas.id, id));
  revalidatePath('/painel/despesas');
  revalidatePath('/painel');
}

/* ---- CUSTOS FIXOS ---- */
export async function criarCustoFixo(formData: FormData) {
  const descricao = String(formData.get('descricao') || '').trim();
  const valor = String(formData.get('valor') || '0');
  const categoria = String(formData.get('categoria') || 'plataforma');
  const diaCobrancaStr = String(formData.get('diaCobranca') || '');
  const diaCobranca = diaCobrancaStr ? Math.max(1, Math.min(31, parseInt(diaCobrancaStr, 10))) : null;

  if (!descricao || Number(valor) <= 0) return;

  await db.insert(custosFixos).values({ descricao, valor, categoria, diaCobranca });
  revalidatePath('/painel/custos-fixos');
  revalidatePath('/painel');
}

export async function encerrarCustoFixo(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await db.update(custosFixos).set({ ativoAte: new Date() }).where(eq(custosFixos.id, id));
  revalidatePath('/painel/custos-fixos');
  revalidatePath('/painel');
}

export async function deletarCustoFixo(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await db.delete(custosFixos).where(eq(custosFixos.id, id));
  revalidatePath('/painel/custos-fixos');
  revalidatePath('/painel');
}
