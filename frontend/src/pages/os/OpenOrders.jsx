import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Columns3, LayoutGrid, List, PlusCircle } from 'lucide-react';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useStatusFlow from '../../hooks/useStatusFlow';
import { DEVICE_TYPES, isOverdue, OPEN_STATUSES, STATUS } from '../../utils/format';
import { btnPrimary, EmptyState, inputCls, PageHeader, SearchInput, Segmented, Spinner, Toolbar } from '../../components/ui';
import KanbanView from '../../components/os/KanbanView';
import WorkspaceView from '../../components/os/WorkspaceView';
import TableView from '../../components/os/TableView';
import OrderSummaryModal from '../../components/os/OrderSummaryModal';
import OrderEditModal from '../../components/os/OrderEditModal';

const VIEWS = [
  { key: 'kanban', label: 'Kanban', icon: Columns3 },
  { key: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { key: 'table', label: 'Tabela', icon: List },
];
const SORTS = [
  ['oldest', 'Mais antigas primeiro'],
  ['newest', 'Mais recentes primeiro'],
  ['updated', 'Atualizadas por último'],
];

export default function OpenOrders() {
  const toast = useToast();
  const { user, updatePreferences } = useAuth();
  const view = user?.preferences?.orders_view || 'kanban';
  const savedOrder = user?.preferences?.workspace_order || [];

  const [orders, setOrders] = useState([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('oldest');
  const [onlyLate, setOnlyLate] = useState(false);
  const [deviceType, setDeviceType] = useState('');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/service-orders', { params: { scope: 'open', q: q || undefined, sort, limit: 500 } });
      setOrders(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, sort]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const flow = useStatusFlow(load);

  // Filtros locais (o status não se aplica ao Kanban, que já separa por coluna)
  const filtered = useMemo(
    () =>
      orders.filter(
        (o) =>
          (view === 'kanban' || !status || o.status === status) &&
          (!onlyLate || isOverdue(o)) &&
          (!deviceType || o.device?.device_type === deviceType)
      ),
    [orders, status, onlyLate, deviceType, view]
  );
  const lateCount = orders.filter(isOverdue).length;

  const handleReorder = (ids) => {
    const rest = savedOrder.filter((id) => !ids.includes(id));
    updatePreferences({ workspace_order: [...ids, ...rest] });
  };

  const shared = { orders: filtered, onOpen: (o) => setOpenId(o.id), onEdit: (o) => setEditId(o.id), onStatusChange: flow.request };

  return (
    <div className="mx-auto max-w-[1600px] space-y-4">
      <PageHeader title="OSs não entregues" subtitle={`${orders.length} aparelho(s) na loja${lateCount ? ` · ${lateCount} com entrega atrasada` : ''}. Arraste os cartões ou use o seletor para mudar o status.`}>
        <Segmented options={VIEWS} value={view} onChange={(key) => updatePreferences({ orders_view: key })} label="Visualização" />
        <Link to="/app/os/nova" className={btnPrimary}><PlusCircle size={18} /> Nova OS</Link>
      </PageHeader>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nº da OS, cliente, telefone, marca, modelo ou IMEI…" />
        <select className={`${inputCls} w-auto`} value={deviceType} onChange={(e) => setDeviceType(e.target.value)} aria-label="Tipo de dispositivo">
          <option value="">Todos os dispositivos</option>
          {Object.entries(DEVICE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={`${inputCls} w-auto`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenação">
          {SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={onlyLate} onChange={(e) => setOnlyLate(e.target.checked)} /> Só atrasadas
        </label>
      </Toolbar>

      {view !== 'kanban' && (
        <div className="flex flex-wrap gap-2">
          {[['', 'Todos os status'], ...OPEN_STATUSES.map((k) => [k, STATUS[k].label])].map(([k, label]) => (
            <button key={k} onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-sm font-semibold transition ${status === k ? 'bg-blue-700 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
              {label} <span className="opacity-70">{k ? orders.filter((o) => o.status === k).length : orders.length}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState>{orders.length ? 'Nenhuma OS corresponde aos filtros.' : 'Nenhuma OS pendente na loja.'}</EmptyState>
      ) : view === 'kanban' ? (
        <KanbanView {...shared} />
      ) : view === 'workspace' ? (
        <WorkspaceView {...shared} savedOrder={savedOrder} onReorder={handleReorder} />
      ) : (
        <TableView {...shared} />
      )}

      {openId && (
        <OrderSummaryModal
          id={openId}
          onClose={() => setOpenId(null)}
          onEdit={(o) => {
            setOpenId(null);
            setEditId(o.id);
          }}
        />
      )}
      {editId && <OrderEditModal id={editId} onClose={() => setEditId(null)} onChanged={load} />}
      {flow.modals}
    </div>
  );
}
