import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from '../../components/icons';
import OrderDetails from '../../components/os/OrderDetails';

// Ficha completa da OS (senha do aparelho, histórico de status, documentos e retornos)
export default function ServiceOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/app/os/abertas'))} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
        <ArrowLeft size={16} /> Voltar
      </button>
      <OrderDetails key={id} id={id} onOpenOrder={(oid) => navigate(`/app/os/${oid}`)} />
      <p className="text-center text-xs text-slate-400">
        Procurando outra OS? <Link to="/app/os/abertas" className="font-semibold text-blue-700 hover:underline">Não entregues</Link> · <Link to="/app/os/entregues" className="font-semibold text-blue-700 hover:underline">Entregues</Link>
      </p>
    </div>
  );
}
