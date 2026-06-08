/* Cliente mínimo da Nuvemshop API v1.
   Docs: https://tiendanube.github.io/api-documentation/ */

const BASE = 'https://api.tiendanube.com/v1';
const UA = 'ClosetFinanceiro (closetdapie@gmail.com)';

export async function fetchPedidos(storeId: string, token: string, since?: Date) {
  const params = new URLSearchParams({ per_page: '50' });
  if (since) params.set('created_at_min', since.toISOString());
  const res = await fetch(`${BASE}/${storeId}/orders?${params}`, {
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent': UA,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Nuvemshop API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<NuvemshopOrder[]>;
}

export type NuvemshopOrder = {
  id: number;
  number: number;
  status: string;
  payment_status: string;
  payment_details?: { method?: string; credit_card_company?: string };
  gateway?: string;
  installments?: number;
  contact_email?: string;
  contact_name?: string;
  customer?: { name?: string; email?: string };
  created_at: string;
  paid_at?: string;
  subtotal: string;
  discount: string;
  shipping_cost_customer: string;
  total: string;
  products: Array<{
    product_id: number;
    variant_id: number;
    name: string;
    sku?: string;
    quantity: number;
    price: string;
  }>;
};

// Mapeia método Nuvemshop → tipo interno
export function mapearMeioPagamento(o: NuvemshopOrder): 'credit_card' | 'pix' | 'boleto' | 'debit_card' | null {
  const m = (o.payment_details?.method || o.gateway || '').toLowerCase();
  if (m.includes('pix')) return 'pix';
  if (m.includes('boleto') || m.includes('ticket')) return 'boleto';
  if (m.includes('debit')) return 'debit_card';
  if (m.includes('credit') || m.includes('cartao') || m.includes('card')) return 'credit_card';
  return null;
}
