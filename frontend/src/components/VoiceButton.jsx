import { useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import useSpeechRecognition from '../hooks/useSpeechRecognition';
import { btnDanger, btnGhost, btnSm } from './ui';

// null = erro esperado, sem aviso (ex.: o usuário clicou em parar)
const ERRORS = {
  'not-allowed': 'Permissão do microfone negada. Libere o microfone nas configurações do navegador.',
  'service-not-allowed': 'O navegador bloqueou o reconhecimento de voz neste site.',
  'no-speech': 'Não ouvi nada. Fale mais perto do microfone e tente de novo.',
  'audio-capture': 'Nenhum microfone encontrado.',
  network: 'Sem conexão: o reconhecimento de voz precisa de internet.',
  aborted: null,
};

export default function VoiceButton({ onTranscript, label = 'Falar', className = '' }) {
  const toast = useToast();
  const { supported, listening, interim, start, stop } = useSpeechRecognition();
  const handler = useRef(onTranscript);
  handler.current = onTranscript; // sempre a versão mais recente (evita estado "velho" no callback)

  if (!supported) {
    return (
      <button type="button" disabled title="Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari." className={`${btnGhost} ${btnSm} ${className}`}>
        <MicOff size={14} /> Voz indisponível
      </button>
    );
  }

  const toggle = () => {
    if (listening) return stop();
    return start(
      (text) => handler.current(text),
      (code) => {
        const message = ERRORS[code];
        if (message) toast.error(message);
        else if (message === undefined) toast.error('Erro no reconhecimento de voz. Tente novamente.');
      }
    );
  };

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={toggle} aria-pressed={listening} className={`${listening ? btnDanger : btnGhost} ${btnSm} ${className}`}>
        <Mic size={14} className={listening ? 'animate-pulse' : ''} /> {listening ? 'Ouvindo… (toque para parar)' : label}
      </button>
      {listening && interim && <span className="max-w-xs rounded bg-slate-100 px-2 py-1 text-xs italic text-slate-600">“{interim}”</span>}
    </span>
  );
}