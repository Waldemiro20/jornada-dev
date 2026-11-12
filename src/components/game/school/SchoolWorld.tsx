import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, Sky } from "@react-three/drei";
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  Object3D,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type DirectionalLight,
  type Group,
  type InstancedMesh,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type PerspectiveCamera,
  type Texture,
} from "three";
import { NpcFigure } from "./NpcFigure";
import { CLASS_COLS, CLASS_ROWS, npcs } from "@/game/people";
import type { AvatarLook } from "@/game/avatar";
import {
  BACK_Z,
  BLOCK_X,
  bridge,
  collide,
  corridorEast,
  corridorWest,
  courtyard,
  courtyardEast,
  doorAngle,
  doorFront,
  ENTRANCE_HALF,
  FACADE_Z,
  floorHeight,
  FLOOR2_Y,
  GUARD_H,
  hall,
  type Rect,
  inRect,
  isInside,
  LANDING_Y,
  LEVEL_SPLIT,
  muralWall,
  sideExit,
  OFFICE_LZ,
  OUTER_X,
  PARAPET_H,
  parapets,
  PATIO_X,
  PILLAR_Z_EAST,
  PILLAR_Z_WEST,
  ramp,
  ROOF_Y,
  roomById,
  roomLevel,
  rooms,
  roomWallH,
  roomY,
  SERVICE_LZ,
  spawn,
  toWorld,
  upperCorridor,
  upperRooms,
  walls,
  WALL_H,
  WALL_H2,
  type CollectItem,
  type Mission,
  type Room,
  type Wall,
} from "@/game/school";

/** Posição do jogador no chão; `y` é a altura do piso onde ele está (térreo = 0). */
export type Vec2 = { x: number; z: number; y?: number; yaw?: number };
/** Ações do jogador: run é contínuo; jump/punch são pedidos consumidos no próximo quadro. */
export type Controls = { run: boolean; jump: boolean; punch: boolean };

/* ------------------------------------------------------------------ */
/* Primitivas                                                          */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];

function B({
  p,
  s,
  c,
  e,
  ei = 0.8,
  r,
}: {
  p: V3;
  s: V3;
  c: string;
  e?: string;
  ei?: number;
  r?: V3;
}) {
  return (
    <mesh position={p} rotation={r ?? [0, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={c}
        roughness={0.75}
        emissive={e ?? "#000000"}
        emissiveIntensity={e ? ei : 0}
      />
    </mesh>
  );
}

/** bg "transparent" = letras soltas em relevo (letreiro metálico da fachada). */
function useTextTexture(lines: string[], bg: string, fg: string, width = 512, height = 256) {
  const key = lines.join("|");
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const relief = bg === "transparent";
    if (!relief) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const parts = key.split("|");
    const size = Math.min(
      height / (parts.length + 0.6),
      (width / Math.max(...parts.map((l) => l.length))) * 1.6,
    );
    ctx.font = `bold ${Math.floor(size)}px sans-serif`;
    parts.forEach((line, i) => {
      const y = (height / (parts.length + 1)) * (i + 1);
      if (relief) {
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillText(line, width / 2 + size * 0.06, y + size * 0.08);
      }
      ctx.fillStyle = fg;
      ctx.fillText(line, width / 2, y);
    });
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, [key, bg, fg, width, height]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/* ------------------------------------------------------------------ */
/* Identidade visual (guia EEEP Dr. Salomão) e texturas procedurais    */
/* ------------------------------------------------------------------ */

const RED = "#901a1e"; // vermelho vinho institucional
const RED_DARK = "#7a171a";
const TRUSS = "#a3191d"; // treliça metálica vermelha
const GREEN = "#14703a"; // verde institucional
const GREEN_DARK = "#0f5a2e";
const CERAMIC = "#e8e1d5"; // cerâmica industrial dos corredores/refeitório
const METAL = "#2d3138";
const FENCE_GREEN = "#1f4d2b";

type Pattern =
  | "tiles"
  | "pavers"
  | "hallFloor"
  | "azulejo"
  | "facade"
  | "roof"
  | "ceramic"
  | "mural"
  | "fence"
  | "emblem"
  | "schoolPainting";

/** Pátio de entrada: textura única em escala real (50 px por metro). */
const HALL_PX = 50;
/** Semicírculo bege (voltado para a Entrada) contornado pelo arco vermelho. */
const ARC = { x: 0, z: 7.6, inner: 3.2, outer: 4.7 };

const PATTERN_SIZE: Record<Pattern, [number, number]> = {
  tiles: [128, 128],
  pavers: [512, 512],
  hallFloor: [Math.round((hall.x1 - hall.x0) * HALL_PX), Math.round((hall.z1 - hall.z0) * HALL_PX)],
  azulejo: [128, 256],
  facade: [256, 256],
  roof: [64, 64],
  ceramic: [128, 128],
  mural: [512, 680],
  fence: [64, 64],
  emblem: [256, 320],
  schoolPainting: [1024, 256],
};

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function drawPattern(kind: Pattern, ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rand = seeded(kind.length * 97 + 13);
  switch (kind) {
    case "pavers":
    case "hallFloor": {
      // blocos retangulares em espinha de peixe (cinza com alguns beges); no pátio de
      // entrada, um arco largo e contínuo vermelho contorna um semicírculo bege
      const hallMode = kind === "hallFloor";
      ctx.fillStyle = "#8d8a84";
      ctx.fillRect(0, 0, w, h);
      const u = hallMode ? 15 : 16; // 15 px = 0,30 m no pátio (50 px/m)
      const tone = (x: number, y: number): "gray" | "beige" | "red" => {
        if (hallMode) {
          const wx = hall.x0 + x / HALL_PX;
          const wz = hall.z0 + y / HALL_PX;
          const r = Math.hypot(wx - ARC.x, wz - ARC.z);
          if (wz >= ARC.z - 0.15) {
            if (r < ARC.inner) return "beige";
            if (r < ARC.outer) return "red";
          }
        }
        return rand() < 0.12 ? "beige" : "gray";
      };
      const colors = {
        gray: ["#c9cbcd", "#c1c3c6", "#cfd1d2"],
        beige: ["#d9c7a6", "#d2bf9c", "#dfcfb1"],
        red: ["#a8322b", "#9b2c26", "#b23a31"],
      } as const;
      // espinha de peixe 90°: degraus (k) deslocados pelo vetor (2u, -2u) (m)
      const n = Math.ceil(Math.max(w, h) / u) + 4;
      for (let m = -n; m <= n; m += 1)
        for (let k = -2 * n; k <= 2 * n; k += 1) {
          const bx = k * u + 2 * u * m;
          const by = k * u - 2 * u * m;
          const cells: [number, number, number, number][] = [
            [bx, by, 2 * u, u],
            [bx, by + u, u, 2 * u],
          ];
          for (const [cx, cy, cw, chh] of cells) {
            if (cx > w || cy > h || cx + cw < 0 || cy + chh < 0) continue;
            const t = tone(cx + cw / 2, cy + chh / 2);
            const list = colors[t];
            ctx.fillStyle = list[Math.floor(rand() * list.length)]!;
            ctx.fillRect(cx + 1, cy + 1, cw - 2, chh - 2);
          }
        }
      for (let k = 0; k < 900; k += 1) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(rand() * w, rand() * h, 2, 2);
      }
      return;
    }
    case "tiles": {
      // placas quadradas escuras do Auditório, com rejunte
      ctx.fillStyle = "#1f2224";
      ctx.fillRect(0, 0, w, h);
      const tones = ["#35393c", "#383c40", "#313537", "#3a3e42"];
      for (let i = 0; i < 2; i += 1)
        for (let j = 0; j < 2; j += 1) {
          ctx.fillStyle = tones[(i * 2 + j + 1) % 4]!;
          ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 60);
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(i * 64 + 2, j * 64 + 2, 60, 3);
        }
      return;
    }
    case "azulejo": {
      // parede interna: azulejo branco até meia altura, filete vermelho, pintura branca acima
      ctx.fillStyle = "#f6f6f3";
      ctx.fillRect(0, 0, w, h);
      const half = h * 0.5;
      ctx.fillStyle = "#d9dadb";
      ctx.fillRect(0, half, w, h - half);
      for (let y = half; y < h; y += 32)
        for (let x = 0; x < w; x += 32) {
          ctx.fillStyle = "#fbfbfa";
          ctx.fillRect(x + 1, y + 1, 30, 30);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillRect(x + 2, y + 2, 26, 3);
        }
      ctx.fillStyle = "#b3201f";
      ctx.fillRect(0, half - 10, w, 10);
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(0, half, w, 1);
      return;
    }
    case "facade": {
      // reboco branco com faixa e rodapé verde institucional
      ctx.fillStyle = "#fbfbf8";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = GREEN;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
      ctx.fillRect(0, h * 0.06, w, h * 0.06);
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (let k = 0; k < 400; k += 1) ctx.fillRect(rand() * w, rand() * h, 2, 2);
      return;
    }
    case "roof": {
      // telha metálica trapezoidal
      for (let x = 0; x < w; x += 1) {
        const v = Math.sin((x / w) * Math.PI * 2);
        const c = Math.round(196 + v * 26);
        ctx.fillStyle = `rgb(${c},${c + 3},${c + 6})`;
        ctx.fillRect(x, 0, 1, h);
      }
      return;
    }
    case "ceramic": {
      ctx.fillStyle = "#c9c2b6";
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64)
        for (let y = 0; y < h; y += 64) {
          ctx.fillStyle = ["#e8e1d5", "#e3dccf", "#ece6db"][Math.floor(rand() * 3)]!;
          ctx.fillRect(x + 1, y + 1, 62, 62);
        }
      return;
    }
    case "mural": {
      // parede azul de pé-direito alto: sol no alto, "SAM" colorido, escada de tijolos e vegetação
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#1a54a3");
      sky.addColorStop(1, "#3f8fdc");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const sx = w * 0.7;
      const sy = 120;
      ctx.fillStyle = "#fcd34d";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 9;
      for (let i = 0; i < 14; i += 1) {
        const a = (i / 14) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(sx + Math.cos(a) * 72, sy + Math.sin(a) * 72);
        ctx.lineTo(sx + Math.cos(a) * 108, sy + Math.sin(a) * 108);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 190px sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ["S", "A", "M"].forEach((letter, i) => {
        const x = 110 + i * 150;
        const y = 330;
        for (let d = 12; d > 0; d -= 2) {
          ctx.fillStyle = "#1e1b4b";
          ctx.fillText(letter, x + d, y + d);
        }
        ctx.fillStyle = ["#22c55e", "#f97316", "#facc15"][i]!;
        ctx.fillText(letter, x, y);
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#ffffff";
        ctx.strokeText(letter, x, y);
      });
      // escada de tijolos subindo
      for (let i = 0; i < 6; i += 1) {
        const bx = 40 + i * 34;
        const by = h - 50 - i * 24;
        for (let r = 0; r < (h - by) / 12; r += 1)
          for (let c = 0; c < 2; c += 1) {
            ctx.fillStyle = (r + c) % 2 ? "#b45309" : "#c2410c";
            ctx.fillRect(bx + c * 17 + ((r % 2) * 8 - 4), by + r * 12, 16, 11);
          }
      }
      for (const [color, amp, y0] of [
        ["#2f8f3a", 30, h - 95],
        ["#3fae4a", 20, h - 55],
      ] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, y0 + Math.sin(x / 60 + amp) * amp * 0.6);
        ctx.lineTo(w, h);
        ctx.fill();
      }
      for (let i = 0; i < 5; i += 1) {
        const x = 260 + i * 60 + rand() * 20;
        ctx.fillStyle = "#1f7a33";
        for (let k = 0; k < 5; k += 1) {
          ctx.beginPath();
          ctx.ellipse(x, h - 60, 10, 42, -0.9 + k * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }
    case "fence": {
      // grade de barras verticais (fundo transparente)
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = FENCE_GREEN;
      ctx.fillRect(28, 0, 8, h);
      return;
    }
    case "emblem": {
      // brasão estilizado (não é reprodução de brasão oficial)
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#e5e7eb";
      ctx.beginPath();
      ctx.moveTo(28, 20);
      ctx.lineTo(w - 28, 20);
      ctx.lineTo(w - 28, 160);
      ctx.quadraticCurveTo(w / 2, 300, 28, 160);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.moveTo(44, 36);
      ctx.lineTo(w - 44, 36);
      ctx.lineTo(w - 44, 156);
      ctx.quadraticCurveTo(w / 2, 276, 44, 156);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(w / 2, 110, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.font = "bold 40px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SAM", w / 2, 112);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText("EEEP", w / 2, 205);
      return;
    }
    case "schoolPainting": {
      // pintura da fachada da escola: céu, prédio verde e branco, pátio coberto
      // com treliças vinho, coqueiros e o nome da escola
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.75);
      sky.addColorStop(0, "#3b82c4");
      sky.addColorStop(1, "#bfe3f5");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // sol e nuvens em pinceladas
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(w * 0.88, 48, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (const [cx, cy] of [
        [140, 40],
        [420, 28],
        [700, 50],
      ] as const)
        for (let k = 0; k < 5; k += 1) {
          ctx.beginPath();
          ctx.ellipse(cx + k * 18 - 36, cy + (k % 2) * 6, 26, 12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      const ground = h * 0.8;
      // grama e calçada
      ctx.fillStyle = "#4d9a3a";
      ctx.fillRect(0, ground, w, h - ground);
      ctx.fillStyle = "#cfc8bb";
      ctx.fillRect(w * 0.44, ground, w * 0.12, h - ground);
      // blocos laterais: 2 andares, branco com faixas verdes e janelas
      const block = (x0: number, x1: number, top: number) => {
        ctx.fillStyle = "#f5f5f0";
        ctx.fillRect(x0, top, x1 - x0, ground - top);
        ctx.fillStyle = GREEN;
        ctx.fillRect(x0, top, x1 - x0, 8);
        ctx.fillRect(x0, ground - 18, x1 - x0, 18);
        ctx.fillRect(x0, (top + ground) / 2 - 3, x1 - x0, 6);
        for (const y of [top + 18, (top + ground) / 2 + 12])
          for (let x = x0 + 14; x + 30 < x1; x += 44) {
            ctx.fillStyle = "#8cc4e0";
            ctx.fillRect(x, y, 30, 26);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillRect(x + 2, y + 2, 10, 22);
          }
      };
      block(40, w * 0.4, 80);
      block(w * 0.6, w - 40, 80);
      // pátio coberto central: pé-direito alto, treliças vinho e telhado metálico
      const hx0 = w * 0.4;
      const hx1 = w * 0.6;
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(hx0 - 6, 52, hx1 - hx0 + 12, 10);
      ctx.strokeStyle = RED;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(hx0, 66);
      ctx.lineTo(hx1, 66);
      for (let x = hx0; x < hx1; x += 20) {
        ctx.moveTo(x, 66);
        ctx.lineTo(x + 10, 80);
        ctx.lineTo(x + 20, 66);
      }
      ctx.stroke();
      ctx.fillStyle = "#3a3a3a";
      ctx.fillRect(hx0, 82, hx1 - hx0, ground - 82);
      ctx.fillStyle = RED;
      for (const x of [hx0 + 4, hx1 - 14, (hx0 + hx1) / 2 - 5]) ctx.fillRect(x, 66, 10, ground - 66);
      // letreiro com o nome da escola
      ctx.fillStyle = GREEN_DARK;
      ctx.fillRect(w * 0.27, ground - 62, w * 0.46, 30);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("EEEP Dr. Salomão Alves de Moura", w / 2, ground - 47);
      // coqueiros
      for (const x of [24, 300, 724, w - 24]) {
        ctx.strokeStyle = "#7c4a26";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, ground + 6);
        ctx.quadraticCurveTo(x + 8, ground - 60, x, ground - 110);
        ctx.stroke();
        ctx.fillStyle = "#1f7a33";
        for (let k = 0; k < 6; k += 1) {
          ctx.beginPath();
          ctx.ellipse(x, ground - 110, 6, 34, -1.3 + k * 0.52, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // textura de tinta (pinceladas)
      for (let k = 0; k < 2500; k += 1) {
        ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
        ctx.fillRect(rand() * w, rand() * h, 3 + rand() * 6, 2);
      }
      return;
    }
  }
}

const patternCanvases = new Map<Pattern, HTMLCanvasElement>();

function patternCanvas(kind: Pattern) {
  let canvas = patternCanvases.get(kind);
  if (!canvas) {
    const [w, h] = PATTERN_SIZE[kind];
    canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) drawPattern(kind, ctx, w, h);
    patternCanvases.set(kind, canvas);
  }
  return canvas;
}

/** Textura procedural repetida rx × ry vezes na superfície. */
function usePattern(kind: Pattern, rx = 1, ry = 1) {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const tex = new CanvasTexture(patternCanvas(kind));
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(rx, ry);
    tex.anisotropy = 4;
    return tex;
  }, [kind, rx, ry]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/** Piso texturizado: caixa fina com a textura repetida a cada `tile` metros. */
function Floor({
  p,
  s,
  pattern,
  tile = 1,
}: {
  p: V3;
  s: [number, number];
  pattern: Pattern;
  tile?: number;
}) {
  const map = usePattern(pattern, s[0] / tile, s[1] / tile);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial map={map} roughness={0.9} />
    </mesh>
  );
}

/**
 * Treliça metálica plana (banzo superior, inferior e diagonais) ao longo do eixo x local.
 * Use `r` para girar (Math.PI / 2 = ao longo de z).
 */
function Truss({
  p,
  length,
  h = 0.45,
  r = 0,
  c = TRUSS,
}: {
  p: V3;
  length: number;
  h?: number;
  r?: number;
  c?: string;
}) {
  const n = Math.max(2, Math.round(length / 1.6));
  const seg = length / n;
  const diag = Math.hypot(seg, h);
  const tilt = Math.atan2(h, seg);
  return (
    <group position={p} rotation={[0, r, 0]}>
      <B p={[0, h / 2, 0]} s={[length, 0.09, 0.12]} c={c} />
      <B p={[0, -h / 2, 0]} s={[length, 0.07, 0.1]} c={c} />
      {Array.from({ length: n }, (_, i) => (
        <B
          key={i}
          p={[-length / 2 + seg * (i + 0.5), 0, 0]}
          s={[diag, 0.05, 0.06]}
          r={[0, 0, i % 2 ? tilt : -tilt]}
          c={c}
        />
      ))}
    </group>
  );
}

function Sign({
  lines,
  p,
  size,
  bg = "#f8fafc",
  fg = "#14532d",
  glow = false,
  r,
}: {
  lines: string[];
  p: V3;
  size: [number, number];
  bg?: string;
  fg?: string;
  glow?: boolean;
  r?: V3;
}) {
  const tw = size[0] > 4 ? 2048 : 512;
  const map = useTextTexture(lines, bg, fg, tw, Math.round((tw * size[1]) / size[0]));
  if (!map) return null;
  return (
    <mesh position={p} rotation={r ?? [0, 0, 0]}>
      <planeGeometry args={size} />
      {glow ? (
        <meshBasicMaterial map={map} toneMapped={false} />
      ) : bg === "transparent" ? (
        <meshStandardMaterial
          map={map}
          roughness={0.35}
          metalness={0.3}
          transparent
          alphaTest={0.1}
        />
      ) : (
        <meshStandardMaterial map={map} roughness={0.8} />
      )}
    </mesh>
  );
}

const WOOD = "#b7794a";
const DARK = "#334155";

function Chair({ x, z, color, face = 0 }: { x: number; z: number; color: string; face?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, face, 0]}>
      <B p={[0, 0.45, 0]} s={[0.42, 0.05, 0.4]} c={color} />
      <B p={[0, 0.7, 0.19]} s={[0.42, 0.45, 0.05]} c={color} />
      <B p={[0, 0.22, 0]} s={[0.36, 0.44, 0.04]} c={DARK} />
    </group>
  );
}

function Computer({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 1.04, 0]} s={[0.5, 0.32, 0.03]} c="#0f172a" e="#3b82f6" ei={0.9} />
      <B p={[0, 0.86, 0.03]} s={[0.05, 0.16, 0.05]} c={DARK} />
      <B p={[0, 0.78, 0.18]} s={[0.4, 0.02, 0.14]} c="#1e293b" />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Interiores                                                          */
/* ------------------------------------------------------------------ */

/** Quadro branco com moldura de alumínio e bandeja de pincéis. */
function Whiteboard({ room, text }: { room: Room; text: string }) {
  const z = -room.d / 2 + 0.13;
  return (
    <group>
      <B p={[0, 1.5, z]} s={[3.1, 1.3, 0.05]} c="#9ca3af" />
      <B p={[0, 1.5, z + 0.02]} s={[2.95, 1.15, 0.03]} c="#f8fafc" />
      <Sign lines={[text]} p={[0, 1.55, z + 0.045]} size={[2.6, 0.9]} bg="#f8fafc" fg="#1e3a8a" />
      <B p={[0, 0.9, z + 0.08]} s={[2.4, 0.04, 0.1]} c="#9ca3af" />
      {[-0.4, -0.25, -0.1].map((x, i) => (
        <B
          key={x}
          p={[x, 0.94, z + 0.08]}
          s={[0.12, 0.03, 0.03]}
          c={["#1d4ed8", "#dc2626", "#111827"][i]!}
        />
      ))}
    </group>
  );
}

/** Carteira escolar: tampo de MDF claro sobre estrutura metálica + cadeira. */
function SchoolDesk({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 0.74, 0]} s={[0.6, 0.04, 0.45]} c="#e7d3b0" />
      {[-0.26, 0.26].map((dx) => (
        <B key={dx} p={[dx, 0.37, 0]} s={[0.03, 0.72, 0.4]} c={METAL} />
      ))}
      <Chair x={0} z={0.45} color={color} />
    </group>
  );
}

function Interior({ room }: { room: Room }) {
  const { w, d, accent } = room;
  const back = -d / 2;
  switch (room.kind) {
    case "classroom":
      return (
        <group>
          <Whiteboard room={room} text={room.board ?? ""} />
          {/* mesa do professor */}
          <B p={[1.5, 0.75, back + 1.3]} s={[1.3, 0.05, 0.65]} c={WOOD} />
          <B p={[1.5, 0.37, back + 1.3]} s={[1.2, 0.72, 0.6]} c="#7c4a26" />
          <group position={[0, 0.25, 0]}>
            <Computer x={1.8} z={back + 1.25} />
          </group>
          <Chair x={1.5} z={back + 0.8} color={DARK} face={Math.PI} />
          {/* fileiras de carteiras escolares */}
          {CLASS_COLS.flatMap((x) =>
            CLASS_ROWS.map((z) => <SchoolDesk key={`${x}:${z}`} x={x} z={z} color={accent} />),
          )}
          <B p={[-w / 2 + 0.12, 1.6, -0.6]} s={[0.04, 0.9, 1.4]} c="#b45309" />
          <B p={[-w / 2 + 0.15, 1.6, -0.6]} s={[0.02, 0.8, 1.3]} c="#fde68a" />
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (w / 2 - 0.25), 2.3, 0.6]}>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#e5e7eb" />
            </mesh>
          ))}
          <B p={[0, 2.45, back + 0.2]} s={[1, 0.3, 0.22]} c="#f8fafc" />
        </group>
      );
    case "lab-lang":
      return (
        <group>
          <Whiteboard room={room} text={room.board ?? ""} />
          <B p={[1.4, 0.4, back + 1.3]} s={[1.3, 0.8, 0.6]} c="#92400e" />
          <Chair x={1.4} z={back + 0.75} color={DARK} face={Math.PI} />
          {[-1.8, -0.6, 0.6, 1.8].flatMap((x) =>
            [-1.6, 0, 1.6, 3.2].map((z) => (
              <group key={`${x}:${z}`}>
                <SchoolDesk x={x} z={z} color={accent} />
                <mesh position={[x, 0.82, z]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.1, 0.02, 6, 12, Math.PI]} />
                  <meshStandardMaterial color="#111827" />
                </mesh>
              </group>
            )),
          )}
          <mesh position={[-1.6, 1.05, back + 1.1]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshStandardMaterial color="#2563eb" />
          </mesh>
          <B p={[-1.6, 0.4, back + 1.1]} s={[0.5, 0.8, 0.5]} c={WOOD} />
        </group>
      );
    case "lab-info":
      return (
        <group>
          <Whiteboard room={room} text={room.board ?? ""} />
          {[-2, -0.2, 1.6, 3.4].flatMap((z) =>
            [-1.5, 1.5].map((x) => (
              <group key={`${x}:${z}`}>
                <B p={[x, 0.74, z]} s={[2.4, 0.05, 0.7]} c="#e5e7eb" />
                <B p={[x, 0.36, z]} s={[2.3, 0.72, 0.05]} c={DARK} />
                {[-0.75, 0, 0.75].map((dx) => (
                  <group key={dx}>
                    <Computer x={x + dx} z={z - 0.12} />
                    <Chair x={x + dx} z={z + 0.55} color={accent} />
                  </group>
                ))}
              </group>
            )),
          )}
          <B p={[w / 2 - 0.45, 1, back + 0.45]} s={[0.6, 2, 0.6]} c="#111827" />
          <B p={[w / 2 - 0.45, 1.4, back + 0.76]} s={[0.4, 0.05, 0.02]} c="#22c55e" e="#22c55e" />
        </group>
      );
    case "lab-science":
      return <ScienceLab room={room} />;
    case "restroom":
      return <Restroom room={room} />;
    case "teachers":
      return (
        <group>
          <B p={[0, 0.38, -0.5]} s={[1.4, 0.76, 3.6]} c={WOOD} />
          {[-1.8, -1.0, -0.2, 0.6].flatMap((z) => [
            <Chair key={`l${z}`} x={-0.95} z={z} color={accent} face={-Math.PI / 2} />,
            <Chair key={`r${z}`} x={0.95} z={z} color={accent} face={Math.PI / 2} />,
          ])}
          {/* escaninhos dos professores */}
          <B p={[0, 0.95, back + 0.25]} s={[w - 1.2, 1.9, 0.45]} c="#64748b" />
          {[-2, -1, 0, 1, 2].map((x) => (
            <B key={x} p={[x * 0.9, 0.95, back + 0.48]} s={[0.02, 1.85, 0.01]} c="#1e293b" />
          ))}
          <B p={[2.2, 0.45, 3.2]} s={[0.6, 0.9, 1.2]} c="#e7e5e4" />
          <B p={[2.2, 1.05, 3]} s={[0.3, 0.3, 0.3]} c="#111827" />
          <B p={[-w / 2 + 0.12, 1.6, 2.4]} s={[0.04, 0.9, 1.6]} c="#b45309" />
        </group>
      );
    case "office":
      return <Secretaria room={room} />;
    case "library":
      return <Library room={room} />;
    case "auditorium":
      return <Auditorium room={room} />;
    case "canteen":
      return <Canteen room={room} />;
    case "court":
      return <Court room={room} />;
  }
}

/** Secretaria: portas de vidro, janelas de atendimento e salas da diretoria ao fundo. */
function Secretaria({ room }: { room: Room }) {
  const { w, d } = room;
  const back = -d / 2;
  return (
    <group>
      {/* recepção: cadeiras de espera voltadas para as janelas de atendimento */}
      {[-2.4, -1.6, -0.8, 0].map((x) => (
        <Chair key={`a${x}`} x={x} z={3} color="#1f2937" />
      ))}
      <B p={[-1.2, 0.25, 3]} s={[3, 0.04, 0.1]} c={METAL} />
      <B p={[w / 2 - 0.4, 0.55, d / 2 - 0.6]} s={[0.4, 1.1, 0.4]} c="#e5e7eb" />
      {/* janelas de atendimento na divisória */}
      {[-1.9, -0.1].map((x) => (
        <group key={x} position={[x, 0, SERVICE_LZ]}>
          <B p={[0, 1.6, 0.02]} s={[1.3, 1.0, 0.04]} c="#bfdbfe" e="#dbeafe" ei={0.15} />
          <B p={[0, 1.08, 0.18]} s={[1.5, 0.05, 0.4]} c="#d6d3d1" />
          <B p={[0, 2.12, 0.13]} s={[1.5, 0.05, 0.1]} c={GREEN} />
        </group>
      ))}
      <Sign
        lines={["ATENDIMENTO"]}
        p={[-1, 2.45, SERVICE_LZ + 0.12]}
        size={[2.4, 0.32]}
        bg={GREEN}
        fg="#ffffff"
      />
      {/* área interna da secretaria */}
      {[-1.9, -0.1].map((x) => (
        <group key={`m${x}`}>
          <B p={[x, 0.74, SERVICE_LZ - 0.6]} s={[1.3, 0.05, 0.6]} c={WOOD} />
          <B p={[x, 0.37, SERVICE_LZ - 0.6]} s={[1.2, 0.72, 0.55]} c="#7c4a26" />
          <Computer x={x} z={SERVICE_LZ - 0.75} />
        </group>
      ))}
      <Chair x={-0.1} z={SERVICE_LZ - 1.0} color={DARK} face={Math.PI} />
      {[-2.6, 2.6].map((x) => (
        <B key={x} p={[x, 0.7, OFFICE_LZ + 0.4]} s={[0.6, 1.4, 0.5]} c="#9ca3af" />
      ))}
      {/* salas da diretoria / administração */}
      {[
        [-w / 4, "DIREÇÃO", -1.5],
        [w / 4, "COORDENAÇÃO", 1.5],
      ].map(([x, label, door]) => (
        <group key={label as string}>
          <group position={[x as number, 0, 0]}>
            <B p={[0, 0.74, back + 0.9]} s={[1.3, 0.05, 0.7]} c={WOOD} />
            <B p={[0, 0.37, back + 0.9]} s={[1.2, 0.72, 0.65]} c="#7c4a26" />
            <Chair x={0} z={back + 0.4} color={DARK} face={Math.PI} />
            <Chair x={-0.35} z={back + 1.7} color={GREEN} />
            <Chair x={0.35} z={back + 1.7} color={GREEN} />
          </group>
          <Sign
            lines={[label as string]}
            p={[door as number, 2.4, OFFICE_LZ + 0.12]}
            size={[1.4, 0.28]}
            bg={GREEN}
            fg="#ffffff"
          />
        </group>
      ))}
    </group>
  );
}

/** Laboratório de Química, Biologia e Física: bancadas com pias, vidrarias e microscópios. */
function ScienceLab({ room }: { room: Room }) {
  const { w, d, accent } = room;
  const back = -d / 2;
  const flasks = ["#22d3ee", "#a3e635", "#f472b6", "#fbbf24"];
  return (
    <group>
      <Whiteboard room={room} text={room.board ?? ""} />
      {/* tabela periódica */}
      <B p={[-w / 2 + 0.12, 1.6, -1]} s={[0.04, 1.1, 1.9]} c="#f8fafc" />
      {Array.from({ length: 18 }, (_, i) => (
        <B
          key={i}
          p={[-w / 2 + 0.15, 1.3 + (i % 3) * 0.28, -1.8 + Math.floor(i / 3) * 0.3]}
          s={[0.02, 0.22, 0.24]}
          c={["#fca5a5", "#93c5fd", "#86efac", "#fde68a"][i % 4]!}
        />
      ))}
      {/* bancadas de granito com pia */}
      {[-3.2, -1.1, 1.1, 3.2].flatMap((x) =>
        [-1.6, 1.6].map((z) => (
          <group key={`${x}:${z}`} position={[x, 0, z]}>
            <B p={[0, 0.45, 0]} s={[1.9, 0.9, 1]} c="#e5e7eb" />
            <B p={[0, 0.92, 0]} s={[2, 0.05, 1.1]} c="#1f2937" />
            <B p={[0.6, 0.95, 0]} s={[0.4, 0.02, 0.3]} c="#94a3b8" />
            <B p={[0.6, 1.1, -0.18]} s={[0.04, 0.3, 0.04]} c="#9ca3af" />
            {[-0.6, -0.4, -0.2].map((fx, i) => (
              <mesh key={fx} position={[fx, 1.04, 0.15]}>
                <coneGeometry args={[0.07, 0.18, 12]} />
                <meshStandardMaterial
                  color={flasks[(i + Math.round(x)) % 4]!}
                  transparent
                  opacity={0.75}
                />
              </mesh>
            ))}
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.55, 0.32, side * 0.85]}>
                <cylinderGeometry args={[0.18, 0.18, 0.64, 12]} />
                <meshStandardMaterial color={accent} />
              </mesh>
            ))}
          </group>
        )),
      )}
      {/* microscópio, esqueleto (Biologia) e plano inclinado (Física) */}
      <group position={[3.2, 0.95, -1.9]}>
        <B p={[0, 0.03, 0]} s={[0.2, 0.05, 0.25]} c="#111827" />
        <B p={[0, 0.2, -0.06]} s={[0.05, 0.3, 0.05]} c="#111827" />
        <B p={[0, 0.33, 0.02]} s={[0.06, 0.16, 0.06]} r={[0.5, 0, 0]} c="#e5e7eb" />
      </group>
      <group position={[w / 2 - 0.6, 0, back + 0.8]}>
        <mesh position={[0, 1.55, 0]}>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#f5f5f4" />
        </mesh>
        <B p={[0, 1.15, 0]} s={[0.3, 0.55, 0.12]} c="#f5f5f4" />
        <B p={[-0.08, 0.5, 0]} s={[0.05, 0.75, 0.05]} c="#f5f5f4" />
        <B p={[0.08, 0.5, 0]} s={[0.05, 0.75, 0.05]} c="#f5f5f4" />
        <B p={[0, 0.03, 0]} s={[0.4, 0.06, 0.4]} c={METAL} />
      </group>
      <B p={[-3.2, 1.1, -1.6]} s={[0.9, 0.04, 0.2]} r={[0, 0, 0.35]} c={WOOD} />
      {/* armário de vidrarias e chuveiro de emergência */}
      <B p={[-w / 2 + 0.35, 1, back + 0.6]} s={[0.5, 2, 1.4]} c="#cbd5e1" />
      <B p={[w / 2 - 0.2, 2.2, d / 2 - 0.7]} s={[0.3, 0.05, 0.3]} c="#16a34a" />
      <B p={[w / 2 - 0.2, 1.2, d / 2 - 0.7]} s={[0.05, 2, 0.05]} c="#16a34a" />
    </group>
  );
}

/** Sanitários: cabines, bancada com cubas e espelho. */
function Restroom({ room }: { room: Room }) {
  const { w, d, accent } = room;
  const back = -d / 2;
  const stalls = 4;
  const sw = (w - 0.4) / stalls;
  return (
    <group>
      {Array.from({ length: stalls }, (_, i) => -w / 2 + 0.2 + sw * (i + 0.5)).map((x) => (
        <group key={x} position={[x, 0, back + 0.9]}>
          <B p={[sw / 2, 1, 0]} s={[0.04, 2, 1.5]} c={accent} />
          <B p={[0, 1, 0.75]} s={[sw - 0.15, 1.8, 0.04]} c={accent} />
          <B p={[0, 0.25, -0.35]} s={[0.4, 0.4, 0.55]} c="#f8fafc" />
        </group>
      ))}
      <B p={[0, 0.85, 1.6]} s={[w - 1, 0.1, 0.55]} c="#d6d3d1" />
      {[-1.4, 0, 1.4].map((x) => (
        <B key={x} p={[x, 0.87, 1.6]} s={[0.4, 0.04, 0.3]} c="#94a3b8" />
      ))}
      <B p={[0, 1.6, 1.88]} s={[w - 1.2, 0.8, 0.02]} c="#bfdbfe" e="#dbeafe" ei={0.2} />
    </group>
  );
}

/** Poltronas instanciadas (assento + encosto) em fileiras. */
function SeatRows({ seats, color }: { seats: V3[]; color: string }) {
  const cushions = useRef<InstancedMesh>(null);
  const backs = useRef<InstancedMesh>(null);
  useEffect(() => {
    const dummy = new Object3D();
    seats.forEach(([x, y, z], i) => {
      dummy.position.set(x, y + 0.42, z);
      dummy.updateMatrix();
      cushions.current?.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, y + 0.72, z + 0.22);
      dummy.updateMatrix();
      backs.current?.setMatrixAt(i, dummy.matrix);
    });
    if (cushions.current) cushions.current.instanceMatrix.needsUpdate = true;
    if (backs.current) backs.current.instanceMatrix.needsUpdate = true;
  }, [seats]);
  return (
    <group>
      <instancedMesh ref={cushions} args={[undefined, undefined, seats.length]}>
        <boxGeometry args={[0.5, 0.14, 0.46]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={backs} args={[undefined, undefined, seats.length]}>
        <boxGeometry args={[0.5, 0.55, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** Plateia em rampa de 8,33 %, palco com cortinas e rampa lateral de acesso. */
const AUDIENCE_SLOPE = 0.0833;

function Auditorium({ room }: { room: Room }) {
  const { w, d } = room;
  const back = -d / 2;
  const stageH = 0.5;
  const stageD = 2.4;
  const rows = useMemo(() => Array.from({ length: 6 }, (_, i) => -1.6 + i * 0.85), []);
  // poltronas por fileira conforme a largura (deixa o corredor da rampa à direita)
  const perRow = Math.max(4, Math.floor((w - 2.4) / 0.6));
  const rowW = perRow * 0.6 + 0.6;
  const rowX = -0.6;
  const seats = useMemo<V3[]>(
    () =>
      rows.flatMap((z) => {
        const y = (z - rows[0]!) * AUDIENCE_SLOPE;
        return Array.from(
          { length: perRow },
          (_, i) => [rowX - ((perRow - 1) * 0.6) / 2 + i * 0.6, y, z] as V3,
        );
      }),
    [rows, perRow],
  );
  const rampLen = stageH / AUDIENCE_SLOPE;
  const rampX = w / 2 - 0.6;
  const rampTilt = Math.atan2(stageH, rampLen);
  return (
    <group>
      <B p={[0, stageH / 2, back + stageD / 2]} s={[w - 0.4, stageH, stageD]} c="#4a2c18" />
      <Sign
        lines={["EXPOTEC", "EEEP Dr. Salomão Alves de Moura"]}
        p={[0, 1.65, back + 0.13]}
        size={[Math.min(7, w - 2.6), 1.4]}
        bg="#0f3d22"
        fg="#dcfce7"
        glow
      />
      {[-1, 1].map((side) => (
        <group key={side}>
          {[0, 1, 2].map((k) => (
            <B
              key={k}
              p={[side * (w / 2 - 0.9 + k * 0.32), stageH + 1, back + 0.3 + (k % 2) * 0.06]}
              s={[0.3, 2, 0.1]}
              c={k % 2 ? "#7f1d1d" : "#6b0f1a"}
            />
          ))}
        </group>
      ))}
      <B p={[0, 2.6, back + 0.3]} s={[w - 0.4, 0.3, 0.14]} c="#6b0f1a" />
      <B p={[2, stageH + 0.5, back + 1.4]} s={[0.6, 1, 0.45]} c={WOOD} />
      <B
        p={[rampX, stageH / 2 - 0.03, back + stageD + rampLen / 2]}
        s={[0.8, 0.08, Math.hypot(rampLen, stageH)]}
        r={[rampTilt, 0, 0]}
        c="#78716c"
      />
      {rows.slice(1).map((z) => {
        const h = (z - rows[0]!) * AUDIENCE_SLOPE;
        return <B key={z} p={[rowX, h / 2, z + 0.1]} s={[rowW, h, 0.85]} c="#3f3a36" />;
      })}
      <SeatRows seats={seats} color="#111111" />
    </group>
  );
}

/** Quadra poliesportiva coberta (pilares e tesouras vinho). */
function Court({ room }: { room: Room }) {
  const { w, d } = room;
  return (
    <group>
      {[-d / 2 + 0.35, d / 2 - 0.35].map((z) => (
        <B key={`h${z}`} p={[0, 0.03, z]} s={[w - 0.6, 0.01, 0.06]} c="#f8fafc" />
      ))}
      {[-w / 2 + 0.3, 0, w / 2 - 0.3].map((x) => (
        <B key={`v${x}`} p={[x, 0.03, 0]} s={[0.06, 0.01, d - 0.7]} c="#f8fafc" />
      ))}
      <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.6, 40]} />
        <meshBasicMaterial color="#f8fafc" />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (w / 2 - 0.45), 0, 0]}>
          <B p={[0, 0.6, -1]} s={[0.08, 1.2, 0.08]} c="#f8fafc" />
          <B p={[0, 0.6, 1]} s={[0.08, 1.2, 0.08]} c="#f8fafc" />
          <B p={[0, 1.2, 0]} s={[0.08, 0.08, 2.08]} c="#f8fafc" />
        </group>
      ))}
      {[-w / 2, -w / 4, 0, w / 4, w / 2].flatMap((x) =>
        [-d / 2, d / 2].map((z) => (
          <B key={`p${x}:${z}`} p={[x, 3.5, z]} s={[0.3, 7, 0.3]} c={RED} />
        )),
      )}
      {[-w / 2, -w / 4, 0, w / 4, w / 2].map((x) => (
        <Truss key={`bs${x}`} p={[x, 7.2, 0]} length={d + 0.2} h={0.6} r={Math.PI / 2} />
      ))}
      <MetalRoof p={[0, 7.6, 0]} s={[w + 0.6, d + 0.6]} />
      {[0, 1, 2].map((i) => (
        <B
          key={i}
          p={[0, 0.15 + i * 0.15, -d / 2 + 0.9 - i * 0.45]}
          s={[12, 0.3 + i * 0.3, 0.45]}
          c="#64748b"
        />
      ))}
    </group>
  );
}

const BOOK_COLORS = ["#1d4ed8", "#b91c1c", "#15803d", "#a16207", "#7c3aed"];

function BookShelf({ p, s, r = 0 }: { p: V3; s: V3; r?: number }) {
  const [len, h, depth] = s;
  const levels = Math.max(2, Math.floor(h / 0.42));
  return (
    <group position={p} rotation={[0, r, 0]}>
      <B p={[0, h / 2, 0]} s={[len, h, depth]} c="#6b3f1d" />
      {Array.from({ length: levels }, (_, i) => (
        <B
          key={i}
          p={[0, 0.22 + i * (h / levels), 0]}
          s={[len - 0.1, h / levels - 0.12, depth + 0.02]}
          c={BOOK_COLORS[(i + Math.round(p[0] * 3)) % BOOK_COLORS.length]!}
        />
      ))}
    </group>
  );
}

/** Mezanino da biblioteca: piso superior a 1,30 m, guarda-corpo duplo h = 1,10 m. */
const MEZZ_Y = 1.3;
const RAIL_H = 1.1;

function Library({ room }: { room: Room }) {
  const { w, d, accent } = room;
  const back = -d / 2;
  const front = back + 1.1; // borda do mezanino
  const stairX = w / 2 - 0.6;
  const steps = 7;
  const run = 0.29;
  const stairLen = steps * run;
  const stairTilt = Math.atan2(MEZZ_Y, stairLen);
  return (
    <group>
      {/* ---- piso inferior ---- */}
      {/* estantes verticais em fileiras paralelas */}
      {[-w / 2 + 0.6, -w / 2 + 1.8].map((x) => (
        <BookShelf key={x} p={[x, 0, -0.9]} s={[3, 1.9, 0.4]} r={Math.PI / 2} />
      ))}
      <BookShelf p={[1.85, 0, front + 0.45]} s={[1, 1, 0.35]} />
      {/* mesas quadradas de estudo em grupo (4 lugares) */}
      {[
        [-0.5, -0.8],
        [1.3, -0.8],
        [-0.5, 1.1],
        [1.3, 1.1],
      ].map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x!, 0, z!]}>
          <B p={[0, 0.74, 0]} s={[0.9, 0.05, 0.9]} c={WOOD} />
          <B p={[0, 0.36, 0]} s={[0.1, 0.72, 0.1]} c={METAL} />
          <Chair x={0} z={0.62} color={accent} />
          <Chair x={0} z={-0.62} color={accent} face={Math.PI} />
          <Chair x={0.62} z={0} color={accent} face={Math.PI / 2} />
          <Chair x={-0.62} z={0} color={accent} face={-Math.PI / 2} />
        </group>
      ))}
      {/* balcão de atendimento em "L" */}
      <B p={[-w / 2 + 0.95, 0.5, d / 2 - 1.5]} s={[1.6, 1, 0.55]} c={RED_DARK} />
      <B p={[-w / 2 + 1.5, 0.5, d / 2 - 0.95]} s={[0.55, 1, 1.1]} c={RED_DARK} />
      <group position={[0, 0.25, 0]}>
        <Computer x={-w / 2 + 0.8} z={d / 2 - 1.55} />
      </group>
      <Chair x={-w / 2 + 0.8} z={d / 2 - 0.9} color={DARK} face={Math.PI} />

      {/* ---- mezanino (piso superior) ---- */}
      <BookShelf p={[0, 0, back + 0.3]} s={[w - 0.4, 1.15, 0.4]} />
      {[-w / 2 + 0.3, -1.2, 1.2, w / 2 - 1.1].map((x) => (
        <B key={x} p={[x, MEZZ_Y / 2, front - 0.06]} s={[0.1, MEZZ_Y, 0.1]} c={METAL} />
      ))}
      <B p={[0, MEZZ_Y - 0.06, back + 0.55]} s={[w - 0.2, 0.12, 1.1]} c="#a8a29e" />
      <B p={[-0.5, MEZZ_Y - 0.2, front]} s={[w - 1.2, 0.28, 0.04]} c={accent} />
      {/* guarda-corpo duplo (corrimão a 1,10 m + barra intermediária) */}
      {[RAIL_H, RAIL_H / 2].map((h) => (
        <B key={h} p={[-0.5, MEZZ_Y + h, front]} s={[w - 1.2, 0.05, 0.05]} c={METAL} />
      ))}
      {Array.from({ length: 9 }, (_, i) => -w / 2 + 0.15 + i * ((w - 1.2) / 8)).map((x) => (
        <B key={x} p={[x, MEZZ_Y + RAIL_H / 2, front]} s={[0.04, RAIL_H, 0.04]} c={METAL} />
      ))}
      {/* cabines individuais de estudo com computador */}
      <group position={[0, MEZZ_Y, 0]}>
        {Array.from({ length: 6 }, (_, i) => -w / 2 + 0.75 + i * 1.3).map((x) => (
          <group key={x}>
            <B p={[x, 0.74, back + 0.32]} s={[1.15, 0.05, 0.5]} c={WOOD} />
            <B p={[x - 0.6, 0.95, back + 0.35]} s={[0.04, 0.9, 0.6]} c="#d6d3d1" />
            <Computer x={x} z={back + 0.3} />
            <Chair x={x} z={back + 0.85} color={accent} />
          </group>
        ))}
      </group>
      {/* escada metálica */}
      {Array.from({ length: steps }, (_, i) => (
        <B
          key={i}
          p={[stairX, ((i + 1) * MEZZ_Y) / steps - 0.02, front + stairLen - (i + 0.5) * run]}
          s={[0.9, 0.05, run]}
          c="#9ca3af"
        />
      ))}
      {[-0.47, 0.47].map((dx) => (
        <group key={dx}>
          <B
            p={[stairX + dx, MEZZ_Y / 2, front + stairLen / 2]}
            s={[0.05, 0.14, Math.hypot(stairLen, MEZZ_Y)]}
            r={[stairTilt, 0, 0]}
            c={METAL}
          />
          {[RAIL_H, RAIL_H / 2].map((h) => (
            <B
              key={h}
              p={[stairX + dx, MEZZ_Y / 2 + h, front + stairLen / 2]}
              s={[0.04, 0.04, Math.hypot(stairLen, MEZZ_Y)]}
              r={[stairTilt, 0, 0]}
              c={METAL}
            />
          ))}
        </group>
      ))}
      <Sign
        lines={["SILÊNCIO · Leia mais!"]}
        p={[-1.5, MEZZ_Y - 0.2, front + 0.03]}
        size={[2.2, 0.26]}
        bg={accent}
        fg="#ffffff"
      />
    </group>
  );
}

/** Telhado de telhas metálicas galvanizadas (visível por baixo e por cima). */
function MetalRoof({ p, s }: { p: V3; s: [number, number] }) {
  const roof = usePattern("roof", s[0], 1);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <planeGeometry args={s} />
      <meshStandardMaterial map={roof} metalness={0.55} roughness={0.4} side={DoubleSide} />
    </mesh>
  );
}

/** Refeitório amplo: balcão de distribuição, mesas retangulares enfileiradas e teto em estrutura metálica. */
function Canteen({ room }: { room: Room }) {
  const { w, d, accent } = room;
  const back = -d / 2;
  const columns = [-w / 2 + 1.6, -w / 2 + 4.4, w / 2 - 4.4, w / 2 - 1.6];
  const rows = [-d / 2 + 2.6, d / 2 - 1.3];
  return (
    <group>
      {/* balcão de distribuição em inox */}
      <B p={[0, 0.5, back + 0.8]} s={[8, 1, 0.7]} c="#d6d3d1" />
      <B p={[0, 1.02, back + 0.8]} s={[8.1, 0.05, 0.8]} c="#94a3b8" />
      {[-3.3, -2.2, -1.1, 0, 1.1, 2.2, 3.3].map((x, i) => (
        <mesh key={x} position={[x, 1.1, back + 0.8]}>
          <cylinderGeometry args={[0.28, 0.24, 0.14, 16]} />
          <meshStandardMaterial
            color={
              ["#fbbf24", "#78350f", "#16a34a", "#f97316", "#fef3c7", "#b91c1c", "#fde68a"][i]!
            }
          />
        </mesh>
      ))}
      <Sign
        lines={["CARDÁPIO DO DIA", "Baião de dois · Frango", "Salada · Suco de caju"]}
        p={[0, 2, back + 0.12]}
        size={[3.4, 1.1]}
        bg="#1c1917"
        fg="#fde68a"
      />
      {/* mesas retangulares enfileiradas com bancos */}
      {columns.flatMap((x) =>
        rows.map((z) => (
          <group key={`${x}:${z}`} position={[x, 0, z]}>
            <B p={[0, 0.74, 0]} s={[2.4, 0.05, 0.8]} c="#f8fafc" />
            <B p={[0, 0.37, 0]} s={[2.2, 0.06, 0.06]} c={METAL} />
            {[-1, 1].map((sx) => (
              <B key={sx} p={[sx * 1.05, 0.37, 0]} s={[0.06, 0.74, 1.4]} c={METAL} />
            ))}
            {[-0.62, 0.62].map((bz) => (
              <B key={bz} p={[0, 0.45, bz]} s={[2.4, 0.06, 0.3]} c={accent} />
            ))}
          </group>
        )),
      )}
      {/* teto em estrutura metálica: tesouras, terças e luminárias */}
      {[-d / 2 + 1, 0, d / 2 - 1].map((z) => (
        <Truss key={z} p={[0, WALL_H - 0.25, z]} length={w - 0.2} h={0.35} />
      ))}
      <MetalRoof p={[0, WALL_H + 0.12, 0]} s={[w + 0.4, d + 0.4]} />
      {[-w / 3, 0, w / 3].map((x) => (
        <B key={x} p={[x, WALL_H - 0.05, 0]} s={[0.08, 0.08, d - 0.2]} c={TRUSS} />
      ))}
      {columns.flatMap((x) =>
        rows.map((z) => (
          <B
            key={`l${x}:${z}`}
            p={[x, WALL_H - 0.5, z]}
            s={[1.6, 0.04, 0.12]}
            c="#f8fafc"
            e="#fffbeb"
            ei={0.9}
          />
        )),
      )}
      {/* faixa de circulação central */}
      {[-1.15, 1.15].map((x) => (
        <B key={x} p={[x, 0.03, 0.8]} s={[0.07, 0.01, d - 2.2]} c="#facc15" />
      ))}
      <B p={[0, 0.03, back + 1.5]} s={[w - 0.6, 0.01, 0.07]} c="#facc15" />
      {/* lavatório na entrada */}
      <group position={[w / 2 - 0.4, 0, d / 2 - 1.3]}>
        <B p={[0, 0.42, 0]} s={[0.55, 0.84, 1.6]} c="#f1f5f9" />
        <B p={[0, 0.86, 0]} s={[0.6, 0.04, 1.65]} c="#cbd5e1" />
        {[-0.5, 0, 0.5].map((z) => (
          <group key={z}>
            <B p={[0.02, 0.87, z]} s={[0.35, 0.02, 0.35]} c="#94a3b8" />
            <B p={[0.2, 1.02, z]} s={[0.05, 0.22, 0.05]} c="#64748b" />
          </group>
        ))}
        <B p={[0.25, 1.6, 0]} s={[0.03, 0.6, 1.4]} c="#bfdbfe" e="#dbeafe" ei={0.2} />
      </group>
    </group>
  );
}

const RoomBlock = memo(function RoomBlock({ room }: { room: Room }) {
  const angle = doorAngle[room.door];
  const doorW = room.doorW ?? 1.7;
  const front = room.d / 2 + 0.115;
  const h = roomWallH(room);
  const closed = room.walls !== false;
  return (
    <group position={[room.x, roomY(room), room.z]} rotation={[0, angle, 0]}>
      <B p={[0, 0.012, 0]} s={[room.w, 0.02, room.d]} c={room.floor} />
      <Interior room={room} />
      {closed && room.kind !== "canteen" && (
        // forro branco (visto de baixo) com luminárias
        <group>
          <mesh position={[0, h - 0.01, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <planeGeometry args={[room.w, room.d]} />
            <meshStandardMaterial color="#f5f5f4" roughness={0.95} />
          </mesh>
          {[-1, 1].map((side) => (
            <B
              key={side}
              p={[side * room.w * 0.22, h - 0.04, 0]}
              s={[0.25, 0.04, room.d * 0.6]}
              c="#ffffff"
              e="#fffbeb"
              ei={1}
            />
          ))}
        </group>
      )}
      {closed && (
        <group>
          <B p={[0, 0.016, room.d / 2 + 0.6]} s={[doorW, 0.02, 0.9]} c={room.accent} />
          {room.reliefSign ? (
            // letreiro em relevo vermelho
            <Sign
              lines={[room.name]}
              p={[0, h - 0.4, front + 0.02]}
              size={[3.2, 0.6]}
              bg="transparent"
              fg={RED}
            />
          ) : (
            <Sign
              lines={[room.name.toUpperCase()]}
              p={[0, h - 0.3, front]}
              size={[Math.max(1.8, doorW + 0.6), 0.38]}
              bg={room.accent}
              fg="#ffffff"
            />
          )}
          {/* placa de identificação ao lado da porta */}
          <B p={[doorW / 2 + 0.55, 1.65, front - 0.01]} s={[0.96, 0.34, 0.02]} c="#94a3b8" />
          <Sign
            lines={[room.name]}
            p={[doorW / 2 + 0.55, 1.65, front + 0.005]}
            size={[0.9, 0.28]}
            bg="#f8fafc"
            fg="#14532d"
          />
          {/* batentes */}
          {[-1, 1].map((side) => (
            <B
              key={side}
              p={[side * (doorW / 2), (h - 0.6) / 2, room.d / 2]}
              s={[0.08, h - 0.6, 0.26]}
              c={GREEN_DARK}
            />
          ))}
          {room.glassDoor && (
            // portas de vidro de correr, abertas
            <group>
              {[-1, 1].map((side) => (
                <mesh
                  key={side}
                  position={[side * (doorW / 2 + doorW / 4), (h - 0.6) / 2, room.d / 2 + 0.16]}
                >
                  <boxGeometry args={[doorW / 2, h - 0.6, 0.03]} />
                  <meshStandardMaterial
                    color="#bfe3f5"
                    transparent
                    opacity={0.35}
                    roughness={0.05}
                    metalness={0.3}
                  />
                </mesh>
              ))}
              <B p={[0, h - 0.62, room.d / 2 + 0.16]} s={[doorW * 2, 0.06, 0.06]} c={METAL} />
            </group>
          )}
        </group>
      )}
    </group>
  );
});

/* ------------------------------------------------------------------ */
/* Paredes (ficam transparentes quando tapam a visão)                  */
/* ------------------------------------------------------------------ */

/** Textura de parede compartilhada por repetição (azulejo a cada 1 m, fachada a cada 4 m). */
function wallTexture(tex: Wall["tex"], len: number, h: number) {
  if (!tex || tex === "mural" || typeof document === "undefined") return null;
  const t = new CanvasTexture(patternCanvas(tex));
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  const step = tex === "facade" ? 4 : tex === "tiles" ? 1.2 : 1;
  t.repeat.set(
    Math.max(1, Math.round(len / step)),
    tex === "tiles" ? Math.max(1, Math.round(h / 1.2)) : 1,
  );
  t.anisotropy = 4;
  return t;
}

function Walls() {
  const maps = useMemo(() => {
    const cache = new Map<string, CanvasTexture | null>();
    return walls.map((wall) => {
      const len = Math.max(wall.sx, wall.sz);
      const key = `${wall.tex}:${Math.round(len)}:${Math.round(wall.h)}`;
      if (!cache.has(key)) cache.set(key, wallTexture(wall.tex, len, wall.h));
      return cache.get(key) ?? null;
    });
  }, []);
  useEffect(() => () => new Set(maps).forEach((tex) => tex?.dispose()), [maps]);
  return (
    <group>
      {walls.map((wall, i) => (
        <mesh key={i} position={[wall.x, wall.y0 + wall.h / 2, wall.z]} castShadow receiveShadow>
          <boxGeometry args={[wall.sx, wall.h, wall.sz]} />
          <meshStandardMaterial
            color={maps[i] ? "#ffffff" : wall.color}
            map={maps[i] ?? null}
            roughness={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Exterior                                                            */
/* ------------------------------------------------------------------ */

function Tree({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.8, 7]} />
        <meshStandardMaterial color="#7c4a26" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#3f8f3a" flatShading />
      </mesh>
      <mesh position={[0.45, 1.9, 0.2]}>
        <icosahedronGeometry args={[0.65, 0]} />
        <meshStandardMaterial color="#4ea64a" flatShading />
      </mesh>
    </group>
  );
}

function Bench({ x, z, r = 0 }: { x: number; z: number; r?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, r, 0]}>
      <B p={[0, 0.42, 0]} s={[1.6, 0.06, 0.45]} c={WOOD} />
      <B p={[-0.65, 0.2, 0]} s={[0.08, 0.4, 0.4]} c={DARK} />
      <B p={[0.65, 0.2, 0]} s={[0.08, 0.4, 0.4]} c={DARK} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Corredores e jardim                                                 */
/* ------------------------------------------------------------------ */

/** Vaso cerâmico (vermelho ou amarelo, como no pátio da escola). */
function Pot({
  x,
  z,
  c = "#16a34a",
  pot = "#c2410c",
}: {
  x: number;
  z: number;
  c?: string;
  pot?: string;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.28, 0.2, 0.5, 12]} />
        <meshStandardMaterial color={pot} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <icosahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial color={c} flatShading />
      </mesh>
    </group>
  );
}

function Palm({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 2, 0]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.12, 0.2, 4, 8]} />
        <meshStandardMaterial color="#8b5a2b" />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.8 + 0.15, 3.9, Math.cos(a) * 0.8]}
            rotation={[Math.cos(a) * 0.9, 0, -Math.sin(a) * 0.9]}
            scale={[0.35, 1, 1.6]}
          >
            <sphereGeometry args={[0.55, 6, 4]} />
            <meshStandardMaterial color="#3f9b3a" flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/** Palmeira-leque pequena. */
function FanPalm({ x, z, y = 0, s = 1 }: { x: number; z: number; y?: number; s?: number }) {
  return (
    <group position={[x, y, z]} scale={s} rotation={[0, (x * 7 + z * 3) % Math.PI, 0]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 1.2, 7]} />
        <meshStandardMaterial color="#6b4423" />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = -1.2 + (i / 8) * 2.4;
        return (
          <group key={i} position={[0, 1.15, 0]} rotation={[0.35 + (i % 2) * 0.25, 0, a]}>
            <mesh position={[0, 0.45, 0]} scale={[0.32, 1, 0.08]}>
              <sphereGeometry args={[0.45, 6, 4]} />
              <meshStandardMaterial color={i % 2 ? "#2f8f3a" : "#3fae4a"} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Shrub({ x, z, s = 1 }: { x: number; z: number; s?: number }) {
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 0.35, 0]} scale={[1.2, 0.8, 1]}>
        <icosahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color="#2f7d32" flatShading />
      </mesh>
      <mesh position={[0.3, 0.3, 0.15]}>
        <icosahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#4ea64a" flatShading />
      </mesh>
    </group>
  );
}

/** Caminho curvo de pedras irregulares claras (instanciado). */
function StonePath({ from, to, width = 2.4 }: { from: Vec2; to: Vec2; width?: number }) {
  const ref = useRef<InstancedMesh>(null);
  const stones = useMemo(() => {
    const rand = seeded(42);
    const list: { x: number; z: number; r: number; s: number; t: number }[] = [];
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    const rows = Math.round(len / 0.5);
    for (let i = 0; i <= rows; i += 1) {
      const t = i / rows;
      // curva em "S" entre o portão e a entrada
      const cx = from.x + (to.x - from.x) * t + Math.sin(t * Math.PI * 2) * 1.6;
      const cz = from.z + (to.z - from.z) * t;
      for (let k = 0; k < 4; k += 1) {
        list.push({
          x: cx + (k - 1.5) * (width / 4) + (rand() - 0.5) * 0.15,
          z: cz + (rand() - 0.5) * 0.15,
          r: rand() * Math.PI,
          s: 0.8 + rand() * 0.45,
          t: rand(),
        });
      }
    }
    return list;
  }, [from.x, from.z, to.x, to.z, width]);
  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    stones.forEach((stone, i) => {
      dummy.position.set(stone.x, 0.03, stone.z);
      dummy.rotation.set(0, stone.r, 0);
      dummy.scale.set(stone.s, 1, stone.s * 0.85);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [stones]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, stones.length]}>
      <cylinderGeometry args={[0.27, 0.29, 0.06, 7]} />
      <meshStandardMaterial color="#e4ded3" roughness={0.95} />
    </instancedMesh>
  );
}

function PingPongTable({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 0.76, 0]} s={[1.525, 0.04, 2.74]} c="#1e4f8a" />
      <B p={[0, 0.785, 0]} s={[0.02, 0.005, 2.74]} c="#f8fafc" />
      <B p={[0, 0.86, 0]} s={[1.7, 0.15, 0.02]} c="#e5e7eb" />
      {[-0.6, 0.6].flatMap((dx) =>
        [-1.1, 1.1].map((dz) => (
          <B key={`${dx}:${dz}`} p={[dx, 0.37, dz]} s={[0.05, 0.74, 0.05]} c={METAL} />
        )),
      )}
    </group>
  );
}

/** Raquete de tênis de mesa apoiada sobre a mesa. */
function Paddle({ p, r = 0 }: { p: V3; r?: number }) {
  return (
    <group position={p} rotation={[-Math.PI / 2, 0, r]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.015, 16]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <B p={[0, -0.12, 0]} s={[0.03, 0.1, 0.02]} c={WOOD} />
    </group>
  );
}

/** Espaço reservado para a logo da escola. Se existir `public/logo-eeep.png`, ela é aplicada. */
function LogoSpace({ p, r, size }: { p: V3; r: V3; size: [number, number] }) {
  const [logo, setLogo] = useState<Texture | null>(null);
  useEffect(() => {
    let alive = true;
    let loaded: Texture | null = null;
    new TextureLoader().load(
      "/logo-eeep.png",
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        loaded = tex;
        if (alive) setLogo(tex);
        else tex.dispose();
      },
      undefined,
      () => undefined,
    );
    return () => {
      alive = false;
      loaded?.dispose();
    };
  }, []);
  return (
    <group position={p} rotation={r}>
      <B p={[0, 0, -0.02]} s={[size[0] + 0.24, size[1] + 0.24, 0.04]} c={GREEN} />
      {logo ? (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={size} />
          <meshStandardMaterial map={logo} transparent roughness={0.6} />
        </mesh>
      ) : (
        <Sign
          lines={["LOGO DA ESCOLA", "EEEP Dr. Salomão", "Alves de Moura"]}
          p={[0, 0, 0.01]}
          size={size}
          bg="#f8fafc"
          fg={GREEN_DARK}
        />
      )}
    </group>
  );
}

/** Pátio coberto da entrada: telhas metálicas, treliças vinho, mural, logo e acessos. */
function EntranceHall() {
  const { x0, x1, z0, z1 } = hall;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const roof = usePattern("roof", (x1 - x0) / 1, 1);
  const hallFloor = usePattern("hallFloor");
  const mural = usePattern("mural");
  // mural "SAM" na entrada da saída lateral: parede do lado do Auditório, logo ao entrar
  const muralH = WALL_H - 0.1;
  const muralW = muralH * 0.75;
  const trussZ = [0.5, 4.6, 8, 11, 14];
  const face = BLOCK_X - 0.115; // face das paredes dos blocos voltada para o pátio
  return (
    <group>
      <mesh position={[cx, 0.012, cz]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[x1 - x0, z1 - z0]} />
        <meshStandardMaterial map={hallFloor} roughness={0.9} />
      </mesh>

      {/* pilares estruturais vinho */}
      {[-5.5, 5.5].map((x) => (
        <group key={x}>
          <B p={[x, ROOF_Y / 2, 11]} s={[0.4, ROOF_Y, 0.4]} c={RED} />
          <B p={[x, 0.12, 11]} s={[0.6, 0.24, 0.6]} c={RED_DARK} />
        </group>
      ))}
      {/* pilares junto às paredes (sem cobrir o mural, as portas e o letreiro) */}
      {(
        [
          [-BLOCK_X + 0.3, 0.5],
          [-BLOCK_X + 0.3, sideExit.z1 + 0.2],
          [-BLOCK_X + 0.3, 14],
          [BLOCK_X - 0.3, 4.3],
          [BLOCK_X - 0.3, 14],
        ] as const
      ).map(([x, z]) => (
        <B key={`s${x}:${z}`} p={[x, ROOF_Y / 2, z]} s={[0.36, ROOF_Y, 0.36]} c={RED} />
      ))}
      {/* treliças metálicas vermelhas aparentes, terças e telhas metálicas */}
      {trussZ.map((z) => (
        <Truss key={z} p={[cx, ROOF_Y, z]} length={x1 - x0} h={0.9} />
      ))}
      {[-8, -4, 0, 4, 8].map((x) => (
        <B key={x} p={[x, ROOF_Y + 0.5, cz]} s={[0.1, 0.12, z1 - z0]} c={TRUSS} />
      ))}
      <mesh
        position={[cx, ROOF_Y + 0.6, cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[x1 - x0 + 0.6, z1 - z0 + 0.6]} />
        <meshStandardMaterial map={roof} metalness={0.5} roughness={0.45} side={DoubleSide} />
      </mesh>
      {/* calhas de luz penduradas */}
      {[-6, 0, 6].flatMap((x) =>
        [2.6, 9.5, 12.5].map((z) => (
          <B
            key={`${x}:${z}`}
            p={[x, ROOF_Y - 0.9, z]}
            s={[1.4, 0.05, 0.15]}
            c="#f8fafc"
            e="#fffbeb"
            ei={0.8}
          />
        )),
      )}

      {/* lado esquerdo: logo, Auditório com ping-pong azul à frente e o mural "SAM" */}
      <LogoSpace p={[-face, 1.9, 13.2]} r={[0, Math.PI / 2, 0]} size={[1.3, 1.1]} />
      <PingPongTable x={-7.6} z={11} />
      <Paddle p={[-7.4, 0.8, 10.2]} r={0.4} />
      <Paddle p={[-7.9, 0.8, 11.9]} r={-0.6} />
      {/* lado esquerdo, entre o Auditório e a Secretaria: saída lateral */}
      <Floor
        p={[(sideExit.x0 + sideExit.x1) / 2, 0.014, (sideExit.z0 + sideExit.z1) / 2]}
        s={[sideExit.x1 - sideExit.x0, sideExit.z1 - sideExit.z0]}
        pattern="ceramic"
        tile={1.2}
      />
      <CorridorCeiling r={sideExit} y={WALL_H} axis="x" />
      {mural && (
        <mesh
          position={[sideExit.x1 - 0.2 - muralW / 2, muralH / 2, sideExit.z1 - 0.112]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[muralW, muralH]} />
          <meshStandardMaterial map={mural} roughness={0.8} />
        </mesh>
      )}

      {/* placa vermelha de setores sobre mureta branca, junto à parede ao lado da rampa */}
      <group position={[muralWall.x - 0.55, 0, muralWall.z1 - 1.1]} rotation={[0, -Math.PI / 2, 0]}>
        <B p={[0, 0.3, 0]} s={[1.6, 0.6, 0.6]} c="#f8fafc" />
        <B p={[0, 0.62, 0]} s={[1.7, 0.05, 0.7]} c="#e7e5e4" />
        <B p={[0, 1.25, -0.12]} s={[1.5, 1.2, 0.08]} r={[-0.08, 0, 0]} c={RED} />
        <Sign
          lines={[
            "SETORES",
            "Auditório · Biblioteca",
            "Secretaria · Professores",
            "Laboratórios · Sanitários",
            "Rampa: 2º andar",
          ]}
          p={[0, 1.25, -0.07]}
          size={[1.38, 1.08]}
          r={[-0.08, 0, 0]}
          bg={RED}
          fg="#ffffff"
        />
      </group>

      {/* lado direito: janela vertical e letreiro vertical da Biblioteca */}
      <group position={[face, 0, 0]}>
        <B p={[0, 1.5, 12.6]} s={[0.04, 2.7, 0.95]} c={GREEN_DARK} />
        <mesh position={[-0.03, 1.5, 12.6]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.8, 2.55]} />
          <meshStandardMaterial
            color="#9fd0ea"
            metalness={0.4}
            roughness={0.08}
            emissive="#1e3a5f"
            emissiveIntensity={0.15}
          />
        </mesh>
        <B p={[-0.02, 2.2, 11.3]} s={[0.04, 3.4, 0.62]} c={RED} />
        <Sign
          lines={["BIBLIOTECA"]}
          p={[-0.05, 2.2, 11.3]}
          size={[3.2, 0.52]}
          r={[0, -Math.PI / 2, Math.PI / 2]}
          bg={RED}
          fg="#ffffff"
        />
      </group>

      {/* vasos e bancos (centro livre para caminhar) */}
      {[
        [-3.6, 13.6],
        [3.6, 13.6],
        [-9.8, 13.6],
        [9.8, 13.6],
        [-9.6, 1],
      ].map(([x, z], i) => (
        <Pot key={i} x={x!} z={z!} pot={POT_COLORS[i % 3]!} c={i % 2 ? "#15803d" : "#22c55e"} />
      ))}
    </group>
  );
}

const POT_COLORS = ["#b91c1c", "#eab308", "#7c4a26"];

/** Sólido de rampa: perfil (comprimento × alturas inicial/final) extrudado na largura. */
function RampSolid({
  p,
  r,
  len,
  width,
  h0,
  h1,
  thick,
  color,
}: {
  p: V3;
  r: number;
  len: number;
  width: number;
  h0: number;
  h1: number;
  /** espessura da laje; sem valor, o sólido vai até o chão */
  thick?: number;
  color: string;
}) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    if (thick) {
      shape.moveTo(0, h0 - thick);
      shape.lineTo(len, h1 - thick);
    } else {
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
    }
    shape.lineTo(len, h1);
    shape.lineTo(0, h0);
    shape.closePath();
    return new ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  }, [len, width, h0, h1, thick]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={p} rotation={[0, r, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** Corrimão metálico duplo inclinado entre dois pontos (x, y, z). */
function Handrail({ a, b }: { a: V3; b: V3 }) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const flat = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.atan2(dy, flat);
  const posts = Math.max(2, Math.round(flat / 1.5));
  return (
    <group>
      {[0.92, 0.7].map((h) => (
        <mesh
          key={h}
          position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + h, (a[2] + b[2]) / 2]}
          rotation={[pitch, yaw, 0, "YXZ"]}
        >
          <boxGeometry args={[0.05, 0.05, len]} />
          <meshStandardMaterial color="#c0c4c8" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
      {Array.from({ length: posts + 1 }, (_, i) => i / posts).map((t) => (
        <B
          key={t}
          p={[a[0] + dx * t, a[1] + dy * t + 0.46, a[2] + dz * t]}
          s={[0.04, 0.92, 0.04]}
          c="#a8adb3"
        />
      ))}
    </group>
  );
}

/** Rampa de acessibilidade vermelho-vinho em ziguezague, com corrimãos e o brasão na frente. */
const Ramp = memo(function Ramp() {
  const { a, landing, b, top } = ramp;
  const len = a.x1 - a.x0;
  const emblem = usePattern("emblem");
  const painting = usePattern("schoolPainting");
  // quadro na face de baixo do 2º lance (voltada para o pátio), abaixo da altura do patamar
  const paintW = 5;
  const paintH = 1.25;
  const paintX = (b.x0 + b.x1) / 2 + 0.2;
  const paintY = 0.25 + paintH / 2;
  return (
    <group>
      {/* pintura da escola embaixo da rampa, em moldura de madeira */}
      <group position={[paintX, paintY, b.z0 - 0.03]} rotation={[0, Math.PI, 0]}>
        <B p={[0, 0, -0.01]} s={[paintW + 0.2, paintH + 0.2, 0.05]} c={WOOD} />
        {painting && (
          <mesh position={[0, 0, 0.02]}>
            <planeGeometry args={[paintW, paintH]} />
            <meshStandardMaterial map={painting} roughness={0.75} />
          </mesh>
        )}
      </group>
      {/* 1º lance: começa voltado para o lado do Auditório e sobe para leste */}
      <RampSolid
        p={[a.x0, 0, a.z0]}
        r={0}
        len={len}
        width={a.z1 - a.z0}
        h0={0}
        h1={LANDING_Y}
        color={RED}
      />
      {/* patamar intermediário */}
      <B
        p={[(landing.x0 + landing.x1) / 2, LANDING_Y / 2, (landing.z0 + landing.z1) / 2]}
        s={[landing.x1 - landing.x0, LANDING_Y, landing.z1 - landing.z0]}
        c={RED}
      />
      {/* 2º lance: volta para oeste até a plataforma superior */}
      <RampSolid
        p={[b.x1, 0, b.z1]}
        r={Math.PI}
        len={len}
        width={b.z1 - b.z0}
        h0={LANDING_Y}
        h1={FLOOR2_Y}
        color={RED_DARK}
      />
      <B
        p={[(a.x0 + a.x1) / 2, LANDING_Y / 2, (b.z1 + a.z0) / 2]}
        s={[len, LANDING_Y, a.z0 - b.z1]}
        c={RED_DARK}
      />
      {/* plataforma superior (passa-se por baixo dela no térreo) */}
      <B
        p={[(top.x0 + top.x1) / 2, FLOOR2_Y - 0.15, (top.z0 + top.z1) / 2]}
        s={[top.x1 - top.x0, 0.3, top.z1 - top.z0]}
        c={RED}
      />
      {[2.3, 4.2].map((z) => (
        <B
          key={z}
          p={[top.x1 - 0.18, (FLOOR2_Y - 0.3) / 2, z]}
          s={[0.3, FLOOR2_Y - 0.3, 0.3]}
          c={RED}
        />
      ))}
      {/* corrimãos metálicos */}
      <Handrail a={[a.x0, 0, a.z1 - 0.06]} b={[a.x1, LANDING_Y, a.z1 - 0.06]} />
      <Handrail a={[a.x0, 0, a.z0 + 0.06]} b={[a.x1, LANDING_Y, a.z0 + 0.06]} />
      <Handrail
        a={[landing.x0, LANDING_Y, landing.z1 - 0.06]}
        b={[landing.x1 - 0.1, LANDING_Y, landing.z1 - 0.06]}
      />
      <Handrail
        a={[landing.x1 - 0.1, LANDING_Y, landing.z1 - 0.06]}
        b={[landing.x1 - 0.1, LANDING_Y, landing.z0 + 0.06]}
      />
      <Handrail a={[b.x1, LANDING_Y, b.z0 + 0.06]} b={[b.x0, FLOOR2_Y, b.z0 + 0.06]} />
      <Handrail a={[b.x1, LANDING_Y, b.z1 - 0.06]} b={[b.x0, FLOOR2_Y, b.z1 - 0.06]} />
      {/* brasão da escola na frente do patamar, voltado para a entrada */}
      {emblem && (
        <mesh position={[(landing.x0 + landing.x1) / 2, 0.8, landing.z1 + 0.012]}>
          <planeGeometry args={[0.95, 1.2]} />
          <meshStandardMaterial map={emblem} transparent alphaTest={0.1} />
        </mesh>
      )}
    </group>
  );
});

/** Guarda-corpo metálico vermelho-vinho (h = 1,10 m) sobre peitoril, ao longo de x ou z. */
function GuardRail({
  from,
  to,
  axis,
  at,
  y,
}: {
  from: number;
  to: number;
  axis: "x" | "z";
  at: number;
  y: number;
}) {
  const len = to - from;
  const mid = (from + to) / 2;
  const pos = (t: number, h: number): V3 => (axis === "x" ? [t, y + h, at] : [at, y + h, t]);
  const size = (thick: number, h: number): V3 => (axis === "x" ? [len, h, thick] : [thick, h, len]);
  const posts = Math.max(2, Math.round(len / 1.2));
  return (
    <group>
      <B p={pos(mid, 0.25)} s={size(0.16, 0.5)} c={RED} />
      <B p={pos(mid, GUARD_H)} s={size(0.08, 0.06)} c={RED} />
      <B p={pos(mid, 0.8)} s={size(0.04, 0.04)} c={RED} />
      {Array.from({ length: posts + 1 }, (_, i) => from + (len * i) / posts).map((t) => (
        <B key={t} p={pos(t, 0.5 + (GUARD_H - 0.5) / 2)} s={[0.05, GUARD_H - 0.5, 0.05]} c={RED} />
      ))}
    </group>
  );
}

/** Passarela superior com guarda-corpo vinho e vista para o pátio. */
const Bridge = memo(function Bridge() {
  const { x0, x1, z0, z1 } = bridge;
  const top = ramp.top;
  return (
    <group>
      {/* laje e vigas laterais maciças em vermelho-vinho */}
      <B p={[(x0 + x1) / 2, FLOOR2_Y - 0.2, (z0 + z1) / 2]} s={[x1 - x0, 0.4, z1 - z0]} c={RED} />
      <B p={[(x0 + x1) / 2, FLOOR2_Y - 0.35, z0 - 0.05]} s={[x1 - x0, 0.7, 0.12]} c={RED} />
      <B p={[(x0 + x1) / 2, FLOOR2_Y - 0.35, z1 + 0.05]} s={[x1 - x0, 0.7, 0.12]} c={RED} />
      {/* início da passarela na parede branca à direita do mural */}
      <B
        p={[bridge.x0 - 0.02, (FLOOR2_Y + ROOF_Y) / 2, (z0 + z1) / 2]}
        s={[0.06, ROOF_Y - FLOOR2_Y, z1 - z0]}
        c="#f8fafc"
      />
      <Floor
        p={[(x0 + x1) / 2, FLOOR2_Y + 0.008, (z0 + z1) / 2]}
        s={[x1 - x0, z1 - z0]}
        pattern="ceramic"
        tile={1.2}
      />
      <Floor
        p={[(top.x0 + top.x1) / 2, FLOOR2_Y + 0.008, (top.z0 + top.z1) / 2]}
        s={[top.x1 - top.x0, top.z1 - top.z0]}
        pattern="ceramic"
        tile={1.2}
      />
      <GuardRail from={-PATIO_X} to={top.x1} axis="x" at={z0 - 0.07} y={FLOOR2_Y} />
      <GuardRail from={x0} to={x1} axis="x" at={z1 + 0.07} y={FLOOR2_Y} />
      <GuardRail from={z1} to={top.z1} axis="z" at={top.x0 - 0.07} y={FLOOR2_Y} />
      <GuardRail from={top.z0} to={ramp.b.z0} axis="z" at={top.x1 + 0.07} y={FLOOR2_Y} />
      <GuardRail from={top.x0} to={top.x1} axis="x" at={top.z1 + 0.07} y={FLOOR2_Y} />
      <Sign
        lines={["2º ANDAR · SALAS DE DESENVOLVIMENTO"]}
        p={[-4.5, FLOOR2_Y - 0.22, z1 + 0.1]}
        size={[4.6, 0.32]}
        bg={RED_DARK}
        fg="#ffffff"
      />
    </group>
  );
});

/** Corredor aberto do 2º andar, laje das salas e laje do bloco do mural. */
const UpperDeck = memo(function UpperDeck() {
  const c = upperCorridor;
  const r = upperRooms;
  return (
    <group>
      <B
        p={[(c.x0 + c.x1) / 2, FLOOR2_Y - 0.14, (c.z0 + c.z1) / 2]}
        s={[c.x1 - c.x0, 0.28, c.z1 - c.z0]}
        c="#e7e5e4"
      />
      <B
        p={[(r.x0 + r.x1) / 2, FLOOR2_Y - 0.14, (r.z0 + r.z1) / 2]}
        s={[r.x1 - r.x0, 0.28, r.z1 - r.z0]}
        c="#e7e5e4"
      />
      {/* peitoril vinho na borda da laje voltada para o pátio central */}
      <B
        p={[c.x1 + 0.03, FLOOR2_Y - 0.25, (c.z0 + c.z1) / 2]}
        s={[0.12, 0.55, c.z1 - c.z0]}
        c={RED}
      />
      <Floor
        p={[(c.x0 + c.x1) / 2, FLOOR2_Y + 0.008, (c.z0 + c.z1) / 2]}
        s={[c.x1 - c.x0, c.z1 - c.z0]}
        pattern="ceramic"
        tile={1.2}
      />
      <GuardRail from={c.z0} to={c.z1} axis="z" at={c.x1 + 0.07} y={FLOOR2_Y} />
      <GuardRail from={c.x0} to={c.x1} axis="x" at={c.z0 - 0.07} y={FLOOR2_Y} />
      {/* laje de cobertura do corredor superior, com viga vinho na borda */}
      <CorridorCeiling r={c} y={FLOOR2_Y + WALL_H2} />
      <B
        p={[c.x1, FLOOR2_Y + WALL_H2 + 0.1, (c.z0 + c.z1) / 2]}
        s={[0.3, 0.3, c.z1 - c.z0]}
        c={RED}
      />
      {/* forro do corredor térreo (face de baixo da laje do 2º andar) */}
      <CorridorCeiling r={corridorWest} y={FLOOR2_Y - 0.28} />
    </group>
  );
});

/** Laje de teto branca e lisa com luminárias retangulares embutidas (vista de baixo). */
function CorridorCeiling({ r, y, axis = "z" }: { r: Rect; y: number; axis?: "x" | "z" }) {
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const len = axis === "z" ? r.z1 - r.z0 : r.x1 - r.x0;
  const lights = Math.max(1, Math.floor(len / 3));
  return (
    <group>
      <B p={[cx, y + 0.08, cz]} s={[r.x1 - r.x0 + 0.1, 0.16, r.z1 - r.z0 + 0.1]} c="#f8fafc" />
      {Array.from({ length: lights }, (_, i) => (len * (i + 0.5)) / lights).map((t) => (
        <B
          key={t}
          p={axis === "z" ? [cx, y - 0.005, r.z0 + t] : [r.x0 + t, y - 0.005, cz]}
          s={axis === "z" ? [0.6, 0.02, 1.2] : [1.2, 0.02, 0.6]}
          c="#ffffff"
          e="#fffbeb"
          ei={1}
        />
      ))}
    </group>
  );
}

/** Canteiro de alvenaria (branco com borda vinho), com terra e arbustos. */
function Planter({
  x,
  z,
  w,
  d,
  tree,
}: {
  x: number;
  z: number;
  w: number;
  d: number;
  tree?: number;
}) {
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 0.25, 0]} s={[w, 0.5, d]} c="#f5f5f4" />
      <B p={[0, 0.52, 0]} s={[w + 0.08, 0.06, d + 0.08]} c={RED} />
      <B p={[0, 0.5, 0]} s={[w - 0.3, 0.04, d - 0.3]} c="#5b3a1e" />
      {[-1, 1].map((side) => (
        <Shrub key={side} x={side * (w / 2 - 0.6)} z={0} s={0.8} />
      ))}
      {tree && <Tree x={0} z={0} s={tree} />}
    </group>
  );
}

/** Pátio central descoberto e arborizado, corredores térreos com pilares e peitoris vinho. */
const Courtyard = memo(function Courtyard() {
  const c = courtyard;
  const e = courtyardEast;
  return (
    <group>
      <Floor
        p={[(c.x0 + c.x1) / 2, 0.012, (c.z0 + c.z1) / 2]}
        s={[c.x1 - c.x0, c.z1 - c.z0]}
        pattern="pavers"
        tile={4}
      />
      <Floor
        p={[(e.x0 + e.x1) / 2, 0.012, (e.z0 + e.z1) / 2]}
        s={[e.x1 - e.x0, e.z1 - e.z0]}
        pattern="pavers"
        tile={4}
      />
      {[corridorWest, corridorEast].map((r, i) => (
        <Floor
          key={i}
          p={[(r.x0 + r.x1) / 2, 0.014, (r.z0 + r.z1) / 2]}
          s={[r.x1 - r.x0, r.z1 - r.z0]}
          pattern="ceramic"
          tile={1.2}
        />
      ))}
      {/* passeio do fundo até o refeitório e a quadra */}
      <Floor p={[0, 0.012, BACK_Z - 0.5]} s={[2 * OUTER_X, 1]} pattern="pavers" tile={4} />

      {/* peitoris vinho com capa de concreto */}
      {parapets.map((m, i) => (
        <group key={i}>
          <B p={[m.x, PARAPET_H / 2, m.z]} s={[m.sx, PARAPET_H, m.sz]} c={RED} />
          <B p={[m.x, PARAPET_H + 0.03, m.z]} s={[m.sx + 0.06, 0.06, m.sz + 0.06]} c="#e7e5e4" />
        </group>
      ))}
      {/* pilares vinho: os da esquerda sustentam o corredor do 2º andar */}
      {PILLAR_Z_WEST.map((z) => (
        <B
          key={`w${z}`}
          p={[-PATIO_X, (FLOOR2_Y + WALL_H2) / 2, z]}
          s={[0.34, FLOOR2_Y + WALL_H2, 0.34]}
          c={RED}
        />
      ))}
      {PILLAR_Z_EAST.map((z) => (
        <B key={`e${z}`} p={[PATIO_X, 1.6, z]} s={[0.34, 3.2, 0.34]} c={RED} />
      ))}
      {/* cobertura do corredor direito: laje leve sobre treliça */}
      <Truss
        p={[PATIO_X, 3.2, (corridorEast.z0 + corridorEast.z1) / 2]}
        length={corridorEast.z1 - corridorEast.z0}
        h={0.35}
        r={Math.PI / 2}
      />
      <CorridorCeiling r={{ ...corridorEast, x1: BLOCK_X + 0.1 }} y={3.4} />

      {/* canteiros de alvenaria com árvores, vasos e bancos no meio do pátio */}
      <Planter x={-4} z={-3.4} w={4} d={2.4} tree={1.3} />
      <Planter x={4} z={-3.4} w={4} d={2.4} tree={1.2} />
      <Planter x={-4} z={-11} w={4} d={2.8} tree={1.6} />
      <Planter x={4} z={-11} w={4} d={2.8} tree={1.5} />
      <Planter x={-4} z={-17.6} w={4} d={2.4} tree={1.4} />
      <Planter x={4} z={-17.6} w={4} d={2.4} tree={1.6} />
      <Planter x={14.5} z={-19.2} w={5} d={2.4} tree={1.7} />
      {[
        [-1.8, -1.2],
        [1.8, -1.2],
        [-1.8, -7.2],
        [1.8, -7.2],
        [-1.8, -14.4],
        [1.8, -14.4],
        [-6.6, -7.2],
        [6.6, -7.2],
        [-1.8, -20.4],
        [1.8, -20.4],
        [10.4, -18.2],
        [17.6, -20.4],
      ].map(([x, z], i) => (
        <Pot
          key={i}
          x={x!}
          z={z!}
          pot={POT_COLORS[i % 3]!}
          c={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#15803d" : "#4d7c0f"}
        />
      ))}
      {[
        [-4, -7.2, 0],
        [4, -7.2, 0],
        [-4, -14.4, Math.PI],
        [4, -14.4, Math.PI],
      ].map(([x, z, r]) => (
        <Bench key={`${x}:${z}`} x={x!} z={z!} r={r!} />
      ))}
    </group>
  );
});

/** Fachada principal em placas quadradas cinza ardósia, letreiro prateado e entrada verde e branca. */
function Facade() {
  const z = FACADE_Z;
  const bandH = ROOF_Y + 1.1 - WALL_H;
  const band = usePattern("tiles", (2 * OUTER_X) / 1.2, bandH / 1.2);
  return (
    <group>
      <mesh position={[0, WALL_H + bandH / 2, z]} castShadow receiveShadow>
        <boxGeometry args={[2 * OUTER_X, bandH, 0.3]} />
        <meshStandardMaterial map={band} color="#ffffff" roughness={0.9} />
      </mesh>
      {/* letreiro em relevo prateado */}
      <Sign
        lines={["ESCOLA ESTADUAL DE EDUCAÇÃO PROFISSIONAL", "DR. SALOMÃO ALVES DE MOURA"]}
        p={[0, WALL_H + bandH * 0.5, z + 0.17]}
        size={[15, 2]}
        bg="transparent"
        fg="#e5e7eb"
      />
      <B p={[0, WALL_H + bandH + 0.06, z]} s={[2 * OUTER_X + 0.2, 0.12, 0.4]} c="#2a2d30" />
      {/* detalhes verde e branco da entrada */}
      {[-ENTRANCE_HALF - 0.2, ENTRANCE_HALF + 0.2].map((x) => (
        <group key={x}>
          <B p={[x, WALL_H / 2, z + 0.1]} s={[0.4, WALL_H, 0.4]} c={GREEN} />
          <B p={[x, WALL_H / 2, z + 0.31]} s={[0.12, WALL_H, 0.04]} c="#ffffff" />
        </group>
      ))}
      <B p={[0, WALL_H - 0.3, z]} s={[ENTRANCE_HALF * 2, 0.6, 0.12]} c={GREEN} />
      <B p={[0, WALL_H + 0.02, z + 0.06]} s={[ENTRANCE_HALF * 2 + 0.8, 0.08, 0.14]} c="#ffffff" />
      {[1, -1].map((side) => (
        <Sign
          key={side}
          lines={["ENTRADA"]}
          p={[0, WALL_H - 0.3, z + side * 0.07]}
          size={[2.2, 0.42]}
          r={[0, side === 1 ? 0 : Math.PI, 0]}
          bg={GREEN}
          fg="#ffffff"
        />
      ))}
    </group>
  );
}

/** Grade metálica verde-escura (barras verticais com textura de recorte). */
function Fence({ x0, x1, z, h = 2 }: { x0: number; x1: number; z: number; h?: number }) {
  const len = x1 - x0;
  const bars = usePattern("fence", len / 0.14, 1);
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, h / 2 + 0.3, z]}>
        <planeGeometry args={[len, h]} />
        <meshStandardMaterial map={bars} transparent alphaTest={0.5} side={DoubleSide} />
      </mesh>
      <B p={[(x0 + x1) / 2, 0.15, z]} s={[len, 0.3, 0.25]} c="#d6d3d1" />
      {[h * 0.15, h - 0.05].map((y) => (
        <B key={y} p={[(x0 + x1) / 2, y + 0.3, z]} s={[len, 0.05, 0.05]} c={FENCE_GREEN} />
      ))}
      {Array.from({ length: Math.floor(len / 2.5) + 1 }, (_, i) => x0 + i * 2.5).map((x) => (
        <B key={x} p={[x, h / 2 + 0.3, z]} s={[0.1, h, 0.1]} c={FENCE_GREEN} />
      ))}
    </group>
  );
}

const FLOWER_COLORS = ["#f43f5e", "#facc15", "#f97316", "#e879f9", "#ffffff", "#60a5fa"];

function FlowerBed({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const flowers = useMemo(() => {
    const list: [number, number, string][] = [];
    let seed = Math.abs(Math.round(x * 31 + z * 17)) + 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 14; i += 1) {
      list.push([
        (rand() - 0.5) * (w - 0.4),
        (rand() - 0.5) * (d - 0.4),
        FLOWER_COLORS[i % FLOWER_COLORS.length]!,
      ]);
    }
    return list;
  }, [x, z, w, d]);
  return (
    <group position={[x, 0, z]}>
      <B p={[0, 0.08, 0]} s={[w + 0.2, 0.16, d + 0.2]} c={RED_DARK} />
      <B p={[0, 0.17, 0]} s={[w, 0.04, d]} c="#5b3a1e" />
      {flowers.map(([fx, fz, c], i) => (
        <group key={i} position={[fx, 0, fz]}>
          <B p={[0, 0.3, 0]} s={[0.04, 0.26, 0.04]} c="#15803d" />
          <mesh position={[0, 0.45, 0]}>
            <sphereGeometry args={[0.11, 8, 6]} />
            <meshStandardMaterial color={c} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Jardim frontal: arbustos e pequenas palmeiras dos dois lados do caminho de pedras. */
const FRONT_GARDEN: [number, number, "palm" | "shrub"][] = [
  [-3.8, 15.2, "shrub"],
  [-5.6, 15.5, "palm"],
  [-7.6, 15.2, "shrub"],
  [-10, 15.6, "palm"],
  [-12.6, 15.2, "shrub"],
  [-15.4, 15.6, "palm"],
  [3.8, 15.2, "shrub"],
  [5.6, 15.5, "palm"],
  [7.6, 15.2, "shrub"],
  [10, 15.6, "palm"],
  [12.6, 15.2, "shrub"],
  [15.4, 15.6, "palm"],
  [-3.4, 17.4, "shrub"],
  [3.4, 17.6, "palm"],
  [-3.6, 20.4, "palm"],
  [3.2, 21.4, "shrub"],
];

const Grounds = memo(function Grounds() {
  return (
    <group>
      <mesh position={[0, -0.01, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 80]} />
        <meshStandardMaterial color="#86b95a" roughness={1} />
      </mesh>
      {/* caminho frontal de pedras */}
      <StonePath from={{ x: 0, z: 22.3 }} to={{ x: 0, z: FACADE_Z + 0.2 }} width={2.2} />
      {FRONT_GARDEN.map(([x, z, kind]) =>
        kind === "palm" ? (
          <FanPalm key={`${x}:${z}`} x={x} z={z} />
        ) : (
          <Shrub key={`${x}:${z}`} x={x} z={z} s={1.05} />
        ),
      )}
      <FlowerBed x={-9} z={19} w={3.2} d={2} />
      <FlowerBed x={10} z={19.4} w={3.2} d={2} />
      <EntranceHall />
      <Ramp />
      <Courtyard />
      <Facade />
      <Palm x={-16.5} z={19.5} />
      <Palm x={16.5} z={19.5} />
      {[
        [-17.5, -32],
        [-9, -32],
        [-0.5, -31],
        [19, -34],
        [-19, 10],
        [19, 5],
      ].map(([x, z]) => (
        <Tree key={`o${x}:${z}`} x={x!} z={z!} s={1.25} />
      ))}
      {/* grade metálica verde-escura na frente */}
      <Fence x0={-20} x1={-2.4} z={22.5} />
      <Fence x0={2.4} x1={20} z={22.5} />
      {/* muro branco com faixa verde nas laterais e no fundo */}
      {[
        [0, -35, 40, 0.25],
        [-20, -6.25, 0.25, 57.5],
        [20, -6.25, 0.25, 57.5],
      ].map(([x, z, sx, sz]) => (
        <group key={`${x}:${z}`}>
          <B p={[x!, 0.9, z!]} s={[sx!, 1.8, sz!]} c="#f5f5f4" />
          <B p={[x!, 1.85, z!]} s={[sx! + 0.05, 0.1, sz! + 0.05]} c={GREEN} />
        </group>
      ))}
      {/* portão */}
      <B p={[-2.4, 1.8, 22.5]} s={[0.5, 3.6, 0.5]} c={GREEN} />
      <B p={[2.4, 1.8, 22.5]} s={[0.5, 3.6, 0.5]} c={GREEN} />
      <B p={[0, 3.8, 22.5]} s={[5.4, 0.9, 0.3]} c="#f8fafc" />
      {[1, -1].map((side) => (
        <Sign
          key={side}
          lines={["EEEP DR. SALOMÃO ALVES DE MOURA", "ARACOIABA · CE"]}
          p={[0, 3.8, 22.5 + side * 0.16]}
          size={[5.2, 0.8]}
          r={[0, side === 1 ? 0 : Math.PI, 0]}
          bg="#f8fafc"
          fg={GREEN_DARK}
        />
      ))}
      {/* mastros */}
      {[
        [5.5, "#16a34a", "#facc15"],
        [6.5, "#15803d", "#f8fafc"],
      ].map(([x, a, b]) => (
        <group key={String(x)} position={[x as number, 0, 19.5]}>
          <B p={[0, 2.5, 0]} s={[0.08, 5, 0.08]} c="#cbd5e1" />
          <B p={[0.4, 4.5, 0]} s={[0.8, 0.5, 0.02]} c={a as string} />
          <B p={[0.4, 4.5, 0.015]} s={[0.35, 0.22, 0.01]} c={b as string} r={[0, 0, Math.PI / 4]} />
        </group>
      ))}
    </group>
  );
});

/** 2º andar: salas de DS, corredor aberto, passarela e plataforma da rampa. */
function UpperFloor({ children }: { children?: ReactNode }) {
  return (
    <group>
      <UpperDeck />
      {rooms
        .filter((room) => roomLevel(room) === 1)
        .map((room) => (
          <RoomBlock key={room.id} room={room} />
        ))}
      <Bridge />
      {children}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Trilha, marcadores e itens                                          */
/* ------------------------------------------------------------------ */

function Marker({ room, state }: { room: Room; state: "next" | "todo" | "done" }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 1.6;
    ref.current.position.y = roomWallH(room) + 0.5 + Math.sin(clock.elapsedTime * 2.5) * 0.12;
  });
  const [x, z] = toWorld(room, 0, room.d / 2 + 0.3);
  const color = state === "done" ? "#22c55e" : state === "next" ? "#facc15" : "#a78bfa";
  return (
    <group position={[x, roomY(room), z]}>
      <group ref={ref}>
        <mesh scale={state === "next" ? 1.5 : 1}>
          {state === "done" ? (
            <sphereGeometry args={[0.18, 12, 10]} />
          ) : (
            <octahedronGeometry args={[0.25]} />
          )}
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
        </mesh>
      </group>
      {state === "next" && (
        <mesh
          position={[
            ...(() => {
              const [fx, fz] = doorFront(room, 1.1);
              return [fx - x, 0.04, fz - z] as V3;
            })(),
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.55, 0.75, 32]} />
          <meshBasicMaterial color="#facc15" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

function ItemMesh({ item }: { item: CollectItem }) {
  switch (item) {
    case "document":
      return <B p={[0, 0, 0]} s={[0.3, 0.02, 0.4]} c="#f8fafc" e="#fde68a" ei={0.6} />;
    case "book":
    case "diary":
      return (
        <group>
          <B
            p={[0, 0, 0]}
            s={[0.3, 0.4, 0.08]}
            c={item === "book" ? "#7c3aed" : "#b91c1c"}
            e="#fde68a"
            ei={0.4}
          />
          <B p={[0.01, 0, 0]} s={[0.27, 0.37, 0.085]} c="#f8fafc" />
        </group>
      );
    case "ram":
      return (
        <group>
          <B p={[0, 0, 0]} s={[0.5, 0.14, 0.03]} c="#15803d" e="#22c55e" ei={0.4} />
          {[-0.15, 0, 0.15].map((x) => (
            <B key={x} p={[x, 0.01, 0.02]} s={[0.1, 0.08, 0.02]} c="#111827" />
          ))}
        </group>
      );
    case "ball":
      return (
        <mesh>
          <sphereGeometry args={[0.2, 16, 12]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.3} />
        </mesh>
      );
    case "cable":
      return (
        <group>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.035, 8, 20]} />
            <meshStandardMaterial color="#2563eb" emissive="#3b82f6" emissiveIntensity={0.4} />
          </mesh>
          <B p={[0.2, 0, 0]} s={[0.08, 0.06, 0.1]} c="#e5e7eb" e="#fde68a" ei={0.3} />
        </group>
      );
  }
}

function Collectible({ x, y, z, item }: { x: number; y: number; z: number; item: CollectItem }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.elapsedTime * 1.8;
    ref.current.position.y = 1.15 + Math.sin(clock.elapsedTime * 3) * 0.1;
  });
  return (
    <group position={[x, y, z]}>
      <group ref={ref}>
        <ItemMesh item={item} />
      </group>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.5, 28]} />
        <meshBasicMaterial color="#facc15" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.3, 0.45, 1.2, 16, 1, true]} />
        <meshBasicMaterial color="#fde68a" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Jogador                                                             */
/* ------------------------------------------------------------------ */

/** Para onde a seta-guia aponta: a porta da sala ou, se ela fica em outro andar, a rampa. */
function routeTarget(x: number, z: number, floor: number, room: Room): [number, number] {
  const { a, landing, b, top } = ramp;
  const midA = (a.z0 + a.z1) / 2;
  const midB = (b.z0 + b.z1) / 2;
  const bottom: [number, number] = [a.x0 - 0.8, midA];
  const onLanding: [number, number] = [
    (landing.x0 + landing.x1) / 2,
    (landing.z0 + landing.z1) / 2,
  ];
  const topEnd: [number, number] = [(top.x0 + top.x1) / 2, (bridge.z0 + bridge.z1) / 2];
  const up = roomLevel(room) === 1;
  const lifted = floor > 0.05;
  if (lifted && inRect(a, x, z)) return up ? onLanding : bottom;
  if (lifted && inRect(landing, x, z)) return up ? [b.x0, midB] : [a.x0, midA];
  if (lifted && inRect(b, x, z)) return up ? topEnd : onLanding;
  const level = floor >= LEVEL_SPLIT ? 1 : 0;
  if (roomLevel(room) === level) return doorFront(room, 0.5);
  return up ? bottom : [b.x0 + 0.5, midB];
}

export type CollectTarget = { missionId: string; x: number; y: number; z: number };

/** Altura dos olhos do jogador (m). */
const EYE_H = 1.68;
const MOUSE_SENS = 0.0022;
const TOUCH_SENS = 0.0055;
const PITCH_MAX = (75 * Math.PI) / 180; // ±75°

/**
 * Jogador em primeira pessoa: câmera nos olhos, corpo oculto.
 * Olhar: mouse com Pointer Lock (clique na tela) ou arrastando; no celular, arrastar o dedo.
 * Andar: `input` (WASD/setas ou joystick) relativo para onde se olha; Shift corre.
 */
function Player({
  input,
  controls,
  posRef,
  paused,
  nextRoomId,
  goal,
  collectTargets,
  onRoomChange,
  onCollect,
}: {
  input: { current: Vec2 };
  controls: { current: Controls };
  posRef: { current: Vec2 };
  paused: boolean;
  nextRoomId: string | null;
  goal: Vec2 | null;
  collectTargets: CollectTarget[];
  onRoomChange: (roomId: string | null) => void;
  onCollect: (missionId: string) => void;
}) {
  const gl = useThree((state) => state.gl);
  const arrow = useRef<Group>(null);
  const room = useRef<string | null>(null);
  const collected = useRef(new Set<string>());
  const look = useRef({ yaw: 0, pitch: 0 }); // horizonte nivelado
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const height = useRef(0);
  const velocityY = useRef(0);
  const bob = useRef(0);
  const forward = useRef(new Vector3());

  // olhar ao redor: Pointer Lock + arrastar (mouse) e arrastar (toque)
  useEffect(() => {
    const canvas = gl.domElement;
    const turn = (dx: number, dy: number, sens: number) => {
      const l = look.current;
      l.yaw -= dx * sens;
      l.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, l.pitch - dy * sens));
    };
    let drag: { id: number; x: number; y: number } | null = null;
    const down = (event: PointerEvent) => {
      if (pausedRef.current) return;
      if (event.pointerType === "mouse" && document.pointerLockElement !== canvas) {
        try {
          const request = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          request?.catch?.(() => undefined);
        } catch {
          // sem Pointer Lock (ex.: iframe): segue olhando por arraste
        }
      }
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const move = (event: PointerEvent) => {
      if (pausedRef.current) return;
      if (document.pointerLockElement === canvas) {
        turn(event.movementX, event.movementY, MOUSE_SENS);
        return;
      }
      if (!drag || drag.id !== event.pointerId) return;
      const sens = event.pointerType === "mouse" ? MOUSE_SENS * 1.4 : TOUCH_SENS;
      turn(event.clientX - drag.x, event.clientY - drag.y, sens);
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    };
    const up = (event: PointerEvent) => {
      if (drag?.id === event.pointerId) drag = null;
    };
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    canvas.style.touchAction = "none";
    return () => {
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // abrir um modal solta o mouse
  useEffect(() => {
    if (paused && document.pointerLockElement === gl.domElement) document.exitPointerLock();
  }, [paused, gl]);

  // atalho só de desenvolvimento para testes: window.__eeep.tp(x, z, y, yaw)
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as {
      __eeep?: { tp: (x: number, z: number, y?: number, yaw?: number) => void };
    };
    w.__eeep = {
      tp: (x, z, y = 0, yaw) => {
        posRef.current.x = x;
        posRef.current.z = z;
        posRef.current.y = y;
        if (yaw !== undefined) posRef.current.yaw = yaw;
      },
    };
    return () => {
      delete w.__eeep;
    };
  }, [posRef]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const pos = posRef.current;
    const camera = state.camera as PerspectiveCamera;
    const ctl = controls.current;
    const l = look.current;
    // teleporte pode definir para onde olhar
    if (pos.yaw !== undefined) {
      l.yaw = pos.yaw;
      l.pitch = 0;
      delete pos.yaw;
    }

    // pulo
    if (ctl.jump) {
      ctl.jump = false;
      if (!paused && height.current === 0) velocityY.current = 4.2;
    }
    if (height.current > 0 || velocityY.current > 0) {
      velocityY.current -= 15 * delta;
      height.current = Math.max(0, height.current + velocityY.current * delta);
      if (height.current === 0) velocityY.current = 0;
    }
    ctl.punch = false;

    // andar relativo ao olhar (frente = -z do input)
    const { x: ix, z: iz } = input.current;
    const magnitude = Math.min(1, Math.hypot(ix, iz));
    const moving = !paused && magnitude > 0.08;
    if (moving) {
      const speed = (ctl.run ? 5.4 : 3.1) * magnitude;
      const fx = -Math.sin(l.yaw);
      const fz = -Math.cos(l.yaw);
      const rx = Math.cos(l.yaw);
      const rz = -Math.sin(l.yaw);
      const n = Math.hypot(ix, iz);
      const f = -iz / n;
      const r = ix / n;
      pos.x += (fx * f + rx * r) * speed * delta;
      pos.z += (fz * f + rz * r) * speed * delta;
      collide(pos);
      bob.current += delta * (ctl.run ? 13 : 9);
    } else {
      bob.current *= 0.9;
    }

    // piso sob o jogador: térreo, rampa ou 2º andar
    const floor = floorHeight(pos.x, pos.z, pos.y ?? 0);
    pos.y = floor;

    // câmera nos olhos
    const aspect = state.size.width / Math.max(1, state.size.height);
    // FOV vertical de 75°; no celular em pé, um pouco mais aberto para não ficar estreito
    const fov = aspect < 0.75 ? 85 : 75;
    if (Math.abs(camera.fov - fov) > 0.1) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const bobY = moving && height.current === 0 ? Math.sin(bob.current) * 0.035 : 0;
    camera.position.set(pos.x, floor + height.current + EYE_H + bobY, pos.z);
    camera.rotation.set(l.pitch, l.yaw, 0, "YXZ");

    const current = rooms.find((r) => isInside(r, pos.x, pos.z, floor))?.id ?? null;
    if (current !== room.current) {
      room.current = current;
      onRoomChange(current);
    }

    for (const target of collectTargets) {
      if (collected.current.has(target.missionId)) continue;
      if (Math.abs(target.y - floor) < 1 && Math.hypot(pos.x - target.x, pos.z - target.z) < 0.85) {
        collected.current.add(target.missionId);
        onCollect(target.missionId);
      }
    }

    // seta-guia flutuando à frente, um pouco abaixo da linha dos olhos
    if (arrow.current) {
      const next = nextRoomId ? roomById[nextRoomId] : undefined;
      const target: [number, number] | null =
        next && current !== nextRoomId
          ? routeTarget(pos.x, pos.z, floor, next)
          : !next && goal
            ? [goal.x, goal.z]
            : null;
      arrow.current.visible = Boolean(target);
      if (target) {
        camera.getWorldDirection(forward.current);
        forward.current.y = 0;
        forward.current.normalize();
        arrow.current.position.set(
          camera.position.x + forward.current.x * 1.5,
          camera.position.y - 0.55,
          camera.position.z + forward.current.z * 1.5,
        );
        arrow.current.rotation.y = Math.atan2(target[0] - pos.x, target[1] - pos.z);
      }
    }
  });

  return (
    <group ref={arrow}>
      <mesh rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
        <coneGeometry args={[0.09, 0.26, 3]} />
        <meshBasicMaterial color="#facc15" depthTest={false} transparent opacity={0.95} />
      </mesh>
      <mesh position={[0, 0, -0.17]} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
        <cylinderGeometry args={[0.03, 0.03, 0.14, 8]} />
        <meshBasicMaterial color="#facc15" depthTest={false} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Alvo no chão (portaria)                                             */
/* ------------------------------------------------------------------ */

function GoalRing({ x, z }: { x: number; z: number }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.08);
  });
  return (
    <mesh ref={ref} position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.1, 1.45, 40]} />
      <meshBasicMaterial color="#facc15" transparent opacity={0.85} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Cena                                                                */
/* ------------------------------------------------------------------ */

/** Sol do meio da manhã: luz direcional que acompanha o jogador, com sombras suaves. */
function Sun({ posRef }: { posRef: { current: Vec2 } }) {
  const ref = useRef<DirectionalLight>(null);
  useFrame(() => {
    const light = ref.current;
    if (!light) return;
    const p = posRef.current;
    const y = p.y ?? 0;
    light.position.set(p.x + 16, y + 30, p.z + 12);
    light.target.position.set(p.x, y, p.z);
    light.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={ref}
      intensity={2.6}
      color="#fff1d6"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
      shadow-camera-left={-24}
      shadow-camera-right={24}
      shadow-camera-top={24}
      shadow-camera-bottom={-24}
      shadow-camera-near={1}
      shadow-camera-far={90}
    />
  );
}

function NpcAt({ npc, currentRoom }: { npc: (typeof npcs)[number]; currentRoom: string | null }) {
  const room = roomById[npc.room];
  if (!room) return null;
  const [x, z] = toWorld(room, npc.at[0], npc.at[1]);
  return (
    <group position={[x, roomY(room), z]} rotation={[0, doorAngle[room.door] + npc.face, 0]}>
      <NpcFigure
        look={npc.look}
        seated={npc.seated}
        label={currentRoom === npc.room ? npc.name : undefined}
        sublabel={npc.role === "Aluno(a)" ? undefined : npc.role}
      />
    </group>
  );
}

export function SchoolScene({
  input,
  controls,
  posRef,
  paused,
  done,
  nextRoomId,
  goal,
  currentRoom,
  trail,
  onRoomChange,
  onCollect,
}: {
  avatar: AvatarLook;
  input: { current: Vec2 };
  controls: { current: Controls };
  posRef: { current: Vec2 };
  paused: boolean;
  done: Record<string, unknown>;
  nextRoomId: string | null;
  /** ponto para onde a seta aponta quando não há sala da trilha (ex.: portaria) */
  goal: Vec2 | null;
  currentRoom: string | null;
  /** missões da rota escolhida */
  trail: Mission[];
  onRoomChange: (roomId: string | null) => void;
  onCollect: (missionId: string) => void;
}) {
  const collectTargets = useMemo<CollectTarget[]>(
    () =>
      trail.flatMap((mission) => {
        if (mission.type !== "collect" || done[mission.id]) return [];
        const room = roomById[mission.room]!;
        const [x, z] = toWorld(room, mission.at[0], mission.at[1]);
        return [{ missionId: mission.id, x, y: roomY(room), z }];
      }),
    [done, trail],
  );
  const groundRooms = rooms.filter((room) => roomLevel(room) === 0);
  const upperRoomIds = new Set(rooms.filter((r) => roomLevel(r) === 1).map((r) => r.id));

  return (
    <>
      {/* dia ensolarado no sertão cearense: céu físico, sol quente e luz ambiente do céu */}
      <Sky
        distance={4500}
        sunPosition={[16, 30, 12]}
        turbidity={6}
        rayleigh={1.2}
        mieCoefficient={0.004}
        mieDirectionalG={0.8}
      />
      <fog attach="fog" args={["#d6ecff", 45, 110]} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={["#dbeafe", "#9c8a66", 1.05]} />
      <Sun posRef={posRef} />

      <Grounds />
      {groundRooms.map((room) => (
        <RoomBlock key={room.id} room={room} />
      ))}
      <Walls />
      <UpperFloor>
        {npcs
          .filter((npc) => upperRoomIds.has(npc.room))
          .map((npc) => (
            <NpcAt key={npc.id} npc={npc} currentRoom={currentRoom} />
          ))}
      </UpperFloor>
      {npcs
        .filter((npc) => !upperRoomIds.has(npc.room))
        .map((npc) => (
          <NpcAt key={npc.id} npc={npc} currentRoom={currentRoom} />
        ))}

      {trail.map((mission) => {
        const room = roomById[mission.room]!;
        const state = done[mission.id] ? "done" : nextRoomId === room.id ? "next" : "todo";
        return <Marker key={`${mission.id}-${state}`} room={room} state={state} />;
      })}
      {collectTargets.map((target) => {
        const mission = trail.find((m) => m.id === target.missionId);
        if (!mission || mission.type !== "collect") return null;
        return (
          <Collectible
            key={target.missionId}
            x={target.x}
            y={target.y}
            z={target.z}
            item={mission.item}
          />
        );
      })}

      {goal && <GoalRing x={goal.x} z={goal.z} />}

      <Player
        input={input}
        controls={controls}
        posRef={posRef}
        paused={paused}
        nextRoomId={nextRoomId}
        goal={goal}
        collectTargets={collectTargets}
        onRoomChange={onRoomChange}
        onCollect={onCollect}
      />
    </>
  );
}

export function SceneFallback({ children }: { children: ReactNode }) {
  return (
    <Html center>
      <span role="status" className="rounded-lg bg-[#120e24]/90 px-3 py-2 text-sm text-violet-100">
        {children}
      </span>
    </Html>
  );
}
