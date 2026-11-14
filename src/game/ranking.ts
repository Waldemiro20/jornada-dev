/**
 * Ranking do quiz do curso.
 *
 * Fica salvo no navegador (localStorage): todos que jogarem no mesmo
 * computador/celular — por exemplo, no estande da Expotec — entram no mesmo
 * ranking. Para um ranking compartilhado entre aparelhos, troque estas
 * funções por chamadas a um banco de dados.
 * Guardamos nome, localidade e o nome normalizado (`key`), que impede o mesmo
 * jogador de responder o quiz mais de uma vez.
 */

export type RankEntry = {
  id: string;
  nome: string;
  local: string;
  /** pontos do quiz */
  score: number;
  acertos: number;
  /** segundos gastos no quiz (desempate) */
  tempo: number;
  data: string;
  /** nome normalizado (identifica quem já fez o quiz) */
  key?: string;
};

const KEY = "jornada-eeep:ranking:v1";

function isEntry(value: unknown): value is RankEntry {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Record<keyof RankEntry, unknown>>;
  return (
    typeof v.id === "string" &&
    typeof v.nome === "string" &&
    typeof v.local === "string" &&
    typeof v.score === "number" &&
    typeof v.acertos === "number" &&
    typeof v.tempo === "number" &&
    typeof v.data === "string" &&
    (v.key === undefined || typeof v.key === "string")
  );
}

/**
 * Identificação do jogador para o bloqueio do quiz: o nome completo digitado,
 * em minúsculas e sem espaços extras (ex.: "  David   Lucas " → "david lucas").
 */
export function playerKey(nome: string) {
  return nome.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

/** Resultado já registrado para este jogador (cada nome só faz o quiz uma vez). */
export function findPlayed(key: string): RankEntry | undefined {
  return loadRanking().find((entry) => entry.key === key);
}

/** O jogador com este nome já concluiu o quiz? */
export function hasPlayed(key: string) {
  return findPlayed(key) !== undefined;
}

export function sortRanking(list: RankEntry[]) {
  return [...list].sort(
    (a, b) => b.score - a.score || a.tempo - b.tempo || a.data.localeCompare(b.data),
  );
}

export function loadRanking(): RankEntry[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? sortRanking(parsed.filter(isEntry)) : [];
  } catch {
    return [];
  }
}

/** Salva a pontuação e devolve o ranking atualizado (a nova entrada sempre aparece, mesmo sem armazenamento). */
export function saveScore(entry: Omit<RankEntry, "id" | "data">): {
  ranking: RankEntry[];
  id: string;
} {
  // quem já fez o quiz não entra de novo no ranking
  const previous = entry.key ? loadRanking().find((r) => r.key === entry.key) : undefined;
  if (previous) return { ranking: loadRanking(), id: previous.id };
  const full: RankEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    data: new Date().toISOString(),
  };
  const ranking = sortRanking([...loadRanking(), full]).slice(0, 200);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ranking));
  } catch {
    /* armazenamento indisponível: mostra o ranking só nesta sessão */
  }
  return {
    ranking: ranking.some((r) => r.id === full.id) ? ranking : [...ranking, full],
    id: full.id,
  };
}

/* ------------------------------------------------------------------ */
/* Expectativas das salas de DS                                        */
/* ------------------------------------------------------------------ */

export type Expectation = {
  nome: string;
  modo: "escola" | "curso";
  sala: string;
  /** null = "Prefiro não responder" */
  resposta: string | null;
  data: string;
};

const EXPECT_KEY = "jornada-eeep:expectativas:v1";

/** Guarda a resposta de expectativas (no navegador), para a escola consultar depois. */
export function saveExpectation(entry: Omit<Expectation, "data">) {
  try {
    const raw = window.localStorage.getItem(EXPECT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(parsed) ? (parsed as Expectation[]) : [];
    list.push({ ...entry, data: new Date().toISOString() });
    window.localStorage.setItem(EXPECT_KEY, JSON.stringify(list.slice(-1000)));
  } catch {
    /* armazenamento indisponível: a resposta vale só para esta sessão */
  }
}
