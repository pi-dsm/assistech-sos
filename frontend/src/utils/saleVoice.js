import { parseInteger, parseMoney, stripAccents } from './spokenNumbers.js';

const norm = (s) => stripAccents(s).toLowerCase().trim();
const METHODS = { pix: 'pix', dinheiro: 'cash', debito: 'debit_card', credito: 'credit_card' };
const isNumberToken = (t) => t !== 'e' && parseInteger(t) !== null;

// Separa a quantidade falada no começo: "dois cabos" -> { quantity: 2, rest: 'cabos' }; "vinte e cinco x" também.
function splitQuantity(rest) {
  const tokens = rest.split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < tokens.length && (isNumberToken(tokens[i]) || (tokens[i] === 'e' && i > 0 && tokens[i + 1] && isNumberToken(tokens[i + 1])))) i += 1;
  const quantity = i > 0 ? parseInteger(tokens.slice(0, i).join(' ')) : null;
  const remaining = tokens.slice(i).filter((t, idx) => !(idx === 0 && /^(x|un|unidades?)$/.test(t)));
  if (remaining[0] === 'de') remaining.shift();
  return { quantity: quantity || 1, rest: remaining.join(' ') };
}

// Interpreta um comando falado do PDV. Retorna { type, ... } ou null se não entendeu.
// Por segurança NÃO existe comando de finalizar venda: o atendente confere e clica no botão.
export function parseSaleCommand(transcript) {
  const original = String(transcript || '').trim();
  const text = norm(original).replace(/[.,;!?]+$/g, '');
  let m;

  if (/^(limpar|esvaziar|zerar)( o)?( carrinho)?$/.test(text)) return { type: 'clear' };

  if ((m = text.match(/^desconto(?: de| do| da)? (.+)$/))) {
    const value = parseMoney(m[1]);
    return value === null ? null : { type: 'discount', value };
  }

  if ((m = text.match(/^(?:pagamento|pagar|pago|forma de pagamento)\b.*?\b(pix|dinheiro|debito|credito)\b(.*)$/))) {
    const inst = m[2].match(/(\S+)\s*(?:x|vezes)\b/);
    const installments = inst ? parseInteger(inst[1]) : null;
    return { type: 'payment', method: METHODS[m[1]], installments: installments && m[1] === 'credito' ? Math.min(installments, 12) : 1 };
  }

  // Para cliente e observação usamos o texto ORIGINAL (com acentos), pois a busca na API diferencia acentos.
  if (/^cliente\s+\S/.test(text)) return { type: 'customer', term: original.replace(/^\s*cliente\s+/i, '').replace(/[.,;!?]+$/g, '') };

  if (/^(?:observacao|observacoes|nota)\s+\S/.test(text)) {
    return { type: 'notes', text: original.replace(/^\s*(?:observa[çc][ãa]o|observa[çc][õo]es|nota)\s+/i, '') };
  }

  if ((m = text.match(/^codigo(?: de barras)? (.+)$/))) {
    const digits = m[1].split(/\s+/).join('');
    return { type: 'barcode', code: digits.replace(/[^\w-]/g, '') };
  }

  if ((m = text.match(/^(?:adicionar|adicione|incluir|inclua|colocar|coloque|vender|venda|inserir|insira)\s+(.+)$/))) {
    const { quantity, rest } = splitQuantity(m[1]);
    const service = /^servico\b/.test(rest);
    const term = rest.replace(/^servico\s*(de |do |da )?/, '').trim();
    return term ? { type: 'add', quantity, service, term } : null;
  }
  return null;
}