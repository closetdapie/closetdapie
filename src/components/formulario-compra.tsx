'use client';

import { useState, useMemo, useTransition } from 'react';
import { registrarCompraMercadoria } from '@/lib/compra-mercadoria-actions';
import { Plus, Trash2, Search } from 'lucide-react';
import { formatBRL } from '@/lib/calcular-lucro';

type Produto = { id: string; nome: string; custoUnitario: string };
type Item = { tempId: string; produtoId: string; nome: string; custoUnitario: number; quantidade: number };

export function FormularioCompra({ produtos }: { produtos: Produto[] }) {
  const [busca, setBusca] = useState('');
  const [itens, setItens] = useState<Item[]>([]);
  const [descricao, setDescricao] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');

  const sugestoes = useMemo(() => {
    if (!busca || busca.length < 2) return [];
    const buscaLow = busca.toLowerCase();
    return produtos
      .filter((p) => p.nome.toLowerCase().includes(buscaLow))
      .slice(0, 8);
  }, [busca, produtos]);

  function adicionarProduto(p: Produto) {
    setItens((arr) => [
      ...arr,
      {
        tempId: crypto.randomUUID(),
        produtoId: p.id,
        nome: p.nome,
        custoUnitario: Number(p.custoUnitario) || 0,
        quantidade: 1,
      },
    ]);
    setBusca('');
  }

  function atualizarItem(tempId: string, campo: 'custoUnitario' | 'quantidade', valor: number) {
    setItens((arr) => arr.map((i) => (i.tempId === tempId ? { ...i, [campo]: valor } : i)));
  }

  function removerItem(tempId: string) {
    setItens((arr) => arr.filter((i) => i.tempId !== tempId));
  }

  const total = useMemo(
    () => itens.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0),
    [itens]
  );

  function submeter() {
    if (itens.length === 0) { setMsg('Adicione pelo menos 1 produto'); return; }
    setMsg('');
    start(async () => {
      const fd = new FormData();
      fd.set('descricao', descricao || 'Compra de mercadoria');
      fd.set('data', data);
      if (fornecedor) fd.set('fornecedor', fornecedor);
      fd.set('itens', JSON.stringify(itens.map((i) => ({
        produtoId: i.produtoId,
        custoUnitario: i.custoUnitario,
        quantidade: i.quantidade,
      }))));
      await registrarCompraMercadoria(fd);
      setItens([]);
      setDescricao('');
      setFornecedor('');
      setMsg('✓ Compra registrada com sucesso');
      setTimeout(() => setMsg(''), 3000);
    });
  }

  return (
    <section className="card space-y-5">
      <h2 className="font-semibold">Nova compra</h2>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5">
          <label className="label">Descrição</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="input"
            placeholder="Ex: Coleção Verão 2026"
          />
        </div>
        <div className="md:col-span-4">
          <label className="label">Fornecedor (opcional)</label>
          <input
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className="input"
            placeholder="Ex: Confecções XYZ"
          />
        </div>
        <div className="md:col-span-3">
          <label className="label">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* Busca de produtos */}
      <div className="relative">
        <label className="label">Adicionar produto</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-ink-faint)]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="input pl-9"
            placeholder="Digite pelo menos 2 letras pra buscar"
          />
        </div>
        {sugestoes.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {sugestoes.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => adicionarProduto(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-cream)] flex items-center justify-between"
                >
                  <span>{p.nome}</span>
                  <Plus className="w-4 h-4 text-[var(--color-ink-faint)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Lista de itens da compra */}
      {itens.length > 0 && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-cream)] text-[11px] uppercase tracking-wider text-[var(--color-ink-mute)]">
              <tr>
                <th className="text-left p-2.5">Produto</th>
                <th className="text-right p-2.5">Custo unitário</th>
                <th className="text-right p-2.5">Qtd</th>
                <th className="text-right p-2.5">Subtotal</th>
                <th className="p-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {itens.map((i) => (
                <tr key={i.tempId}>
                  <td className="p-2.5">{i.nome}</td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={i.custoUnitario}
                      onChange={(e) => atualizarItem(i.tempId, 'custoUnitario', Number(e.target.value))}
                      className="input text-right w-24"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      min="1"
                      value={i.quantidade}
                      onChange={(e) => atualizarItem(i.tempId, 'quantidade', Number(e.target.value))}
                      className="input text-right w-16"
                    />
                  </td>
                  <td className="p-2.5 text-right font-mono">{formatBRL(i.custoUnitario * i.quantidade)}</td>
                  <td className="p-2.5">
                    <button
                      type="button"
                      onClick={() => removerItem(i.tempId)}
                      className="text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--color-cream)] font-bold">
                <td colSpan={3} className="p-2.5 text-right">Total da compra</td>
                <td className="p-2.5 text-right font-mono">{formatBRL(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--color-ink-mute)]">
          {itens.length === 0 ? 'Adicione produtos acima' : `${itens.length} item(ns)`}
          {msg && <span className="ml-3 text-[var(--color-success)]">{msg}</span>}
        </span>
        <button
          type="button"
          onClick={submeter}
          disabled={pending || itens.length === 0}
          className="btn"
        >
          {pending ? 'Registrando...' : 'Registrar compra'}
        </button>
      </div>
    </section>
  );
}
