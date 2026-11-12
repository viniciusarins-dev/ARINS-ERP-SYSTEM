// Horários dos slots e a decisão de publicar. São Paulo não tem horário de verão desde 2019: UTC−3 fixo.
const OFFSET = '-03:00';

/** Instante (Date, UTC) do slot na data local AAAA-MM-DD. */
function horarioDoSlot(calendario, slotId, dataISO) {
  const slot = calendario.slots.find((s) => s.id === slotId);
  if (!slot) throw new Error(`slot desconhecido: ${slotId}`);
  return new Date(`${dataISO}T${slot.hora}:00${OFFSET}`);
}

/**
 * O que fazer agora com um post do horário `horario`:
 *  - "aguardar": ainda sem confirmação e dentro da janela;
 *  - "agendar":  confirmado antes do horário → publicar no horário;
 *  - "publicar": confirmado entre o horário e horário + janela;
 *  - "pular":    passou da janela (com ou sem confirmação) → não publica.
 */
function decidir(agora, horario, confirmado, janelaHoras = 3) {
  const limite = horario.getTime() + janelaHoras * 3600000;
  if (agora.getTime() > limite) return 'pular';
  if (!confirmado) return 'aguardar';
  return agora.getTime() < horario.getTime() ? 'agendar' : 'publicar';
}

module.exports = { horarioDoSlot, decidir };
