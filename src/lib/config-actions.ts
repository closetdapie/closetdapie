'use server';

import { db, configuracoes } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getConfig() {
  const [c] = await db.select().from(configuracoes).where(eq(configuracoes.id, 1));
  if (c) return c;
  // primeira vez — cria linha padrão
  const [novo] = await db.insert(configuracoes).values({ id: 1 }).returning();
  return novo;
}

export async function salvarConfig(formData: FormData) {
  const dados = {
    taxaNuvemshopPercent: String(formData.get('taxaNuvemshopPercent') || '0.7'),
    taxaMpCartaoCreditoPercent: String(formData.get('taxaMpCartaoCreditoPercent') || '4.49'),
    taxaMpCartaoDebitoPercent: String(formData.get('taxaMpCartaoDebitoPercent') || '3.98'),
    taxaMpPixPercent: String(formData.get('taxaMpPixPercent') || '0.99'),
    taxaMpCartaoFixa: String(formData.get('taxaMpCartaoFixa') || '0.35'),
    taxaMpBoletoFixa: String(formData.get('taxaMpBoletoFixa') || '2.39'),
    custoEmbalagem: String(formData.get('custoEmbalagem') || '3.00'),
    custoFreteMedio: String(formData.get('custoFreteMedio') || '25.00'),
    limiteFreteGratis: String(formData.get('limiteFreteGratis') || '300.00'),
    nuvemshopStoreId: String(formData.get('nuvemshopStoreId') || '') || null,
    nuvemshopAccessToken: String(formData.get('nuvemshopAccessToken') || '') || null,
    atualizadoEm: new Date(),
  };

  await db
    .insert(configuracoes)
    .values({ id: 1, ...dados })
    .onConflictDoUpdate({ target: configuracoes.id, set: dados });

  revalidatePath('/painel/configuracoes');
  revalidatePath('/painel');
}
