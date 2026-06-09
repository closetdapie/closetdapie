'use server';

import { db, despesas, produtosCogs } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/* Compra de coleção/mercadoria — atualiza custo dos produtos E cria 1 despesa pontual.
   Esperado em formData:
     descricao: string
     data: yyyy-mm-dd
     fornecedor: string (opcional)
     itens: JSON stringified array [{produtoId, custoUnitario, quantidade}] */

export async function registrarCompraMercadoria(formData: FormData) {
  const descricao = String(formData.get('descricao') || '').trim() || 'Compra de mercadoria';
  const data = new Date(String(formData.get('data') || new Date().toISOString().slice(0, 10)));
  const fornecedor = String(formData.get('fornecedor') || '').trim() || null;
  const itensJson = String(formData.get('itens') || '[]');

  let itens: Array<{ produtoId: string; custoUnitario: number; quantidade: number }>;
  try { itens = JSON.parse(itensJson); } catch { return { erro: 'itens_invalidos' }; }
  if (!Array.isArray(itens) || itens.length === 0) return { erro: 'sem_itens' };

  let total = 0;
  for (const item of itens) {
    const custo = Number(item.custoUnitario);
    const qtd = Math.max(1, Number(item.quantidade));
    if (custo <= 0) continue;
    total += custo * qtd;

    // atualiza COGS do produto (cada compra sobrescreve com o custo mais recente)
    if (item.produtoId) {
      await db
        .update(produtosCogs)
        .set({ custoUnitario: String(custo), atualizadoEm: new Date() })
        .where(eq(produtosCogs.id, item.produtoId));
    }
  }

  // cria a despesa pontual no caixa
  const obs = [fornecedor && `Fornecedor: ${fornecedor}`, `${itens.length} item(ns)`].filter(Boolean).join(' · ');
  await db.insert(despesas).values({
    descricao,
    valor: String(total),
    categoria: 'estoque',
    data,
    observacao: obs,
  });

  revalidatePath('/painel/compras');
  revalidatePath('/painel/despesas');
  revalidatePath('/painel/produtos');
  revalidatePath('/painel');
}
