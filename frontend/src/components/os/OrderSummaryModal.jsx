import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ExternalLink, Pencil, ShieldAlert } from '../icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, dateOnly, dt, DEVICE_TYPES, OPEN_STATUSES, paymentLabel } from '../../utils/format';
import { btnGhost, btnPrimary, Modal, PaymentBadge, Spinner, StatusBadge } from '../ui';
import WhatsAppButton from './WhatsAppButton';

const Row = ({ label, children, strong, tone = '' }) => (
  <div className={`flex justify-between gap-3 py-1.5 text-sm ${strong ? 'font-bold text-slate-900' : ''} ${tone}`}>
    <span className={strong ? '' : 'text-slate-500'}>{label}</span>
    <span className="text-right">{children}</span>
  </div>
);

// Modal de detalhes "enxuto" da OS: prazos, manutenções, valores, pagamentos e lucro.
// A ficha completa (senha, histórico, documentos) continua em /app/os/:id.
export default function OrderSummaryModal({ id, onClose, onEdit }) {
  const toast = useToast();
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/service-orders/${id}`).then((r) => setOrder(r.data)).catch((e) => {
      toast.error(errMsg(e));
      onClose();
    });
  }, [id]);

  const open = order && OPEN_STATUSES.includes(order.status);

  return (
    <Modal title={order ? `OS #${order.service_order_number}` : 'Detalhes da OS'} onClose={onClose} size="lg">
      {!order ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{order.device?.brand} {order.device?.model} <span className="font-normal text-slate-500">· {DEVICE_TYPES[order.device?.device_type]}</span></p>
              <p className="text-sm text-slate-600">{order.customer?.name} · {order.customer?.phone}</p>
              <p className="mt-2 text-sm text-slate-700"><span className="text-slate-500">Problema relatado:</span> {order.reported_issue}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <StatusBadge status={order.status} />
              {order.is_warranty && <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-700"><ShieldAlert size={12} /> Garantia</span>}
              {order.return_kind === 'paid' && <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Retorno cobrado</span>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <CalendarClock className="text-blue-700" size={20} />
              <div><p className="text-xs font-semibold uppercase text-slate-500">Previsão de orçamento</p><p className="font-bold">{dateOnly(order.estimated_budget_at)}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <CalendarClock className="text-blue-700" size={20} />
              <div><p className="text-xs font-semibold uppercase text-slate-500">Previsão de entrega</p><p className="font-bold">{dateOnly(order.estimated_delivery_at)}</p></div>
            </div>
          </div>

          <section>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Manutenções</h4>
            {order.parts_used.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-500">
                {order.no_parts_used ? 'Conserto sem uso de peças.' : 'Nenhuma manutenção registrada ainda. As peças são informadas ao concluir o conserto.'}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[460px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr><th className="px-3 py-1.5">Peça / serviço</th><th className="px-3">Qtd.</th>{showCosts && <th className="px-3 text-right">Custo</th>}<th className="px-3 text-right">Venda</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.parts_used.map((p, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{p.part_name || p.description}<span className="block text-xs text-slate-400">{p.is_own_stock ? 'Estoque próprio' : p.supplier_name}</span></td>
                        <td className="px-3">{p.quantity}</td>
                        {showCosts && <td className="px-3 text-right">{brl(p.cost_price * p.quantity)}</td>}
                        <td className="px-3 text-right">{brl(p.sale_price * p.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-slate-200 p-3">
              <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Valores</h4>
              <Row label="Peças">{brl(order.parts_total_amount)}</Row>
              <Row label="Mão de obra">{brl(order.labor_amount)}</Row>
              <Row label="Desconto (opcional)" tone={order.discount_amount > 0 ? 'text-emerald-700' : ''}>{order.discount_amount > 0 ? `− ${brl(order.discount_amount)}` : '—'}</Row>
              {showCosts && <Row label="Valor total de custo">{brl(order.cost_total_amount)}</Row>}
              <div className="border-t border-slate-100" />
              <Row label="Valor total de venda" strong>{order.is_warranty ? 'Garantia (sem cobrança)' : brl(order.grand_total_amount)}</Row>
              {showCosts && order.return_loss_amount > 0 && (
                <Row label={`Perda no retorno (${order.return_loss_reason || 'não informado'})`} tone="text-red-600">− {brl(order.return_loss_amount)}</Row>
              )}
              {showCosts ? (
                <Row label={order.is_warranty ? 'Prejuízo de garantia' : 'Lucro'} strong tone={order.profit_amount < 0 ? 'text-red-600' : 'text-emerald-700'}>
                  {brl(order.is_warranty ? -order.warranty_loss_amount : order.profit_amount)}
                </Row>
              ) : (
                <p className="pt-1 text-xs text-slate-400">Custo e lucro visíveis apenas para quem tem permissão.</p>
              )}
            </section>

            <section className="rounded-xl border border-slate-200 p-3">
              <div className="mb-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Pagamentos</h4>
                <PaymentBadge state={order.payment_state} />
              </div>
              {order.payments.length === 0 ? (
                <p className="py-1.5 text-sm text-slate-500">Nenhum pagamento registrado.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {order.payments.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2 py-1.5 text-sm">
                      <span>{paymentLabel(p)} <span className="text-xs text-slate-400">· {dt(p.paid_at)}{p.payment_status === 'refunded' ? ' (estorno)' : ''}</span></span>
                      <b>{brl(p.amount)}</b>
                    </li>
                  ))}
                </ul>
              )}
              <Row label="Recebido">{brl(order.paid_amount)}</Row>
              {order.balance_due > 0 && <Row label="Saldo a receber" strong tone="text-amber-700">{brl(order.balance_due)}</Row>}
            </section>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <WhatsAppButton order={order} />
            <Link to={`/app/os/${order.id}`} className={btnGhost}><ExternalLink size={16} /> Ficha completa</Link>
            {open && onEdit && (
              <button className={btnPrimary} onClick={() => onEdit(order)}><Pencil size={16} /> Atualizar / editar OS</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
