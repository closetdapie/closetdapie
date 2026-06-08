/* Cálculo de lucro real de um pedido.
   Usa configurações globais + COGS do produto + taxa do gateway baseada no método. */

export type ConfiguracoesCalculo = {
  taxaNuvemshopPercent: number;
  taxaMpCartaoCreditoPercent: number;
  taxaMpCartaoDebitoPercent: number;
  taxaMpPixPercent: number;
  taxaMpCartaoFixa: number;
  taxaMpBoletoFixa: number;
  custoEmbalagem: number;
  custoFreteMedio: number;
  limiteFreteGratis: number;
};

export type ItemPedido = {
  nuvemshopProductId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
};

export type EntradaCalculo = {
  subtotal: number;
  desconto: number;
  freteCobrado: number; // que cliente pagou
  freteCustoReal?: number | null; // que Pietra gastou (opcional, manual)
  total: number;
  meioPagamento: 'credit_card' | 'pix' | 'boleto' | 'debit_card' | null;
  itens: ItemPedido[];
  cogsMap: Map<string, number>; // productId -> custoUnitario
  config: ConfiguracoesCalculo;
};

export type ResultadoCalculo = {
  taxaGateway: number;
  taxaNuvemshop: number;
  cogsTotal: number;
  custoEmbalagem: number;
  custoFrete: number;
  lucroLiquido: number;
  margemPercent: number;
};

export function calcularLucroPedido(e: EntradaCalculo): ResultadoCalculo {
  // 1) Taxa do gateway por método
  let taxaGateway = 0;
  const valorPagamento = e.total;
  switch (e.meioPagamento) {
    case 'credit_card':
      taxaGateway = (valorPagamento * e.config.taxaMpCartaoCreditoPercent) / 100 + e.config.taxaMpCartaoFixa;
      break;
    case 'debit_card':
      taxaGateway = (valorPagamento * e.config.taxaMpCartaoDebitoPercent) / 100 + e.config.taxaMpCartaoFixa;
      break;
    case 'pix':
      taxaGateway = (valorPagamento * e.config.taxaMpPixPercent) / 100;
      break;
    case 'boleto':
      taxaGateway = e.config.taxaMpBoletoFixa;
      break;
    default:
      // fallback: assume cartão (mais comum)
      taxaGateway = (valorPagamento * e.config.taxaMpCartaoCreditoPercent) / 100 + e.config.taxaMpCartaoFixa;
  }

  // 2) Taxa Nuvemshop (0,7% sobre venda)
  const taxaNuvemshop = (e.total * e.config.taxaNuvemshopPercent) / 100;

  // 3) COGS — soma custo de todos os itens
  let cogsTotal = 0;
  for (const item of e.itens) {
    const cogs = e.cogsMap.get(item.nuvemshopProductId) ?? 0;
    cogsTotal += cogs * item.quantidade;
  }

  // 4) Embalagem (fixo por pedido)
  const custoEmbalagem = e.config.custoEmbalagem;

  // 5) Frete custo real
  // Se Pietra informou manualmente, usa esse. Senão:
  // - Se o cliente pagou (subtotal < limite frete grátis), assume que repassou (custo = freteCobrado)
  // - Se subtotal >= limite (frete grátis), Pietra absorveu (custo = média configurada)
  let custoFrete: number;
  if (e.freteCustoReal != null) {
    custoFrete = e.freteCustoReal;
  } else if (e.subtotal >= e.config.limiteFreteGratis) {
    custoFrete = e.config.custoFreteMedio;
  } else {
    // cliente pagou: assume que cobriu o custo (loja zero)
    // Mas Pietra disse que <300 o frete está embutido no preço — então a loja ainda gasta o frete real
    // Conservador: usa a média
    custoFrete = e.config.custoFreteMedio;
  }

  // 6) Lucro líquido = total - todas despesas diretas
  const lucroLiquido = e.total - taxaGateway - taxaNuvemshop - cogsTotal - custoEmbalagem - custoFrete;
  const margemPercent = e.total > 0 ? (lucroLiquido / e.total) * 100 : 0;

  return {
    taxaGateway: round2(taxaGateway),
    taxaNuvemshop: round2(taxaNuvemshop),
    cogsTotal: round2(cogsTotal),
    custoEmbalagem: round2(custoEmbalagem),
    custoFrete: round2(custoFrete),
    lucroLiquido: round2(lucroLiquido),
    margemPercent: round2(margemPercent),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatBRL(n: number | string | null | undefined): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n ?? 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
