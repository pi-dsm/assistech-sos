// Converte números falados em português ("vinte e cinco", "mil e quinhentos") e valores em reais.
// O Chrome costuma devolver algarismos ("25"), mas por extenso também acontece; tratamos os dois.

const UNITS = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15,
  dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
};
const TENS = { vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90 };
const HUNDREDS = {
  cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400,
  quatrocentas: 400, quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600, setecentos: 700,
  setecentas: 700, oitocentos: 800, oitocentas: 800, novecentos: 900, novecentas: 900,
};
const DIGIT_WORDS = { zero: '0', um: '1', uma: '1', dois: '2', duas: '2', tres: '3', quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9' };
const FILLER = /^(unidades?|dias?|uteis|util|pecas?|reais?\.?)$/;

// Remove acentos preservando o tamanho do texto (1 caractere -> 1 caractere).
export const stripAccents = (s) => [...String(s)].map((ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).join('');
const norm = (s) => stripAccents(s).toLowerCase();

function wordsToInt(tokens) {
  let total = 0;
  let current = 0;
  let seen = false;
  for (const t of tokens) {
    if (t === 'e') continue;
    if (/^\d+$/.test(t)) current += Number(t);
    else if (t in UNITS) current += UNITS[t];
    else if (t in TENS) current += TENS[t];
    else if (t in HUNDREDS) current += HUNDREDS[t];
    else if (t === 'mil') {
      total += (current || 1) * 1000;
      current = 0;
    } else return null;
    seen = true;
  }
  return seen ? total + current : null;
}

const numberFrom = (tokens) => {
  if (tokens.length === 1 && /^\d+(\.\d+)?$/.test(tokens[0])) return Number(tokens[0]);
  return wordsToInt(tokens);
};

const tokensOf = (text) => norm(text).replace(/r\$/g, ' ').replace(/(\d),(\d)/g, '$1.$2').split(/\s+/).filter(Boolean);

// "dez" | "10" | "vinte e cinco unidades" -> número inteiro (ou null)
export function parseInteger(text) {
  const n = numberFrom(tokensOf(text).filter((t) => !FILLER.test(t)));
  return n === null ? null : Math.round(n);
}

// "25 reais" | "12,50" | "doze vírgula cinquenta" | "vinte e cinco reais e cinquenta centavos" -> 25.5
export function parseMoney(text) {
  const tokens = tokensOf(text);
  const iVirg = tokens.indexOf('virgula');
  const iReal = tokens.findIndex((w) => /^reais?$/.test(w));
  const iCent = tokens.findIndex((w) => /^centavos?$/.test(w));

  if (iVirg > -1) {
    const int = numberFrom(tokens.slice(0, iVirg));
    const dec = numberFrom(tokens.slice(iVirg + 1).filter((t) => !FILLER.test(t)));
    return int === null || dec === null ? null : Number(`${int}.${dec}`);
  }
  if (iReal > -1) {
    const int = numberFrom(tokens.slice(0, iReal));
    if (int === null) return null;
    if (iCent > iReal) {
      const cents = numberFrom(tokens.slice(iReal + 1, iCent));
      return cents === null ? int : int + cents / 100;
    }
    return int;
  }
  if (iCent > -1) {
    const cents = numberFrom(tokens.slice(0, iCent));
    return cents === null ? null : cents / 100;
  }
  return numberFrom(tokens.filter((t) => !FILLER.test(t)));
}

// "7 8 9 1 0" | "sete oito nove" | "7891000" -> "78910"
export function parseDigits(text) {
  return tokensOf(text).map((t) => DIGIT_WORDS[t] ?? t).join('').replace(/\D/g, '');
}

// "joao arroba gmail ponto com" -> "joao@gmail.com"
export function parseEmail(text) {
  return norm(text).replace(/\s+arroba\s+/g, '@').replace(/\s+ponto\s+/g, '.').replace(/\s+/g, '');
}