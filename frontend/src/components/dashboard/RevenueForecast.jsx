import { useEffect, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from '../icons';
import api from '../../services/api';
import { brl } from '../../utils/format';
import { Card } from '../ui';

const label = (month) => new Date(`${month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

// Faturamento recebido por mês e previsão dos próximos 3 meses (regressão linear no servidor)
export default function RevenueForecast() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get('/dashboard/predictive-revenue', { params: { months: 6 } }).then((r) => setData(r.data)).catch(() => setData(false));
  }, []);
  if (!data) return null;

  // O mês atual aparece nas duas séries para ligar a linha real à prevista
  const rows = [
    ...data.history.slice(0, -1).map((h) => ({ month: label(h.month), real: h.total })),
    ...data.forecast.map((f, i) => ({ month: label(f.month), forecast: f.total, ...(i === 0 ? { real: data.history.at(-1).total } : {}) })),
  ];
  const trend = data.trend_per_month;

  return (
    <Card
      title={<span className="flex items-center gap-2"><TrendingUp size={16} /> Previsão de receita</span>}
      right={<span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>Tendência: {trend >= 0 ? '+' : '−'}{brl(Math.abs(trend))}/mês</span>}
    >
      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(v) => `R$ ${Math.round(v / 1000)}k`} width={60} />
            <Tooltip formatter={(v, name) => [brl(v), name]} />
            <Legend />
            <Area type="monotone" dataKey="real" name="Recebido" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
            <Line type="monotone" dataKey="forecast" name="Previsto" stroke="#f97316" strokeDasharray="6 4" strokeWidth={2} dot />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-slate-500">{data.method}. O mês atual ainda está em andamento; a linha tracejada é a projeção.</p>
    </Card>
  );
}
