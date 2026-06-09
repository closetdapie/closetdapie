/* Cria pedidos sintéticos pra Junho 2026 baseados nos números reais do painel-ia.
   Dados base (painel-ia, últimos 30d até 08/06):
     - 180 pedidos, 157 vendas convertidas, R$ 39.190
     - Top produtos: Body Vampy Preto, Shorts Saia Temptation, Body Moon, Vestido Crazy
     - Canais: Instagram 57, Facebook 35, Direto 28, Google 18
     - Ticket médio ~R$ 217
   Esses pedidos são PLACEHOLDERS pra ela visualizar dashboard funcionando — quando
   ela conectar API real da Nuvemshop, sincronização sobrescreve com dados reais. */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { neon } from '@neondatabase/serverless';
import { calcularLucroPedido, type ConfiguracoesCalculo } from '../src/lib/calcular-lucro';

const sql = neon(process.env.DATABASE_URL!);

const NOMES_CLIENTES = [
  'Laiza Sales', 'Ana Barreto', 'Ana Kyriazi', 'Laura Grochevits', 'Sabrina Sardote',
  'Mariana Costa', 'Beatriz Lima', 'Camila Santos', 'Júlia Oliveira', 'Larissa Souza',
  'Manuela Ferreira', 'Bruna Pereira', 'Carolina Alves', 'Eduarda Martins', 'Gabriela Ribeiro',
  'Isabela Carvalho', 'Lívia Gomes', 'Pietra Mendes', 'Rafaela Cardoso', 'Tatiane Vieira',
  'Vanessa Rocha', 'Yasmin Almeida', 'Beatriz Nascimento', 'Carla Borges', 'Daniela Castro',
  'Elaine Dias', 'Fabiana Pinto', 'Giovanna Reis', 'Helena Moraes', 'Iara Teixeira',
  'Jéssica Araújo', 'Kelly Barros', 'Letícia Cavalcanti', 'Michele Fernandes', 'Natália Cunha',
  'Olívia Macedo', 'Patrícia Nunes', 'Quézia Lopes', 'Renata Moura', 'Sara Pacheco',
  'Tainá Vasconcelos', 'Úrsula Xavier', 'Viviane Andrade', 'Wendy Brandão', 'Adriana Cruz',
  'Bianca Duarte', 'Clara Ezequiel', 'Débora Furtado', 'Erika Galvão', 'Flávia Henrique',
];

type Produto = {
  id: string;
  nuvemshopProductId: string | null;
  nome: string;
  precoVenda: string | null;
  custoUnitario: string;
};

function escolher<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function gerarDataAleatoria(inicio: Date, fim: Date): Date {
  const ts = inicio.getTime() + Math.random() * (fim.getTime() - inicio.getTime());
  const d = new Date(ts);
  // hora comercial brasileira (10h-22h)
  d.setHours(10 + Math.floor(Math.random() * 13), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

function gerarTelefone(): string {
  const ddd = escolher(['11', '21', '31', '41', '51', '61', '71', '81']);
  return `+55${ddd}9${String(Math.floor(Math.random() * 90000000) + 10000000)}`;
}

async function main() {
  console.log('[seed] Buscando produtos disponíveis...');
  // Pega produtos disponíveis pra montar carrinho realista
  const produtos = await sql`
    SELECT id, nuvemshop_product_id as "nuvemshopProductId", nome, preco_venda as "precoVenda", custo_unitario as "custoUnitario"
    FROM produtos_cogs
    WHERE disponivel = true AND preco_venda IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 200
  ` as unknown as Produto[];

  if (produtos.length === 0) {
    console.error('[seed] Nenhum produto disponível! Rode importar-estoque.ts primeiro');
    return;
  }
  console.log(`[seed] ${produtos.length} produtos disponíveis pra usar`);

  console.log('[seed] Buscando configurações...');
  const [cfg] = await sql`SELECT * FROM configuracoes WHERE id = 1` as unknown as Array<{
    taxa_nuvemshop_percent: string;
    taxa_mp_credito_percent: string;
    taxa_mp_debito_percent: string;
    taxa_mp_pix_percent: string;
    taxa_mp_cartao_fixa: string;
    taxa_mp_boleto_fixa: string;
    custo_embalagem: string;
    custo_frete_medio: string;
    limite_frete_gratis: string;
  }>;

  const config: ConfiguracoesCalculo = cfg ? {
    taxaNuvemshopPercent: Number(cfg.taxa_nuvemshop_percent),
    taxaMpCartaoCreditoPercent: Number(cfg.taxa_mp_credito_percent),
    taxaMpCartaoDebitoPercent: Number(cfg.taxa_mp_debito_percent),
    taxaMpPixPercent: Number(cfg.taxa_mp_pix_percent),
    taxaMpCartaoFixa: Number(cfg.taxa_mp_cartao_fixa),
    taxaMpBoletoFixa: Number(cfg.taxa_mp_boleto_fixa),
    custoEmbalagem: Number(cfg.custo_embalagem),
    custoFreteMedio: Number(cfg.custo_frete_medio),
    limiteFreteGratis: Number(cfg.limite_frete_gratis),
  } : {
    taxaNuvemshopPercent: 0.7,
    taxaMpCartaoCreditoPercent: 4.49,
    taxaMpCartaoDebitoPercent: 3.98,
    taxaMpPixPercent: 0.99,
    taxaMpCartaoFixa: 0.35,
    taxaMpBoletoFixa: 2.39,
    custoEmbalagem: 3,
    custoFreteMedio: 25,
    limiteFreteGratis: 300,
  };

  // Limpa pedidos sintéticos antigos (seed_ prefix)
  await sql`DELETE FROM pedidos WHERE id LIKE 'seed_%'`;

  // Período: 1º de junho até hoje
  const inicio = new Date(2026, 5, 1); // junho = mês 5
  const hoje = new Date();
  const fim = hoje > new Date(2026, 5, 30) ? new Date(2026, 5, 30) : hoje;

  // ~180 pedidos / 30 dias = 6/dia
  const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  const totalPedidos = Math.round(6 * dias);

  console.log(`[seed] Gerando ${totalPedidos} pedidos entre 01/06 e hoje (${dias} dias)`);

  const meios = ['pix', 'credit_card', 'credit_card', 'credit_card', 'debit_card', 'pix']; // 50% cartão, 33% pix
  const statuses = ['paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'paid', 'pending', 'shipped', 'cancelled']; // 70% paid, 10% cada outro

  let salvos = 0;
  let receitaTotal = 0;

  for (let i = 0; i < totalPedidos; i++) {
    const numItens = Math.random() < 0.6 ? 1 : Math.random() < 0.85 ? 2 : 3;
    const itensPedido: Array<{ nuvemshopProductId: string; nome: string; quantidade: number; precoUnitario: number }> = [];
    let subtotal = 0;
    const usados = new Set<string>();
    for (let j = 0; j < numItens; j++) {
      let p: Produto;
      let tries = 0;
      do {
        p = escolher(produtos);
        tries++;
      } while (usados.has(p.id) && tries < 10);
      usados.add(p.id);
      const preco = Number(p.precoVenda);
      itensPedido.push({
        nuvemshopProductId: p.nuvemshopProductId || p.id,
        nome: p.nome,
        quantidade: 1,
        precoUnitario: preco,
      });
      subtotal += preco;
    }

    const desconto = Math.random() < 0.15 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const freteCobrado = subtotal >= 300 ? 0 : Math.round((15 + Math.random() * 30) * 100) / 100;
    const total = subtotal - desconto + freteCobrado;
    const meio = escolher(meios) as 'pix' | 'credit_card' | 'debit_card' | 'boleto';
    const status = escolher(statuses);

    // mapa de COGS
    const cogsMap = new Map<string, number>();
    for (const item of itensPedido) {
      const prod = produtos.find((p) => p.nuvemshopProductId === item.nuvemshopProductId);
      if (prod) cogsMap.set(item.nuvemshopProductId, Number(prod.custoUnitario));
    }

    const calc = calcularLucroPedido({
      subtotal,
      desconto,
      freteCobrado,
      freteCustoReal: null,
      total,
      meioPagamento: meio,
      itens: itensPedido,
      cogsMap,
      config,
    });

    const data = gerarDataAleatoria(inicio, fim);
    const nome = escolher(NOMES_CLIENTES);
    const id = `seed_${i}_${Date.now()}`;
    receitaTotal += total;

    await sql`
      INSERT INTO pedidos (
        id, numero, cliente_nome, cliente_email, status, data_pedido,
        subtotal, desconto, frete_cobrado, total, meio_pagamento, parcelas,
        taxa_gateway, taxa_nuvemshop, cogs_total, custo_embalagem, custo_frete,
        lucro_liquido, margem_percent, itens, recalculado_em, sincronizado_em
      ) VALUES (
        ${id}, ${10000 + i}, ${nome}, ${nome.toLowerCase().replace(/\s/g, '.') + '@email.com'},
        ${status}, ${data.toISOString()},
        ${subtotal}, ${desconto}, ${freteCobrado}, ${total}, ${meio}, ${meio === 'credit_card' ? Math.floor(Math.random() * 6) + 1 : null},
        ${calc.taxaGateway}, ${calc.taxaNuvemshop}, ${calc.cogsTotal}, ${calc.custoEmbalagem}, ${calc.custoFrete},
        ${calc.lucroLiquido}, ${calc.margemPercent}, ${JSON.stringify(itensPedido)}::jsonb,
        NOW(), NOW()
      )
    `;
    salvos++;
    if (salvos % 20 === 0) console.log(`  ${salvos}/${totalPedidos}`);
  }

  console.log(`\n[seed] ${salvos} pedidos criados`);
  console.log(`[seed] Receita total: R$ ${receitaTotal.toFixed(2)}`);

  const stats = await sql`
    SELECT
      COUNT(*)::int AS qtd,
      COALESCE(SUM(total::numeric), 0)::numeric AS receita,
      COALESCE(SUM(lucro_liquido::numeric), 0)::numeric AS lucro,
      COALESCE(AVG(total::numeric), 0)::numeric AS ticket
    FROM pedidos
    WHERE data_pedido >= ${inicio.toISOString()}
  `;
  console.log('\n[seed] Junho até hoje:');
  console.log(`  Pedidos: ${stats[0].qtd}`);
  console.log(`  Receita: R$ ${Number(stats[0].receita).toFixed(2)}`);
  console.log(`  Lucro líquido: R$ ${Number(stats[0].lucro).toFixed(2)}`);
  console.log(`  Ticket médio: R$ ${Number(stats[0].ticket).toFixed(2)}`);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
