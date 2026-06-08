'use server';

import { db, produtosCogs } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function criarProdutoCogs(formData: FormData) {
  const nome = String(formData.get('nome') || '').trim();
  const sku = String(formData.get('sku') || '').trim() || null;
  const custoUnitario = String(formData.get('custoUnitario') || '0');
  const precoVenda = String(formData.get('precoVenda') || '') || null;
  const nuvemshopProductId = String(formData.get('nuvemshopProductId') || '').trim() || null;

  if (!nome || Number(custoUnitario) < 0) return;

  await db.insert(produtosCogs).values({
    nome,
    sku,
    custoUnitario,
    precoVenda,
    nuvemshopProductId,
  });

  revalidatePath('/painel/produtos');
}

export async function atualizarCogs(formData: FormData) {
  const id = String(formData.get('id') || '');
  const custoUnitario = String(formData.get('custoUnitario') || '0');
  if (!id) return;
  await db.update(produtosCogs)
    .set({ custoUnitario, atualizadoEm: new Date() })
    .where(eq(produtosCogs.id, id));
  revalidatePath('/painel/produtos');
}

export async function deletarProdutoCogs(formData: FormData) {
  const id = String(formData.get('id') || '');
  if (id) await db.delete(produtosCogs).where(eq(produtosCogs.id, id));
  revalidatePath('/painel/produtos');
}
