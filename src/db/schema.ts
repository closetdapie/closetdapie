import { pgTable, text, integer, timestamp, boolean, jsonb, primaryKey, numeric, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ---- AUTH (NextAuth + Drizzle Adapter) ---- */
export const users = pgTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable('account', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

/* ---- CONFIGURAÇÕES GLOBAIS DA LOJA ----
   Linha única (id=1). Pietra preenche 1x e usa em todos os cálculos. */
export const configuracoes = pgTable('configuracoes', {
  id: integer('id').primaryKey().default(1),
  // Nuvemshop
  taxaNuvemshopPercent: numeric('taxa_nuvemshop_percent', { precision: 5, scale: 3 }).notNull().default('0.700'), // 0,7%
  // Mercado Pago (gateway principal)
  taxaMpCartaoCreditoPercent: numeric('taxa_mp_credito_percent', { precision: 5, scale: 2 }).notNull().default('4.49'),
  taxaMpCartaoDebitoPercent: numeric('taxa_mp_debito_percent', { precision: 5, scale: 2 }).notNull().default('3.98'),
  taxaMpPixPercent: numeric('taxa_mp_pix_percent', { precision: 5, scale: 2 }).notNull().default('0.99'),
  taxaMpBoletoFixa: numeric('taxa_mp_boleto_fixa', { precision: 6, scale: 2 }).notNull().default('2.39'),
  taxaMpCartaoFixa: numeric('taxa_mp_cartao_fixa', { precision: 6, scale: 2 }).notNull().default('0.35'),
  // Operacional
  custoEmbalagem: numeric('custo_embalagem', { precision: 8, scale: 2 }).notNull().default('3.00'), // R$ por pedido
  custoFreteMedio: numeric('custo_frete_medio', { precision: 8, scale: 2 }).notNull().default('25.00'), // R$ médio quando Pietra absorve
  limiteFreteGratis: numeric('limite_frete_gratis', { precision: 8, scale: 2 }).notNull().default('300.00'),
  // Integração Nuvemshop
  nuvemshopStoreId: text('nuvemshop_store_id'),
  nuvemshopAccessToken: text('nuvemshop_access_token'),
  atualizadoEm: timestamp('atualizado_em', { mode: 'date' }).notNull().defaultNow(),
});

/* ---- CUSTOS FIXOS MENSAIS ----
   Recorrentes — entram automaticamente no cálculo de cada mês.
   Ex: Plano Nuvemshop, Avise-me, contadora, internet. */
export const custosFixos = pgTable('custos_fixos', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  descricao: text('descricao').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  categoria: text('categoria').notNull(), // 'plataforma' | 'marketing' | 'operacional' | 'pessoal' | 'outros'
  ativoDesde: timestamp('ativo_desde', { mode: 'date' }).notNull().defaultNow(),
  ativoAte: timestamp('ativo_ate', { mode: 'date' }), // null = ainda ativo
  diaCobranca: integer('dia_cobranca'), // dia do mês (1-31), opcional
  criadoEm: timestamp('criado_em', { mode: 'date' }).notNull().defaultNow(),
});

/* ---- DESPESAS PONTUAIS ----
   Gastos não recorrentes: compra de coleção, ads, eventos, parcerias. */
export const despesas = pgTable('despesas', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  descricao: text('descricao').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  categoria: text('categoria').notNull(), // 'ads_meta' | 'ads_google' | 'estoque' | 'marketing' | 'operacional' | 'imposto' | 'outros'
  data: timestamp('data', { mode: 'date' }).notNull(),
  observacao: text('observacao'),
  criadoEm: timestamp('criado_em', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
  index('despesas_data_idx').on(t.data),
  index('despesas_categoria_idx').on(t.categoria),
]);

/* ---- COGS POR PRODUTO ----
   Pietra cadastra o custo de cada peça (manualmente ou via planilha).
   Liga ao produto Nuvemshop via productId. */
export const produtosCogs = pgTable('produtos_cogs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  nuvemshopProductId: text('nuvemshop_product_id').unique(),
  nome: text('nome').notNull(),
  sku: text('sku'),
  custoUnitario: numeric('custo_unitario', { precision: 10, scale: 2 }).notNull(),
  precoVenda: numeric('preco_venda', { precision: 10, scale: 2 }),
  observacao: text('observacao'),
  // Estoque (sincronizado do site público)
  variantesDisponiveis: integer('variantes_disponiveis').default(0),
  variantesTotal: integer('variantes_total').default(0),
  disponivel: boolean('disponivel').default(false),
  atualizadoEm: timestamp('atualizado_em', { mode: 'date' }).notNull().defaultNow(),
});

/* ---- PEDIDOS SINCRONIZADOS DA NUVEMSHOP ----
   Cache local. Sincroniza via webhook/cron. Inclui cálculo de lucro real. */
export const pedidos = pgTable('pedidos', {
  id: text('id').primaryKey(), // = nuvemshop order id
  numero: integer('numero').notNull(),
  clienteNome: text('cliente_nome'),
  clienteEmail: text('cliente_email'),
  status: text('status').notNull(), // 'paid' | 'pending' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  dataPedido: timestamp('data_pedido', { mode: 'date' }).notNull(),

  // Valores
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  desconto: numeric('desconto', { precision: 10, scale: 2 }).notNull().default('0'),
  freteCobrado: numeric('frete_cobrado', { precision: 10, scale: 2 }).notNull().default('0'), // o que cliente pagou
  freteCustoReal: numeric('frete_custo_real', { precision: 10, scale: 2 }), // o que Pietra gastou (manual ou via API envio)
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),

  // Pagamento
  meioPagamento: text('meio_pagamento'), // 'credit_card' | 'pix' | 'boleto' | 'debit_card'
  parcelas: integer('parcelas'),

  // Calculados (cache pra dashboard rápido)
  taxaGateway: numeric('taxa_gateway', { precision: 10, scale: 2 }),
  taxaNuvemshop: numeric('taxa_nuvemshop', { precision: 10, scale: 2 }),
  cogsTotal: numeric('cogs_total', { precision: 10, scale: 2 }),
  custoEmbalagem: numeric('custo_embalagem', { precision: 10, scale: 2 }),
  custoFrete: numeric('custo_frete', { precision: 10, scale: 2 }),
  lucroLiquido: numeric('lucro_liquido', { precision: 10, scale: 2 }),
  margemPercent: numeric('margem_percent', { precision: 5, scale: 2 }),

  // Itens (JSON pra simplicidade)
  itens: jsonb('itens'), // [{productId, sku, nome, quantidade, precoUnitario}]
  recalculadoEm: timestamp('recalculado_em', { mode: 'date' }),
  sincronizadoEm: timestamp('sincronizado_em', { mode: 'date' }).notNull().defaultNow(),
}, (t) => [
  index('pedidos_data_idx').on(t.dataPedido),
  index('pedidos_status_idx').on(t.status),
]);
