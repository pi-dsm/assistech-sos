import { parseDigits, parseEmail, parseInteger, parseMoney, stripAccents } from './spokenNumbers.js';

const SMALL_WORDS = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
const UF_BY_NAME = {
  acre: 'AC', alagoas: 'AL', amapa: 'AP', amazonas: 'AM', bahia: 'BA', ceara: 'CE', 'distrito federal': 'DF', 'espirito santo': 'ES',
  goias: 'GO', maranhao: 'MA', 'mato grosso do sul': 'MS', 'mato grosso': 'MT', 'minas gerais': 'MG', para: 'PA', paraiba: 'PB',
  parana: 'PR', pernambuco: 'PE', piaui: 'PI', 'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  rondonia: 'RO', roraima: 'RR', 'santa catarina': 'SC', 'sao paulo': 'SP', sergipe: 'SE', tocantins: 'TO',
};

const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sentence = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const titleCase = (s) =>
  s.split(/\s+/).map((w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : sentence(w))).join(' ');

export function formatBrPhone(digits) {
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return digits;
}
export function formatBrDocument(digits) {
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return digits;
}

function convert(raw, field) {
  const plain = stripAccents(raw).toLowerCase();
  switch (field.type) {
    case 'money': {
      const v = parseMoney(raw);
      return v === null ? undefined : v;
    }
    case 'integer': {
      const v = parseInteger(raw);
      return v === null ? undefined : v;
    }
    case 'digits':
      return parseDigits(raw) || undefined;
    case 'phone': {
      const d = parseDigits(raw);
      return d ? formatBrPhone(d) : undefined;
    }
    case 'document': {
      const d = parseDigits(raw);
      return d ? formatBrDocument(d) : undefined;
    }
    case 'email':
      return parseEmail(raw) || undefined;
    case 'uf': {
      const byName = Object.entries(UF_BY_NAME).find(([name]) => plain.includes(name));
      if (byName) return byName[1];
      const letters = plain.replace(/[^a-z]/g, '').toUpperCase();
      return letters.length === 2 ? letters : undefined;
    }
    case 'enum': {
      const hit = Object.entries(field.options).find(([, words]) => words.some((w) => plain.includes(w)));
      return hit ? hit[0] : undefined;
    }
    case 'name':
      return titleCase(raw);
    default:
      return sentence(raw); // 'text'
  }
}

// Interpreta uma frase como "nome película três D preço vinte e cinco reais estoque dez".
// schema: [{ key, label, type, words: [palavras-chave], options? }]
// Retorna { values: { key: valor }, matched: ['rótulos preenchidos'] }
export function parseVoiceFields(transcript, schema) {
  const original = String(transcript || '').normalize('NFC');
  const plain = stripAccents(original).toLowerCase(); // mesmo tamanho do original

  const hits = [];
  schema.forEach((field) =>
    field.words.forEach((word) => {
      const w = stripAccents(word).toLowerCase();
      const rx = new RegExp(`(^|\\s)(${escapeRx(w)})(?=\\s|$|[,.:])`, 'g');
      let m = rx.exec(plain);
      while (m) {
        const start = m.index + m[1].length;
        hits.push({ field, start, end: start + w.length });
        m = rx.exec(plain);
      }
    })
  );

  // Em caso de sobreposição ("telefone alternativo" x "telefone"), vence a palavra-chave mais longa.
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const picked = [];
  let lastEnd = -1;
  hits.forEach((h) => {
    if (h.start >= lastEnd) {
      picked.push(h);
      lastEnd = h.end;
    }
  });

  const values = {};
  const matched = [];
  picked.forEach((h, i) => {
    const next = picked[i + 1];
    const raw = original
      .slice(h.end, next ? next.start : undefined)
      .trim()
      .replace(/^(?:(?:é|e|de|do|da|igual a|igual|foi|:|=)\s+)+/i, '') // "preço é 25", "nome: x"
      .replace(/(?:\s+e|[,.;:])+$/i, '') // "película e" / "película,"
      .trim();
    if (!raw) return;
    const value = convert(raw, h.field);
    if (value === undefined || value === null || value === '') return;
    values[h.field.key] = value;
    matched.push(h.field.label);
  });
  return { values, matched };
}