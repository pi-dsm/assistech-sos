import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { brl, dt, METHODS, paymentLabel } from '../../utils/format';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, inputCls } from '../ui';

// Corpo detalhado de uma venda: itens, totais, pagamentos, recebimento de saldo e estorno.
// Usado no cartão expansível do histórico e no modal de detalhes.
export default function SalePanel({ sale, onChanged }) {
  const toast = useToast();
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const [pay, setPay] = useState({ amount: sale.balance_due > 0 ? sale.balance_due : '', payment_method: 'pix' });
  const [restock, setRestock] = useState(true);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [busy, setBusy] = useState(false);

  const act = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onChanged?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  const receive = () => act(() => api.post(`/sales/${sale.id}/payments`, { amount: Number(pay.amount), payment_method: pay.payment_method }), 'Pagamento registrado');
  const refund = () => {
    setConfirmRefund(false);
    act(() => api.patch(`/sales/${sale.id}/refund`, { restock }), 'Venda estornada');
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr><th className="px-3 py-1.5">Item</th><th className="px-3">Tipo</th><th className="px-3 text-right">Qtd.</th><th className="px-3 text-right">Valor un.</th><th className="px-3 text-right">Total</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items.map((i, idx) => (
              <tr key={idx}>
                <td className="px-3 py-1.5 font-medium">{i.name}</td>
                <td className="px-3">{i.item_type === 'product' ? 'Produto' : 'Serviço'}</td>
                <td className="px-3 text-right">{i.quantity}</td>
                <td className="px-3 text-right">{brl(i.unit_price)}</td>
                <td className="px-3 text-right font-semibold">{brl(i.unit_price * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
          <div className="flex justify-between"><span>Subtotal</span><span>{brl(sale.subtotal_amount)}</span></div>
          {sale.discount_amount > 0 && <div className="flex justify-between text-emerald-700"><span>Desconto</span><span>− {brl(sale.discount_amount)}</span></div>}
          <div className="flex justify-between border-t border-slate-100 pt-1 font-bold"><span>Valor total da venda</span><span>{brl(sale.grand_total_amount)}</span></div>
          {showCosts && (
            <>
              <div className="flex justify-between text-slate-500"><span>Valor total de custo</span><span>{brl(sale.cost_total_amount)}</span></div>
              <div className="flex justify-between font-bold text-emerald-700"><span>Lucro</span><span>{brl(sale.profit_amount)}</span></div>
            </>
          )}
          {sale.refunded_amount > 0 && <div className="flex justify-between text-red-600"><span>Estornado</span><span>{brl(sale.refunded_amount)}</span></div>}
        </div>
        <div className="space-y-1 rounded-lg bg-white p-3 text-sm ring-1 ring-slate-200">
          <p><span className="text-slate-500">Data e hora:</span> <b>{dt(sale.created_at)}</b></p>
          <p><span className="text-slate-500">Atendente:</span> <b>{sale.created_by?.name || '—'}</b></p>
          {sale.customer && <p><span className="text-slate-500">Cliente:</span> <b>{sale.customer.name}</b></p>}
          {sale.notes && <p><span className="text-slate-500">Observações:</span> {sale.notes}</p>}
          <p className="pt-1 text-xs font-bold uppercase tracking-wide text-slate-500">Pagamentos</p>
          {sale.payments.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhum pagamento.</p>
          ) : (
            <ul className="text-xs text-slate-600">
              {sale.payments.map((p) => (
                <li key={p.id} className="flex justify-between gap-2"><span>{paymentLabel(p)} · {dt(p.paid_at)}{p.payment_status === 'refunded' && ' (estorno)'}</span><b>{brl(p.amount)}</b></li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {sale.balance_due > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
          <b className="text-sm text-amber-900">A receber: {brl(sale.balance_due)}</b>
          <select className={`${inputCls} w-auto`} value={pay.payment_method} onChange={(e) => setPay((p) => ({ ...p, payment_method: e.target.value }))} aria-label="Forma de pagamento">
            {Object.entries(METHODS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input className={`${inputCls} w-28`} type="number" min="0" step="0.01" value={pay.amount} onChange={(e) => setPay((p) => ({ ...p, amount: e.target.value }))} aria-label="Valor" />
          <button className={`${btnPrimary} ${btnSm}`} onClick={receive} disabled={busy || !(Number(pay.amount) > 0)}>Registrar pagamento</button>
        </div>
      )}

      {can('sales.refund') && sale.paid_amount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Devolver produtos ao estoque</label>
          <button className={`${btnGhost} ${btnSm} text-red-600`} onClick={() => setConfirmRefund(true)} disabled={busy}><Undo2 size={14} /> Estornar venda</button>
        </div>
      )}

      {confirmRefund && (
        <ConfirmModal
          title="Estornar venda"
          message={`Estornar ${brl(sale.paid_amount)} da venda #${sale.sale_number}?${restock ? ' Os produtos voltam ao estoque.' : ''}`}
          confirmLabel="Estornar"
          danger
          busy={busy}
          onConfirm={refund}
          onClose={() => setConfirmRefund(false)}
        />
      )}
    </div>
  );
}
