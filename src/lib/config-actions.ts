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
  // só atualiza Store ID e Token se vierem PREENCHIDOS no form
  // (assim a Pietra pode salvar config sem perder esses dados ao deixar em branco)
  const storeIdForm = String(formData.get('nuvemshopStoreId') || '').trim();
  const tokenForm = String(formData.get('nuvemshopAccessToken') || '').trim();

  const dados: Record<string, string | Date | null> = {
    taxaNuvemshopPercent: String(formData.get('taxaNuvemshopPercent') || '0.7'),
    taxaMpCartaoCreditoPercent: String(formData.get('taxaMpCartaoCreditoPercent') || '4.49'),
    taxaMpCartaoDebitoPercent: String(formData.get('taxaMpCartaoDebitoPercent') || '3.98'),
    taxaMpPixPercent: String(formData.get('taxaMpPixPercent') || '0.99'),
    taxaMpCartaoFixa: String(formData.get('taxaMpCartaoFixa') || '0.35'),
    taxaMpBoletoFixa: String(formData.get('taxaMpBoletoFixa') || '2.39'),
    custoEmbalagem: String(formData.get('custoEmbalagem') || '6.00'),
    custoFreteMedio: String(formData.get('custoFreteMedio') || '15.00'),
    limiteFreteGratis: String(formData.get('limiteFreteGratis') || '300.00'),
    atualizadoEm: new Date(),
  };
  if (storeIdForm) dados.nuvemshopStoreId = storeIdForm;
  if (tokenForm) dados.nuvemshopAccessToken = tokenForm;

  await db
    .insert(configuracoes)
    .values({ id: 1, ...dados })
    .onConflictDoUpdate({ target: configuracoes.id, set: dados });

  revalidatePath('/painel/configuracoes');
  revalidatePath('/painel');
}
