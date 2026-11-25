import { CalendarClock, Eye, Pencil, ShieldAlert } from '../icons';
import { brl, dateOnly, DEVICE_TYPES, isOverdue } from '../../utils/format';
import StatusSelect from './StatusSelect';

// Botões dentro de cartões arrastáveis não podem iniciar o arraste nem abrir o cartão
const stop = (e) => e.stopPropagation();

export default function OrderCard({ order, onOpen, onEdit, onStatusChange, className = '' }) {
  const overdue = isOverdue(order);
  return (
    <div
      onClick={() => onOpen?.(order)}
      className={`rounded-xl border bg-white p-3.5 shadow-card transition hover:shadow-pop ${overdue ? 'border-red-300' : 'border-slate-200'} ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-base font-extrabold text-slate-900">#{order.service_order_number}</span>
        <StatusSelect order={order} onChange={onStatusChange} />
      </div>
      {order.is_warranty && (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700">
          <ShieldAlert size={12} /> Garantia
        </span>
      )}
      <p className="truncate text-sm font-semibold text-slate-800">
        {order.device?.brand} {order.device?.model}
        <span className="font-normal text-slate-400"> · {DEVICE_TYPES[order.device?.device_type]}</span>
      </p>
      <p className="truncate text-sm text-slate-600">{order.customer?.name}</p>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{order.reported_issue}</p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className={`flex items-center gap-1 ${overdue ? 'font-bold text-red-600' : 'text-slate-500'}`}>
          <CalendarClock size={13} /> {dateOnly(order.estimated_delivery_at)}
          {overdue && ' · atrasada'}
        </span>
        <span className="font-bold text-blue-700">{order.grand_total_amount > 0 ? brl(order.grand_total_amount) : ''}</span>
      </div>
      {onEdit && (
        <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2.5" onPointerDown={stop} onClick={stop}>
          <button type="button" onClick={() => onOpen?.(order)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
            <Eye size={14} /> Detalhes
          </button>
          <button type="button" onClick={() => onEdit(order)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100">
            <Pencil size={14} /> Editar
          </button>
        </div>
      )}
    </div>
  );
}
