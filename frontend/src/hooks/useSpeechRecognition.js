import { useCallback, useEffect, useRef, useState } from 'react';

const getCtor = () => (typeof window === 'undefined' ? null : window.SpeechRecognition || window.webkitSpeechRecognition || null);

// Envolve a Web Speech API. Uma frase por vez (continuous = false): fala, pausa, resultado.
export default function useSpeechRecognition() {
  const Ctor = getCtor();
  const recognition = useRef(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState(''); // texto parcial enquanto a pessoa fala

  const start = useCallback(
    (onFinal, onError) => {
      if (!Ctor) return;
      recognition.current?.abort();
      const rec = new Ctor();
      rec.lang = 'pt-BR';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;

      rec.onstart = () => setListening(true);
      rec.onresult = (event) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) finalText += result[0].transcript;
          else interimText += result[0].transcript;
        }
        setInterim(interimText);
        if (finalText.trim()) onFinal(finalText.trim());
      };
      rec.onerror = (event) => {
        setListening(false);
        onError?.(event.error);
      };
      rec.onend = () => {
        setListening(false);
        setInterim('');
      };

      recognition.current = rec;
      try {
        rec.start();
      } catch {
        /* já estava ouvindo */
      }
    },
    [Ctor]
  );

  const stop = useCallback(() => recognition.current?.stop(), []);
  useEffect(() => () => recognition.current?.abort(), []);

  return { supported: !!Ctor, listening, interim, start, stop };
}