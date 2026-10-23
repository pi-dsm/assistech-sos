import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDigits, parseEmail, parseInteger, parseMoney } from './spokenNumbers.js';
import { parseVoiceFields } from './voiceFields.js';

test('números falados por extenso e em algarismos', () => {
  assert.equal(parseInteger('dez'), 10);
  assert.equal(parseInteger('vinte e cinco unidades'), 25);
  assert.equal(parseInteger('cento e vinte'), 120);
  assert.equal(parseInteger('mil e quinhentos'), 1500);
  assert.equal(parseInteger('dois mil'), 2000);
  assert.equal(parseInteger('7'), 7);
  assert.equal(parseInteger('banana'), null);
});

test('valores em reais', () => {
  assert.equal(parseMoney('25 reais'), 25);
  assert.equal(parseMoney('R$ 12,50'), 12.5);
  assert.equal(parseMoney('doze vírgula cinquenta'), 12.5);
  assert.equal(parseMoney('vinte e cinco reais e cinquenta centavos'), 25.5);
  assert.equal(parseMoney('cinquenta centavos'), 0.5);
  assert.equal(parseMoney('trinta e cinco'), 35);
  assert.equal(parseMoney('2 reais e 30 centavos'), 2.3);
});

test('dígitos e e-mail ditados', () => {
  assert.equal(parseDigits('7 8 9 1 0'), '78910');
  assert.equal(parseDigits('sete oito nove'), '789');
  assert.equal(parseEmail('joão arroba gmail ponto com'), 'joao@gmail.com');
});

const product = [
  { key: 'name', label: 'nome', type: 'text', words: ['nome do produto', 'nome', 'produto'] },
  { key: 'barcode', label: 'código de barras', type: 'digits', words: ['código de barras', 'codigo', 'barras'] },
  { key: 'category', label: 'categoria', type: 'enum', words: ['categoria'], options: { screen_protector: ['pelicula'], keyboard: ['teclado'], accessory: ['acessorio'] } },
  { key: 'cost_price', label: 'custo', type: 'money', words: ['custo', 'compra'] },
  { key: 'sale_price', label: 'preço', type: 'money', words: ['preço', 'preco', 'venda'] },
  { key: 'stock_quantity', label: 'estoque', type: 'integer', words: ['estoque', 'quantidade'] },
  { key: 'min_stock', label: 'estoque mínimo', type: 'integer', words: ['estoque mínimo', 'mínimo'] },
];

test('preenche um produto a partir de uma frase', () => {
  const r = parseVoiceFields('nome película 3D código de barras 7 8 9 1 0 0 categoria película custo 5 reais preço vinte e cinco reais estoque dez estoque mínimo 3', product);
  assert.deepEqual(r.values, { name: 'Película 3D', barcode: '789100', category: 'screen_protector', cost_price: 5, sale_price: 25, stock_quantity: 10, min_stock: 3 });
  assert.equal(r.matched.length, 7);
});

test('ignora conectivos ("é", "e") e vírgulas; frase sem palavras-chave não preenche nada', () => {
  assert.deepEqual(parseVoiceFields('nome do produto Cabo USB-C, preço é 29,90 e estoque 12', product).values, { name: 'Cabo USB-C', sale_price: 29.9, stock_quantity: 12 });
  assert.deepEqual(parseVoiceFields('blá blá', product).values, {});
});

test('"telefone alternativo" vence "telefone"; nomes próprios em Title Case', () => {
  const order = [
    { key: 'customer_name', label: 'cliente', type: 'name', words: ['nome do cliente', 'cliente'] },
    { key: 'customer_phone', label: 'telefone', type: 'phone', words: ['telefone', 'celular'] },
    { key: 'customer_alt_phone', label: 'telefone alternativo', type: 'phone', words: ['telefone alternativo', 'outro telefone'] },
    { key: 'brand', label: 'marca', type: 'name', words: ['marca'] },
    { key: 'model', label: 'modelo', type: 'text', words: ['modelo'] },
    { key: 'reported_issue', label: 'problema', type: 'text', words: ['problema', 'defeito'] },
    { key: 'delivery_days', label: 'prazo de entrega', type: 'integer', words: ['prazo de entrega', 'entrega'] },
  ];
  const r = parseVoiceFields('cliente joão da silva telefone 14 99811 2233 telefone alternativo 14 3622 0000 marca samsung modelo A54 problema tela trincada prazo de entrega 5 dias', order);
  assert.deepEqual(r.values, {
    customer_name: 'João da Silva', customer_phone: '(14) 99811-2233', customer_alt_phone: '(14) 3622-0000',
    brand: 'Samsung', model: 'A54', reported_issue: 'Tela trincada', delivery_days: 5,
  });
});

test('estado por nome, CNPJ e e-mail ditados', () => {
  const sup = [
    { key: 'state', label: 'estado', type: 'uf', words: ['estado', 'uf'] },
    { key: 'document', label: 'CNPJ', type: 'document', words: ['cnpj', 'cpf'] },
    { key: 'email', label: 'e-mail', type: 'email', words: ['e-mail', 'email'] },
  ];
  const r = parseVoiceFields('estado São Paulo cnpj 11 222 333 0001 81 email vendas arroba tecpecas ponto com ponto br', sup);
  assert.deepEqual(r.values, { state: 'SP', document: '11.222.333/0001-81', email: 'vendas@tecpecas.com.br' });
});