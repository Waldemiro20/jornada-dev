/**
 * Mapa da EEEP Dr. Salomão Alves de Moura (Aracoiaba - CE).
 *
 * Prédio de dois andares, em verde e branco, com detalhes vermelho-vinho.
 *
 *  Térreo
 *   - Entrada (sul) com pátio coberto de pé-direito altíssimo (telhas metálicas
 *     e treliças vermelhas aparentes).
 *       Esquerda: espaço da logo da escola, Auditório (portas de vidro) e a
 *       parede azul do mural "SAM", com placa de setores e pingue-pongue.
 *       Direita: Biblioteca (janela vertical e letreiro vertical) e a rampa
 *       vermelha de acessibilidade que leva ao 2º andar.
 *   - Pátio central arborizado entre os dois blocos; a cobertura metálica cobre a escola
 *     inteira e só fica aberta a claraboia central, sobre os canteiros.
 *       Bloco esquerdo: Secretaria, Sala dos Professores, Laboratório de
 *       Línguas e Laboratório de Informática.
 *       Bloco direito: Laboratório de Química, Biologia e Física e Sanitários.
 *   - Fundo: Quadra poliesportiva em ginásio fechado (esquerda) e Refeitório
 *     aberto nas laterais (direita), ligados por um passeio coberto.
 *  2º andar (sobre o bloco esquerdo)
 *   - Corredor aberto com vista para o pátio central e as salas
 *     "1º Desenvolvimento", "2º Desenvolvimento" e "3º Desenvolvimento".
 *
 * Coordenadas em metros. x → leste, z → sul (a entrada fica ao sul), y ↑.
 */

export type DoorSide = "n" | "s" | "e" | "w";
export type RoomKind =
  | "office"
  | "teachers"
  | "classroom"
  | "lab-info"
  | "lab-lang"
  | "lab-science"
  | "restroom"
  | "library"
  | "auditorium"
  | "canteen"
  | "court";
export type Level = 0 | 1;

export type Room = {
  id: string;
  name: string;
  kind: RoomKind;
  /** centro */
  x: number;
  z: number;
  /** largura ao longo da parede da porta */
  w: number;
  /** profundidade (da porta até o fundo) */
  d: number;
  door: DoorSide;
  /** largura do vão da porta (padrão 1,7 m) */
  doorW?: number;
  /** portas de vidro (abertas) no vão */
  glassDoor?: boolean;
  /** letreiro em relevo vermelho em vez da faixa colorida acima da porta */
  reliefSign?: boolean;
  /** revestimento das paredes (padrão: azulejo) */
  wallTex?: WallTex;
  /** false = espaço aberto, sem paredes (refeitório arejado) */
  walls?: boolean;
  /** pé-direito próprio (ex.: ginásio); padrão WALL_H / WALL_H2 */
  wallH?: number;
  /** 0 = térreo, 1 = 2º andar */
  level?: Level;
  floor: string;
  accent: string;
  /** texto do quadro/placa interna */
  board?: string;
};

/** Topo da laje do 2º andar. */
export const FLOOR2_Y = 3.2;
/** Pé-direito das paredes do térreo e do 2º andar. */
export const WALL_H = 3;
export const WALL_H2 = 2.8;
/** Pé-direito do ginásio (paredes até a cobertura metálica). */
export const COURT_H = 7.6;
/** Abaixo disso o jogador está no térreo; acima, no 2º andar. */
export const LEVEL_SPLIT = FLOOR2_Y / 2;

/** Linhas principais da planta. */
export const FACADE_Z = 14.2;
export const ENTRANCE_HALF = 2.5;
export const BLOCK_X = 10.5; // fachada dos blocos voltada para os corredores
export const OUTER_X = 18.5; // paredes externas laterais
export const PATIO_X = 7.5; // borda do pátio central (peitoris)
export const BACK_Z = -21; // fundo dos blocos
export const SCHOOL_BACK_Z = -36.5; // muro do fundo (a cobertura vai até ele)

const LEFT_X = -(BLOCK_X + OUTER_X) / 2;
const RIGHT_X = (BLOCK_X + OUTER_X) / 2;
const BLOCK_D = OUTER_X - BLOCK_X;

export const rooms: Room[] = [
  /* ---------------- 2º andar: salas de DS (lado esquerdo) ---------------- */
  {
    id: "sala1",
    name: "1º Desenvolvimento",
    kind: "classroom",
    level: 1,
    x: LEFT_X,
    z: -1.5,
    w: 7,
    d: BLOCK_D,
    door: "e",
    floor: "#e7e5e4",
    accent: "#15803d",
    board: "Lógica de Programação",
  },
  {
    id: "sala2",
    name: "2º Desenvolvimento",
    kind: "classroom",
    level: 1,
    x: LEFT_X,
    z: -8.5,
    w: 7,
    d: BLOCK_D,
    door: "e",
    floor: "#e7e5e4",
    accent: "#16a34a",
    board: "Banco de Dados · Web",
  },
  {
    id: "sala3",
    name: "3º Desenvolvimento",
    kind: "classroom",
    level: 1,
    x: LEFT_X,
    z: -15.5,
    w: 7,
    d: BLOCK_D,
    door: "e",
    floor: "#e7e5e4",
    accent: "#166534",
    board: "Estágio · Projeto Social",
  },

  /* ---------------- Térreo: entrada ---------------- */
  {
    id: "auditorio",
    name: "Auditório",
    kind: "auditorium",
    x: LEFT_X,
    // vai da Secretaria (z = 2) até a fachada: parede lateral fechada, sem saída
    z: 8,
    w: 12,
    d: BLOCK_D,
    door: "e",
    doorW: 2.4,
    glassDoor: true,
    reliefSign: true,
    wallTex: "tiles",
    floor: "#57534e",
    accent: "#901a1e",
    board: "AUDITÓRIO",
  },
  {
    id: "biblioteca",
    name: "Biblioteca",
    kind: "library",
    x: RIGHT_X,
    z: 9,
    w: 10,
    d: BLOCK_D,
    door: "w",
    glassDoor: true,
    floor: "#b08968",
    accent: "#901a1e",
    board: "BIBLIOTECA",
  },

  /* ---------------- Bloco esquerdo (térreo) ---------------- */
  {
    id: "secretaria",
    name: "Secretaria",
    kind: "office",
    x: LEFT_X,
    z: -1,
    w: 6,
    d: BLOCK_D,
    door: "e",
    doorW: 2,
    glassDoor: true,
    floor: "#d6d3d1",
    accent: "#15803d",
    board: "SECRETARIA",
  },
  {
    id: "professores",
    name: "Sala dos Professores",
    kind: "teachers",
    x: LEFT_X,
    z: -6.5,
    w: 5,
    d: BLOCK_D,
    door: "e",
    floor: "#d6d3d1",
    accent: "#15803d",
    board: "PROFESSORES",
  },
  {
    id: "linguas",
    name: "Laboratório de Línguas",
    kind: "lab-lang",
    x: LEFT_X,
    z: -12,
    w: 6,
    d: BLOCK_D,
    door: "e",
    // funciona como um 2º Laboratório de Informática: mesmo piso, cores e equipamentos
    floor: "#cbd5e1",
    accent: "#2563eb",
    board: "LAB. DE LÍNGUAS",
  },
  {
    id: "informatica",
    name: "Laboratório de Informática",
    kind: "lab-info",
    x: LEFT_X,
    z: -18,
    w: 6,
    d: BLOCK_D,
    door: "e",
    floor: "#cbd5e1",
    accent: "#2563eb",
    board: "LAB. INFORMÁTICA",
  },

  /* ---------------- Bloco direito (térreo) ---------------- */
  {
    id: "sanitario-f",
    name: "Sanitário Feminino",
    kind: "restroom",
    x: RIGHT_X,
    z: -2,
    w: 4,
    d: BLOCK_D,
    door: "w",
    floor: "#e2e8f0",
    accent: "#db2777",
  },
  {
    id: "sanitario-m",
    name: "Sanitário Masculino",
    kind: "restroom",
    x: RIGHT_X,
    z: -6,
    w: 4,
    d: BLOCK_D,
    door: "w",
    floor: "#e2e8f0",
    accent: "#2563eb",
  },
  {
    id: "ciencias",
    name: "Laboratório de Química, Biologia e Física",
    kind: "lab-science",
    x: RIGHT_X,
    z: -12.5,
    w: 9,
    d: BLOCK_D,
    door: "w",
    doorW: 2,
    floor: "#e5e7eb",
    accent: "#0d9488",
    board: "QUÍMICA · BIOLOGIA · FÍSICA",
  },

  /* ---------------- Fundo da escola ---------------- */
  {
    id: "cantina",
    name: "Refeitório",
    kind: "canteen",
    // lado direito do fundo, aberto nas laterais (ventilação), sob a cobertura geral
    x: 8.5,
    z: -27.5,
    w: 15,
    d: 7,
    door: "s",
    doorW: 3.2,
    walls: false,
    floor: "#e8e1d5",
    accent: "#ea580c",
    board: "CARDÁPIO DO DIA",
  },
  {
    id: "quadra",
    name: "Quadra Poliesportiva",
    kind: "court",
    // lado esquerdo do fundo: ginásio totalmente fechado, com cobertura metálica.
    // Recuado: a fachada fica em z = -24, 3 m depois do fim dos corredores (BACK_Z).
    x: -10,
    z: -29.5,
    w: 16,
    d: 11,
    door: "s",
    // entrada ampla e desobstruída (sem pilar no vão)
    doorW: 4.8,
    wallH: COURT_H,
    wallTex: "facade",
    floor: "#0f766e",
    accent: "#facc15",
  },
];

export const roomById = Object.fromEntries(rooms.map((room) => [room.id, room])) as Record<
  string,
  Room
>;

/* ------------------------------------------------------------------ */
/* Geometria                                                           */
/* ------------------------------------------------------------------ */

const WALL_T = 0.2;
const DOOR_W = 1.7;

export const doorAngle: Record<DoorSide, number> = {
  s: 0,
  e: Math.PI / 2,
  n: Math.PI,
  w: -Math.PI / 2,
};

export const roomLevel = (room: Room): Level => room.level ?? 0;
/** Altura do piso da sala. */
export const roomY = (room: Room) => (roomLevel(room) === 1 ? FLOOR2_Y : 0);
export const roomWallH = (room: Room) => room.wallH ?? (roomLevel(room) === 1 ? WALL_H2 : WALL_H);
export const levelOf = (y: number): Level => (y >= LEVEL_SPLIT ? 1 : 0);

/** Tamanho no mundo (eixo x, eixo z). */
export function worldSize(room: Room): [number, number] {
  return room.door === "n" || room.door === "s" ? [room.w, room.d] : [room.d, room.w];
}

/** Converte coordenada local da sala (porta em +z) para o mundo. */
export function toWorld(room: Room, lx: number, lz: number): [number, number] {
  const a = doorAngle[room.door];
  return [
    room.x + lx * Math.cos(a) + lz * Math.sin(a),
    room.z - lx * Math.sin(a) + lz * Math.cos(a),
  ];
}

export function doorFront(room: Room, distance = 1.4): [number, number] {
  return toWorld(room, 0, room.d / 2 + distance);
}

/** O ponto (x, z) na altura y está dentro da sala (considera o andar). */
export function isInside(room: Room, x: number, z: number, y = 0, inset = 0.2) {
  if (Math.abs(y - roomY(room)) > 1) return false;
  const [sx, sz] = worldSize(room);
  return Math.abs(x - room.x) < sx / 2 - inset && Math.abs(z - room.z) < sz / 2 - inset;
}

export type Rect = { x0: number; x1: number; z0: number; z1: number };

export const inRect = (r: Rect, x: number, z: number) =>
  x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1;

export type WallTex = "azulejo" | "facade" | "mural" | "tiles";

export type Wall = {
  x: number;
  z: number;
  sx: number;
  sz: number;
  /** "x" = parede que corre no eixo x (pode tapar a câmera) */
  axis: "x" | "z";
  /** base e altura (a colisão vale para quem está nessa faixa de altura) */
  y0: number;
  h: number;
  color: string;
  tex?: WallTex;
};

/** Paredes internas: barra de azulejo branco até meia altura com filete vermelho. */
const INNER = "#f4f4f2";

function wallSegments(
  axis: "x" | "z",
  fixed: number,
  from: number,
  to: number,
  doorW: number,
  y0: number,
  h: number,
  tex: WallTex,
): Wall[] {
  const pieces: [number, number][] =
    doorW > 0
      ? [
          [from, (from + to) / 2 - doorW / 2],
          [(from + to) / 2 + doorW / 2, to],
        ]
      : [[from, to]];
  return pieces.map(([a, b]) =>
    axis === "x"
      ? {
          x: (a + b) / 2,
          z: fixed,
          sx: b - a + WALL_T,
          sz: WALL_T,
          axis,
          y0,
          h,
          color: INNER,
          tex,
        }
      : {
          x: fixed,
          z: (a + b) / 2,
          sx: WALL_T,
          sz: b - a + WALL_T,
          axis,
          y0,
          h,
          color: INNER,
          tex,
        },
  );
}

export function roomWalls(room: Room): Wall[] {
  if (room.walls === false) return [];
  const [sx, sz] = worldSize(room);
  const x0 = room.x - sx / 2;
  const x1 = room.x + sx / 2;
  const z0 = room.z - sz / 2;
  const z1 = room.z + sz / 2;
  const dw = room.doorW ?? DOOR_W;
  const y0 = roomY(room);
  const h = roomWallH(room);
  const tex = room.wallTex ?? "azulejo";
  return [
    ...wallSegments("x", z0, x0, x1, room.door === "n" ? dw : 0, y0, h, tex),
    ...wallSegments("x", z1, x0, x1, room.door === "s" ? dw : 0, y0, h, tex),
    ...wallSegments("z", x0, z0, z1, room.door === "w" ? dw : 0, y0, h, tex),
    ...wallSegments("z", x1, z0, z1, room.door === "e" ? dw : 0, y0, h, tex),
  ];
}

/** Retângulo em coordenadas locais da sala → parede (divisória) no mundo. */
function localWall(room: Room, lx0: number, lx1: number, lz0: number, lz1: number): Wall {
  const [ax, az] = toWorld(room, lx0, lz0);
  const [bx, bz] = toWorld(room, lx1, lz1);
  const sx = Math.max(Math.abs(bx - ax), WALL_T);
  const sz = Math.max(Math.abs(bz - az), WALL_T);
  return {
    x: (ax + bx) / 2,
    z: (az + bz) / 2,
    sx,
    sz,
    axis: sx >= sz ? "x" : "z",
    y0: roomY(room),
    h: roomWallH(room),
    color: INNER,
    tex: "azulejo",
  };
}

/* Entrada, pátio e mural -------------------------------------------- */

/** Altura das tesouras do pátio coberto da entrada (pé-direito alto). */
export const ROOF_Y = 8;
/** Pátio coberto da entrada. */
export const hall: Rect = { x0: -BLOCK_X, x1: BLOCK_X, z0: 0.2, z1: FACADE_Z };
/** Pátio central descoberto entre os blocos (com a extensão atrás do laboratório). */
export const courtyard: Rect = { x0: -PATIO_X, x1: PATIO_X, z0: BACK_Z, z1: hall.z0 };
export const courtyardEast: Rect = { x0: PATIO_X, x1: OUTER_X, z0: BACK_Z, z1: -17 };
/** Corredores térreos cobertos ao longo dos blocos. */
export const corridorWest: Rect = { x0: -BLOCK_X, x1: -PATIO_X, z0: BACK_Z, z1: hall.z0 };
export const corridorEast: Rect = { x0: PATIO_X, x1: BLOCK_X, z0: -17, z1: 4.6 };

/** Parede branca de pé-direito inteiro no lado direito, colada à rampa (placa de setores). */
export const muralWall = { x: BLOCK_X, z0: 0, z1: 4 };
/** Limite sul do bloco esquerdo do 2º andar (encontro da Secretaria com o Auditório). */
export const AUDITORIUM_Z0 = 2;
/** Parede de ligação entre o Auditório e a porta da Secretaria. */
export const samWall = { x: -BLOCK_X, z0: 0, z1: AUDITORIUM_Z0 };
/**
 * Painel do mural "SAM": de frente para a entrada (voltado para +z), no plano das duas colunas
 * vermelhas — a do pátio junto ao Auditório (x = -BLOCK_X + 0.3) e o pilar do corredor do
 * 2º andar (x = -PATIO_X) —, encaixado no vão livre entre elas.
 */
export const samMural = {
  x0: -BLOCK_X + 0.3 + 0.18 + 0.02, // face da coluna do pátio
  x1: -PATIO_X - 0.17 - 0.02, // face do pilar do corredor do 2º andar
  z: 0.2,
};

/**
 * Placa vermelha de setores sobre mureta branca, no chão, encostada na parte inferior
 * direita do mural "SAM" (voltada para a entrada).
 */
// ao lado do mural (à direita do pilar do corredor do 2º andar), sem tapar o painel nem a passagem
export const directorySign = {
  x: -PATIO_X + 0.17 + 1.4 + 0.6, // 1,4 m livres junto ao pilar (passagem para o corredor)
  z: samMural.z + 0.45,
  w: 1.2,
  d: 0.45,
};

/** Passeio coberto no fundo (folga entre os corredores e a Quadra/Refeitório). */
export const backWalkway: Rect = { x0: -OUTER_X, x1: OUTER_X, z0: -24, z1: BACK_Z };
/** Pilares do passeio coberto: fora do vão da Quadra (x -12,4…-7,6) e do centro. */
export const WALKWAY_PILLARS_X = [-OUTER_X + 0.3, -14.5, -5, 5, 14.5, OUTER_X - 0.3];
export const WALKWAY_PILLAR_Z = (backWalkway.z0 + backWalkway.z1) / 2;

/** Cobertura metálica geral: da fachada até o muro do fundo, de lado a lado. */
export const roofCover: Rect = {
  x0: -OUTER_X - 0.3,
  x1: OUTER_X + 0.3,
  z0: SCHOOL_BACK_Z,
  z1: FACADE_Z + 0.3,
};
/** Única abertura da cobertura: claraboia sobre os canteiros e vasos do pátio central. */
export const skylight: Rect = { x0: -6.8, x1: 6.8, z0: -19.8, z1: -1.4 };
/** Colunas vinho que sustentam a cobertura junto ao muro do fundo (fora das passagens). */
export const ROOF_COLUMNS: [number, number][] = [-OUTER_X + 0.3, -0.5, OUTER_X - 0.3].map((x) => [
  x,
  SCHOOL_BACK_Z + 0.4,
]);

/** Divisórias internas da Secretaria (local): janelas de atendimento e diretoria. */
export const SERVICE_LZ = 1.2;
export const OFFICE_LZ = -2;
const secretaria = roomById["secretaria"]!;
const cantina = roomById["cantina"]!;
/** Pilares do Refeitório aberto (frente e fundo), em coordenadas locais. */
export const CANTEEN_PILLARS: [number, number][] = [-1, -0.5, 0.5, 1].flatMap((f) =>
  [-1, 1].map(
    (side) =>
      [(f * cantina.w) / 2 - Math.sign(f) * 0.2, side * (cantina.d / 2 - 0.2)] as [number, number],
  ),
);

const hallBand = (x: number, z0: number, z1: number, color: string, tex?: WallTex): Wall => ({
  x,
  z: (z0 + z1) / 2,
  sx: WALL_T,
  sz: z1 - z0,
  axis: "z",
  y0: WALL_H,
  h: ROOF_Y - WALL_H,
  color,
  ...(tex ? { tex } : {}),
});

const facadeWall = (x0: number, x1: number, color: string, tex: WallTex): Wall => ({
  x: (x0 + x1) / 2,
  z: FACADE_Z,
  sx: x1 - x0,
  sz: WALL_T,
  axis: "x",
  y0: 0,
  h: WALL_H,
  color,
  tex,
});

const buildingWalls: Wall[] = [
  // fachada: parede externa do Auditório em placas quadradas cinza ardósia …
  facadeWall(-OUTER_X, -BLOCK_X, "#35393c", "tiles"),
  // … e a Entrada (e a frente da Biblioteca) em branco com faixas verde-bandeira
  facadeWall(-BLOCK_X, -ENTRANCE_HALF, "#f8fafc", "facade"),
  facadeWall(ENTRANCE_HALF, BLOCK_X, "#f8fafc", "facade"),
  facadeWall(BLOCK_X, OUTER_X, "#f8fafc", "facade"),
  // parede branca do chão ao teto, ao lado da rampa (o mural "SAM" fica ao lado do Auditório)
  {
    x: muralWall.x,
    z: (muralWall.z0 + muralWall.z1) / 2,
    sx: WALL_T,
    sz: muralWall.z1 - muralWall.z0,
    axis: "z",
    y0: 0,
    h: ROOF_Y,
    color: "#f8fafc",
  },
  // bloco fechado atrás do mural (lado de fora)
  {
    x: OUTER_X,
    z: (muralWall.z0 + muralWall.z1) / 2,
    sx: WALL_T,
    sz: muralWall.z1 - muralWall.z0,
    axis: "z",
    y0: 0,
    h: WALL_H,
    color: INNER,
    tex: "azulejo",
  },
  // fechamento alto do pátio coberto: Auditório (placas escuras) e Biblioteca
  hallBand(-BLOCK_X, AUDITORIUM_Z0, FACADE_Z, "#35393c", "tiles"),
  hallBand(BLOCK_X, muralWall.z1, FACADE_Z, "#f8fafc"),
  // painel do mural "SAM" entre as colunas vermelhas, de frente para a entrada
  {
    x: (samMural.x0 + samMural.x1) / 2,
    z: samMural.z,
    sx: samMural.x1 - samMural.x0,
    sz: WALL_T,
    axis: "x",
    y0: 0,
    h: WALL_H,
    color: "#1d4ed8",
  },
  // Secretaria: divisória com janelas de atendimento (passagem lateral) …
  localWall(secretaria, -secretaria.w / 2, 1.6, SERVICE_LZ, SERVICE_LZ),
  // … e salas da diretoria ao fundo (Direção · Coordenação)
  localWall(secretaria, -secretaria.w / 2, -2, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, -1, 1, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, 2, secretaria.w / 2, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, 0, 0, -secretaria.d / 2, OFFICE_LZ),
  // Refeitório: só a parede da cozinha ao fundo (laterais abertas para ventilação)
  localWall(cantina, -cantina.w / 2, cantina.w / 2, -cantina.d / 2, -cantina.d / 2),
];

export const walls: Wall[] = [...rooms.flatMap(roomWalls), ...buildingWalls];

/* Rampa vermelha em ziguezague e 2º andar --------------------------- */

/**
 * Rampa de acessibilidade na lateral direita do pátio coberto, em ziguezague:
 * 1º lance começa voltado para o lado do Auditório (oeste) e sobe para leste,
 * patamar junto à Biblioteca, 2º lance volta para oeste até a plataforma superior.
 */
export const ramp = {
  a: { x0: 2.5, x1: 9, z0: 6.3, z1: 7.8 },
  landing: { x0: 9, x1: BLOCK_X, z0: 4.6, z1: 7.8 } as Rect,
  b: { x0: 2.5, x1: 9, z0: 4.6, z1: 6.1 },
  /** plataforma no topo, que se liga à passarela */
  top: { x0: 0.8, x1: 2.5, z0: hall.z0, z1: 6.1 } as Rect,
};
export const LANDING_Y = FLOOR2_Y / 2;

/** Passarela superior (vista para o pátio) que liga a rampa ao corredor do 2º andar. */
export const bridge: Rect = { x0: -BLOCK_X, x1: ramp.top.x0, z0: hall.z0, z1: AUDITORIUM_Z0 };
/** Corredor aberto do 2º andar (sobre o corredor térreo do bloco esquerdo). */
export const upperCorridor: Rect = { x0: -BLOCK_X, x1: -PATIO_X, z0: -19, z1: AUDITORIUM_Z0 };
/** Laje das salas de DS. */
export const upperRooms: Rect = { x0: -OUTER_X, x1: -BLOCK_X, z0: -19, z1: AUDITORIUM_Z0 };
export const GUARD_H = 1.1;

type Surface = { r: Rect; h: (x: number, z: number) => number };

const rampLen = ramp.a.x1 - ramp.a.x0;
const surfaces: Surface[] = [
  { r: ramp.a, h: (x) => ((x - ramp.a.x0) / rampLen) * LANDING_Y },
  { r: ramp.landing, h: () => LANDING_Y },
  { r: ramp.b, h: (x) => LANDING_Y + ((ramp.b.x1 - x) / rampLen) * LANDING_Y },
  { r: ramp.top, h: () => FLOOR2_Y },
  { r: bridge, h: () => FLOOR2_Y },
  { r: upperCorridor, h: () => FLOOR2_Y },
  { r: upperRooms, h: () => FLOOR2_Y },
];

/**
 * Altura do piso sob o jogador: a superfície mais alta que ele alcança a partir
 * de `prevY` (sobe a rampa andando, mas não "pula" para a passarela acima dele).
 */
export function floorHeight(x: number, z: number, prevY: number) {
  let best = 0;
  for (const s of surfaces) {
    if (!inRect(s.r, x, z)) continue;
    const h = Math.min(FLOOR2_Y, Math.max(0, s.h(x, z)));
    if (h <= prevY + 0.6 && h > best) best = h;
  }
  return best;
}

/** Pilares vermelhos ao longo dos peitoris do pátio central (z). */
export const PILLAR_Z_WEST = [-21, -15, -9, -3, 0.2];
// (sem pilar em z = 4,6: ele atravessaria o 2º lance da rampa como um poste solto)
export const PILLAR_Z_EAST = [-17, -11, -6, -1];

/** Peitoris vermelhos (h = 1 m) entre os corredores e o pátio central, com passagens. */
export const PARAPET_H = 1;
function parapet(x: number, z0: number, z1: number, gaps: [number, number][]): Wall[] {
  const pieces: [number, number][] = [];
  let start = z0;
  for (const [a, b] of gaps) {
    if (a > start) pieces.push([start, a]);
    start = b;
  }
  if (start < z1) pieces.push([start, z1]);
  return pieces.map(([a, b]) => ({
    x,
    z: (a + b) / 2,
    sx: 0.22,
    sz: b - a,
    axis: "z" as const,
    y0: 0,
    h: PARAPET_H,
    color: "#901a1e",
  }));
}
export const parapets: Wall[] = [
  ...parapet(-PATIO_X, BACK_Z, -3.5, [
    [-18.8, -17.2],
    [-12.8, -11.2],
    [-6.8, -5.2],
  ]),
  ...parapet(PATIO_X, -17, -1.5, [
    [-13.3, -11.7],
    [-8.8, -7.2],
  ]),
];

function bar(x0: number, x1: number, z0: number, z1: number, y0 = -1, h = 10): Wall {
  return {
    x: (x0 + x1) / 2,
    z: (z0 + z1) / 2,
    sx: x1 - x0,
    sz: z1 - z0,
    axis: x1 - x0 >= z1 - z0 ? "x" : "z",
    y0,
    h,
    color: "#901a1e",
  };
}

const UP = { y0: FLOOR2_Y - 0.6, h: 4 };
const T = 0.1;
/** Barreiras de colisão sem parede própria (o desenho fica em SchoolWorld). */
export const barriers: Wall[] = [
  // ziguezague: lateral sul do 1º lance/patamar, divisória entre os lances, lateral norte
  bar(ramp.a.x0, BLOCK_X, ramp.a.z1, ramp.a.z1 + T),
  bar(ramp.a.x0, ramp.a.x1, ramp.b.z1, ramp.a.z0),
  bar(ramp.b.x0, BLOCK_X, ramp.b.z0 - T, ramp.b.z0),
  // ponta do 2º lance (maciço até o chão) para quem está no térreo
  bar(ramp.b.x0 - T, ramp.b.x0, ramp.b.z0, ramp.b.z1, -1, FLOOR2_Y - 0.6),
  // guarda-corpos da plataforma, da passarela e do corredor superior
  bar(ramp.top.x1, ramp.top.x1 + T, ramp.top.z0, ramp.b.z0, UP.y0, UP.h),
  bar(ramp.top.x0, ramp.top.x1, ramp.top.z1, ramp.top.z1 + T, UP.y0, UP.h),
  bar(ramp.top.x0 - T, ramp.top.x0, bridge.z1, ramp.top.z1, UP.y0, UP.h),
  bar(bridge.x0, ramp.top.x0, bridge.z1, bridge.z1 + T, UP.y0, UP.h),
  bar(-PATIO_X, ramp.top.x1, bridge.z0 - T, bridge.z0, UP.y0, UP.h),
  bar(-PATIO_X, -PATIO_X + T, upperCorridor.z0, bridge.z0, UP.y0, UP.h),
  bar(upperCorridor.x0, upperCorridor.x1, upperCorridor.z0 - T, upperCorridor.z0, UP.y0, UP.h),
  // pilares do pátio coberto da entrada
  ...[-5.5, 5.5].map((x) => bar(x - 0.2, x + 0.2, 10.8, 11.2, -1, 3)),
  // placa de setores (mureta) diante do mural "SAM"
  bar(
    directorySign.x - directorySign.w / 2,
    directorySign.x + directorySign.w / 2,
    directorySign.z - directorySign.d / 2,
    directorySign.z + directorySign.d / 2,
    -1,
    2,
  ),
  // pilares do Refeitório aberto e do passeio coberto do fundo
  ...CANTEEN_PILLARS.map(([lx, lz]) => {
    const [x, z] = toWorld(cantina, lx, lz);
    return bar(x - 0.15, x + 0.15, z - 0.15, z + 0.15, -1, 4);
  }),
  ...WALKWAY_PILLARS_X.map((x) =>
    bar(x - 0.18, x + 0.18, WALKWAY_PILLAR_Z - 0.18, WALKWAY_PILLAR_Z + 0.18, -1, 4),
  ),
  ...ROOF_COLUMNS.map(([x, z]) => bar(x - 0.18, x + 0.18, z - 0.18, z + 0.18, -1, 4)),
];

/** Limites da escola (muro). */
export const bounds = { x0: -20, x1: 20, z0: SCHOOL_BACK_Z, z1: 22.5 };

export const spawn: [number, number] = [0, 20.5];

/** Entrada (sem guarita): ponto onde o guia faz a pergunta. */
export const portaria = { x: 0, z: FACADE_Z };

/** O jogador chegou à Entrada vindo do portão. */
export function atPortaria(x: number, z: number) {
  return Math.abs(x - portaria.x) < 3.2 && z < portaria.z + 0.8 && z > portaria.z - 4;
}

const solid: Wall[] = [...walls, ...parapets, ...barriers];

/** Resolve colisão de um círculo contra as paredes na altura do jogador (in-place). */
export function collide(pos: { x: number; z: number; y?: number }, radius = 0.3) {
  const y = pos.y ?? 0;
  for (const wall of solid) {
    if (y < wall.y0 - 0.6 || y >= wall.y0 + wall.h - 0.2) continue;
    const minX = wall.x - wall.sx / 2;
    const maxX = wall.x + wall.sx / 2;
    const minZ = wall.z - wall.sz / 2;
    const maxZ = wall.z + wall.sz / 2;
    const cx = Math.max(minX, Math.min(pos.x, maxX));
    const cz = Math.max(minZ, Math.min(pos.z, maxZ));
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const dist = Math.hypot(dx, dz);
    if (dist >= radius) continue;
    if (dist > 1e-5) {
      pos.x = cx + (dx / dist) * radius;
      pos.z = cz + (dz / dist) * radius;
    } else {
      const pushes = [
        { x: minX - radius, z: pos.z, d: pos.x - minX },
        { x: maxX + radius, z: pos.z, d: maxX - pos.x },
        { x: pos.x, z: minZ - radius, d: pos.z - minZ },
        { x: pos.x, z: maxZ + radius, d: maxZ - pos.z },
      ].sort((a, b) => a.d - b.d);
      pos.x = pushes[0]!.x;
      pos.z = pushes[0]!.z;
    }
  }
  pos.x = Math.max(bounds.x0 + radius, Math.min(bounds.x1 - radius, pos.x));
  pos.z = Math.max(bounds.z0 + radius, Math.min(bounds.z1 - radius, pos.z));
}

/* ------------------------------------------------------------------ */
/* Missões                                                             */
/* ------------------------------------------------------------------ */

export type CollectItem = "document" | "book" | "diary" | "ram" | "ball" | "cable";

export type Mission =
  | {
      /** Parada da trilha guiada: card explicativo curto ao chegar no local. */
      id: string;
      /** sala de referência (mapa); o nome mostrado é o `title` */
      room: string;
      type: "visit";
      title: string;
      intro: string;
      /** foto exibida no card (ex.: equipe da escola) */
      image?: string;
      /** texto do botão de continuar */
      button?: string;
    }
  | {
      /** Sala de DS: conteúdo do ano (em cima) + pergunta aberta de expectativas (embaixo). */
      id: string;
      room: string;
      type: "expect";
      title: string;
      intro: string;
    }
  | {
      id: string;
      room: string;
      type: "collect";
      title: string;
      intro: string;
      item: CollectItem;
      itemName: string;
      /** posição local na sala (porta em +z) */
      at: [number, number];
      success: string;
    };

export type Route = "escola" | "curso";

/** Salas de Desenvolvimento, em ordem (1º, 2º e 3º ano). */
export const COURSE_ROOMS = ["sala1", "sala2", "sala3"] as const;

const expectMissions = (prefix: string, titles: [string, string, string]): Mission[] =>
  COURSE_ROOMS.map((room, i) => ({
    id: `${prefix}-${room}`,
    room,
    type: "expect" as const,
    title: titles[i]!,
    intro: `Suba a rampa e entre na sala ${i + 1}º Desenvolvimento, no 2º andar.`,
  }));

/**
 * MODO "Conhecer a Escola": tour automático (o personagem anda sozinho) nesta ordem:
 * Auditório → Sala dos Professores → Laboratório de Línguas → Quadra → quadro da Equipe SAM
 * (junto à rampa) → salas do 1º, 2º e 3º Desenvolvimento. Sem quiz: ao terminar a sala do
 * 3º ano, a visita é concluída.
 */
export const schoolTour: Mission[] = [
  {
    id: "v-auditorio",
    room: "auditorio",
    type: "visit",
    title: "Auditório",
    intro:
      "O espaço de encontros da escola: aqui acontecem palestras, reuniões gerais, eventos culturais, apresentações de trabalhos e as cerimônias da EEEP.",
  },
  {
    id: "v-professores",
    room: "professores",
    type: "visit",
    title: "Sala dos Professores",
    intro:
      "Aqui os professores planejam as aulas, corrigem atividades e atendem os alunos e as famílias.",
  },
  {
    id: "v-linguas",
    room: "linguas",
    type: "visit",
    title: "Laboratório de Línguas / Informática",
    intro:
      "Apesar do nome, o Laboratório de Línguas funciona como um laboratório completo de computadores, igual ao Laboratório de Informática: aulas práticas do curso técnico, pesquisas e estudos. Só o nome na placa muda.",
  },
  {
    id: "v-quadra",
    room: "quadra",
    type: "visit",
    title: "Quadra Poliesportiva",
    intro:
      "A quadra é utilizada para as aulas práticas de Educação Física: aqui os alunos colocam em prática os conteúdos esportivos e as atividades físicas, e a escola realiza seus eventos esportivos, como os jogos interclasse.",
  },
  {
    id: "v-equipe",
    room: "biblioteca",
    type: "visit",
    title: "Equipe SAM",
    intro:
      "Este quadro, na parede junto à rampa, apresenta a Equipe SAM: professores, coordenadores e todos os profissionais da EEEP Dr. Salomão Alves de Moura, que apoiam, orientam e acompanham os estudantes durante toda a jornada escolar.",
    image: "/equipesam.jpeg",
    button: "Continuar / Subir para as Salas",
  },
  ...expectMissions("e", [
    "1º ano · Base comum e tempo integral",
    "2º ano · Grupos de Matemática e Português",
    "3º ano · Rumo ao ENEM",
  ]),
];

/* Caminhos do tour automático ---------------------------------------- */

export type TourLeg = {
  /** pontos (x, z) percorridos em ordem; a altura vem do piso (rampa, passarela) */
  path: [number, number][];
  /** para onde olhar ao chegar (yaw) */
  face: number;
  /** inclinação do olhar ao chegar (pitch; positivo = para cima). Padrão: horizonte. */
  pitch?: number;
};

/** Eixo do corredor térreo/superior do bloco esquerdo. */
const WEST_LANE = -(BLOCK_X + PATIO_X) / 2;
/** Passagem do pátio da entrada para o corredor esquerdo (entre o pilar e a placa de setores). */
const HALL_TO_WEST: [number, number][] = [
  [-6.6, 1.6],
  [-6.6, -1.2],
  [WEST_LANE, -2.2],
];
const laneA = (ramp.a.z0 + ramp.a.z1) / 2;
const laneB = (ramp.b.z0 + ramp.b.z1) / 2;
const topX = (ramp.top.x0 + ramp.top.x1) / 2;
const bridgeZ = (bridge.z0 + bridge.z1) / 2;
/** Pé da rampa (início do 1º lance). */
const RAMP_FOOT: [number, number] = [ramp.a.x0 - 0.8, laneA];
/**
 * Parada da Equipe SAM: no meio do 1º lance da rampa, de frente para o quadro na parede do
 * patamar, longe o bastante para a foto (2,9 m de largura) caber inteira na tela.
 */
const TEAM_STOP: [number, number] = [6.3, laneA];
/** Do ponto da Equipe SAM, termina o 1º lance, vira no patamar e atravessa a passarela. */
const REST_OF_RAMP: [number, number][] = [
  [ramp.a.x1 - 0.1, laneA],
  [(ramp.landing.x0 + ramp.landing.x1) / 2, laneA],
  [(ramp.landing.x0 + ramp.landing.x1) / 2, laneB],
  [ramp.b.x0 + 0.5, laneB],
  [topX, laneB],
  [topX, bridgeZ],
  [WEST_LANE, bridgeZ],
];
/** Fim do corredor esquerdo, junto ao passeio coberto do fundo. */
const WEST_END: [number, number] = [WEST_LANE, BACK_Z + 0.7];

/** Centro do quadro (na parede da Biblioteca, à altura do patamar). */
const TEAM_BOARD = { x: BLOCK_X - 0.1, z: (ramp.landing.z0 + ramp.landing.z1) / 2, y: 3.46 };
const EYE = 1.68;
/** Altura do piso do 1º lance da rampa na coordenada x. */
const rampFloorAt = (x: number) => ((x - ramp.a.x0) / (ramp.a.x1 - ramp.a.x0)) * LANDING_Y;

const front = (id: string, distance = 1.4) => doorFront(roomById[id]!, distance);
const inside = (id: string) => {
  const room = roomById[id]!;
  return toWorld(room, 0, room.d / 2 - 0.7);
};
/** Olhando para a porta/quadro da sala. */
const facing = (id: string) => doorAngle[roomById[id]!.door];

/** Trecho que leva até cada parada do tour, a partir da parada anterior. */
export const tourLegs: Record<string, TourLeg> = {
  "v-auditorio": { path: [[-3, 9.5], front("auditorio", 1.6)], face: facing("auditorio") },
  "v-professores": {
    path: [...HALL_TO_WEST, front("professores")],
    face: facing("professores"),
  },
  "v-linguas": { path: [front("linguas")], face: facing("linguas") },
  // pelo corredor até o fundo e para logo depois da entrada da quadra
  "v-quadra": {
    path: [WEST_END, front("quadra"), inside("quadra")],
    face: facing("quadra"),
  },
  // de volta pelo corredor até o pátio e direto para a rampa (sem passar pela Biblioteca):
  // começa a subir e para no 1º lance, de frente para o quadro da Equipe SAM
  "v-equipe": {
    path: [
      front("quadra"),
      WEST_END,
      [WEST_LANE, -2.2],
      [-6.6, -1.2],
      [-6.6, 1.6],
      [-2, 9.4],
      [1, 8.6],
      RAMP_FOOT,
      TEAM_STOP,
    ],
    face: Math.atan2(-(TEAM_BOARD.x - TEAM_STOP[0]), -(TEAM_BOARD.z - TEAM_STOP[1])),
    pitch: Math.atan2(
      TEAM_BOARD.y - (rampFloorAt(TEAM_STOP[0]) + EYE),
      Math.hypot(TEAM_BOARD.x - TEAM_STOP[0], TEAM_BOARD.z - TEAM_STOP[1]),
    ),
  },
  // continua a subida da rampa a partir do ponto da Equipe SAM
  "e-sala1": {
    path: [...REST_OF_RAMP, front("sala1"), inside("sala1")],
    face: facing("sala1"),
  },
  "e-sala2": {
    path: [front("sala1"), front("sala2"), inside("sala2")],
    face: facing("sala2"),
  },
  "e-sala3": {
    path: [front("sala2"), front("sala3"), inside("sala3")],
    face: facing("sala3"),
  },
};

/**
 * MODO "Conhecer o Curso": o jogador vai direto para a sala do 1º Desenvolvimento e segue
 * automaticamente para a do 2º e a do 3º. O quiz só aparece depois da sala do 3º ano.
 */
export const courseMissions: Mission[] = expectMissions("c", [
  "1º Desenvolvimento · Os primeiros passos",
  "2º Desenvolvimento · Sistemas e apps",
  "3º Desenvolvimento · Estágio e projeto social",
]);

/** Todas as missões possíveis (para buscar por id). */
export const allMissions: Mission[] = [...schoolTour, ...courseMissions];

export const XP_PER_MISSION = 100;

/* ------------------------------------------------------------------ */
/* Conteúdos das salas de DS em cada modo, quiz e ranking              */
/* ------------------------------------------------------------------ */

export type Topic = { name: string; text: string };
export type RoomContent = {
  year: string;
  topics: Topic[];
  highlight?: Topic;
  /** pergunta aberta de expectativas (parte inferior do painel) */
  question: string;
};

/** MODO "Conhecer a Escola": o que se estuda na escola (base comum) em cada ano. */
export const schoolContent: Record<string, RoomContent> = {
  sala1: {
    year: "1º ano",
    topics: [
      {
        name: "Matérias da Base Comum do Ensino Médio",
        text: "Português, Matemática, Física, Química, Biologia, História, Geografia, Filosofia, Sociologia, Inglês, Artes e Educação Física, junto com o curso técnico.",
      },
    ],
    highlight: {
      name: "Adaptação à rotina integral da EEEP",
      text: "As aulas começam às 07:15 e terminam às 16:40, com almoço na escola. O 1º ano é para se acostumar com o novo ritmo, fazer amizades e criar hábitos de estudo.",
    },
    question: "O que você espera no seu 1º ano de EEEP?",
  },
  sala2: {
    year: "2º ano",
    topics: [
      {
        name: "Base comum aprofundada",
        text: "Os conteúdos do ensino médio ficam mais densos e a escola acompanha de perto o desempenho de cada aluno.",
      },
    ],
    highlight: {
      name: "Grupos de estudo de Matemática e Língua Portuguesa",
      text: "A turma é dividida em grupos focados em Matemática e Língua Portuguesa, para fortalecer as competências cobradas no ENEM e no SPAECE. Cada grupo trabalha no seu ritmo.",
    },
    question: "O que você espera no seu 2º ano de EEEP?",
  },
  sala3: {
    year: "3º ano",
    topics: [
      {
        name: "Revisões e simulados",
        text: "Aulas de revisão de todas as áreas e simulados periódicos no modelo do ENEM, com correção comentada.",
      },
    ],
    highlight: {
      name: "Preparação intensiva para o ENEM e vestibulares",
      text: "É o ano do “agora é valendo”: o foco da base comum é a aprovação no ENEM e nos vestibulares, com redação semanal e plantões de dúvidas.",
    },
    question: "O que você espera no seu 3º ano de EEEP?",
  },
};

/** MODO "Conhecer o Curso": o que se estuda em Desenvolvimento de Sistemas em cada ano. */
export const courseContent: Record<string, RoomContent> = {
  sala1: {
    year: "1º ano",
    topics: [
      {
        name: "Lógica de programação básica",
        text: "Aprender a resolver problemas passo a passo, com algoritmos, antes de escrever código de verdade.",
      },
      {
        name: "Fundamentos de informática",
        text: "Como funcionam o computador, o sistema operacional e a internet — a base de tudo no curso.",
      },
      {
        name: "Criação de sites (HTML/CSS)",
        text: "As primeiras páginas da internet: HTML para o conteúdo e CSS para cores, fontes e layout.",
      },
    ],
    highlight: {
      name: "Participação na Expotec",
      text: "Já no 1º ano a turma participa da Expotec, a feira em que os alunos mostram seus projetos à comunidade.",
    },
    question: "O que você espera aprender no 1º ano do curso?",
  },
  sala2: {
    year: "2º ano",
    topics: [
      {
        name: "Desenvolvimento de sistemas",
        text: "Sistemas completos que funcionam no navegador, com cadastro, login e dados salvos.",
      },
      {
        name: "Aplicativos",
        text: "Criação de apps para celular, da tela até o funcionamento.",
      },
    ],
    highlight: {
      name: "Participação na Expotec",
      text: "No 2º ano a turma volta à Expotec com projetos mais completos. A feira é organizada pelos alunos do 1º e do 2º ano.",
    },
    question: "Quais são suas expectativas para o 2º ano do curso?",
  },
  sala3: {
    year: "3º ano",
    topics: [
      {
        name: "Estágio curricular supervisionado",
        text: "O aluno trabalha em uma empresa da área de tecnologia, aplicando o que aprendeu, com acompanhamento da escola.",
      },
      {
        name: "Projeto social na área de tecnologia",
        text: "No final do ano, a turma cria um projeto de tecnologia para ajudar a comunidade.",
      },
    ],
    highlight: {
      name: "Sem Expotec no 3º ano",
      text: "Os alunos do 3º ano não participam nem organizam a Expotec — ela é organizada apenas pelos alunos do 1º e do 2º ano. O foco do 3º ano é o estágio e o projeto social.",
    },
    question: "O que você espera conquistar no 3º ano do curso?",
  },
};

/** Conteúdo da sala de DS conforme o modo escolhido. */
export const roomContent = (route: Route, room: string) =>
  (route === "curso" ? courseContent : schoolContent)[room];

/** O que se faz nos laboratórios de computadores (Informática e Línguas são iguais). */
const computerLabSections: Topic[] = [
  {
    name: "Como funciona",
    text: "Cada aluno trabalha em um computador durante as aulas práticas. O professor demonstra no projetor e a turma programa junto.",
  },
  {
    name: "Infraestrutura",
    text: "Bancadas com computadores ligados à internet, monitores, cadeiras, projetor, quadro e os programas usados pelos desenvolvedores: editores de código, navegadores e bancos de dados.",
  },
  {
    name: "Nas aulas do curso técnico",
    text: "Lógica de programação, desenvolvimento web e mobile, banco de dados e os projetos em equipe — incluindo os projetos apresentados na Expotec.",
  },
  {
    name: "Estudos e pesquisas",
    text: "Pesquisas, produção de trabalhos, apresentações e simulados online das disciplinas da base comum.",
  },
];

/** Laboratórios: só exploração, sem missão. O modal abre ao entrar. */
export const labInfo: Record<string, { intro: string; sections: Topic[] }> = {
  informatica: {
    intro:
      "O coração do curso de Desenvolvimento de Sistemas. Tudo o que se faz aqui também é feito no Laboratório de Línguas.",
    sections: computerLabSections,
  },
  linguas: {
    intro:
      "Apesar do nome, não é uma sala de idiomas: na prática ele funciona como um segundo Laboratório de Informática. Tudo o que se faz no Laboratório de Informática também é feito aqui — a única diferença entre os dois é o nome na placa.",
    sections: computerLabSections,
  },
  ciencias: {
    intro: "Química, Biologia e Física saem do livro e viram experimento.",
    sections: [
      {
        name: "Como funciona",
        text: "Em grupos, nas bancadas, a turma realiza experimentos guiados pelo professor, sempre com jaleco, óculos e as normas de segurança.",
      },
      {
        name: "Infraestrutura",
        text: "Bancadas com pias, vidrarias (béqueres, tubos de ensaio, erlenmeyers), microscópios, modelos anatômicos, kits de Física e a tabela periódica na parede.",
      },
      {
        name: "Nas aulas do curso técnico",
        text: "Método científico, levantamento de hipóteses e registro de resultados: o mesmo raciocínio usado para testar e depurar sistemas.",
      },
      {
        name: "Na base comum",
        text: "Aulas práticas de Química, Biologia e Física, que ajudam a entender os conteúdos cobrados no ENEM.",
      },
    ],
  },
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

/** Quiz final do curso: 6 perguntas fáceis e diretas (gabarito: A, C, B, D, B, C). */
export const courseQuiz: QuizQuestion[] = [
  {
    question:
      "O que um estudante aprende na prática durante o curso técnico em Desenvolvimento de Sistemas?",
    options: [
      "A criar sites, aplicativos e sistemas de computador",
      "A consertar motores de carros e motos",
      "A fazer receitas de culinária e panificação",
      "A plantar árvores e cuidar de jardins",
    ],
    answer: 0,
    explanation: "Isso! Sites, aplicativos e sistemas são o que um desenvolvedor cria.",
  },
  {
    question:
      "Para criar a estrutura e o visual bonito de um site na internet, quais tecnologias básicas o aluno aprende logo no início do curso?",
    options: [
      "Martelo e Chave de Fenda",
      "Pincel e Tinta Guache",
      "HTML e CSS",
      "Régua e Compasso",
    ],
    answer: 2,
    explanation: "O HTML monta a estrutura da página e o CSS cuida do visual.",
  },
  {
    question: "O que é um algoritmo, muito estudado nas primeiras aulas de programação do curso?",
    options: [
      "Um tipo de cabo usado para ligar o monitor na tomada",
      "Uma sequência lógica de passos para resolver um problema ou realizar uma tarefa no computador",
      "O nome da cadeira usada no laboratório",
      "Um programa usado apenas para desenhar no papel",
    ],
    answer: 1,
    explanation: "Algoritmo é o passo a passo que o computador segue para resolver um problema.",
  },
  {
    question:
      "Quando um programador encontra um erro (chamado de 'bug') no código do seu aplicativo, o que ele precisa fazer?",
    options: [
      "Jogar o computador fora e comprar outro",
      "Desligar o Wi-Fi da escola inteira",
      "Pintar a tela do monitor",
      "Revisar o código, encontrar o problema e corrigir para o sistema voltar a funcionar",
    ],
    answer: 3,
    explanation:
      "Encontrar e corrigir bugs (a “depuração”) faz parte do dia a dia de quem programa.",
  },
  {
    question:
      "No 3º ano do curso técnico em Desenvolvimento de Sistemas, qual é a principal atividade prática onde os alunos aplicam o que aprenderam para ajudar a comunidade?",
    options: [
      "Pintar os muros externos da escola",
      "Desenvolver um projeto social na área de tecnologia, além de realizar o estágio supervisionado",
      "Fazer apenas provas de educação física na quadra",
      "Organizar torneios de futebol no refeitório",
    ],
    answer: 1,
    explanation: "No 3º ano vêm o estágio supervisionado e o projeto social de tecnologia.",
  },
  {
    question:
      "Por que os estudantes de Desenvolvimento de Sistemas aprendem a usar senhas fortes e proteger dados nos sistemas?",
    options: [
      "Para deixar a tela do computador mais colorida",
      "Para aumentar o volume das caixas de som",
      "Para manter as informações dos usuários seguras contra invasões e vazamentos",
      "Para economizar energia elétrica",
    ],
    answer: 2,
    explanation: "Segurança da informação protege os dados das pessoas que usam o sistema.",
  },
];

export const QUIZ_POINTS = 100;
