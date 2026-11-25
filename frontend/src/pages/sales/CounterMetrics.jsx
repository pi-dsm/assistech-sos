import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Calculator, CreditCard, Receipt, RefreshCw, Save, Target, TrendingUp } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, dt, METHODS, pctFmt, round2 } from '../../utils/format';
import { addDays, dayKey, paymentsByMethod, saleItemRows, startOfDay } from '../../utils/sales';
import { btnGhost, btnPrimary, btnSm, Card, EmptyState, inputCls, Kpi, Notice, PageHeader, Pill, Segmented, Spinner } from '../../components/ui';
import GoalsModal from '../../components/dashboard/GoalsModal';
import CashClosing from '../../components/sales/CashClosing';

const PERIODS = [
  { key: 'daily', label: 'Hoje', prev: 'ontem' },
  { key: 'weekly', label: '7 dias', prev: '7 dias anteriores' },
  { key: 'monthly', label: 'Este mês', prev: 'mês anterior' },
];
const METHOD_COLORS = { pix: '#059669', cash: '#f97316', credit_card: '#1d4ed8', debit_card: '#7c3aed' };
const ABC_CLS = {
  A: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  B: 'bg-amber-50 text-amber-800 ring-amber-200',
  C: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function rangeOf(period) {
  const today = startOfDay();
  if (period === 'daily') return { from: today, days: 1 };
  if (period === 'weekly') return { from: addDays(today, -6), days: 7 };
  return { from: new Date(today.getFullYear(), today.getMonth(), 1), days: today.getDate() };
}
export default function CounterMetrics() {
  const toast = useToast();
  const { can } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [abcAll, setAbcAll] = useState(false);

  const load = useCallback(async () => {
    setData(null);
    const { from, days } = rangeOf(period);
    try {
      const [dash, sales, products, g, pays] = await Promise.all([
        api.get('/dashboard/sales', { params: { period } }),
        api.get('/sales', { params: { from: dayKey(from), to: dayKey(new Date()), limit: 500 } }),
        api.get('/products', { params: { limit: 500 } }),
        api.get('/dashboard/goals', { params: { scope: 'sales' } }),
        api.get('/dashboard/payments', { params: { from: dayKey(from), to: dayKey(new Date()) } }),
      ]);
      setData({ dash: dash.data, sales: sales.data, products: products.data, payments: pays.data, from, days });
      setGoals(g.data);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const calc = useMemo(() => {
    if (!data) return null;
    const rows = saleItemRows(data.sales).filter((r) => r.item_type === 'product');

    // Curva ABC por faturamento
    const byProduct = new Map();
    rows.forEach((r) => {
      const key = r.product_id || r.name;
      const cur = byProduct.get(key) || { key, name: r.name, revenue: 0, qty: 0, profit: 0 };
      cur.revenue += r.total_price;
      cur.qty += r.quantity;
      cur.profit += r.profit;
      byProduct.set(key, cur);
    });
    const ranked = [...byProduct.values()].sort((a, b) => b.revenue - a.revenue);
    const total = ranked.reduce((s, r) => s + r.revenue, 0);
    let acc = 0;
    const abc = ranked.map((r) => {
      const before = acc;
      acc += r.revenue;
      const cum = total > 0 ? (acc / total) * 100 : 0;
      const cls = total > 0 && before / total < 0.8 ? 'A' : total > 0 && before / total < 0.95 ? 'B' : 'C';
      return { ...r, revenue: round2(r.revenue), profit: round2(r.profit), share: total > 0 ? (r.revenue / total) * 100 : 0, cum: round2(cum), cls };
    });
    const abcCount = { A: 0, B: 0, C: 0 };
    abc.forEach((r) => (abcCount[r.cls] += 1));

    // Giro de estoque (aproximação: estoque médio = atual + metade do vendido)
    const soldBy = new Map();
    rows.forEach((r) => r.product_id && soldBy.set(r.product_id, (soldBy.get(r.product_id) || 0) + r.quantity));
    const turnover = data.products
      .map((p) => {
        const sold = soldBy.get(String(p.id)) || 0;
        const avgStock = p.stock_quantity + sold / 2;
        return {
          id: p.id,
          name: p.name,
          stock: p.stock_quantity,
          sold,
          turnover: avgStock > 0 ? sold / avgStock : 0,
          cover: sold > 0 ? p.stock_quantity / (sold / data.days) : null,
        };
      })
      .sort((a, b) => b.turnover - a.turnover);
    const totalSold = turnover.reduce((s, t) => s + t.sold, 0);
    const totalAvg = turnover.reduce((s, t) => s + t.stock + t.sold / 2, 0);
    const stale = turnover.filter((t) => t.sold === 0 && t.stock > 0);

    // Formas de pagamento recebidas no período (vendas do período)
    const methods = data.payments.methods
      .filter((m) => m.sales > 0)
      .map((m) => ({ method: m.method, amount: m.sales }))
      .sort((a, b) => b.amount - a.amount);
    const methodsTotal = methods.reduce((s, m) => s + m.amount, 0);

    return { abc, abcCount, abcTotal: total, turnover, overallTurnover: totalAvg > 0 ? totalSold / totalAvg : 0, stale, methods, methodsTotal };
  }, [data]);

  const info = PERIODS.find((p) => p.key === period);
  const c = data?.dash.current;
  const delta = data?.dash.delta_revenue_pct;
  const series = data?.dash.series.map((r) => ({ ...r, ticket: r.sales_count ? round2(r.revenue / r.sales_count) : 0 })) || [];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Métricas de balcão" subtitle="Desempenho do PDV: faturamento, ticket, curva ABC, giro de estoque, pagamentos e caixa.">
        <Segmented options={PERIODS} value={period} onChange={setPeriod} label="Período" />
      </PageHeader>

      {!data || !calc ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Faturamento do PDV" icon={TrendingUp} value={brl(c.revenue)} accent="bg-blue-50 text-blue-700">
              {delta === null ? 'Sem base de comparação' : (
                <span className={`inline-flex items-center gap-0.5 font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {delta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(delta).toLocaleString('pt-BR')}%
                  <span className="font-normal text-slate-500"> vs {info.prev}</span>
                </span>
              )}
            </Kpi>
            <Kpi label="Ticket médio" icon={Receipt} value={brl(c.avg_ticket)}>{c.sales_count} vendas · {c.items_sold} itens</Kpi>
            <Kpi label="Lucro" icon={Calculator} value={brl(c.profit)} tone={c.profit < 0 ? 'text-red-600' : 'text-emerald-700'} accent="bg-emerald-50 text-emerald-700">Margem de {pctFmt(c.margin_pct)}</Kpi>
            <Kpi label="Meta de vendas" icon={Target} value={data.dash.goal.target > 0 ? pctFmt(data.dash.goal.progress, 0) : '—'} accent="bg-violet-50 text-violet-700">
              {data.dash.goal.target > 0 ? (data.dash.goal.remaining > 0 ? `Faltam ${brl(data.dash.goal.remaining)}` : 'Meta atingida!') : 'Nenhuma meta definida'}
              {can('goals.edit') && <button className={`${btnGhost} ${btnSm} mt-2 w-full`} onClick={() => setGoalsOpen(true)}><Target size={13} /> Definir metas</button>}
            </Kpi>
          </div>

          <Card title="Faturamento e ticket médio do PDV">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} width={70} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} width={60} />
                  <Tooltip formatter={(v) => brl(v)} />
                  <Legend />
                  <Bar yAxisId="l" dataKey="revenue" name="Faturamento" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="r" dataKey="ticket" name="Ticket médio" stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 3 }} />
                  {data.dash.goal.target > 0 && <Line yAxisId="l" dataKey="goal" name="Meta" stroke="#dc2626" strokeDasharray="6 4" dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card
            title="Curva ABC de acessórios e produtos"
            right={
              <span className="flex flex-wrap gap-1.5">
                {['A', 'B', 'C'].map((k) => <Pill key={k} cls={ABC_CLS[k]}>Classe {k}: {calc.abcCount[k]}</Pill>)}
              </span>
            }
          >
            {calc.abc.length === 0 ? (
              <EmptyState>Nenhum produto vendido no período.</EmptyState>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={calc.abc.slice(0, 15)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} width={64} />
                      <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v, n) => (n === 'Acumulado' ? `${v}%` : brl(v))} />
                      <Bar yAxisId="l" dataKey="revenue" name="Faturamento" radius={[4, 4, 0, 0]}>
                        {calc.abc.slice(0, 15).map((r) => <Cell key={r.key} fill={r.cls === 'A' ? '#059669' : r.cls === 'B' ? '#f59e0b' : '#94a3b8'} />)}
                      </Bar>
                      <Line yAxisId="r" dataKey="cum" name="Acumulado" stroke="#0f1b45" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <div className="max-h-72 overflow-auto rounded-lg border border-slate-100">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                        <tr><th className="px-2 py-1.5">Classe</th><th className="px-2">Produto</th><th className="px-2 text-right">Qtd.</th><th className="px-2 text-right">Faturamento</th><th className="px-2 text-right">Acum.</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(abcAll ? calc.abc : calc.abc.slice(0, 12)).map((r) => (
                          <tr key={r.key}>
                            <td className="px-2 py-1.5"><Pill cls={ABC_CLS[r.cls]}>{r.cls}</Pill></td>
                            <td className="max-w-48 truncate px-2" title={r.name}>{r.name}</td>
                            <td className="px-2 text-right">{r.qty}</td>
                            <td className="px-2 text-right font-semibold">{brl(r.revenue)}</td>
                            <td className="px-2 text-right text-slate-500">{pctFmt(r.cum, 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {calc.abc.length > 12 && <button className="mt-2 text-xs font-semibold text-blue-700 hover:underline" onClick={() => setAbcAll((v) => !v)}>{abcAll ? 'Mostrar menos' : `Ver os ${calc.abc.length} produtos`}</button>}
                  <p className="mt-2 text-xs text-slate-400">A = até 80% do faturamento, B = de 80% a 95%, C = restante. Priorize a reposição da classe A.</p>
                </div>
              </div>
            )}
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card title="Giro de estoque (turnover)" right={<span className="text-xs font-semibold text-slate-500">Giro geral: <b className="text-slate-900">{calc.overallTurnover.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×</b> no período</span>}>
              <div className="max-h-80 overflow-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr><th className="px-2 py-1.5">Produto</th><th className="px-2 text-right">Vendidos</th><th className="px-2 text-right">Estoque</th><th className="px-2 text-right">Giro</th><th className="px-2 text-right">Cobertura</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calc.turnover.filter((t) => t.sold > 0).slice(0, 25).map((t) => (
                      <tr key={t.id}>
                        <td className="max-w-56 truncate px-2 py-1.5" title={t.name}>{t.name}</td>
                        <td className="px-2 text-right">{t.sold}</td>
                        <td className={`px-2 text-right ${t.stock === 0 ? 'font-bold text-red-600' : ''}`}>{t.stock}</td>
                        <td className="px-2 text-right font-semibold">{t.turnover.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}×</td>
                        <td className="px-2 text-right text-slate-600">{t.cover === null ? '—' : t.stock === 0 ? 'esgotado' : `${Math.round(t.cover)} dia(s)`}</td>
                      </tr>
                    ))}
                    {calc.turnover.every((t) => t.sold === 0) && <tr><td colSpan={5} className="px-2 py-4 text-center text-slate-400">Nenhum produto vendido no período.</td></tr>}
                  </tbody>
                </table>
              </div>
              {calc.stale.length > 0 && (
                <p className="mt-3 text-sm text-slate-600"><b className="text-amber-700">{calc.stale.length} produto(s) sem giro</b> no período, com estoque parado: {calc.stale.slice(0, 6).map((s) => s.name).join(', ')}{calc.stale.length > 6 ? '…' : ''}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">Giro = unidades vendidas ÷ estoque médio (aproximado pelo estoque atual + metade do vendido). Cobertura = dias que o estoque atual dura no ritmo do período.</p>
            </Card>

            <Card title={<span className="flex items-center gap-2"><CreditCard size={16} /> Formas de pagamento predominantes</span>}>
              {calc.methods.length === 0 ? (
                <EmptyState>Nenhum pagamento no período.</EmptyState>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={calc.methods.map((m) => ({ name: METHODS[m.method] || m.method, value: m.amount, method: m.method }))} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {calc.methods.map((m) => <Cell key={m.method} fill={METHOD_COLORS[m.method] || '#64748b'} />)}
                        </Pie>
                        <Tooltip formatter={(v) => brl(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm">
                    {calc.methods.map((m) => (
                      <li key={m.method} className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ background: METHOD_COLORS[m.method] || '#64748b' }} /> {METHODS[m.method] || m.method}</span>
                        <span><b>{brl(m.amount)}</b> <span className="text-xs text-slate-500">{pctFmt((m.amount / calc.methodsTotal) * 100, 0)}</span></span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>

          {can('cash.close') && (
            <Card title={<span className="flex items-center gap-2"><Calculator size={16} /> Fechamento de caixa e quebras</span>}>
              <CashClosing />
            </Card>
          )}
        </>
      )}

      {goalsOpen && goals && (
        <GoalsModal
          scope="sales"
          title="Metas de vendas do balcão"
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
