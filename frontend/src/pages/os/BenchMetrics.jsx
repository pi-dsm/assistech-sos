import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, Percent, Target, TrendingUp, Wallet, Wrench } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, DEVICE_TYPES, pctFmt, round2 } from '../../utils/format';
import { defectModes } from '../../utils/defects';
import { btnGhost, btnSm, Card, EmptyState, Kpi, PageHeader, Segmented, Spinner } from '../../components/ui';
import GoalsModal from '../../components/dashboard/GoalsModal';

const DAY = 86400000;
const RANGES = [
  { key: '30', label: '30 dias' },
  { key: '90', label: '90 dias' },
  { key: '180', label: '6 meses' },
  { key: '365', label: '12 meses' },
];
const CYCLE_BUCKETS = [
  ['Até 1 dia', 1],
  ['2–3 dias', 3],
  ['4–7 dias', 7],
  ['8–14 dias', 14],
  ['15+ dias', Infinity],
];
const days = (a, b) => (a && b ? (new Date(b) - new Date(a)) / DAY : null);
const avg = (list) => (list.length ? list.reduce((s, v) => s + v, 0) / list.length : 0);
const median = (list) => {
  if (!list.length) return 0;
  const s = [...list].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmtDays = (v) => `${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dia${Math.round(v) === 1 ? '' : 's'}`;
// Retornos (garantia ou cobrados) não são orçamentos novos
const isReturn = (o) => o.is_warranty || !!o.return_kind;
const reachedRepair = (o) => ['ready', 'delivered', 'returned'].includes(o.status) || o.status === 'in_repair' || (o.status_history || []).some((h) => h.status === 'in_repair');

function GoalRow({ title, data, projection }) {
  const target = data?.goal?.target || 0;
  const revenue = data?.current?.revenue || 0;
  const progress = target > 0 ? Math.min((revenue / target) * 100, 999) : 0;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-ink-900">{title}</p>
        <p className="text-xs text-slate-500">{target > 0 ? `meta ${brl(target)}` : 'sem meta'}</p>
      </div>
      <p className="mt-1 text-2xl font-extrabold text-ink-900">{brl(revenue)}</p>
      {target > 0 ? (
        <>
          <div className="mt-2 h-2.5 rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-600">
            {progress >= 100 ? <b className="text-emerald-700">Meta atingida ({pctFmt(progress, 0)})</b> : <>Faltam <b>{brl(target - revenue)}</b> · {pctFmt(progress, 0)}</>}
          </p>
          {projection && <p className="mt-1 text-xs text-slate-500">{projection}</p>}
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-400">Defina uma meta para acompanhar o progresso.</p>
      )}
    </div>
  );
}

export default function BenchMetrics() {
  const toast = useToast();
  const { can } = useAuth();
  const [range, setRange] = useState('90');
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [modeBy, setModeBy] = useState('model');

  const load = useCallback(async () => {
    try {
      const [closed, open, g, d, w, m] = await Promise.all([
        api.get('/service-orders', { params: { scope: 'closed', sort: 'newest', limit: 500 } }),
        api.get('/service-orders', { params: { scope: 'open', sort: 'newest', limit: 500 } }),
        api.get('/dashboard/goals'),
        api.get('/dashboard/summary', { params: { period: 'daily' } }),
        api.get('/dashboard/summary', { params: { period: 'weekly' } }),
        api.get('/dashboard/summary', { params: { period: 'monthly' } }),
      ]);
      setData({ closed: closed.data, open: open.data, goalsSummary: { daily: d.data, weekly: w.data, monthly: m.data } });
      setGoals(g.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => {
    if (!data) return null;
    const from = Date.now() - Number(range) * DAY;
    const delivered = data.closed.filter((o) => ['delivered', 'returned'].includes(o.status) && o.delivered_at && new Date(o.delivered_at).getTime() >= from);
    const normal = delivered.filter((o) => !o.is_warranty);
    const warranty = delivered.filter((o) => o.is_warranty);

    const profit = normal.reduce((s, o) => s + (o.profit_amount || 0), 0);
    const returnLosses = [...data.open, ...data.closed]
      .filter((o) => o.return_loss_amount > 0 && new Date(o.created_at).getTime() >= from)
      .reduce((s, o) => s + o.return_loss_amount, 0);
    const losses = warranty.reduce((s, o) => s + Math.max(0, -(o.profit_amount || 0)), 0) + returnLosses;
    const revenue = normal.reduce((s, o) => s + (o.grand_total_amount || 0), 0);

    // Margem de contribuição por categoria de dispositivo
    const byCat = new Map();
    normal.forEach((o) => {
      const key = o.device?.device_type || 'other';
      const cur = byCat.get(key) || { key, name: DEVICE_TYPES[key] || 'Outro', count: 0, revenue: 0, cost: 0 };
      cur.count += 1;
      cur.revenue += o.grand_total_amount || 0;
      cur.cost += o.cost_total_amount || 0;
      byCat.set(key, cur);
    });
    const categories = [...byCat.values()]
      .map((c) => ({ ...c, revenue: round2(c.revenue), cost: round2(c.cost), contribution: round2(c.revenue - c.cost), margin: c.revenue > 0 ? round2(((c.revenue - c.cost) / c.revenue) * 100) : 0 }))
      .sort((a, b) => b.contribution - a.contribution);

    // Tempo de ciclo
    const total = delivered.map((o) => days(o.created_at, o.delivered_at)).filter((v) => v !== null);
    const repair = delivered.map((o) => days(o.created_at, o.ready_at)).filter((v) => v !== null);
    const pickup = delivered.map((o) => days(o.ready_at, o.delivered_at)).filter((v) => v !== null);
    const buckets = CYCLE_BUCKETS.map(([name]) => ({ name, count: 0 }));
    total.forEach((v) => {
      const i = CYCLE_BUCKETS.findIndex(([, max]) => v <= max);
      buckets[i].count += 1;
    });

    // Conversão de orçamentos (OS abertas no período, sem contar retornos em garantia)
    const cohort = [...data.open, ...data.closed].filter((o) => !isReturn(o) && new Date(o.created_at).getTime() >= from);
    const approved = cohort.filter(reachedRepair).length;
    const declined = cohort.filter((o) => o.status === 'cancelled' && !reachedRepair(o)).length;
    const pending = cohort.length - approved - declined;

    const allInPeriod = [...data.open, ...data.closed].filter((o) => new Date(o.created_at).getTime() >= from);

    return {
      count: normal.length,
      warrantyCount: warranty.length,
      avgNetProfit: normal.length ? (profit - losses) / normal.length : 0,
      avgTicket: normal.length ? revenue / normal.length : 0,
      losses,
      categories,
      cycle: { total: avg(total), median: median(total), repair: avg(repair), pickup: avg(pickup), buckets, n: total.length },
      conversion: { approved, declined, pending, rate: approved + declined > 0 ? (approved / (approved + declined)) * 100 : null },
      modesSource: allInPeriod,
    };
  }, [data, range]);

  const modes = useMemo(() => (metrics ? defectModes(metrics.modesSource, modeBy).slice(0, 12) : []), [metrics, modeBy]);

  const now = new Date();
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthly = data?.goalsSummary.monthly;
  const monthRevenue = monthly?.current?.revenue || 0;
  const monthTarget = monthly?.goal?.target || 0;
  const projected = (monthRevenue / now.getDate()) * monthDays;
  const remainingDays = monthDays - now.getDate() + 1;
  const projection =
    monthTarget > 0
      ? `Projeção para o mês: ${brl(projected)}${monthRevenue < monthTarget ? ` · ritmo necessário: ${brl((monthTarget - monthRevenue) / remainingDays)}/dia` : ''}`
      : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Métricas de bancada" subtitle="Desempenho técnico e financeiro das ordens de serviço.">
        <Segmented options={RANGES} value={range} onChange={setRange} label="Período" />
      </PageHeader>

      {!metrics ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Lucro líquido médio por OS" icon={Wallet} value={brl(metrics.avgNetProfit)} tone={metrics.avgNetProfit < 0 ? 'text-red-600' : 'text-emerald-700'} accent="bg-emerald-50 text-emerald-700">
              {metrics.count} OS entregues · perdas de garantia {brl(metrics.losses)}
            </Kpi>
            <Kpi label="Ticket médio por OS" icon={TrendingUp} value={brl(metrics.avgTicket)} accent="bg-orange-50 text-orange-600">
              {metrics.warrantyCount} retorno(s) em garantia no período
            </Kpi>
            <Kpi label="Tempo médio de ciclo" icon={Clock} value={fmtDays(metrics.cycle.total)}>
              Mediana {fmtDays(metrics.cycle.median)} · {metrics.cycle.n} OS
            </Kpi>
            <Kpi label="Conversão de orçamentos" icon={Percent} value={metrics.conversion.rate === null ? '—' : pctFmt(metrics.conversion.rate, 0)} accent="bg-violet-50 text-violet-700">
              {metrics.conversion.approved} aprovados · {metrics.conversion.declined} recusados/cancelados
            </Kpi>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Margem de contribuição por categoria">
              {metrics.categories.length === 0 ? (
                <EmptyState>Nenhuma OS entregue no período.</EmptyState>
              ) : (
                <>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.categories} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tickFormatter={(v) => `R$ ${v}`} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => brl(v)} />
                        <Bar dataKey="contribution" name="Contribuição" fill="#1d4ed8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="text-left text-xs uppercase text-slate-500">
                        <tr><th className="py-1.5">Categoria</th><th className="text-right">OS</th><th className="text-right">Receita</th><th className="text-right">Custos variáveis</th><th className="text-right">Contribuição</th><th className="text-right">Margem</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {metrics.categories.map((c) => (
                          <tr key={c.key}>
                            <td className="py-1.5 font-semibold">{c.name}</td>
                            <td className="text-right">{c.count}</td>
                            <td className="text-right">{brl(c.revenue)}</td>
                            <td className="text-right text-slate-500">{brl(c.cost)}</td>
                            <td className={`text-right font-bold ${c.contribution < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(c.contribution)}</td>
                            <td className="text-right">{pctFmt(c.margin)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">Custos variáveis = peças compradas para cada OS (peças de estoque próprio entram com custo zero).</p>
                </>
              )}
            </Card>

            <Card title="Tempo médio de ciclo">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] font-semibold uppercase text-slate-500">Entrada → pronta</p><p className="text-lg font-extrabold text-ink-900">{fmtDays(metrics.cycle.repair)}</p></div>
                <div className="rounded-lg bg-slate-50 p-2"><p className="text-[11px] font-semibold uppercase text-slate-500">Pronta → entrega</p><p className="text-lg font-extrabold text-ink-900">{fmtDays(metrics.cycle.pickup)}</p></div>
                <div className="rounded-lg bg-orange-50 p-2"><p className="text-[11px] font-semibold uppercase text-orange-700">Ciclo total</p><p className="text-lg font-extrabold text-orange-700">{fmtDays(metrics.cycle.total)}</p></div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.cycle.buckets}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="OS" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
            <Card title="Taxa de conversão de orçamentos">
              <div className="flex flex-wrap items-center gap-6">
                <div className="relative h-44 w-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Aprovados', value: metrics.conversion.approved },
                          { name: 'Recusados / cancelados', value: metrics.conversion.declined },
                          { name: 'Aguardando decisão', value: metrics.conversion.pending },
                        ]}
                        dataKey="value"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={2}
                      >
                        <Cell fill="#059669" />
                        <Cell fill="#dc2626" />
                        <Cell fill="#cbd5e1" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <p className="absolute inset-0 grid place-items-center text-2xl font-extrabold text-ink-900">{metrics.conversion.rate === null ? '—' : pctFmt(metrics.conversion.rate, 0)}</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-emerald-600" /> Aprovados (foram para conserto): <b>{metrics.conversion.approved}</b></li>
                  <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-red-600" /> Recusados/cancelados antes do conserto: <b>{metrics.conversion.declined}</b></li>
                  <li className="flex items-center gap-2"><i className="h-3 w-3 rounded-full bg-slate-300" /> Aguardando decisão: <b>{metrics.conversion.pending}</b></li>
                </ul>
              </div>
              <p className="mt-3 text-xs text-slate-400">Considera as OS abertas no período, exceto retornos em garantia. Taxa = aprovados ÷ (aprovados + recusados).</p>
            </Card>

            <Card title="Moda de defeitos" right={<Segmented size="sm" options={[{ key: 'model', label: 'Por modelo' }, { key: 'brand', label: 'Por marca' }]} value={modeBy} onChange={setModeBy} label="Agrupar" />}>
              {modes.length === 0 ? (
                <EmptyState>Nenhuma OS aberta no período.</EmptyState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead className="text-left text-xs uppercase text-slate-500">
                      <tr><th className="py-1.5">{modeBy === 'model' ? 'Modelo' : 'Marca'}</th><th className="text-right">OS</th><th className="pl-4">Defeito mais comum</th><th>Outros defeitos</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {modes.map((m) => (
                        <tr key={m.name}>
                          <td className="py-2 font-semibold">{m.name}</td>
                          <td className="text-right">{m.total}</td>
                          <td className="pl-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700 ring-1 ring-inset ring-orange-200">
                              <Wrench size={12} /> {m.top.category} · {m.top.count}/{m.total}
                            </span>
                          </td>
                          <td className="text-xs text-slate-500">{m.categories.slice(1, 4).map((c) => `${c.category} (${c.count})`).join(', ') || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-400">Os defeitos são classificados pelas palavras do problema relatado (tela, bateria, conector, não liga, software…).</p>
            </Card>
          </div>

          <Card title={<span className="flex items-center gap-2"><Target size={16} /> Painel de metas</span>} right={can('goals.edit') && <button className={`${btnGhost} ${btnSm}`} onClick={() => setGoalsOpen(true)}><Target size={13} /> Definir metas</button>}>
            <div className="grid gap-3 md:grid-cols-3">
              <GoalRow title="Hoje" data={data.goalsSummary.daily} />
              <GoalRow title="Últimos 7 dias" data={data.goalsSummary.weekly} />
              <GoalRow title="Este mês" data={data.goalsSummary.monthly} projection={projection} />
            </div>
            <p className="mt-3 text-xs text-slate-400">Faturamento recebido (OS + vendas) comparado às metas gerais da assistência. Atualiza a cada visita.</p>
          </Card>
        </>
      )}

      {goalsOpen && goals && (
        <GoalsModal
          goals={goals}
          onClose={() => setGoalsOpen(false)}
          onSaved={() => {
            setGoalsOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}
