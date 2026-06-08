import { getConfig, salvarConfig } from '@/lib/config-actions';

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  const c = await getConfig();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-[var(--color-ink-mute)] mt-1">
          Taxas e custos padrão. Preencha 1x e o sistema usa em todos os cálculos.
        </p>
      </header>

      <form action={salvarConfig} className="space-y-6">
        <section className="card space-y-4">
          <h2 className="font-semibold">Nuvemshop</h2>
          <Campo label="Taxa por venda (%)" name="taxaNuvemshopPercent" defaultValue={c.taxaNuvemshopPercent} suffix="%" />
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">MercadoPago — taxas por meio de pagamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Cartão de crédito (%)" name="taxaMpCartaoCreditoPercent" defaultValue={c.taxaMpCartaoCreditoPercent} suffix="%" />
            <Campo label="Cartão de débito (%)" name="taxaMpCartaoDebitoPercent" defaultValue={c.taxaMpCartaoDebitoPercent} suffix="%" />
            <Campo label="PIX (%)" name="taxaMpPixPercent" defaultValue={c.taxaMpPixPercent} suffix="%" />
            <Campo label="Boleto (R$ fixo)" name="taxaMpBoletoFixa" defaultValue={c.taxaMpBoletoFixa} prefix="R$" />
            <Campo label="Cartão — taxa fixa adicional (R$)" name="taxaMpCartaoFixa" defaultValue={c.taxaMpCartaoFixa} prefix="R$" />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Operacional</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Campo label="Embalagem (R$/pedido)" name="custoEmbalagem" defaultValue={c.custoEmbalagem} prefix="R$" />
            <Campo label="Frete médio (R$/pedido)" name="custoFreteMedio" defaultValue={c.custoFreteMedio} prefix="R$" />
            <Campo label="Frete grátis acima de (R$)" name="limiteFreteGratis" defaultValue={c.limiteFreteGratis} prefix="R$" />
          </div>
        </section>

        <section className="card space-y-4">
          <h2 className="font-semibold">Integração Nuvemshop (opcional)</h2>
          <p className="text-xs text-[var(--color-ink-mute)]">
            Preencha pra puxar pedidos automaticamente. Encontra esses dados em Nuvemshop → Aplicativos → API.
          </p>
          <Campo label="Store ID" name="nuvemshopStoreId" defaultValue={c.nuvemshopStoreId || ''} placeholder="2159344" />
          <Campo label="Access Token" name="nuvemshopAccessToken" defaultValue={c.nuvemshopAccessToken || ''} placeholder="••••••••••••" type="password" />
        </section>

        <div className="flex justify-end">
          <button type="submit" className="btn">Salvar configurações</button>
        </div>
      </form>
    </div>
  );
}

function Campo({ label, name, defaultValue, prefix, suffix, type = 'text', placeholder }: { label: string; name: string; defaultValue: string | number; prefix?: string; suffix?: string; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-mute)]">{prefix}</span>}
        <input
          name={name}
          type={type}
          defaultValue={String(defaultValue)}
          placeholder={placeholder}
          className={`input ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-mute)]">{suffix}</span>}
      </div>
    </div>
  );
}
