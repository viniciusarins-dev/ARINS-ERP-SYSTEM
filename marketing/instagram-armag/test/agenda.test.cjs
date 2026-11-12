const { test } = require('node:test');
const assert = require('node:assert/strict');
const { horarioDoSlot, decidir } = require('../scripts/lib/agenda.cjs');
const cal = require('../calendario.json');

test('qua 19:40 em São Paulo = 22:40Z', () => {
  assert.equal(horarioDoSlot(cal, 'qua', '2026-11-18').toISOString(), '2026-11-18T22:40:00.000Z');
});
test('ter 12:10 = 15:10Z', () => {
  assert.equal(horarioDoSlot(cal, 'ter', '2026-11-17').toISOString(), '2026-11-17T15:10:00.000Z');
});
test('slot inexistente lança erro', () => assert.throws(() => horarioDoSlot(cal, 'dom', '2026-11-15'), /slot/));

const H = new Date('2026-11-18T22:40:00Z');
const m = (min) => new Date(H.getTime() + min * 60000);
test('sem confirmação antes do horário → aguardar', () => assert.equal(decidir(m(-30), H, false), 'aguardar'));
test('confirmado antes do horário → agendar', () => assert.equal(decidir(m(-30), H, true), 'agendar'));
test('confirmado logo depois do horário → publicar', () => assert.equal(decidir(m(10), H, true), 'publicar'));
test('confirmado exatamente às 3 h → publicar', () => assert.equal(decidir(m(180), H, true), 'publicar'));
test('confirmado depois de 3 h → pular', () => assert.equal(decidir(m(181), H, true), 'pular'));
test('sem confirmação depois de 3 h → pular', () => assert.equal(decidir(m(181), H, false), 'pular'));
test('sem confirmação dentro da janela → aguardar', () => assert.equal(decidir(m(60), H, false), 'aguardar'));
