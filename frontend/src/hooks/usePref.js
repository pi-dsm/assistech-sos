import { useState } from 'react';
import { readPref, writePref } from '../components/ui';

// Estado de preferência de tela (ex.: visualização escolhida), lembrado neste navegador.
export default function usePref(key, fallback) {
  const [value, setValue] = useState(() => readPref(key, fallback));
  const set = (next) => {
    setValue(next);
    writePref(key, next);
  };
  return [value, set];
}
