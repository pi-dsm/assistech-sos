import { MessageCircle } from '../icons';
import api, { errMsg } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { btnGhost } from '../ui';

// Aviso opcional ao cliente: copia a mensagem do status atual e abre o WhatsApp (se houver internet).
// Nada é enviado automaticamente.
export default function WhatsAppButton({ order, className = btnGhost }) {
  const toast = useToast();
  const notify = async () => {
    try {
      const { data } = await api.post(`/service-orders/${order.id || order._id}/notify-whatsapp`);
      navigator.clipboard?.writeText(data.message).catch(() => {});
      window.open(data.url, '_blank', 'noopener');
      toast.success('Mensagem copiada. Se o WhatsApp não abrir, cole a mensagem manualmente.');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };
  return (
    <button type="button" className={className} onClick={notify}>
      <MessageCircle size={16} /> Avisar no WhatsApp
    </button>
  );
}
