import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ClipboardList, Clock, PackageX, ShieldAlert, Target } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, OPEN_STATUSES, STATUS, WEEKDAYS } from '../../utils/format';
import { btnGhost, btnSm, Card, Kpi, PageHeader, Segmented, Spinner } from '../../components/ui';
import RankList from '../../components/dashboard/RankList';
import GoalsModal from '../../components/dashboard/GoalsModal';
import RevenueForecast from '../../components/dashboard/RevenueForecast';

const PERIODS = [
  { key: 'daily', label: 'Diário', now: 'Hoje', prev: 'ontem' },
  { key: 'weekly', label: 'Semanal', now: 'Últimos 7 dias', prev: '7 dias anteriores' },
  { key: 'monthly', label: 'Mensal', now: 'Este mês', prev: 'mês anterior' },
];

// Visão geral da assistência (OS + balcão): faturamento, lucro, perdas, metas, operação e tendências
export default function AssistanceMetrics() {
  const toast = useToast();
  const { can } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [data, setData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [summary, ov, g] = await Promise.all([api.get('/dashboard/summary', { params: { period } }), api.get('/dashboard/overview'), api.get('/dashboard/goals')]);
      setData(summary.data);
      setOverview(ov.data);
      setGoals(g.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const info = PERIODS.find((p) => p.key === period);
  const c = data?.current;
  const delta = data?.delta_revenue_pct;
  const progress = data?.goal?.progress;
  const weekdays = data?.trackers.weekdays.map((w) => ({ ...w, name: WEEKDAYS[w.weekday] })) || [];
  const peak = weekdays.reduce((best, w) => (w.orders + w.sales > (best?.orders || 0) + (best?.sales || 0) ? w : best), null);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Métricas da assistência" subtitle="Faturamento, lucro, perdas e operação da loja inteira (ordens de serviço + balcão).">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} label="Período" />
      </PageHeader>

      {!data || !overview ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label={`Faturamento · ${info.now}`} value={brl(c.revenue)} accent="bg-blue-50 text-blue-700">
              {delta === null ? 'Sem base de comparação' : (
                <span className={`inline-flex items-center gap-0.5 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta).toLocaleString('pt-BR')}%
                  <span className="font-normal text-slate-500"> vs {info.prev}</span>
                </span>
              )}
            </Kpi>
            <Kpi label="Lucro líquido" value={brl(c.net_profit)} tone={c.net_profit < 0 ? 'text-red-600' : 'text-emerald-700'}>
              {c.delivered_orders} OS entregues · {c.sales_count} vendas · descontos {brl(c.discounts)}
            </Kpi>
            <Kpi label="Perdas (garantia)" icon={ShieldAlert} value={brl(c.loss)} tone={c.loss > 0 ? 'text-red-600' : 'text-slate-900'} accent="bg-red-50 text-red-600">
              {data.warranty_returns} retorno(s) na janela do gráfico
            </Kpi>
            <Kpi label={`Meta ${info.label.toLowerCase()}`} icon={Target} value={data.goal.target > 0 ? `${progress ?? 0}%` : '—'} accent="bg-violet-50 text-violet-700">
              {data.goal.target > 0 ? (
                <>
                  <div className="mb-1 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(progress || 0, 100)}%` }} /></div>
                  {brl(c.revenue)} de {brl(data.goal.target)}
                </>
              ) : 'Nenhuma meta definida'}
              {can('goals.edit') && <button className={`${btnGhost} ${btnSm} mt-2 w-full`} onClick={() => setGoalsOpen(true)}><Target size={13} /> Definir metas</button>}
            </Kpi>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link to="/app/os/abertas" className="block"><Kpi label="OSs na loja" icon={ClipboardList} value={overview.open_orders}>
              {OPEN_STATUSES.map((s) => `${STATUS[s].label}: ${overview.counts[s] || 0}`).join(' · ')}
            </Kpi></Link>
            <Kpi label="Entregas atrasadas" icon={AlertTriangle} value={overview.overdue_orders} tone={overview.overdue_orders ? 'text-red-600' : 'text-slate-900'} accent="bg-red-50 text-red-600">Abertas com previsão vencida</Kpi>
            <Kpi label="Prontas há +30 dias" icon={Clock} value={overview.ready_over_30_days} tone={overview.ready_over_30_days ? 'text-amber-600' : 'text-slate-900'} accent="bg-amber-50 text-amber-600">Risco de abandono do aparelho</Kpi>
            <Link to="/app/gestao/perifericos" className="block"><Kpi label="Itens no estoque mínimo" icon={PackageX} value={overview.low_stock_products} tone={overview.low_stock_products ? 'text-amber-600' : 'text-slate-900'} accent="bg-amber-50 text-amber-600">Hoje: {brl(overview.today.revenue)} recebidos</Kpi></Link>
          </div>

          <Card title="Faturamento, lucro e perdas">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${v}`} width={70} />
                  <Tooltip formatter={(v) => brl(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Faturamento" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Line dataKey="net_profit" name="Lucro líquido" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line dataKey="loss" name="Perdas" stroke="#dc2626" strokeWidth={2} strokeDasharray="4 3" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Marcas mais atendidas"><RankList items={data.trackers.brands} empty="Sem OS na janela." /></Card>
            <Card title="Modelos mais atendidos"><RankList items={data.trackers.models} empty="Sem OS na janela." /></Card>
            <Card title="Dias de pico" right={peak && peak.orders + peak.sales > 0 ? <span className="text-xs font-bold text-blue-700">Pico: {peak.name}</span> : null}>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdays}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} width={28} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="orders" name="OS abertas" stackId="a" fill="#1d4ed8" />
                    <Bar dataKey="sales" name="Vendas" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
          <RevenueForecast />
          <p className="text-xs text-slate-400">
            Marcas, modelos e dias de pico consideram toda a janela do gráfico ({period === 'daily' ? '7 dias' : period === 'weekly' ? '8 semanas' : '6 meses'}). Detalhes por área em
            {' '}<Link to="/app/os/metricas" className="font-semibold text-blue-700 hover:underline">Métricas de bancada</Link> e <Link to="/app/vendas/metricas" className="font-semibold text-blue-700 hover:underline">Métricas de balcão</Link>.
          </p>
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
