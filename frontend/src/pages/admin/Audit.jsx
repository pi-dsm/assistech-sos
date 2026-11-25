import { useEffect, useMemo, useState } from 'react';
import { History } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Card, inputCls, PageHeader, SearchInput, Spinner } from '../../components/ui';
import { dt } from '../../utils/format';

// "MÉTODO /rota/padrão" -> descrição da ação. O que não estiver aqui aparece como a própria rota.
const ACTIONS = {
  'POST /api/v1/auth/login': 'Entrou no sistema',
  'POST /api/v1/service-orders/': 'Abriu uma OS',
  'PUT /api/v1/service-orders/:id': 'Editou uma OS',
  'PATCH /api/v1/service-orders/:id/status': 'Mudou o status de uma OS',
  'PATCH /api/v1/service-orders/:id/ready': 'Concluiu o reparo de uma OS',
  'PATCH /api/v1/service-orders/:id/deliver': 'Entregou uma OS',
  'POST /api/v1/service-orders/:id/payments': 'Recebeu pagamento de OS',
  'POST /api/v1/service-orders/:id/return': 'Reabriu OS como retorno',
  'POST /api/v1/service-orders/:id/notify-whatsapp': 'Gerou aviso de WhatsApp',
  'DELETE /api/v1/service-orders/:id': 'Cancelou ou removeu uma OS',
  'POST /api/v1/sales/': 'Registrou uma venda',
  'POST /api/v1/pdv/checkout': 'Registrou uma venda',
  'POST /api/v1/sales/:id/payments': 'Recebeu pagamento de venda',
  'PATCH /api/v1/sales/:id/refund': 'Estornou uma venda',
  'POST /api/v1/cash-closings/open': 'Abriu o caixa',
  'POST /api/v1/cash-closings/movements': 'Fez sangria ou suprimento',
  'POST /api/v1/cash-closings/': 'Fechou o caixa',
  'POST /api/v1/products/': 'Cadastrou item de estoque',
  'PUT /api/v1/products/:id': 'Editou item de estoque',
  'PATCH /api/v1/products/:id/stock': 'Ajustou estoque',
  'DELETE /api/v1/products/:id': 'Desativou item de estoque',
  'POST /api/v1/suppliers/purchase-order': 'Lançou compra de fornecedor',
  'POST /api/v1/suppliers/': 'Cadastrou fornecedor',
  'PUT /api/v1/suppliers/:id': 'Editou fornecedor',
  'PATCH /api/v1/suppliers/:id/status': 'Ativou/inativou fornecedor',
  'POST /api/v1/services/': 'Cadastrou serviço',
  'PUT /api/v1/services/:id': 'Editou serviço',
  'DELETE /api/v1/services/:id': 'Desativou serviço',
  'POST /api/v1/customers/': 'Cadastrou cliente',
  'PUT /api/v1/customers/:id': 'Editou cliente',
  'POST /api/v1/users/': 'Criou usuário',
  'PUT /api/v1/users/:id': 'Editou usuário ou permissões',
  'PATCH /api/v1/users/:id/toggle-status': 'Ativou/desativou usuário',
  'PUT /api/v1/tenant/': 'Alterou as configurações da loja',
  'PUT /api/v1/dashboard/goals': 'Alterou metas',
  'POST /api/v1/holidays/': 'Cadastrou feriado',
  'DELETE /api/v1/holidays/:id': 'Removeu feriado',
  'PATCH /api/v1/auth/me/preferences': 'Alterou preferências',
  'POST /api/v1/public/stores/:slug/service-orders/:number/approve': 'Cliente aprovou o orçamento',
  'POST /api/v1/super/tenants': 'Criou assinante',
  'PUT /api/v1/super/tenants/:id': 'Alterou assinante',
};
const actionOf = (log) => ACTIONS[`${log.method} ${log.route}`] || ACTIONS[`${log.method} ${log.route}/`] || `${log.method} ${log.path}`;

// Auditoria: quem fez o quê e quando. global = todas as assistências (superadmin)
export default function Audit({ global = false }) {
  const toast = useToast();
  const [logs, setLogs] = useState(null);
  const [q, setQ] = useState('');
  const [hidePrefs, setHidePrefs] = useState(true);

  useEffect(() => {
    api.get(global ? '/super/audit' : '/tenant/audit', { params: { limit: 500 } }).then((r) => setLogs(r.data)).catch((e) => toast.error(errMsg(e)));
  }, [global]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (logs || []).filter((l) => (!hidePrefs || !l.route?.includes('preferences')) && (!term || `${l.user_name} ${actionOf(l)} ${l.tenant?.name || ''}`.toLowerCase().includes(term)));
  }, [logs, q, hidePrefs]);

  if (!logs) return <Spinner />;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Auditoria" subtitle={global ? 'Alterações feitas em todas as assistências.' : 'Tudo o que foi alterado na assistência: quem fez, o quê e quando.'} />
      <Card
        title={<span className="flex items-center gap-2"><History size={16} /> Últimas {logs.length} alterações</span>}
        right={
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500"><input type="checkbox" checked={hidePrefs} onChange={(e) => setHidePrefs(e.target.checked)} /> Ocultar preferências</label>
            <SearchInput value={q} onChange={setQ} placeholder="Pessoa ou ação…" className="w-56" />
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Quando</th>
                {global && <th className="py-2 pr-3">Assistência</th>}
                <th className="py-2 pr-3">Quem</th>
                <th className="py-2 pr-3">O quê</th>
                <th className="py-2">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((l) => (
                <tr key={l._id || l.id} className="align-top">
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{dt(l.created_at)}</td>
                  {global && <td className="py-2 pr-3">{l.tenant?.name || 'Plataforma'}</td>}
                  <td className="py-2 pr-3 font-medium text-slate-900">{l.user_name || '—'}</td>
                  <td className="py-2 pr-3">{actionOf(l)}</td>
                  <td className="py-2">
                    <details>
                      <summary className="cursor-pointer text-xs text-blue-700">{l.path}</summary>
                      <pre className={`${inputCls} mt-1 max-w-md overflow-x-auto whitespace-pre-wrap text-[11px]`}>{JSON.stringify(l.body, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="py-6 text-center text-sm text-slate-500">Nenhuma alteração encontrada.</p>}
        </div>
      </Card>
    </div>
  );
}
