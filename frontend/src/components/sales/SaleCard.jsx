import { ChevronDown } from '../icons';
import { useAuth } from '../../context/AuthContext';
import { brl, friendlyDateTime, salePaymentSummary, saleStatus } from '../../utils/format';
import SalePanel from './SalePanel';

export default function SaleCard({ sale, expanded, onToggle, onChanged }) {
  const { can } = useAuth();
  const showCosts = can('costs.view');
  const status = saleStatus(sale);
  const itemsCount = sale.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left hover:bg-slate-50">
        <div className="min-w-28">
          <p className="text-lg font-extrabold text-slate-900">#{sale.sale_number}</p>
          <p className="font-mono text-xs text-slate-400">{sale.short_id}</p>
        </div>
        <div className="min-w-40 flex-1">
          <p className="font-semibold text-slate-800">{friendlyDateTime(sale.created_at)}</p>
          <p className="text-sm text-slate-500">{itemsCount} {itemsCount === 1 ? 'item' : 'itens'} · {salePaymentSummary(sale)}</p>
          <p className="truncate text-xs text-slate-400">{sale.items.map((i) => i.name).join(', ')}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${status.cls}`}>{status.label}</span>
        <div className="ml-auto text-right">
          <p className="text-xl font-extrabold text-slate-900">{brl(sale.grand_total_amount)}</p>
          {showCosts && <p className="text-sm font-bold text-emerald-700">Lucro {brl(sale.profit_amount)}</p>}
        </div>
        <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} size={22} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4">
          <SalePanel sale={sale} onChanged={onChanged} />
        </div>
      )}
    </article>
  );
}
