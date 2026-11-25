import { useToast } from '../context/ToastContext';
import { parseVoiceFields } from '../utils/voiceFields';
import VoiceButton from './VoiceButton';

// Fala -> campos do formulário. schema/example vêm de utils/voiceSchemas.js
export default function VoiceFill({ schema, example, onFill, label = 'Preencher por voz' }) {
  const toast = useToast();

  const handle = (transcript) => {
    const { values, matched } = parseVoiceFields(transcript, schema);
    if (matched.length === 0) {
      toast.error(`Não entendi “${transcript}”. Exemplo: ${example}`);
      return;
    }
    onFill(values);
    toast.success(`Preenchido por voz: ${matched.join(', ')}`);
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-blue-50 p-3 ring-1 ring-blue-200">
      <VoiceButton label={label} onTranscript={handle} />
      <p className="min-w-48 flex-1 text-xs text-blue-900">Diga, por exemplo: <i>{example}</i></p>
    </div>
  );
}