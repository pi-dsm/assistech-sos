import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSaleCommand as parse } from './saleVoice.js';

test('limpar, desconto e pagamento', () => {
  assert.deepEqual(parse('limpar carrinho'), { type: 'clear' });
  assert.deepEqual(parse('Desconto de 5 reais'), { type: 'discount', value: 5 });
  assert.deepEqual(parse('desconto dois reais e cinquenta centavos'), { type: 'discount', value: 2.5 });
  assert.deepEqual(parse('pagamento pix'), { type: 'payment', method: 'pix', installments: 1 });
  assert.deepEqual(parse('pagar no cartão de crédito em 3x'), { type: 'payment', method: 'credit_card', installments: 3 });
  assert.deepEqual(parse('pagamento crédito em três vezes'), { type: 'payment', method: 'credit_card', installments: 3 });
});

test('adicionar itens com quantidade falada', () => {
  assert.deepEqual(parse('adicionar dois cabos lightning'), { type: 'add', quantity: 2, service: false, term: 'cabos lightning' });
  assert.deepEqual(parse('adicionar cabo lightning'), { type: 'add', quantity: 1, service: false, term: 'cabo lightning' });
  assert.deepEqual(parse('adicionar 40 xerox'), { type: 'add', quantity: 40, service: false, term: 'xerox' });
  assert.deepEqual(parse('adicionar vinte e cinco unidades de caderno'), { type: 'add', quantity: 25, service: false, term: 'caderno' });
  assert.deepEqual(parse('adicionar serviço de formatação'), { type: 'add', quantity: 1, service: true, term: 'formatacao' });
});

test('cliente, código de barras e observação preservam o texto original', () => {
  assert.deepEqual(parse('cliente João Silva'), { type: 'customer', term: 'João Silva' });
  assert.deepEqual(parse('código de barras 7 8 9 1 0 0'), { type: 'barcode', code: '789100' });
  assert.deepEqual(parse('observação Cliente retira amanhã'), { type: 'notes', text: 'Cliente retira amanhã' });
});

test('não existe comando de finalizar venda (segurança)', () => {
  assert.equal(parse('finalizar venda'), null);
  assert.equal(parse('conversa qualquer'), null);
});