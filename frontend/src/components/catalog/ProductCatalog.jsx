import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Barcode, Boxes, Eye, LayoutGrid, List, Pencil, Plus, Trash2, Truck } from '../icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import usePref from '../../hooks/usePref';
import { brl, dt, PRODUCT_CATEGORIES } from '../../utils/format';
import { backendHasKind, marginPct, PRODUCT_KINDS, productKind } from '../../utils/catalog';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, Field, Info, inputCls, Modal, Notice, PageHeader, Pill, SearchInput, Segmented, Spinner, Toolbar } from '../ui';
import SupplierSelect from '../SupplierSelect';
import PurchaseModal from './PurchaseModal';
import VoiceFill from '../VoiceFill';
import { productVoice } from '../../utils/voiceSchemas';

const VIEWS = [
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'table', label: 'Tabela', icon: List },
];
const STOCK_FILTERS = [
  ['', 'Todo o estoque'],
  ['low', 'Estoque baixo'],
  ['zero', 'Zerados'],
  ['ok', 'Acima do mínimo'],
];
const SORTS = [
  ['name', 'Nome (A–Z)'],
  ['stock', 'Menor estoque'],
  ['price', 'Maior preço'],
  ['margin', 'Maior margem'],
];
const MOVEMENT_KINDS = { initial: 'Estoque inicial', sale: 'Venda', refund: 'Estorno', adjustment: 'Ajuste' };
const blank = (kind) => ({ name: '', barcode: '', category: kind === 'peripheral' ? 'accessory' : 'other', description: '', supplier: '', cost_price: '', sale_price: '', stock_quantity: '', min_stock: '', location: '', show_in_showcase: false });

function StockPill({ p }) {
  return (
    <Pill cls={p.stock_quantity === 0 ? 'bg-red-50 text-red-700 ring-red-200' : p.is_low_stock ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200'}>
      {(p.is_low_stock || p.stock_quantity === 0) && <AlertTriangle size={12} />} {p.stock_quantity} un.
    </Pill>
  );
}

function DetailsModal({ product, canEdit, onClose, onEdit, onStock }) {
  const [moves, setMoves] = useState(null);
  useEffect(() => {
    api.get(`/products/${product.id}/movements`).then((r) => setMoves(r.data)).catch(() => setMoves([]));
  }, [product.id]);
  const kind = productKind(product);

  return (
    <Modal title={product.name} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Info label="Tipo" value={PRODUCT_KINDS[kind].label} />
        {kind === 'peripheral' && <Info label="Categoria" value={PRODUCT_CATEGORIES[product.category]} />}
        <Info label="Código de barras" value={product.barcode} />
        <Info label="Fornecedor habitual" value={product.supplier?.name} />
        <Info label="Preço de custo" value={brl(product.cost_price)} />
        <Info label="Preço de venda" value={brl(product.sale_price)} />
        <Info label="Margem sobre a venda" value={`${marginPct(product.cost_price, product.sale_price).toLocaleString('pt-BR')}%`} />
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estoque</p>
          <StockPill p={product} /> <span className="text-xs text-slate-500">mín. {product.min_stock}</span>
        </div>
        <Info label="Valor em estoque (custo)" value={brl(product.cost_price * product.stock_quantity)} />
        <Info label="Local na bancada" value={product.location || '—'} />
        <Info label="Situação" value={product.is_active ? 'Ativo' : 'Inativo'} />
        <Info label="Cadastrado em" value={dt(product.created_at)} />
        <Info label="Atualizado em" value={dt(product.updated_at)} />
        {product.description && <div className="col-span-2 sm:col-span-3"><Info label="Descrição" value={product.description} /></div>}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Movimentações de estoque</p>
        {!moves ? (
          <Spinner />
        ) : moves.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-3 py-1.5">Data</th><th className="px-3">Tipo</th><th className="px-3 text-right">Qtd.</th><th className="px-3 text-right">Saldo</th><th className="px-3">Motivo</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {moves.slice(0, 50).map((m) => (
                  <tr key={m.id || m._id}>
                    <td className="whitespace-nowrap px-3 py-1.5 text-slate-500">{dt(m.created_at)}</td>
                    <td className="px-3">{MOVEMENT_KINDS[m.kind] || m.kind}</td>
                    <td className={`px-3 text-right font-semibold ${m.quantity < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td>
                    <td className="px-3 text-right">{m.balance_after}</td>
                    <td className="max-w-48 truncate px-3 text-slate-500">{m.reason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button className={btnGhost} onClick={() => onStock(product)}><Boxes size={16} /> Ajustar estoque</button>
          <button className={btnPrimary} onClick={() => onEdit(product)}><Pencil size={16} /> Editar</button>
        </div>
      )}
    </Modal>
  );
}

// Catálogo de estoque reutilizado por Periféricos, Peças e Dispositivos
export default function ProductCatalog({ kind = 'peripheral' }) {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can('catalog.edit');
  const canDelete = can('catalog.delete');
  const showCosts = can('costs.view');
  const meta = PRODUCT_KINDS[kind];

  const [view, setView] = usePref(`catalog_view_${kind}`, 'cards');
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [sort, setSort] = useState('name');
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(null);
  const [stockFor, setStockFor] = useState(null);
  const [stock, setStock] = useState({ delta: '', reason: '' });
  const [removing, setRemoving] = useState(null);
  const [saving, setSaving] = useState(false);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/products', { params: { q: q || undefined, kind, limit: 500 } });
      setAll(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, kind]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const supportsKind = backendHasKind(all);
  const kindPending = kind !== 'peripheral' && supportsKind === false;

  const items = useMemo(() => {
    const list = all.filter(
      (p) =>
        productKind(p) === kind &&
        (!category || p.category === category) &&
        (stockFilter === 'low' ? p.is_low_stock && p.stock_quantity > 0 : stockFilter === 'zero' ? p.stock_quantity === 0 : stockFilter === 'ok' ? !p.is_low_stock : true)
    );
    const by = {
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
      stock: (a, b) => a.stock_quantity - b.stock_quantity,
      price: (a, b) => b.sale_price - a.sale_price,
      margin: (a, b) => marginPct(b.cost_price, b.sale_price) - marginPct(a.cost_price, a.sale_price),
    }[sort];
    return list.sort(by);
  }, [all, kind, category, stockFilter, sort]);

  const stockValue = items.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);
  const lowCount = items.filter((p) => p.is_low_stock).length;

  const save = async (e) => {
    e.preventDefault();
    if (!form.barcode.trim()) return toast.error('Informe o código de barras (ou gere um código interno)');
    const body = {
      name: form.name,
      barcode: form.barcode.trim(),
      kind,
      category: kind === 'peripheral' ? form.category : form.category || 'other',
      description: form.description || '',
      supplier: form.supplier || '',
      cost_price: Number(form.cost_price) || 0,
      sale_price: Number(form.sale_price),
      min_stock: Number(form.min_stock) || 0,
      location: form.location || '',
      show_in_showcase: !!form.show_in_showcase,
      ...(form.id ? {} : { stock_quantity: Number(form.stock_quantity) || 0 }),
    };
    setSaving(true);
    try {
      const { data } = form.id ? await api.put(`/products/${form.id}`, body) : await api.post('/products', body);
      if (kind !== 'peripheral' && data?.kind !== kind) {
        toast.error(`Salvo, mas o servidor ainda não guarda o tipo "${meta.singular}": o item aparecerá em Periféricos até a atualização do backend.`);
      } else {
        toast.success(`${meta.singular.charAt(0).toUpperCase()}${meta.singular.slice(1)} salvo`);
      }
      setForm(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const adjust = async () => {
    setSaving(true);
    try {
      await api.patch(`/products/${stockFor.id}/stock`, { delta: Number(stock.delta), reason: stock.reason });
      toast.success('Estoque ajustado');
      setStockFor(null);
      setStock({ delta: '', reason: '' });
      load();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/products/${removing.id}`);
      toast.success('Item desativado');
      setRemoving(null);
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  const openEdit = (p) => {
    setDetails(null);
    setForm({ ...blank(kind), ...p, description: p.description || '', supplier: p.supplier?.id || p.supplier?._id || '' });
  };
  const openStock = (p) => {
    setDetails(null);
    setStockFor(p);
  };
  const fillByVoice = (v) =>
    setForm((s) => {
      const { stock_quantity: qty, ...rest } = v;
      return { ...s, ...rest, ...(!s.id && qty !== undefined ? { stock_quantity: qty } : {}) };
    });

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageHeader title={meta.label} subtitle={meta.subtitle}>
        <Segmented options={VIEWS} value={view} onChange={setView} label="Visualização" />
        {canEdit && <button className={btnGhost} onClick={() => setBuying(true)} disabled={!all.length}><Truck size={18} /> Lançar compra</button>}
        {canEdit && <button className={btnPrimary} onClick={() => setForm(blank(kind))} disabled={kindPending}><Plus size={18} /> Adicionar {meta.singular}</button>}
      </PageHeader>

      {kindPending && (
        <Notice tone="warn">
          O servidor ainda não diferencia periféricos, peças e dispositivos (falta o campo <b>tipo</b> no cadastro de produtos). Até essa atualização do backend, todos os produtos aparecem em Periféricos e o cadastro por aqui fica bloqueado.
        </Notice>
      )}

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nome ou código de barras…" />
        {kind === 'peripheral' && (
          <select className={`${inputCls} w-auto`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {Object.entries(PRODUCT_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        )}
        <select className={`${inputCls} w-auto`} value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} aria-label="Estoque">
          {STOCK_FILTERS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenação">
          {SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Toolbar>

      {!loading && items.length > 0 && (
        <p className="text-sm text-slate-500">
          {items.length} item(ns) · {items.reduce((s, p) => s + p.stock_quantity, 0)} unidades · {showCosts ? `${brl(stockValue)} em estoque (custo) · ` : ''}
          <span className={lowCount ? 'font-semibold text-amber-700' : ''}>{lowCount} abaixo do mínimo</span>
        </p>
      )}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>{kindPending ? `Nenhum(a) ${meta.singular} cadastrado(a) ainda.` : 'Nenhum item encontrado.'}</EmptyState>
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {items.map((p) => (
            <article key={p.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-pop">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800" title={p.name}>{p.name}</p>
                  <p className="font-mono text-[11px] text-slate-400">{p.barcode}</p>
                </div>
                <StockPill p={p} />
              </div>
              {kind === 'peripheral' && <p className="mt-1 text-xs text-slate-500">{PRODUCT_CATEGORIES[p.category]}</p>}
              {p.description && kind !== 'peripheral' && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] uppercase text-slate-500">Custo</p><p className="font-semibold">{brl(p.cost_price)}</p></div>
                <div className="rounded-lg bg-blue-50 p-2"><p className="text-[11px] uppercase text-blue-800">Venda</p><p className="font-extrabold text-blue-800">{brl(p.sale_price)}</p></div>
              </div>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <button className={`${btnGhost} ${btnSm} flex-1`} onClick={() => setDetails(p)}><Eye size={14} /> Detalhes</button>
                {canEdit && <button className={`${btnGhost} ${btnSm} flex-1`} onClick={() => openEdit(p)}><Pencil size={14} /> Editar</button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Nome', 'Código de barras', kind === 'peripheral' ? 'Categoria' : 'Descrição', 'Fornecedor', 'Custo', 'Venda', 'Estoque', ''].map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30">
                  <td className="px-3 py-2.5 font-semibold">{p.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.barcode}</td>
                  <td className="max-w-52 truncate px-3 py-2.5 text-slate-600">{kind === 'peripheral' ? PRODUCT_CATEGORIES[p.category] : p.description || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{p.supplier?.name || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-500">{brl(p.cost_price)}</td>
                  <td className="px-3 py-2.5 font-semibold">{brl(p.sale_price)}</td>
                  <td className="px-3 py-2.5"><StockPill p={p} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button className={`${btnGhost} ${btnSm}`} onClick={() => setDetails(p)}><Eye size={14} /> Detalhes</button>
                      {canEdit && <button className={`${btnGhost} ${btnSm}`} onClick={() => openEdit(p)}><Pencil size={14} /> Editar</button>}
                      {canDelete && <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setRemoving(p)} aria-label="Desativar" title="Desativar"><Trash2 size={14} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && <DetailsModal product={details} canEdit={canEdit} onClose={() => setDetails(null)} onEdit={openEdit} onStock={openStock} />}

      {form && (
        <Modal title={form.id ? `Editar ${meta.singular}` : `Adicionar ${meta.singular}`} onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <VoiceFill schema={productVoice.schema} example={productVoice.example} onFill={fillByVoice} />
            </div>
            <Field label="Nome *" className="sm:col-span-2">
              <input className={inputCls} required autoFocus value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            </Field>
            <Field label="Código de barras *" hint="Use o leitor aqui. Sem código? Gere um interno." className="sm:col-span-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputCls} pl-9 font-mono`}
                    value={form.barcode}
                    onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                  />
                </div>
                <button type="button" className={btnGhost} onClick={() => setForm((s) => ({ ...s, barcode: `INT-${Date.now().toString(36).toUpperCase()}` }))}>Gerar código</button>
              </div>
            </Field>
            {kind === 'peripheral' ? (
              <Field label="Categoria">
                <select className={inputCls} value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
                  {Object.entries(PRODUCT_CATEGORIES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
              </Field>
            ) : null}
            <Field label="Fornecedor habitual" className={kind === 'peripheral' ? '' : 'sm:col-span-2'}>
              <SupplierSelect optional value={form.supplier} onChange={(id) => setForm((s) => ({ ...s, supplier: id }))} />
            </Field>
            <Field label={kind === 'device' ? 'Descrição (condição, cor, armazenamento, IMEI…)' : kind === 'part' ? 'Descrição (compatibilidade, modelo…)' : 'Descrição'} className="sm:col-span-2">
              <textarea className={inputCls} rows={2} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </Field>
            <Field label="Custo (R$)">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm((s) => ({ ...s, cost_price: e.target.value }))} />
            </Field>
            <Field label="Preço de venda (R$) *">
              <input className={inputCls} type="number" min="0" step="0.01" required value={form.sale_price} onChange={(e) => setForm((s) => ({ ...s, sale_price: e.target.value }))} />
            </Field>
            <Field label="Estoque mínimo (alerta)">
              <input className={inputCls} type="number" min="0" value={form.min_stock} onChange={(e) => setForm((s) => ({ ...s, min_stock: e.target.value }))} />
            </Field>
            <Field label="Local na bancada" hint="Ex.: gaveta 3, prateleira B">
              <input className={inputCls} value={form.location || ''} onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={!!form.show_in_showcase} onChange={(e) => setForm((s) => ({ ...s, show_in_showcase: e.target.checked }))} /> Mostrar na vitrine pública
            </label>
            {!form.id ? (
              <Field label="Estoque inicial">
                <input className={inputCls} type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm((s) => ({ ...s, stock_quantity: e.target.value }))} />
              </Field>
            ) : (
              <p className="self-end pb-2 text-xs text-slate-500">Para mudar a quantidade use “Ajustar estoque” nos detalhes, assim o histórico fica registrado.</p>
            )}
            <div className="mt-2 flex justify-end gap-2 sm:col-span-2">
              <button type="button" className={btnGhost} onClick={() => setForm(null)}>Cancelar</button>
              <button className={btnPrimary} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </form>
        </Modal>
      )}

      {stockFor && (
        <Modal title={`Ajustar estoque — ${stockFor.name}`} onClose={() => setStockFor(null)} size="sm">
          <p className="mb-3 text-sm text-slate-500">Estoque atual: <b>{stockFor.stock_quantity}</b>. Use valores negativos para baixas (perda, quebra, contagem).</p>
          <div className="space-y-3">
            <Field label="Quantidade (+ entrada / − saída)">
              <input className={inputCls} type="number" step="1" autoFocus value={stock.delta} onChange={(e) => setStock((s) => ({ ...s, delta: e.target.value }))} />
            </Field>
            <Field label="Motivo *">
              <input className={inputCls} placeholder="Ex.: compra de reposição" value={stock.reason} onChange={(e) => setStock((s) => ({ ...s, reason: e.target.value }))} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className={btnGhost} onClick={() => setStockFor(null)}>Cancelar</button>
            <button className={btnPrimary} onClick={adjust} disabled={saving || !stock.delta || !stock.reason.trim()}>Confirmar ajuste</button>
          </div>
        </Modal>
      )}

      {buying && <PurchaseModal products={all.filter((p) => p.is_active !== false)} onClose={() => setBuying(false)} onDone={() => { setBuying(false); load(); }} />}

      {removing && (
        <ConfirmModal
          title="Desativar item"
          message={`Desativar "${removing.name}"? Ele deixa de aparecer no PDV, mas o histórico de vendas é preservado.`}
          confirmLabel="Desativar"
          danger
          onConfirm={remove}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  );
}
