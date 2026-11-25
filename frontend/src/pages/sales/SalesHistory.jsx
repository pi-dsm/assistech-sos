import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Info as InfoIcon, LayoutList, ListOrdered, PlusCircle, Table2 } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import usePref from '../../hooks/usePref';
import { brl, dt, pctFmt, round2, salePaymentSummary, saleStatus } from '../../utils/format';
import { addDays, dayKey, saleItemRows, startOfDay } from '../../utils/sales';
import { btnGhost, btnPrimary, EmptyState, Modal, inputCls, PageHeader, SearchInput, Segmented, Spinner, Toolbar } from '../../components/ui';
import SaleCard from '../../components/sales/SaleCard';
import SaleDetailsModal from '../../components/sales/SaleDetailsModal';
import ItemDetailsModal from '../../components/sales/ItemDetailsModal';
import CashClosing from '../../components/sales/CashClosing';

const VIEWS = [
  { key: 'cards', label: 'Cards por venda', icon: LayoutList },
  { key: 'sales', label: 'Tabela de vendas', icon: Table2 },
  { key: 'items', label: 'Itens vendidos', icon: ListOrdered },
];
const PERIODS = [
  ['today', 'Hoje'],
  ['7d', 'Últimos 7 dias'],
  ['30d', 'Últimos 30 dias'],
  ['custom', 'Personalizado'],
];
const STATUS_FILTERS = [
  ['', 'Todas as situações'],
  ['done', 'Concluídas'],
  ['pending', 'Com pendência'],
  ['refunded', 'Estornadas'],
];
const statusKey = (s) => (s.refunded_amount > 0 && s.refunded_amount + 0.001 >= s.grand_total_amount ? 'refunded' : s.balance_due > 0 ? 'pending' : 'done');
const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function rangeFor(period, custom) {
  const today = startOfDay();
  if (period === 'today') return { from: dayKey(today), to: dayKey(today) };
  if (period === '7d') return { from: dayKey(addDays(today, -6)), to: dayKey(today) };
  if (period === '30d') return { from: dayKey(addDays(today, -29)), to: dayKey(today) };
  return custom;
}

export default function SalesHistory() {
  const toast = useToast();
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const [view, setView] = usePref('sales_view', 'cards');
  const [period, setPeriod] = useState('today');
  const [custom, setCustom] = useState(() => ({ from: dayKey(addDays(startOfDay(), -6)), to: dayKey(startOfDay()) }));
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [itemType, setItemType] = useState('');
  const [sales, setSales] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [openSale, setOpenSale] = useState(null);
  const [openItem, setOpenItem] = useState(null);
  const [cashOpen, setCashOpen] = useState(false);

  const range = rangeFor(period, custom);
  const load = useCallback(async () => {
    try {
      setSales((await api.get('/sales', { params: { from: range.from, to: range.to, limit: 500 } })).data);
    } catch (e) {
      toast.error(errMsg(e));
      setSales([]);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    setSales(null);
    load();
  }, [load]);

  // Pesquisa local: nº, hex, item, cliente ou atendente
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    const term = norm(q.trim().replace(/^#/, ''));
    return sales.filter((s) => {
      if (status && statusKey(s) !== status) return false;
      if (itemType && !s.items.some((i) => i.item_type === itemType)) return false;
      if (!term) return true;
      return (
        String(s.sale_number) === term ||
        norm(s.short_id).includes(term) ||
        norm(s.customer?.name).includes(term) ||
        norm(s.created_by?.name).includes(term) ||
        s.items.some((i) => norm(i.name).includes(term) || norm(i.barcode).includes(term))
      );
    });
  }, [sales, q, status, itemType]);

  const itemRows = useMemo(() => {
    const term = norm(q.trim().replace(/^#/, ''));
    return saleItemRows(filteredSales).filter(
      (r) => (!itemType || r.item_type === itemType) && (!term || String(r.sale.sale_number) === term || norm(r.sale.short_id).includes(term) || norm(r.name).includes(term) || norm(r.barcode).includes(term))
    );
  }, [filteredSales, itemType, q]);

  const totals = useMemo(() => {
    const revenue = round2(filteredSales.reduce((s, x) => s + x.grand_total_amount, 0));
    const profit = round2(filteredSales.reduce((s, x) => s + x.profit_amount, 0));
    const pending = round2(filteredSales.reduce((s, x) => s + (x.balance_due || 0), 0));
    return { count: filteredSales.length, revenue, profit, pending, ticket: filteredSales.length ? revenue / filteredSales.length : 0 };
  }, [filteredSales]);
  const itemTotals = useMemo(() => {
    const price = round2(itemRows.reduce((s, r) => s + r.total_price, 0));
    const cost = round2(itemRows.reduce((s, r) => s + r.total_cost, 0));
    return { qty: itemRows.reduce((s, r) => s + r.quantity, 0), price, cost, profit: round2(price - cost) };
  }, [itemRows]);

  const toggle = (id) =>
    setExpanded((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageHeader title="Histórico de vendas" subtitle="Vendas do balcão em cards, em tabela ou item a item.">
        <Segmented options={VIEWS} value={view} onChange={setView} label="Visualização" />
        {can('cash.close') && <button className={btnGhost} onClick={() => setCashOpen(true)}><Calculator size={18} /> Fechar caixa</button>}
        <Link to="/app/vendas/nova" className={btnPrimary}><PlusCircle size={18} /> Nova venda</Link>
      </PageHeader>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nº, hex, item, código de barras, cliente ou atendente…" />
        <select className={`${inputCls} w-auto`} value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período">
          {PERIODS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {period === 'custom' && (
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <input type="date" className={`${inputCls} w-auto`} value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))} aria-label="De" />
            até
            <input type="date" className={`${inputCls} w-auto`} value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))} aria-label="Até" />
          </span>
        )}
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          {STATUS_FILTERS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={itemType} onChange={(e) => setItemType(e.target.value)} aria-label="Tipo de item">
          <option value="">Produtos e serviços</option>
          <option value="product">Só produtos</option>
          <option value="service">Só serviços</option>
        </select>
      </Toolbar>

      {sales && (
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <p className="rounded-lg bg-white p-3 shadow-card ring-1 ring-slate-200">Vendas<br /><b className="text-lg text-slate-900">{totals.count}</b></p>
          <p className="rounded-lg bg-white p-3 shadow-card ring-1 ring-slate-200">Valor vendido<br /><b className="text-lg text-slate-900">{brl(totals.revenue)}</b></p>
          <p className="rounded-lg bg-white p-3 shadow-card ring-1 ring-slate-200">Ticket médio<br /><b className="text-lg text-slate-900">{brl(totals.ticket)}</b></p>
          {showCosts ? (
            <p className="rounded-lg bg-white p-3 shadow-card ring-1 ring-slate-200">Lucro<br /><b className="text-lg text-emerald-700">{brl(totals.profit)}</b></p>
          ) : (
            <p className="rounded-lg bg-white p-3 shadow-card ring-1 ring-slate-200">A receber<br /><b className="text-lg text-amber-700">{brl(totals.pending)}</b></p>
          )}
        </div>
      )}

      {!sales ? (
        <Spinner />
      ) : filteredSales.length === 0 ? (
        <EmptyState>Nenhuma venda encontrada para os filtros escolhidos.</EmptyState>
      ) : view === 'cards' ? (
        <div className="space-y-3">
          {filteredSales.map((s) => <SaleCard key={s.id} sale={s} expanded={expanded.has(s.id)} onToggle={() => toggle(s.id)} onChanged={load} />)}
        </div>
      ) : view === 'sales' ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Venda</th>
                <th className="px-3 py-2.5 font-semibold">Hex</th>
                <th className="px-3 py-2.5 font-semibold">Data e hora</th>
                <th className="px-3 py-2.5 font-semibold">Itens</th>
                <th className="px-3 py-2.5 font-semibold">Pagamento</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
                {showCosts && <th className="px-3 py-2.5 text-right font-semibold">Custo</th>}
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                {showCosts && <th className="px-3 py-2.5 text-right font-semibold">Lucro</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((s) => {
                const st = saleStatus(s);
                const qty = s.items.reduce((n, i) => n + i.quantity, 0);
                return (
                  <tr key={s.id} onClick={() => setOpenSale(s)} className="cursor-pointer hover:bg-blue-50/40">
                    <td className="px-3 py-2.5 font-extrabold text-slate-900">#{s.sale_number}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{s.short_id}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{dt(s.created_at)}</td>
                    <td className="max-w-72 truncate px-3 py-2.5" title={s.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}>
                      <b>{qty}</b> · {s.items.map((i) => i.name).join(', ')}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{salePaymentSummary(s)}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${st.cls}`}>{st.label}</span></td>
                    {showCosts && <td className="px-3 py-2.5 text-right text-slate-500">{brl(s.cost_total_amount)}</td>}
                    <td className="px-3 py-2.5 text-right font-bold">{brl(s.grand_total_amount)}</td>
                    {showCosts && <td className={`px-3 py-2.5 text-right font-bold ${s.profit_amount < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(s.profit_amount)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : itemRows.length === 0 ? (
        <EmptyState>Nenhum item encontrado.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Data e hora</th>
                <th className="px-3 py-2.5 font-semibold">Venda</th>
                <th className="px-3 py-2.5 font-semibold">Item</th>
                <th className="px-3 py-2.5 text-right font-semibold">Qtd.</th>
                <th className="px-3 py-2.5 text-right font-semibold">Venda un.</th>
                {showCosts && <th className="px-3 py-2.5 text-right font-semibold">Custo total</th>}
                <th className="px-3 py-2.5 text-right font-semibold">Venda total</th>
                {showCosts && <th className="px-3 py-2.5 text-right font-semibold">Lucro</th>}
                {showCosts && <th className="px-3 py-2.5 text-right font-semibold">Margem</th>}
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemRows.map((r) => (
                <tr key={r.key} onClick={() => setOpenItem(r)} className="cursor-pointer hover:bg-blue-50/40">
                  <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dt(r.sale.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5"><b>#{r.sale.sale_number}</b> <span className="font-mono text-xs text-slate-400">{r.sale.short_id}</span></td>
                  <td className="px-3 py-2.5">
                    <span className="font-semibold">{r.name}</span>
                    {r.item_type === 'service' && <span className="ml-1.5 rounded bg-blue-50 px-1.5 text-[11px] font-bold text-blue-700">SERVIÇO</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">{r.quantity}</td>
                  <td className="px-3 py-2.5 text-right">{brl(r.unit_price)}</td>
                  {showCosts && <td className="px-3 py-2.5 text-right text-slate-500">{brl(r.total_cost)}</td>}
                  <td className="px-3 py-2.5 text-right font-semibold">
                    {brl(r.total_price)}
                    {r.discount_share > 0 && <span className="block text-[11px] font-normal text-emerald-700">desc. − {brl(r.discount_share)}</span>}
                  </td>
                  {showCosts && <td className={`px-3 py-2.5 text-right font-bold ${r.profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(r.profit)}</td>}
                  {showCosts && <td className="px-3 py-2.5 text-right text-slate-600">{pctFmt(r.profit_pct)}</td>}
                  <td className="px-3 py-2.5 text-right"><InfoIcon size={15} className="inline text-slate-400" aria-hidden="true" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-900">
              <tr>
                <td className="px-3 py-2.5" colSpan={3}>Total · {itemRows.length} linha(s)</td>
                <td className="px-3 py-2.5 text-right">{itemTotals.qty}</td>
                <td />
                {showCosts && <td className="px-3 py-2.5 text-right">{brl(itemTotals.cost)}</td>}
                <td className="px-3 py-2.5 text-right">{brl(itemTotals.price)}</td>
                {showCosts && <td className="px-3 py-2.5 text-right text-emerald-700">{brl(itemTotals.profit)}</td>}
                {showCosts && <td className="px-3 py-2.5 text-right">{pctFmt(itemTotals.price > 0 ? (itemTotals.profit / itemTotals.price) * 100 : 0)}</td>}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {view === 'items' && <p className="text-xs text-slate-400">O valor total de cada item já considera o desconto da venda, rateado proporcionalmente.</p>}

      {openSale && <SaleDetailsModal sale={openSale} onClose={() => setOpenSale(null)} onChanged={load} />}
      {openItem && <ItemDetailsModal row={openItem} onClose={() => setOpenItem(null)} />}
      {cashOpen && (
        <Modal title="Fechamento de caixa" onClose={() => setCashOpen(false)} size="xl">
          <CashClosing />
        </Modal>
      )}
    </div>
  );
}
