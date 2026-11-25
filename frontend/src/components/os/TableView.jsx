import { Eye, Pencil } from 'lucide-react';
import { brl, dateOnly, dt, isOverdue, stayDuration } from '../../utils/format';
import StatusSelect from './StatusSelect';

export default function TableView({ orders, onOpen, onEdit, onStatusChange }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {['OS', 'Dispositivo', 'Cliente', 'Problema relatado', 'Entrada', 'Na loja há', 'Previsão', 'Total', 'Status', ''].map((h, i) => (
              <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr key={o.id} onClick={() => onOpen(o)} className="cursor-pointer hover:bg-blue-50/40">
              <td className="px-3 py-2.5 font-bold text-ink-900">#{o.service_order_number}</td>
              <td className="px-3 py-2.5">{o.device?.brand} {o.device?.model}</td>
              <td className="px-3 py-2.5">{o.customer?.name}</td>
              <td className="max-w-56 truncate px-3 py-2.5 text-slate-500" title={o.reported_issue}>{o.reported_issue}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{dt(o.created_at)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{stayDuration(o.created_at)}</td>
              <td className={`px-3 py-2.5 ${isOverdue(o) ? 'font-bold text-red-600' : 'text-slate-500'}`}>{dateOnly(o.estimated_delivery_at)}</td>
              <td className="px-3 py-2.5 font-semibold">{o.grand_total_amount > 0 ? brl(o.grand_total_amount) : '—'}</td>
              <td className="px-3 py-2.5"><StatusSelect order={o} onChange={onStatusChange} /></td>
              <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink-900" onClick={() => onOpen(o)} aria-label={`Detalhes da OS ${o.service_order_number}`} title="Detalhes"><Eye size={16} /></button>
                  {onEdit && <button type="button" className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-50" onClick={() => onEdit(o)} aria-label={`Editar OS ${o.service_order_number}`} title="Editar"><Pencil size={16} /></button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
