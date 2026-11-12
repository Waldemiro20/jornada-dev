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
 *   - Pátio central descoberto e arborizado entre os dois blocos.
 *       Bloco esquerdo: Secretaria, Sala dos Professores, Laboratório de
 *       Línguas e Laboratório de Informática.
 *       Bloco direito: Laboratório de Química, Biologia e Física e Sanitários.
 *   - Fundo: Refeitório e Quadra poliesportiva.
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
  /** false = espaço aberto, sem paredes (quadra) */
  walls?: boolean;
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
/** Abaixo disso o jogador está no térreo; acima, no 2º andar. */
export const LEVEL_SPLIT = FLOOR2_Y / 2;

/** Linhas principais da planta. */
export const FACADE_Z = 14.2;
export const ENTRANCE_HALF = 2.5;
export const BLOCK_X = 10.5; // fachada dos blocos voltada para os corredores
export const OUTER_X = 18.5; // paredes externas laterais
export const PATIO_X = 7.5; // borda do pátio central (peitoris)
export const BACK_Z = -21; // fundo dos blocos

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
    board: "Projeto Final · Expotec",
  },

  /* ---------------- Térreo: entrada ---------------- */
  {
    id: "auditorio",
    name: "Auditório",
    kind: "auditorium",
    x: LEFT_X,
    z: 9.5,
    w: 9,
    d: BLOCK_D,
    door: "e",
    doorW: 2.4,
    glassDoor: true,
    reliefSign: true,
    wallTex: "tiles",
    floor: "#57534e",
    accent: "#901a1e",
    board: "EXPOTEC",
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
    floor: "#e2e8f0",
    accent: "#dc2626",
    board: "HELLO · HOLA",
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
    x: -8.5,
    z: -25,
    w: 15,
    d: 7,
    door: "s",
    doorW: 3.2,
    floor: "#e8e1d5",
    accent: "#ea580c",
    board: "CARDÁPIO DO DIA",
  },
  {
    id: "quadra",
    name: "Quadra Poliesportiva",
    kind: "court",
    x: 10,
    z: -27.5,
    w: 16,
    d: 11,
    door: "s",
    walls: false,
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
export const roomWallH = (room: Room) => (roomLevel(room) === 1 ? WALL_H2 : WALL_H);
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
/** Saída lateral (lado esquerdo, entre o Auditório e a Secretaria) para fora do prédio. */
export const sideExit: Rect = { x0: -OUTER_X, x1: -BLOCK_X, z0: 2, z1: 5 };

/** Divisórias internas da Secretaria (local): janelas de atendimento e diretoria. */
export const SERVICE_LZ = 1.2;
export const OFFICE_LZ = -2;
const secretaria = roomById["secretaria"]!;

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

const buildingWalls: Wall[] = [
  // fachada principal em placas quadradas cinza ardósia
  {
    x: (-OUTER_X - ENTRANCE_HALF) / 2,
    z: FACADE_Z,
    sx: OUTER_X - ENTRANCE_HALF,
    sz: WALL_T,
    axis: "x",
    y0: 0,
    h: WALL_H,
    color: "#35393c",
    tex: "tiles",
  },
  {
    x: (OUTER_X + ENTRANCE_HALF) / 2,
    z: FACADE_Z,
    sx: OUTER_X - ENTRANCE_HALF,
    sz: WALL_T,
    axis: "x",
    y0: 0,
    h: WALL_H,
    color: "#35393c",
    tex: "tiles",
  },
  // parede branca do chão ao teto, ao lado da rampa (o mural "SAM" foi para o lado da SAÍDA)
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
  // fechamento alto do pátio coberto: Auditório (placas escuras), acima da saída e da Biblioteca
  hallBand(-BLOCK_X, sideExit.z1, FACADE_Z, "#35393c", "tiles"),
  hallBand(-BLOCK_X, sideExit.z0, sideExit.z1, "#f8fafc"),
  hallBand(BLOCK_X, muralWall.z1, FACADE_Z, "#f8fafc"),
  // Secretaria: divisória com janelas de atendimento (passagem lateral) …
  localWall(secretaria, -secretaria.w / 2, 1.6, SERVICE_LZ, SERVICE_LZ),
  // … e salas da diretoria ao fundo (Direção · Coordenação)
  localWall(secretaria, -secretaria.w / 2, -2, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, -1, 1, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, 2, secretaria.w / 2, OFFICE_LZ, OFFICE_LZ),
  localWall(secretaria, 0, 0, -secretaria.d / 2, OFFICE_LZ),
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
export const bridge: Rect = { x0: -BLOCK_X, x1: ramp.top.x0, z0: hall.z0, z1: sideExit.z0 };
/** Corredor aberto do 2º andar (sobre o corredor térreo do bloco esquerdo). */
export const upperCorridor: Rect = { x0: -BLOCK_X, x1: -PATIO_X, z0: -19, z1: sideExit.z0 };
/** Laje das salas de DS. */
export const upperRooms: Rect = { x0: -OUTER_X, x1: -BLOCK_X, z0: -19, z1: sideExit.z0 };
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
export const PILLAR_Z_EAST = [-17, -11, -6, -1, 4.6];

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
];

/** Limites da escola (muro). */
export const bounds = { x0: -20, x1: 20, z0: -35, z1: 22.5 };

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
      id: string;
      room: string;
      type: "quiz";
      title: string;
      intro: string;
      question: string;
      options: string[];
      answer: number;
      explanation: string;
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
    }
  | {
      id: string;
      room: string;
      type: "reflection";
      title: string;
      intro: string;
      question: string;
    };

/**
 * Ordem da trilha: o guia Chrystian começa pelas salas de DS (2º andar).
 * Os laboratórios não têm missão: são só exploração (veja `labInfo`).
 */
export const missions: Mission[] = [
  {
    id: "m-sala1",
    room: "sala1",
    type: "reflection",
    title: "1º ano · Adaptação e fundamentos",
    intro:
      "Esta é a sala 1º Desenvolvimento, no 2º andar! A professora Clara Mendes e a turma (Vitor, Rikelme, Miguel, Izabely e Ray) estão começando a jornada: adaptação ao tempo integral e os fundamentos da programação.",
    question: "Qual sua expectativa para o primeiro ano no curso de DS?",
  },
  {
    id: "m-sala2",
    room: "sala2",
    type: "reflection",
    title: "2º ano · Prática técnica e grupos do ENEM",
    intro:
      "Na sala 2º Desenvolvimento, o professor Natan e a turma (Aloson, Viny, Vinícius, Bia e Kaio) intensificam a prática técnica e começam a preparação para o ENEM.",
    question: "Qual sua expectativa para o 2º ano de Desenvolvimento de Sistemas na EEEP SAM?",
  },
  {
    id: "m-sala3",
    room: "sala3",
    type: "reflection",
    title: "3º ano · Reta final: ENEM, estágio e Expotec",
    intro:
      "Na sala 3º Desenvolvimento, o professor Antoine e a turma (Waldemiro, Devid, Felipe, Dailane e Fernanda) estão na reta final: ENEM, estágio e Expotec!",
    question:
      "Qual sua expectativa para o 3º ano de Desenvolvimento de Sistemas na EEEP SAM (ENEM, estágio e Expotec)?",
  },
  {
    id: "m-secretaria",
    room: "secretaria",
    type: "collect",
    title: "A ficha de matrícula",
    intro:
      "A secretária precisa de uma ficha de matrícula que ficou esquecida perto das cadeiras de espera. Encontre-a e entregue no balcão!",
    item: "document",
    itemName: "Ficha de matrícula",
    at: [-2.2, 3.4],
    success: "Ficha entregue! A Secretaria agradece a ajuda.",
  },
  {
    id: "m-professores",
    room: "professores",
    type: "collect",
    title: "O diário perdido",
    intro: "Um professor esqueceu o diário de classe em algum lugar da sala. Encontre-o!",
    item: "diary",
    itemName: "Diário de classe",
    at: [-1.9, -1.8],
    success: "Diário entregue! Os professores agradecem a ajuda.",
  },
  {
    id: "m-biblioteca",
    room: "biblioteca",
    type: "collect",
    title: "O livro de lógica",
    intro: "Encontre o livro “Lógica de Programação” nas estantes da biblioteca.",
    item: "book",
    itemName: "Livro de Lógica de Programação",
    at: [2.6, -2.4],
    success: "Livro emprestado! Lembre-se de devolver no prazo.",
  },
  {
    id: "m-cantina",
    room: "cantina",
    type: "quiz",
    title: "Hora do almoço",
    intro: "Em tempo integral, alimentação é energia para estudar a tarde toda.",
    question: "Qual prato é mais equilibrado para o almoço?",
    options: [
      "Arroz, feijão, salada e frango",
      "Só refrigerante e salgadinho",
      "Apenas doces",
      "Ficar sem almoçar",
    ],
    answer: 0,
    explanation: "Um prato com carboidrato, proteína, leguminosas e verduras mantém a energia.",
  },
  {
    id: "m-auditorio",
    room: "auditorio",
    type: "quiz",
    title: "Palco da Expotec",
    intro: "O auditório recebe palestras, formaturas e a Expotec.",
    question: "O que é a Expotec?",
    options: [
      "Feira onde os alunos apresentam seus projetos técnicos",
      "Uma prova de recuperação",
      "Um jogo de futebol",
      "A reunião de pais",
    ],
    answer: 0,
    explanation:
      "Na Expotec os cursos técnicos mostram à comunidade os projetos criados pelos alunos.",
  },
  {
    id: "m-quadra",
    room: "quadra",
    type: "collect",
    title: "Intervalo na quadra",
    intro: "A turma vai jogar no intervalo. Pegue a bola no meio da quadra!",
    item: "ball",
    itemName: "Bola",
    at: [0, 0],
    success: "Bola pega! Esporte também faz parte da formação.",
  },
];

export const missionByRoom = Object.fromEntries(missions.map((m) => [m.room, m])) as Record<
  string,
  Mission
>;

export const XP_PER_MISSION = 100;
export const XP_FIRST_TRY_BONUS = 50;

/* ------------------------------------------------------------------ */
/* Rota "curso": conteúdos das salas de DS, quiz e ranking             */
/* ------------------------------------------------------------------ */

export type Route = "escola" | "curso";

/** Salas visitadas na rota do curso, em ordem. */
export const COURSE_ROOMS = ["sala1", "sala2", "sala3"] as const;

export type Topic = { name: string; text: string };

/** O que o modal de cada sala de DS apresenta, com um destaque do ano. */
export const courseContent: Record<string, { year: string; topics: Topic[]; highlight?: Topic }> = {
  sala1: {
    year: "1º ano",
    topics: [
      {
        name: "Como funcionam as aulas",
        text: "As disciplinas da base comum (Português, Matemática, Ciências…) e as do curso técnico dividem a semana. Você estuda o ensino médio e a profissão ao mesmo tempo.",
      },
      {
        name: "Introdução à lógica de programação",
        text: "O ponto de partida do curso: aprender a resolver problemas passo a passo com algoritmos, antes de escrever código de verdade.",
      },
      {
        name: "A rotina do curso técnico",
        text: "Aulas práticas no laboratório de informática, projetos em equipe e professores acompanhando de perto a evolução de cada aluno.",
      },
      {
        name: "Adaptação ao tempo integral",
        text: "As aulas vão das 7h às 17h, com almoço na escola. O primeiro ano é para se acostumar com o novo ritmo, fazer amizades e criar hábitos de estudo.",
      },
    ],
  },
  sala2: {
    year: "2º ano",
    topics: [
      {
        name: "Prática técnica intensificada",
        text: "Os conteúdos técnicos ficam mais fortes: bancos de dados, desenvolvimento web e mobile, com projetos cada vez mais completos.",
      },
      {
        name: "Início da preparação para o ENEM",
        text: "Junto com o técnico, a escola começa a preparar a turma para o ENEM, com revisões, simulados e acompanhamento do desempenho.",
      },
    ],
    highlight: {
      name: "Grupos de Estudo de Matemática e Português",
      text: "A turma é dividida em grupos para focar no fortalecimento das competências cobradas no ENEM e no SPAECE. Cada grupo trabalha no seu ritmo, revisando o que mais precisa.",
    },
  },
  sala3: {
    year: "3º ano",
    topics: [
      {
        name: "Preparação total para o ENEM",
        text: "É o ano do “agora é valendo”: revisões intensas, simulados e foco total no ENEM e nos vestibulares.",
      },
      {
        name: "Projeto final",
        text: "A turma desenvolve um sistema completo, do planejamento à entrega, aplicando tudo o que aprendeu nos três anos.",
      },
    ],
    highlight: {
      name: "Estágio supervisionado, projeto e Expotec",
      text: "O desafio do 3º ano é conciliar o Estágio Curricular Supervisionado nas empresas, com acompanhamento da escola, com a elaboração do projeto final e a apresentação para a comunidade na Expotec.",
    },
  },
};

/** Laboratórios: só exploração, sem missão. O modal abre ao entrar. */
export const labInfo: Record<string, { intro: string; sections: Topic[] }> = {
  informatica: {
    intro: "O coração do curso de Desenvolvimento de Sistemas.",
    sections: [
      {
        name: "Como funciona",
        text: "Cada aluno trabalha em um computador durante as aulas práticas. O professor demonstra no projetor e a turma programa junto.",
      },
      {
        name: "Infraestrutura",
        text: "Bancadas com computadores ligados à internet, projetor, quadro e os programas usados pelos desenvolvedores: editores de código, navegadores e bancos de dados.",
      },
      {
        name: "Nas aulas do curso técnico",
        text: "Lógica de programação, desenvolvimento web e mobile, banco de dados e os projetos em equipe — incluindo o projeto final da Expotec.",
      },
      {
        name: "Na base comum",
        text: "Pesquisas, produção de trabalhos, apresentações e simulados online das outras disciplinas.",
      },
    ],
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
  linguas: {
    intro: "Onde o inglês e o espanhol ganham voz.",
    sections: [
      {
        name: "Como funciona",
        text: "Atividades de escuta, fala, leitura e escrita, com áudios e vídeos para treinar a pronúncia e a compreensão.",
      },
      {
        name: "Infraestrutura",
        text: "Carteiras com fones de ouvido, recursos de áudio e vídeo, projetor e materiais didáticos de língua estrangeira.",
      },
      {
        name: "Nas aulas do curso técnico",
        text: "Inglês técnico: a maioria das linguagens, ferramentas e documentações de programação está em inglês.",
      },
      {
        name: "Na base comum",
        text: "Aulas de inglês e espanhol e a preparação para a prova de língua estrangeira do ENEM.",
      },
    ],
  },
};

export type QuizQuestion = {
  year: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

/** Quiz final: 6 perguntas fáceis, 2 de cada ano do curso. */
export const courseQuiz: QuizQuestion[] = [
  {
    year: "1º ano",
    question: "Em qual disciplina você acha que vai começar a aprender programação?",
    options: ["Educação Física", "Lógica de Programação", "Geografia", "Artes"],
    answer: 1,
    explanation:
      "A introdução à lógica de programação abre o curso: resolver problemas passo a passo!",
  },
  {
    year: "1º ano",
    question: "Como é o horário de aulas na EEEP?",
    options: [
      "Só pela manhã",
      "Só à noite",
      "Tempo integral, das 7h às 17h",
      "Um dia sim, outro não",
    ],
    answer: 2,
    explanation: "A EEEP é de tempo integral — o 1º ano é para se adaptar a esse novo ritmo.",
  },
  {
    year: "2º ano",
    question: "Onde ficam guardadas as informações de um sistema, como nomes e notas dos alunos?",
    options: ["No banco de dados", "Na mochila", "No mouse", "Na caixa de som"],
    answer: 0,
    explanation: "Bancos de dados são um dos conteúdos técnicos que ganham força no 2º ano.",
  },
  {
    year: "2º ano",
    question: "Para que servem os Grupos de Estudo de Matemática e Português do 2º ano?",
    options: [
      "Para organizar festas",
      "Para fortalecer as competências do ENEM e do SPAECE",
      "Para escolher o time de futebol",
      "Para trocar de curso",
    ],
    answer: 1,
    explanation: "A turma é dividida em grupos para reforçar o que o ENEM e o SPAECE cobram.",
  },
  {
    year: "3º ano",
    question: "O que o aluno de DS faz no estágio supervisionado do 3º ano?",
    options: [
      "Trabalha em uma empresa aplicando o que aprendeu",
      "Fica de férias o ano todo",
      "Só assiste vídeos em casa",
      "Muda de curso",
    ],
    answer: 0,
    explanation: "No estágio você vive a rotina de uma empresa de verdade, com apoio da escola.",
  },
  {
    year: "3º ano",
    question: "Onde os alunos apresentam o projeto final para a comunidade?",
    options: ["Na cantina", "Na Expotec", "Na quadra, no intervalo", "Em lugar nenhum"],
    answer: 1,
    explanation: "Na Expotec os alunos mostram à comunidade os projetos que criaram.",
  },
];

export const QUIZ_POINTS = 100;
