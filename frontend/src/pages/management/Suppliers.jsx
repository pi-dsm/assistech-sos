import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, LayoutGrid, List, Mail, MapPin, Pencil, Phone, Plus, Power } from '../../components/icons';
import api, { errMsg } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import usePref from '../../hooks/usePref';
import { brl, dt, formatDocument } from '../../utils/format';
import { PRODUCT_KINDS, productKind } from '../../utils/catalog';
import { btnGhost, btnPrimary, btnSm, ConfirmModal, EmptyState, Info, Modal, PageHeader, Pill, SearchInput, Segmented, Spinner, Toolbar } from '../../components/ui';
import SupplierFormModal from '../../components/SupplierFormModal';

const VIEWS = [
  { key: 'cards', label: 'Cards', icon: LayoutGrid },
  { key: 'table', label: 'Tabela', icon: List },
];
const STATUS_FILTERS = [
  { key: 'active', label: 'Ativos' },
  { key: 'inactive', label: 'Inativos' },
  { key: 'all', label: 'Todos' },
];
const ActivePill = ({ s }) => (
  <Pill cls={s.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}>{s.is_active ? 'Ativo' : 'Inativo'}</Pill>
);

function SupplierDetails({ supplier, canEdit, onClose, onEdit }) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    api
      .get('/products', { params: { limit: 500 } })
      .then((r) => setProducts(r.data.filter((p) => String(p.supplier?.id || p.supplier?._id || '') === String(supplier.id))))
      .catch(() => setProducts([]));
  }, [supplier.id]);

  return (
    <Modal title={supplier.name} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Info label="CNPJ / CPF" value={formatDocument(supplier.document)} />
        <Info label="Pessoa de contato" value={supplier.contact_name} />
        <Info label="Telefone / WhatsApp" value={supplier.phone} />
        <Info label="E-mail" value={supplier.email} />
        <div className="col-span-2"><Info label="Endereço" value={[supplier.address, supplier.city, supplier.state].filter(Boolean).join(' · ')} /></div>
        <div className="col-span-2"><Info label="Observações" value={supplier.notes} /></div>
        <div><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Situação</p><ActivePill s={supplier} /></div>
        <Info label="Atualizado em" value={dt(supplier.updated_at)} />
      </div>
      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Itens do estoque com este fornecedor</p>
        {!products ? (
          <Spinner />
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum produto vinculado.</p>
        ) : (
          <ul className="max-h-48 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 px-3 py-1.5">
                <span>{p.name} <span className="text-xs text-slate-400">· {PRODUCT_KINDS[productKind(p)].singular}</span></span>
                <span className="text-slate-500">{p.stock_quantity} un. · custo {brl(p.cost_price)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {canEdit && (
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
          <button className={btnPrimary} onClick={() => onEdit(supplier)}><Pencil size={16} /> Editar</button>
        </div>
      )}
    </Modal>
  );
}

export default function Suppliers() {
  const toast = useToast();
  const { can } = useAuth();
  const canEdit = can('suppliers.edit');
  const [params, setParams] = useSearchParams();
  const [view, setView] = usePref('suppliers_view', 'cards');

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [details, setDetails] = useState(null);
  const [form, setForm] = useState(null); // null = fechado | {} = novo | fornecedor = edição
  const [toggling, setToggling] = useState(null);

  // Atalho: ?novo=1 abre o cadastro direto
  useEffect(() => {
    if (params.get('novo') === '1' && canEdit) {
      setForm({});
      setParams({}, { replace: true });
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/suppliers', { params: { q: q || undefined, status, limit: 500 } });
      setItems(data);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const toggle = async () => {
    try {
      await api.patch(`/suppliers/${toggling.id}/status`, { is_active: !toggling.is_active });
      toast.success(toggling.is_active ? 'Fornecedor inativado' : 'Fornecedor reativado');
      setToggling(null);
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  const edit = (s) => {
    setDetails(null);
    setForm(s);
  };

  const actions = (s) => (
    <>
      <button className={`${btnGhost} ${btnSm}`} onClick={() => setDetails(s)}><Eye size={14} /> Detalhes</button>
      {canEdit && <button className={`${btnGhost} ${btnSm}`} onClick={() => edit(s)}><Pencil size={14} /> Editar</button>}
      {canEdit && <button className={`${btnGhost} ${btnSm}`} onClick={() => setToggling(s)} title={s.is_active ? 'Inativar' : 'Reativar'} aria-label={s.is_active ? 'Inativar' : 'Reativar'}><Power size={14} /></button>}
    </>
  );

  return (
    <div className="mx-auto max-w-[1300px] space-y-4">
      <PageHeader title="Fornecedores" subtitle="Todos os fornecedores cadastrados, vinculados aos produtos e às peças usadas nas OSs.">
        <Segmented options={VIEWS} value={view} onChange={setView} label="Visualização" />
        {canEdit && <button className={btnPrimary} onClick={() => setForm({})}><Plus size={18} /> Adicionar fornecedor</button>}
      </PageHeader>

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Nome, CNPJ/CPF, contato, cidade ou telefone…" />
        <Segmented options={STATUS_FILTERS} value={status} onChange={setStatus} label="Situação" size="sm" />
      </Toolbar>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState>Nenhum fornecedor encontrado.</EmptyState>
      ) : view === 'cards' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <article key={s.id} className={`flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:shadow-pop ${s.is_active ? '' : 'opacity-70'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800">{s.name}</p>
                  <p className="font-mono text-xs text-slate-400">{formatDocument(s.document) || 'sem documento'}</p>
                </div>
                <ActivePill s={s} />
              </div>
              <ul className="mb-3 mt-3 space-y-1 text-sm text-slate-600">
                {s.contact_name && <li>{s.contact_name}</li>}
                {s.phone && <li className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {s.phone}</li>}
                {s.email && <li className="flex items-center gap-1.5 truncate"><Mail size={13} className="text-slate-400" /> {s.email}</li>}
                {(s.city || s.state) && <li className="flex items-center gap-1.5"><MapPin size={13} className="text-slate-400" /> {[s.city, s.state].filter(Boolean).join('/')}</li>}
              </ul>
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">{actions(s)}</div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{['Fornecedor', 'CNPJ/CPF', 'Contato', 'Telefone', 'Cidade/UF', 'Situação', ''].map((h, i) => <th key={i} className="px-3 py-2.5 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((s) => (
                <tr key={s.id} className={s.is_active ? 'hover:bg-blue-50/30' : 'bg-slate-50 text-slate-400'}>
                  <td className="px-3 py-2.5 font-semibold">{s.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{formatDocument(s.document) || '—'}</td>
                  <td className="px-3 py-2.5">{s.contact_name || '—'}</td>
                  <td className="px-3 py-2.5">{s.phone || '—'}</td>
                  <td className="px-3 py-2.5">{[s.city, s.state].filter(Boolean).join('/') || '—'}</td>
                  <td className="px-3 py-2.5"><ActivePill s={s} /></td>
                  <td className="px-3 py-2.5"><div className="flex justify-end gap-1.5">{actions(s)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && <SupplierDetails supplier={details} canEdit={canEdit} onClose={() => setDetails(null)} onEdit={edit} />}

      {form && (
        <SupplierFormModal
          supplier={form.id ? form : undefined}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            load();
          }}
        />
      )}

      {toggling && (
        <ConfirmModal
          title={toggling.is_active ? 'Inativar fornecedor' : 'Reativar fornecedor'}
          message={toggling.is_active ? `Inativar "${toggling.name}"? Ele deixa de aparecer nas listas de seleção, mas o histórico é preservado.` : `Reativar "${toggling.name}"?`}
          confirmLabel={toggling.is_active ? 'Inativar' : 'Reativar'}
          danger={toggling.is_active}
          onConfirm={toggle}
          onClose={() => setToggling(null)}
        />
      )}
    </div>
  );
}
