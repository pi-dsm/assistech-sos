import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowRight, BellRing, CheckCircle2, Clock, Lightbulb, PackageX, RefreshCw, ShoppingCart, Timer, Wrench } from '../components/icons';
import api, { errMsg } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { brl, daysSince, greeting, isOverdue, OPEN_STATUSES, STATUS, stayDuration, todayLong } from '../utils/format';
import { addDays, dayKey, startOfDay } from '../utils/sales';
import { PRODUCT_KINDS, productKind } from '../utils/catalog';
import { btnGhost, btnSm, Card, EmptyState, Spinner, StatusBadge } from '../components/ui';
import OrderSummaryModal from '../components/os/OrderSummaryModal';
import OrderEditModal from '../components/os/OrderEditModal';
import SaleDetailsModal from '../components/sales/SaleDetailsModal';

const IDLE_DAYS = 60; // produto parado: com estoque e sem venda neste intervalo
const VERY_LATE_DAYS = 3; // OS "muito atrasada": previsão de entrega vencida há este tanto

const TONES = {
  danger: { cls: 'border-red-200 bg-red-50 text-red-900', icon: AlertTriangle, iconCls: 'text-red-600' },
  warn: { cls: 'border-amber-200 bg-amber-50 text-amber-900', icon: Clock, iconCls: 'text-amber-600' },
  info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: PackageX, iconCls: 'text-blue-600' },
  tip: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: Lightbulb, iconCls: 'text-emerald-600' },
};

function buildWarnings({ overview, orders, lowStock, idle, summary }) {
  const list = [];
  lowStock.forEach((p) =>
    list.push({
      tone: p.stock_quantity === 0 ? 'danger' : 'warn',
      icon: PackageX,
      text: `Estoque mínimo: ${p.name} — ${p.stock_quantity} un. (mínimo ${p.min_stock})`,
      to: PRODUCT_KINDS[productKind(p)].path,
    })
  );
  orders
    .filter(isOverdue)
    .map((o) => ({ o, late: daysSince(o.estimated_delivery_at) }))
    .sort((a, b) => b.late - a.late)
    .forEach(({ o, late }) =>
      list.push({
        tone: late >= VERY_LATE_DAYS ? 'danger' : 'warn',
        icon: Timer,
        text: `OS #${o.service_order_number} atrasada há ${late} dia${late === 1 ? '' : 's'} — ${o.customer?.name || 'cliente'} (${o.device?.brand} ${o.device?.model})`,
        order: o,
      })
    );
  if (overview?.ready_over_30_days > 0) {
    list.push({ tone: 'warn', icon: Clock, text: `${overview.ready_over_30_days} OS pronta(s) há mais de 30 dias aguardando retirada.`, to: '/app/os/abertas' });
  }
  idle.forEach((p) =>
    list.push({ tone: 'info', icon: PackageX, text: `Parado há mais de ${IDLE_DAYS} dias: ${p.name} (${p.stock_quantity} un. em estoque). Considere uma promoção.`, to: PRODUCT_KINDS[productKind(p)].path })
  );

  // Recomendações
  const ready = overview?.counts?.ready || 0;
  if (ready > 0) list.push({ tone: 'tip', icon: Lightbulb, text: `${ready} OS pronta(s) para retirada: avise os clientes para liberar a prateleira.`, to: '/app/os/abertas' });
  const target = summary?.goal?.target || 0;
  const revenue = summary?.current?.revenue || 0;
  if (target > 0 && revenue < target) list.push({ tone: 'tip', icon: Lightbulb, text: `Faltam ${brl(target - revenue)} para a meta de faturamento do dia.` });
  if (target > 0 && revenue >= target) list.push({ tone: 'tip', icon: CheckCircle2, text: `Meta do dia batida: ${brl(revenue)} de ${brl(target)}.` });
  return list;
}

export default function Home() {
  const toast = useToast();
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState(null);
  const [sales, setSales] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [idle, setIdle] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [openOrder, setOpenOrder] = useState(null);
  const [editOrder, setEditOrder] = useState(null);
  const [openSale, setOpenSale] = useState(null);

  const load = useCallback(async () => {
    const today = dayKey(new Date());
    try {
      const [ov, sm, os, sl, low] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/summary', { params: { period: 'daily' } }),
        api.get('/service-orders', { params: { scope: 'open', sort: 'oldest', limit: 200 } }),
        api.get('/sales', { params: { from: today, to: today, limit: 200 } }),
        api.get('/products', { params: { low_stock: true, limit: 100 } }),
      ]);
      setOverview(ov.data);
      setSummary(sm.data);
      setOrders(os.data);
      setSales(sl.data);
      setLowStock(low.data);
    } catch (e) {
      toast.error(errMsg(e));
      setOrders((o) => o || []);
      setSales((s) => s || []);
    }
  }, []);

  // Produtos parados: carregado à parte para não atrasar o resto da tela
  const loadIdle = useCallback(async () => {
    try {
      const since = dayKey(addDays(startOfDay(), -IDLE_DAYS));
      const [products, recent] = await Promise.all([
        api.get('/products', { params: { limit: 500 } }),
        api.get('/sales', { params: { from: since, limit: 500 } }),
      ]);
      const sold = new Set(recent.data.flatMap((s) => s.items.filter((i) => i.product).map((i) => String(i.product.id || i.product))));
      setIdle(products.data.filter((p) => p.stock_quantity > 0 && daysSince(p.created_at) >= IDLE_DAYS && !sold.has(String(p.id))).slice(0, 10));
    } catch {
      setIdle([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadIdle();
  }, [load, loadIdle]);

  const warnings = useMemo(
    () => (orders ? buildWarnings({ overview, orders, lowStock, idle, summary }) : []),
    [overview, orders, lowStock, idle, summary]
  );
  const visibleWarnings = showAll ? warnings : warnings.slice(0, 6);

  const firstName = user?.name?.split(' ')[0] || '';
  const c = summary?.current;
  const chart = c
    ? [
        { name: 'Faturamento', value: c.revenue, color: '#f97316' },
        { name: 'Lucro', value: c.net_profit, color: '#059669' },
        { name: 'Meta', value: summary.goal.target, color: '#1d4ed8' },
        { name: 'Perdas', value: c.loss, color: '#dc2626' },
      ]
    : [];

  const refreshAll = () => {
    load();
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{greeting()}, {firstName}!</h1>
          <p className="mt-0.5 text-slate-500">{todayLong()} · bom trabalho por aqui.</p>
        </div>
        <button className={`${btnGhost} ${btnSm}`} onClick={refreshAll}><RefreshCw size={14} /> Atualizar</button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/app/os/nova" className="group flex items-center gap-4 rounded-2xl bg-blue-600 p-6 text-white shadow-pop transition hover:bg-blue-700">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/20"><Wrench size={28} /></span>
          <span className="flex-1"><span className="block text-2xl font-extrabold">Nova OS</span><span className="text-blue-50">Receber um aparelho para conserto</span></span>
          <ArrowRight className="transition group-hover:translate-x-1" />
        </Link>
        <Link to="/app/vendas/nova" className="group flex items-center gap-4 rounded-2xl bg-ink-900 p-6 text-white shadow-pop transition hover:bg-ink-800">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-white/15"><ShoppingCart size={28} /></span>
          <span className="flex-1"><span className="block text-2xl font-extrabold">Nova venda</span><span className="text-blue-100">Produtos e serviços no balcão</span></span>
          <ArrowRight className="transition group-hover:translate-x-1" />
        </Link>
      </div>

      <Card title={<span className="flex items-center gap-2"><BellRing size={16} /> Avisos</span>} right={warnings.length > 0 && <span className="text-xs font-semibold text-slate-500">{warnings.length} aviso(s)</span>}>
        {!orders ? (
          <Spinner />
        ) : warnings.length === 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} /> Tudo em ordem: sem atrasos, estoque acima do mínimo e nada parado.</p>
        ) : (
          <>
            <ul className="grid gap-2 lg:grid-cols-2">
              {visibleWarnings.map((w, i) => {
                const t = TONES[w.tone];
                const Icon = w.icon || t.icon;
                const body = (
                  <>
                    <Icon size={17} className={`mt-0.5 shrink-0 ${t.iconCls}`} />
                    <span className="flex-1">{w.text}</span>
                    {(w.to || w.order) && <ArrowRight size={15} className="mt-0.5 shrink-0 opacity-60" />}
                  </>
                );
                const cls = `flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${t.cls}`;
                return (
                  <li key={i}>
                    {w.to ? (
                      <Link to={w.to} className={`${cls} transition hover:brightness-95`}>{body}</Link>
                    ) : w.order ? (
                      <button type="button" onClick={() => setOpenOrder(w.order.id)} className={`${cls} w-full text-left transition hover:brightness-95`}>{body}</button>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
            {warnings.length > 6 && (
              <button className="mt-3 text-sm font-semibold text-blue-700 hover:underline" onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Mostrar menos' : `Ver todos os ${warnings.length} avisos`}
              </button>
            )}
          </>
        )}
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[1.35fr_1fr]">
        <Card
          title="Situação atual das OSs"
          right={
            <div className="flex flex-wrap items-center gap-2">
              {overview && OPEN_STATUSES.map((s) => (
                <span key={s} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  <i className={`h-2 w-2 rounded-full ${STATUS[s].bar}`} /> {STATUS[s].label} <b className="text-slate-900">{overview.counts[s] || 0}</b>
                </span>
              ))}
              <Link to="/app/os/abertas" className="text-xs font-semibold text-blue-700 hover:underline">Abrir central</Link>
            </div>
          }
        >
          <p className="-mt-2 mb-3 text-xs text-slate-500">Tudo o que ainda está na loja, da OS mais antiga para a mais recente.</p>
          {!orders ? (
            <Spinner />
          ) : orders.length === 0 ? (
            <EmptyState>Nenhuma OS pendente na loja.</EmptyState>
          ) : (
            <div className="max-h-[460px] overflow-auto rounded-lg border border-slate-100">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>{['OS', 'Dispositivo', 'Cliente', 'Problema relatado', 'Status', 'Na loja há'].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => (
                    <tr key={o.id} onClick={() => setOpenOrder(o.id)} className="cursor-pointer hover:bg-blue-50/40">
                      <td className="px-3 py-2 font-extrabold text-slate-900">#{o.service_order_number}</td>
                      <td className="px-3 py-2">{o.device?.brand} {o.device?.model}</td>
                      <td className="px-3 py-2">{o.customer?.name}</td>
                      <td className="max-w-60 truncate px-3 py-2 text-slate-500" title={o.reported_issue}>{o.reported_issue}</td>
                      <td className="px-3 py-2"><StatusBadge status={o.status} /></td>
                      <td className={`whitespace-nowrap px-3 py-2 ${isOverdue(o) ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                        {stayDuration(o.created_at)}{isOverdue(o) && ' · atrasada'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Faturamento de hoje" right={<span className="text-xs text-slate-500">Meta, lucro e perdas do dia</span>}>
          {!summary ? (
            <Spinner />
          ) : (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} width={64} />
                    <Tooltip formatter={(v) => brl(v)} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
                    <Bar dataKey="value" name="Hoje" radius={[6, 6, 0, 0]}>
                      {chart.map((d) => <Cell key={d.name} fill={d.color} />)}
                      <LabelList dataKey="value" position="top" formatter={(v) => brl(v)} style={{ fontSize: 11, fontWeight: 700, fill: '#0f1b45' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <p className="rounded-lg bg-slate-50 p-2">Ontem<br /><b className="text-sm text-slate-900">{brl(summary.previous.revenue)}</b></p>
                <p className="rounded-lg bg-slate-50 p-2">Vendas hoje<br /><b className="text-sm text-slate-900">{c.sales_count}</b></p>
                <p className="rounded-lg bg-slate-50 p-2">OS entregues<br /><b className="text-sm text-slate-900">{c.delivered_orders}</b></p>
                <p className="rounded-lg bg-slate-50 p-2">Meta<br /><b className="text-sm text-slate-900">{summary.goal.target > 0 ? `${summary.goal.progress ?? 0}%` : 'não definida'}</b></p>
              </div>
            </>
          )}
        </Card>
      </div>

      <Card title="Situação atual das vendas" right={<Link to="/app/vendas/historico" className="text-xs font-semibold text-blue-700 hover:underline">Histórico completo</Link>}>
        <p className="-mt-2 mb-3 text-xs text-slate-500">Vendas registradas hoje, da mais recente para a mais antiga.</p>
        {!sales ? (
          <Spinner />
        ) : sales.length === 0 ? (
          <EmptyState>Nenhuma venda registrada hoje.</EmptyState>
        ) : (
          <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">Venda</th>
                  <th className="px-3 py-2 font-semibold">Hex</th>
                  <th className="px-3 py-2 font-semibold">Itens</th>
                  <th className="px-3 py-2 text-right font-semibold">Valor unitário</th>
                  <th className="px-3 py-2 text-right font-semibold">Total da venda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((s) => (
                  <tr key={s.id} onClick={() => setOpenSale(s)} className="cursor-pointer align-top hover:bg-blue-50/40">
                    <td className="px-3 py-2 font-extrabold text-slate-900">#{s.sale_number}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.short_id}</td>
                    <td className="px-3 py-2">
                      {s.items.map((i, idx) => <p key={idx}><b>{i.quantity}×</b> {i.name}</p>)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {s.items.map((i, idx) => <p key={idx}>{brl(i.unit_price)}</p>)}
                    </td>
                    <td className="px-3 py-2 text-right font-extrabold text-slate-900">{brl(s.grand_total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {openOrder && (
        <OrderSummaryModal
          id={openOrder}
          onClose={() => setOpenOrder(null)}
          onEdit={(o) => {
            setOpenOrder(null);
            setEditOrder(o.id);
          }}
        />
      )}
      {editOrder && <OrderEditModal id={editOrder} onClose={() => setEditOrder(null)} onChanged={load} />}
      {openSale && <SaleDetailsModal sale={openSale} onClose={() => setOpenSale(null)} onChanged={load} />}
    </div>
  );
}
