import { describe, expect, it } from "vitest";
import {
  courseQuiz,
  collide,
  floorHeight,
  isInside,
  portaria,
  ramp,
  roomById,
  roomY,
  schoolTour,
  tourLegs,
} from "@/game/school";

/**
 * Simula o tour automático do modo "Conhecer a Escola" com a mesma colisão e o mesmo piso
 * do jogo: cada trecho precisa chegar ao último ponto sem ficar preso e no andar certo.
 */
function walk(start: { x: number; z: number; y: number }, path: [number, number][]) {
  const pos = { ...start };
  const dt = 1 / 60;
  const speed = 2.8;
  for (const [tx, tz] of path) {
    let steps = 0;
    for (;;) {
      const dx = tx - pos.x;
      const dz = tz - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.15) break;
      if (++steps > 60 * 20) {
        throw new Error(
          `preso indo para (${tx}, ${tz}) em (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`,
        );
      }
      const step = Math.min(dist, speed * dt);
      const before = { x: pos.x, z: pos.z };
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      collide(pos);
      pos.y = floorHeight(pos.x, pos.z, pos.y);
      // a colisão não pode empurrar o personagem para trás de forma contínua
      if (Math.hypot(pos.x - before.x, pos.z - before.z) < step * 0.2) {
        throw new Error(
          `bloqueado indo para (${tx}, ${tz}) em (${pos.x.toFixed(2)}, ${pos.z.toFixed(2)})`,
        );
      }
    }
  }
  return pos;
}

describe("tour automático da escola", () => {
  it("percorre todas as paradas, sobe a rampa e entra nas salas do 2º andar", () => {
    let pos = { x: portaria.x, z: portaria.z - 1, y: 0 };
    for (const mission of schoolTour) {
      const leg = tourLegs[mission.id];
      expect(leg, mission.id).toBeDefined();
      pos = walk(pos, leg!.path);
      const room = roomById[mission.room]!;
      if (mission.id === "v-equipe") {
        // a parada da Equipe SAM é no meio do 1º lance da rampa, já subindo
        const { a } = ramp;
        expect(pos.x > a.x0 && pos.x < a.x1 && pos.z > a.z0 && pos.z < a.z1, "na rampa").toBe(true);
        expect(pos.y, "v-equipe: acima do térreo").toBeGreaterThan(0.3);
        continue;
      }
      expect(Math.abs(pos.y - roomY(room)), `${mission.id}: andar`).toBeLessThan(0.05);
      if (mission.type === "expect") {
        expect(isInside(room, pos.x, pos.z, pos.y), `${mission.id}: dentro da sala`).toBe(true);
      }
    }
  });
});

describe("quiz final do curso", () => {
  it("tem 6 perguntas com o gabarito A, C, B, D, B, C", () => {
    const letters = courseQuiz.map((q) => "ABCD"[q.answer]);
    expect(letters).toEqual(["A", "C", "B", "D", "B", "C"]);
    for (const q of courseQuiz) expect(q.options).toHaveLength(4);
  });
});
