import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Columns3, Eye, List, RotateCcw, ShieldAlert } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import usePref from '../../hooks/usePref';
import { brl, dateOnly, DEVICE_TYPES, dt } from '../../utils/format';
import { EmptyState, inputCls, Notice, PageHeader, Pill, SearchInput, Segmented, Spinner, Toolbar } from '../../components/ui';
import OrderSummaryModal from '../../components/os/OrderSummaryModal';
import ReopenModal from '../../components/os/ReopenModal';

const DAY = 86400000;
const HIDE_AFTER_DAYS = 15; // some da visualização 15 dias depois do fim da garantia (continua na pesquisa)
const SOON_DAYS = 7;

const VIEWS = [
  { key: 'table', label: 'Tabela', icon: List },
  { key: 'kanban', label: 'Kanban', icon: Columns3 },
];

// Situação da OS finalizada, usada nas colunas e nos filtros
const GROUPS = {
  warranty: { label: 'Em garantia', dot: 'bg-emerald-500', cls: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  expiring: { label: `Garantia vence em até ${SOON_DAYS} dias`, dot: 'bg-amber-500', cls: 'bg-amber-50 text-amber-800 ring-amber-200' },
  expired: { label: 'Garantia encerrada', dot: 'bg-slate-400', cls: 'bg-slate-100 text-slate-700 ring-slate-200' },
  returned: { label: 'Retornaram', dot: 'bg-violet-500', cls: 'bg-violet-50 text-violet-800 ring-violet-200' },
  cancelled: { label: 'Canceladas', dot: 'bg-red-500', cls: 'bg-red-50 text-red-700 ring-red-200' },
};

const groupOf = (o) => {
  if (o.status === 'returned') return 'returned';
  if (o.status === 'cancelled') return 'cancelled';
  const until = o.warranty_until ? new Date(o.warranty_until).getTime() : 0;
  if (!until || until < Date.now()) return 'expired';
  return until - Date.now() <= SOON_DAYS * DAY ? 'expiring' : 'warranty';
};
// Referência para ocultar: fim da garantia (ou a data de entrega / última atualização)
const hiddenByAge = (o) => {
  const ref = new Date(o.warranty_until || o.delivered_at || o.updated_at).getTime();
  return ref + HIDE_AFTER_DAYS * DAY < Date.now();
};
const maintenanceText = (o) =>
  o.parts_used?.length ? o.parts_used.map((p) => `${p.quantity}× ${p.part_name || p.description}`).join(', ') : o.no_parts_used ? 'Sem peças' : '—';

function ReopenButton({ order, onClick, compact }) {
  if (order.status !== 'delivered') return null;
  const ok = order.is_under_warranty;
  return (
    <button
      type="button"
      title={ok ? 'Reabrir como retorno em garantia' : 'Garantia vencida: reabrir como retorno cobrado'}
      onClick={(e) => {
        e.stopPropagation();
        onClick(order);
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? 'p-1.5 text-violet-700 hover:bg-violet-50' : 'flex-1 justify-center bg-violet-50 py-1.5 text-xs text-violet-700 hover:bg-violet-100'
      }`}
      aria-label={`Reabrir OS ${order.service_order_number} como retorno`}
    >
      <RotateCcw size={compact ? 16 : 14} /> {!compact && 'Reabrir como retorno'}
    </button>
  );
}

function DeliveredCard({ order, onOpen, onReopen }) {
  return (
    <article onClick={() => onOpen(order)} className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition hover:shadow-pop">
      <div className="flex items-center justify-between gap-2">
        <span className="font-extrabold text-slate-900">#{order.service_order_number}</span>
        {order.is_warranty && <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 text-[11px] font-semibold text-violet-700"><ShieldAlert size={12} /> Garantia</span>}
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{order.device?.brand} {order.device?.model} <span className="font-normal text-slate-400">· {DEVICE_TYPES[order.device?.device_type]}</span></p>
      <p className="truncate text-sm text-slate-600">{order.customer?.name}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{order.reported_issue}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-700"><b>Manutenção:</b> {maintenanceText(order)}</p>
      <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
        <p>Entrada: {dt(order.created_at)}</p>
        <p>{order.status === 'cancelled' ? 'Cancelada' : 'Entrega'}: {dt(order.delivered_at || order.updated_at)}</p>
        {order.warranty_until && <p>Garantia até {dateOnly(order.warranty_until)}</p>}
      </div>
      <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={() => onOpen(order)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Eye size={14} /> Detalhes
        </button>
        <ReopenButton order={order} onClick={onReopen} />
      </div>
    </article>
  );
}

export default function DeliveredOrders() {
  const toast = useToast();
  const [view, setView] = usePref('delivered_view', 'table');
  const [orders, setOrders] = useState(null);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [openId, setOpenId] = useState(null);
  const [reopenId, setReopenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/service-orders', { params: { scope: 'closed', q: q || undefined, sort: 'newest', limit: 500 } });
      setOrders(data);
    } catch (e) {
      toast.error(errMsg(e));
      setOrders([]);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const searching = q.trim().length > 0;
  const { visible, hiddenCount } = useMemo(() => {
    if (!orders) return { visible: [], hiddenCount: 0 };
    const pool = searching ? orders : orders.filter((o) => !hiddenByAge(o));
    const fromT = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toT = to ? new Date(`${to}T23:59:59`).getTime() : null;
    const list = pool.filter((o) => {
      const at = new Date(o.delivered_at || o.updated_at).getTime();
      return (!group || groupOf(o) === group) && (!deviceType || o.device?.device_type === deviceType) && (!fromT || at >= fromT) && (!toT || at <= toT);
    });
    return { visible: list, hiddenCount: orders.length - pool.length };
  }, [orders, searching, group, deviceType, from, to]);

  const open = (o) => setOpenId(o.id);
  const reopen = (o) => setReopenId(o.id);

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader title="OSs entregues" subtitle="Histórico das OSs finalizadas. Saem desta lista 15 dias depois do fim da garantia, mas continuam na pesquisa.">
        <Segmented options={VIEWS} value={view} onChange={setView} label="Visualização" />
      </PageHeader>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Pesquisar em todas as OSs finalizadas: nº, cliente, telefone, aparelho…" />
        <select className={`${inputCls} w-auto`} value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(GROUPS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={deviceType} onChange={(e) => setDeviceType(e.target.value)} aria-label="Tipo de dispositivo">
          <option value="">Todos os dispositivos</option>
          {Object.entries(DEVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <CalendarCheck2 size={16} /> Entrega de
          <input type="date" className={`${inputCls} w-auto`} value={from} onChange={(e) => setFrom(e.target.value)} />
          até
          <input type="date" className={`${inputCls} w-auto`} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
      </Toolbar>

      {hiddenCount > 0 && !searching && (
        <Notice>{hiddenCount} OS(s) antiga(s) ocultas por já terem passado 15 dias do fim da garantia. Use a pesquisa para encontrá-las.</Notice>
      )}

      {!orders ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <EmptyState>Nenhuma OS finalizada encontrada.</EmptyState>
      ) : view === 'kanban' ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(GROUPS).map(([key, g]) => {
            const list = visible.filter((o) => groupOf(o) === key);
            return (
              <section key={key} className="flex min-h-40 flex-col rounded-xl border border-slate-200 bg-slate-100/60 p-2.5">
                <header className="mb-2 flex items-center justify-between px-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><i className={`h-2.5 w-2.5 rounded-full ${g.dot}`} /> {g.label}</span>
                  <span className="rounded-full bg-white px-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{list.length}</span>
                </header>
                <div className="flex max-h-[64vh] flex-col gap-2 overflow-y-auto">
                  {list.map((o) => <DeliveredCard key={o.id} order={o} onOpen={open} onReopen={reopen} />)}
                  {list.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Nenhuma OS</p>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['OS', 'Dispositivo', 'Cliente', 'Problema relatado', 'Manutenção', 'Entrada', 'Entrega', 'Total', 'Situação', ''].map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((o) => {
                const g = GROUPS[groupOf(o)];
                return (
                  <tr key={o.id} onClick={() => open(o)} className="cursor-pointer hover:bg-blue-50/40">
                    <td className="px-3 py-2.5 font-bold text-slate-900">#{o.service_order_number}</td>
                    <td className="px-3 py-2.5">{o.device?.brand} {o.device?.model}</td>
                    <td className="px-3 py-2.5">{o.customer?.name}</td>
                    <td className="max-w-52 truncate px-3 py-2.5 text-slate-500" title={o.reported_issue}>{o.reported_issue}</td>
                    <td className="max-w-52 truncate px-3 py-2.5 text-slate-600" title={maintenanceText(o)}>{maintenanceText(o)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dt(o.created_at)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dt(o.delivered_at)}</td>
                    <td className="px-3 py-2.5 font-semibold">{o.is_warranty ? 'Garantia' : brl(o.grand_total_amount)}</td>
                    <td className="px-3 py-2.5">
                      <Pill cls={g.cls}>{g.label}</Pill>
                      {o.warranty_until && o.status === 'delivered' && <span className="mt-0.5 block text-[11px] text-slate-400">até {dateOnly(o.warranty_until)}</span>}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" onClick={() => open(o)} aria-label="Detalhes" title="Detalhes"><Eye size={16} /></button>
                        <ReopenButton order={o} onClick={reopen} compact />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {openId && <OrderSummaryModal id={openId} onClose={() => setOpenId(null)} />}
      {reopenId && (
        <ReopenModal
          orderId={reopenId}
          onClose={() => setReopenId(null)}
          onReopened={(created) => {
            setReopenId(null);
            load();
            setOpenId(created.id);
          }}
        />
      )}
    </div>
  );
}
