import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Building, TrendingUp, Users, Wallet } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { brl, pctFmt } from '../../utils/format';
import { Card, Kpi, PageHeader, Spinner } from '../../components/ui';

// Métricas da plataforma: receita recorrente, cancelamentos e valor por assinante
export default function SaasMetrics() {
  const toast = useToast();
  const [m, setM] = useState(null);
  useEffect(() => {
    api.get('/super/metrics').then((r) => setM(r.data)).catch((e) => toast.error(errMsg(e)));
  }, []);
  if (!m) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Métricas SaaS" subtitle="Calculadas a partir dos assinantes e dos preços dos planos." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="MRR" icon={Wallet} value={brl(m.mrr)}>Receita recorrente mensal</Kpi>
        <Kpi label="ARR" icon={TrendingUp} value={brl(m.arr)}>MRR x 12</Kpi>
        <Kpi label="Assinantes ativos" icon={Building} value={`${m.active} de ${m.tenants}`}>{m.users} usuários ativos</Kpi>
        <Kpi label="Churn (30 dias)" icon={BarChart3} value={pctFmt(m.churn_rate)} tone={m.churn_rate ? 'text-orange-600' : 'text-slate-900'} accent="bg-orange-50 text-orange-600">
          Cancelamentos sobre a base
        </Kpi>
        <Kpi label="Ticket médio (ARPU)" icon={Users} value={brl(m.arpu)}>Por assinante ativo</Kpi>
        <Kpi label="LTV" icon={TrendingUp} value={m.ltv === null ? '—' : brl(m.ltv)}>ARPU ÷ churn {m.ltv === null && '(sem cancelamentos no período)'}</Kpi>
      </div>
      <Card title="Assinantes ativos por plano">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={m.by_plan}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'Assinantes']} />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
