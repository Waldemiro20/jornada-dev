import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronsUp,
  FlaskConical,
  Flag,
  GraduationCap,
  Home,
  School,
  Map as MapIcon,
  MapPin,
  Shirt,
  Star,
  X,
  Zap,
  Smartphone,
} from "lucide-react";
import { isTouchDevice } from "@/lib/immersive";
import { SceneFallback, SchoolScene, type Controls, type Vec2 } from "./SchoolWorld";
import { ActionButton, Joystick } from "./Controls";
import { GuidePortrait } from "./GuidePortrait";
import { CourseQuiz, ExpectationPanel, VisitCard } from "./CourseQuiz";
import { findPlayed, playerKey, saveExpectation, saveScore, type RankEntry } from "@/game/ranking";
import type { Player } from "../LoginScreen";
import { describeLook, fardaOptions, type AvatarLook } from "@/game/avatar";
import {
  allMissions,
  COURSE_ROOMS,
  courseMissions,
  schoolTour,
  tourLegs,
  labInfo,
  QUIZ_POINTS,
  atPortaria,
  doorAngle,
  BACK_Z,
  bridge,
  courtyard,
  courtyardEast,
  ENTRANCE_HALF,
  FACADE_Z,
  hall,
  OUTER_X,
  ramp,
  levelOf,
  roomLevel,
  roomY,
  upperCorridor,
  toWorld,
  portaria,
  roomById,
  rooms,
  spawn,
  worldSize,
  XP_PER_MISSION,
  type Mission,
  type Route,
  type TourLeg,
} from "@/game/school";
import { guide } from "@/game/people";

type Done = Record<string, { xp: number }>;
type Toast = { title: string; text: string; xp: number };

/** Espera na Entrada antes de o tour da escola começar (curso → escola). */
const SCHOOL_START_DELAY_MS = 2000;
/** Posição padrão no pátio da Entrada, olhando para dentro da escola (yaw 0 = -z). */
const ENTRANCE_SPOT = { x: 0, z: FACADE_Z - 1.5, yaw: 0 };

export function SchoolGameScreen({
  player,
  avatar,
  onExit,
}: {
  player: Player;
  avatar: AvatarLook;
  onExit: () => void;
}) {
  const input = useRef<Vec2>({ x: 0, z: 0 });
  const controls = useRef<Controls>({ run: false, jump: false, punch: false });
  const posRef = useRef<Vec2>({ x: spawn[0], z: spawn[1], y: 0 });
  // sombras só em telas com mouse (desktop): no celular pesam demais
  const [richGraphics] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  );
  /** celular/tablet: joystick, botões e arraste da câmera; no PC ficam escondidos */
  const [touch] = useState(isTouchDevice);

  /* Ao girar o aparelho, o iOS às vezes informa o tamanho antigo: força um novo resize
     depois que a rotação termina para o canvas (renderer + camera.aspect) se ajustar. */
  useEffect(() => {
    const timers: number[] = [];
    const refit = () => {
      for (const ms of [120, 400])
        timers.push(window.setTimeout(() => window.dispatchEvent(new Event("resize")), ms));
    };
    window.addEventListener("orientationchange", refit);
    screen.orientation?.addEventListener?.("change", refit);
    return () => {
      window.removeEventListener("orientationchange", refit);
      screen.orientation?.removeEventListener?.("change", refit);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const [done, setDone] = useState<Done>({});
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  /** Card da parada ou painel da sala de DS aberto (id da missão). */
  const [openMission, setOpenMission] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [runToggle, setRunToggle] = useState(false);
  const [mapSnapshot, setMapSnapshot] = useState<Vec2>({ x: spawn[0], z: spawn[1] });
  const [look, setLook] = useState<AvatarLook>(avatar);
  const [showWardrobe, setShowWardrobe] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPortaria, setShowPortaria] = useState(false);
  const [teleporting, setTeleporting] = useState<string | null>(null);
  /** Teleporte imediato (curso → Entrada): a cortina já começa fechada. */
  const coverNow = useRef(false);
  /** Quiz final (modo curso): novo quiz ou aviso de que este nome já respondeu. */
  const [quiz, setQuiz] = useState<{ mode: "quiz" | "blocked"; previous: RankEntry | null } | null>(
    null,
  );
  /** Fim da visita do modo escola (volta sozinho para o início). */
  const [schoolEnd, setSchoolEnd] = useState(false);
  const [route, setRoute] = useState<Route | null>(null);
  /**
   * Percursos concluídos nesta sessão. Só zeram ao voltar à tela inicial (o jogo é
   * desmontado) ou ao recarregar o site. Impedem o vaivém curso ⇄ escola sem fim.
   */
  const [concluiuCurso, setConcluiuCurso] = useState(false);
  const [concluiuEscola, setConcluiuEscola] = useState(false);

  /* Modo "Conhecer o Curso": só as salas de DS. Modo "Conhecer a Escola": trilha guiada. */
  const trail = useMemo(() => (route === "curso" ? courseMissions : schoolTour), [route]);

  /* 1. No portão: só uma mensagem de boas-vindas */
  useEffect(() => {
    const id = window.setTimeout(() => setShowWelcome(true), 900);
    return () => window.clearTimeout(id);
  }, []);

  /* 2. Ao chegar na placa ENTRADA: escola ou curso? */
  useEffect(() => {
    if (route || showWelcome || showPortaria) return;
    const id = window.setInterval(() => {
      const { x, z } = posRef.current;
      if (atPortaria(x, z)) setShowPortaria(true);
    }, 150);
    return () => window.clearInterval(id);
  }, [route, showWelcome, showPortaria]);

  /** Leva o boneco para dentro de uma sala (corredor entre as carteiras), com fade. */
  const teleportTo = useCallback((roomId: string, label: string) => {
    const room = roomById[roomId];
    if (!room) return;
    input.current = { x: 0, z: 0 };
    setTeleporting(label);
    window.setTimeout(() => {
      const [x, z] = toWorld(room, 0, room.d / 2 - 0.7);
      posRef.current.x = x;
      posRef.current.z = z;
      posRef.current.y = roomY(room);
      // de frente para o quadro
      posRef.current.yaw = doorAngle[room.door];
    }, 450);
    window.setTimeout(() => setTeleporting(null), 1100);
  }, []);

  /* Tour automático do modo escola: o personagem anda sozinho até cada parada */
  const autopilot = useRef<TourLeg | null>(null);
  const autoTarget = useRef<string | null>(null);
  const [walkingTo, setWalkingTo] = useState<string | null>(null);
  /** Começa a caminhar até a parada `missionId` (o card abre ao chegar). */
  const startLeg = useCallback((missionId: string) => {
    const leg = tourLegs[missionId];
    if (!leg) return;
    input.current = { x: 0, z: 0 };
    autoTarget.current = missionId;
    // cópia: o Player consome os pontos do trecho
    autopilot.current = { path: leg.path.map(([x, z]) => [x, z]), face: leg.face };
    setWalkingTo(missionId);
  }, []);
  const onAutoArrive = useCallback(() => {
    setWalkingTo(null);
    if (autoTarget.current) setOpenMission(autoTarget.current);
  }, []);

  const chooseRoute = (choice: Route) => {
    setShowPortaria(false);
    setRoute(choice);
    // "Conhecer o Curso" começa direto na sala do 1º Desenvolvimento;
    // "Conhecer a Escola" começa o tour automático pelo Auditório
    if (choice === "curso")
      teleportTo(COURSE_ROOMS[0], "Indo para a sala do 1º Desenvolvimento...");
    else startLeg(schoolTour[0]!.id);
  };

  /** Esquece o progresso de um modo, para refazê-lo do começo. */
  const resetRoute = (list: Mission[]) =>
    setDone((current) => {
      const next = { ...current };
      for (const m of list) delete next[m.id];
      return next;
    });

  /* Tour pendente (curso → escola): cancelado se o jogador sair antes dos 2 s */
  const tourTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (tourTimer.current !== null) window.clearTimeout(tourTimer.current);
    },
    [],
  );

  /**
   * Fim do modo curso → "Conhecer a Escola": fecha o ranking, leva o personagem para a
   * Entrada (olhando para dentro) e, 2 s depois, começa o tour automático pelo Auditório.
   */
  const switchToSchool = () => {
    setQuiz(null);
    setOpenMission(null);
    autopilot.current = null;
    setWalkingTo(null);
    resetRoute(schoolTour);
    setRoute("escola");
    input.current = { x: 0, z: 0 };
    // tela já coberta (sem fade de entrada) para o salto não aparecer; depois clareia suave
    coverNow.current = true;
    setTeleporting("Indo para a Entrada da escola...");
    window.setTimeout(() => {
      setTeleporting(null);
      coverNow.current = false;
    }, 900);
    posRef.current.x = ENTRANCE_SPOT.x;
    posRef.current.z = ENTRANCE_SPOT.z;
    posRef.current.y = 0;
    posRef.current.yaw = ENTRANCE_SPOT.yaw;
    if (tourTimer.current !== null) window.clearTimeout(tourTimer.current);
    tourTimer.current = window.setTimeout(() => {
      tourTimer.current = null;
      startLeg(schoolTour[0]!.id);
    }, SCHOOL_START_DELAY_MS);
  };

  /**
   * Fim do modo escola → "Conhecer o Curso": fecha a conclusão da visita e leva o
   * personagem para dentro da sala do 1º Desenvolvimento (o painel abre ao chegar).
   */
  const switchToCourse = () => {
    setSchoolEnd(false);
    setOpenMission(null);
    autopilot.current = null;
    setWalkingTo(null);
    resetRoute(courseMissions);
    setRoute("curso");
    teleportTo(COURSE_ROOMS[0], "Indo para a sala do 1º Desenvolvimento...");
  };

  /** Próxima parada do tour depois de `mission` (modo escola). */
  const continueTour = (mission: Mission) => {
    const next = schoolTour[schoolTour.indexOf(mission) + 1];
    if (next) startLeg(next.id);
  };

  const nextMission = route ? trail.find((mission) => !done[mission.id]) : undefined;
  const nextRoomId = nextMission?.room ?? null;
  const nextStep = nextMission ? trail.indexOf(nextMission) + 1 : 0;

  /* Laboratórios fora da trilha: exploração livre, com o modal que apresenta o espaço. */
  const [openLab, setOpenLab] = useState<string | null>(null);
  useEffect(() => {
    if (!currentRoom || !labInfo[currentRoom] || currentRoom === nextRoomId) return;
    input.current = { x: 0, z: 0 };
    setOpenLab(currentRoom);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abre só ao entrar na sala
  }, [currentRoom]);
  const activeLab = openLab ? labInfo[openLab] : undefined;

  const paused =
    openLab !== null ||
    openMission !== null ||
    showMap ||
    showWelcome ||
    showPortaria ||
    quiz !== null ||
    schoolEnd ||
    teleporting !== null;
  const totalXp = useMemo(
    () => Object.values(done).reduce((sum, item) => sum + item.xp, 0),
    [done],
  );
  const doneCount = trail.filter((m) => done[m.id]).length;

  const stop = useCallback(() => {
    input.current = { x: 0, z: 0 };
  }, []);

  const complete = useCallback((mission: Mission, xp: number, text: string | null) => {
    setDone((current) => (current[mission.id] ? current : { ...current, [mission.id]: { xp } }));
    if (text !== null) setToast({ title: mission.title, text, xp });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onCollect = useCallback(
    (missionId: string) => {
      const mission = allMissions.find((m) => m.id === missionId);
      if (mission?.type === "collect") complete(mission, XP_PER_MISSION, mission.success);
    },
    [complete],
  );

  const onRoomChange = useCallback((roomId: string | null) => setCurrentRoom(roomId), []);

  /* Modo curso: ao entrar na sala de DS (teleporte), o painel abre sozinho */
  useEffect(() => {
    if (route !== "curso" || !nextMission || currentRoom !== nextMission.room) return;
    if (nextMission.type === "collect") return;
    const id = window.setTimeout(() => {
      input.current = { x: 0, z: 0 };
      setOpenLab(null);
      setOpenMission(nextMission.id);
    }, 350);
    return () => window.clearTimeout(id);
  }, [route, nextMission, currentRoom]);

  /**
   * Sala de DS concluída ("Enviar e Avançar" ou "Prefiro não responder"): guarda a resposta
   * e avança sozinho 1º → 2º → 3º. Depois do 3º: quiz (curso) ou fim da visita (escola).
   */
  const finishExpectation = (mission: Mission, answer: string | null) => {
    if (!route) return;
    saveExpectation({
      nome: player.nome,
      modo: route,
      sala: mission.room,
      resposta: answer,
    });
    complete(
      mission,
      XP_PER_MISSION,
      answer === null ? "Tudo bem! Seguimos em frente." : "Sua expectativa foi registrada.",
    );
    setOpenMission(null);
    const index = (COURSE_ROOMS as readonly string[]).indexOf(mission.room);
    const nextRoom = COURSE_ROOMS[index + 1];
    if (nextRoom) {
      // curso: vai direto para a próxima sala; escola: o tour segue andando pelo corredor
      if (route === "curso")
        teleportTo(nextRoom, `Indo para a sala do ${index + 2}º Desenvolvimento...`);
      else continueTour(mission);
      return;
    }
    setToast(null);
    if (route === "curso") {
      // cada nome responde o quiz uma única vez
      const previous = findPlayed(playerKey(player.nome)) ?? null;
      setConcluiuCurso(true);
      setQuiz({ mode: previous ? "blocked" : "quiz", previous });
    } else {
      setConcluiuEscola(true);
      setSchoolEnd(true);
    }
  };

  /** Salva o resultado do quiz (se este nome ainda não tiver um) e devolve a entrada. */
  const finishQuiz = (acertos: number, tempo: number): RankEntry | null => {
    const key = playerKey(player.nome);
    const previous = findPlayed(key);
    if (previous) return previous;
    const { ranking, id } = saveScore({
      nome: player.nome.trim().replace(/\s+/g, " "),
      local: player.local,
      key,
      acertos,
      score: acertos * QUIZ_POINTS,
      tempo,
    });
    return ranking.find((r) => r.id === id) ?? null;
  };

  /* teclado */
  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      if (paused) {
        stop();
        return;
      }
      input.current = {
        x:
          Number(keys.has("arrowright") || keys.has("d")) -
          Number(keys.has("arrowleft") || keys.has("a")),
        z:
          Number(keys.has("arrowdown") || keys.has("s")) -
          Number(keys.has("arrowup") || keys.has("w")),
      };
    };
    const typing = (event: KeyboardEvent) =>
      event.target instanceof HTMLElement &&
      ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName);
    const down = (event: KeyboardEvent) => {
      if (typing(event)) return;
      const key = event.key.toLowerCase();
      if (key === "shift") controls.current.run = true;
      if (key === " ") {
        event.preventDefault();
        controls.current.jump = true;
      }
      if (key === "f" || key === "j") controls.current.punch = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        event.preventDefault();
        keys.add(key);
        sync();
      }
    };
    const up = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "shift") controls.current.run = runToggle;
      keys.delete(key);
      sync();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", stop);
    };
  }, [paused, runToggle, stop]);

  useEffect(() => {
    controls.current.run = runToggle;
  }, [runToggle]);

  useEffect(() => {
    if (paused) stop();
  }, [paused, stop]);

  const activeMission = openMission ? allMissions.find((m) => m.id === openMission) : undefined;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[#bfe3ff] text-white">
      <Canvas
        // nitidez até 2x (Math.min(devicePixelRatio, 2)): poupa bateria em telas 3x
        dpr={[1, 2]}
        shadows={richGraphics ? "soft" : false}
        camera={{ position: [spawn[0], 1.68, spawn[1]], fov: 75, near: 0.05, far: 160 }}
        gl={{ antialias: true }}
        className="absolute inset-0"
        fallback={<WebGLFallback />}
      >
        <Suspense fallback={<SceneFallback>Carregando a EEEP...</SceneFallback>}>
          <SchoolScene
            avatar={look}
            input={input}
            controls={controls}
            posRef={posRef}
            paused={paused}
            done={done}
            nextRoomId={nextRoomId}
            goal={route ? null : portaria}
            currentRoom={currentRoom}
            trail={route ? trail : []}
            autopilot={autopilot}
            onAutoArrive={onAutoArrive}
            onRoomChange={onRoomChange}
            onCollect={onCollect}
          />
        </Suspense>
      </Canvas>

      {/* mira e dica de controles da primeira pessoa */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-[5] h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/85 shadow-[0_0_0_1.5px_rgba(0,0,0,0.35)]"
      />

      {/* ---------------- HUD ---------------- */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-[#0f0b1e]/85 to-transparent pb-6 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] short:pb-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-bold">{player.nome}</p>
          <p className="truncate text-[11px] text-white/70">{describeLook(look)}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[#1c1206]">
              <Star className="h-3 w-3 fill-current" /> {totalXp} XP
            </span>
            <span className="rounded-full bg-white/15 px-2 py-0.5">
              {route === "curso" ? "Conhecer o Curso · salas" : "Conhecer a Escola · paradas"}{" "}
              {doneCount}/{trail.length}
            </span>
          </div>
        </div>
        <div className="pointer-events-auto relative flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-expanded={showWardrobe}
            onClick={() => setShowWardrobe((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#120e24]/80 px-3 py-2 text-sm font-semibold"
          >
            <Shirt className="h-4 w-4" /> Farda
          </button>
          {showWardrobe && (
            <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-2xl border border-white/15 bg-[#171126]/95 p-2 shadow-2xl backdrop-blur">
              <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                Trocar farda
              </p>
              {fardaOptions.map((option) => {
                const active = look.outfit === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      const next = { ...look, outfit: option.id };
                      setLook(next);
                      setShowWardrobe(false);
                      try {
                        window.localStorage.setItem("jornada-eeep:avatar", JSON.stringify(next));
                      } catch {
                        /* armazenamento indisponível */
                      }
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm ${
                      active ? "bg-violet-500/25" : "hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      className="h-5 w-5 shrink-0 rounded-full border-2 border-white/40"
                      style={{ backgroundColor: option.swatch }}
                    />
                    <span className="flex-1 font-semibold">{option.name}</span>
                    {active && <Check className="h-4 w-4 text-violet-200" />}
                  </button>
                );
              })}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setMapSnapshot({ ...posRef.current });
              setShowMap(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#120e24]/80 px-3 py-2 text-sm font-semibold"
          >
            <MapIcon className="h-4 w-4" /> Mapa
          </button>
          <button
            type="button"
            aria-label="Sair do jogo"
            onClick={() => {
              stop();
              onExit();
            }}
            className="rounded-xl border border-white/20 bg-[#120e24]/80 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Objetivo atual (indicador no topo) */}
      <div className="pointer-events-none absolute inset-x-3 top-[5.5rem] z-10 flex justify-center">
        {!route ? (
          !showWelcome && (
            <div className="flex max-w-full items-center gap-1.5 rounded-full bg-[#120e24]/80 px-3 py-1.5 text-xs backdrop-blur">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" />
              <span className="truncate">
                Siga a seta até a <b>ENTRADA</b>
              </span>
            </div>
          )
        ) : walkingTo && nextMission ? (
          <div className="flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/50 bg-[#120e24]/85 px-3 py-1.5 text-xs backdrop-blur">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="truncate">
              Tour automático · parada {nextStep}/{trail.length}: caminhando até{" "}
              <b>
                {nextMission.type === "visit"
                  ? nextMission.title
                  : roomById[nextMission.room]?.name}
              </b>
            </span>
          </div>
        ) : nextMission && currentRoom === nextMission.room ? (
          <button
            type="button"
            onClick={() => {
              stop();
              setOpenMission(nextMission.id);
            }}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-amber-400/95 px-3 py-1.5 text-xs font-bold text-[#1c1206]"
          >
            <MapPin className="h-3.5 w-3.5" /> {nextMission.title} · abrir
          </button>
        ) : nextMission ? (
          <div className="flex max-w-full items-center gap-1.5 rounded-full border border-amber-300/50 bg-[#120e24]/85 px-3 py-1.5 text-xs backdrop-blur">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            <span className="truncate">
              Parada {nextStep}/{trail.length}: <b>{roomById[nextMission.room]?.name}</b>
              {roomLevel(roomById[nextMission.room]!) === 1 && levelOf(posRef.current.y ?? 0) === 0
                ? " · suba a rampa até o 2º andar"
                : " · siga a seta amarela"}
            </span>
          </div>
        ) : currentRoom && labInfo[currentRoom] ? (
          <button
            type="button"
            onClick={() => {
              stop();
              setOpenLab(currentRoom);
            }}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-violet-600/90 px-3 py-1.5 text-xs font-bold"
          >
            <FlaskConical className="h-3.5 w-3.5" /> {roomById[currentRoom]?.name} · ver informações
          </button>
        ) : null}
      </div>

      {/* Toast de missão concluída */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-none absolute inset-x-4 top-1/3 z-20 mx-auto max-w-sm rounded-2xl border border-emerald-300/60 bg-emerald-600/95 p-4 text-center shadow-2xl"
            role="status"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-100">
              Missão concluída!
            </p>
            <p className="font-display text-lg font-bold">{toast.title}</p>
            <p className="mt-1 text-sm text-emerald-50">{toast.text}</p>
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-300 px-3 py-0.5 text-sm font-bold text-[#1c1206]">
              <Star className="h-3.5 w-3.5 fill-current" /> +{toast.xp} XP
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controles touch (celular/tablet): joystick à esquerda, Pular/Correr à direita.
          O resto da tela é a área de arrastar para girar a câmera. */}
      {touch && (
        <>
          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-10">
            <Joystick input={input} disabled={paused} />
          </div>
          <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-10 h-40 w-44 short:h-32">
            <div className="absolute bottom-0 right-0">
              <ActionButton
                label="Pular"
                big
                disabled={paused}
                onPress={() => (controls.current.jump = true)}
              >
                <ChevronsUp className="h-6 w-6" />
              </ActionButton>
            </div>
            <div className="absolute right-3 top-0">
              <ActionButton
                label={runToggle ? "Correr" : "Andar"}
                active={runToggle}
                disabled={paused}
                onPress={() => setRunToggle((value) => !value)}
              >
                <Zap className="h-5 w-5" />
              </ActionButton>
            </div>
          </div>
          <p className="pointer-events-none absolute left-1/2 top-24 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#120e24]/60 px-3 py-1 text-[11px] text-white/80 short:top-16">
            Arraste a tela para olhar ao redor
          </p>
        </>
      )}
      {!touch && (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-[#120e24]/70 px-3 py-1.5 text-center text-xs text-white/80">
          Clique na tela para olhar com o mouse · WASD/setas: andar · Shift: correr · Espaço: pular
          · Esc: soltar o mouse
        </p>
      )}

      {/* ---------------- Parada da trilha / sala de DS ---------------- */}
      <AnimatePresence>
        {activeMission?.type === "visit" && (
          <VisitCard
            key={activeMission.id}
            mission={activeMission}
            step={trail.indexOf(activeMission) + 1}
            total={trail.length}
            onContinue={() => {
              complete(activeMission, XP_PER_MISSION, null);
              setOpenMission(null);
              continueTour(activeMission);
            }}
          />
        )}
        {activeMission?.type === "expect" && route && (
          <ExpectationPanel
            key={activeMission.id}
            route={route}
            roomId={activeMission.room}
            nextLabel={
              activeMission.room !== COURSE_ROOMS[COURSE_ROOMS.length - 1]
                ? "Você vai para a próxima sala automaticamente."
                : route === "curso"
                  ? "Em seguida: o quiz final do curso."
                  : "Em seguida: fim da visita pela escola."
            }
            onSubmit={(answer) => finishExpectation(activeMission, answer)}
          />
        )}
      </AnimatePresence>

      {/* ---------------- Boas-vindas (portão) ---------------- */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0f0b1e]/70 p-3 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-title"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="game-card max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-violet-300/25 bg-[#171126] p-5 short:p-4 text-center shadow-2xl"
            >
              <div className="flex justify-center">
                <GuidePortrait size="lg" />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                EEEP Dr. Salomão Alves de Moura · Aracoiaba · CE
              </p>
              <h2 id="welcome-title" className="font-display text-2xl font-bold">
                Seja muito bem-vindo(a), {player.nome}! 🎉
              </h2>
              <p className="mt-3 text-white/85">
                Eu sou o <b>{guide.name}</b>, seu guia hoje. Que alegria ter você aqui na nossa
                escola!
              </p>
              <p className="mt-2 text-sm text-white/60">
                Siga a seta amarela até a placa <b>ENTRADA</b>. Te encontro lá!
              </p>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold"
              >
                Vamos lá!
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Pergunta da portaria ---------------- */}
      <AnimatePresence>
        {showPortaria && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0f0b1e]/70 p-3 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-title"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="game-card max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-violet-300/25 bg-[#171126] p-5 short:p-4 text-center shadow-2xl"
            >
              <div className="flex justify-center">
                <GuidePortrait size="lg" />
              </div>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-300">
                Entrada
              </p>
              <h2 id="guide-title" className="font-display text-2xl font-bold">
                Olá, {player.nome}!
              </h2>
              <p className="mt-3 font-display text-lg font-bold text-violet-200">
                O que você gostaria de saber mais: sobre a <b className="text-white">escola</b> ou
                sobre o <b className="text-white">curso</b> (Desenvolvimento de Sistemas)?
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    chooseRoute("escola");
                  }}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.05] p-4 font-bold active:scale-[0.99]"
                >
                  <School className="h-6 w-6 text-emerald-300" />
                  Conhecer a Escola
                  <span className="text-xs font-normal text-white/60">
                    Tour guiado: Auditório, Sala dos Professores, laboratórios, quadra e as salas do
                    1º, 2º e 3º ano
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    chooseRoute("curso");
                  }}
                  className="flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-500 p-4 font-bold active:scale-[0.99]"
                >
                  <GraduationCap className="h-6 w-6 text-amber-300" />
                  Conhecer o Curso
                  <span className="text-xs font-normal text-white/80">
                    Desenvolvimento de Sistemas: as salas do 1º, 2º e 3º ano, quiz final e ranking
                  </span>
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Laboratório (exploração) ---------------- */}
      <AnimatePresence>
        {openLab && activeLab && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-[#0f0b1e]/70 p-3 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="lab-title"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              className="game-card max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-violet-300/25 bg-[#171126] p-5 short:p-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700">
                    <FlaskConical className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-violet-300">
                      Exploração · Conheça o espaço
                    </p>
                    <h2 id="lab-title" className="font-display text-xl font-bold">
                      {roomById[openLab]?.name}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Fechar"
                  onClick={() => setOpenLab(null)}
                  className="rounded-lg border border-white/10 p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-white/80">{activeLab.intro}</p>
              <dl className="mt-3 space-y-2">
                {activeLab.sections.map((section) => (
                  <div
                    key={section.name}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
                  >
                    <dt className="font-bold text-violet-200">{section.name}</dt>
                    <dd className="mt-0.5 text-white/75">{section.text}</dd>
                  </div>
                ))}
              </dl>
              <button
                type="button"
                onClick={() => setOpenLab(null)}
                className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold"
              >
                Continuar explorando
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Mapa ---------------- */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            className="absolute inset-0 z-40 flex items-center justify-center bg-[#0f0b1e]/85 p-3 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMap(false)}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="map-title"
              onClick={(event) => event.stopPropagation()}
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-3xl border border-white/15 bg-[#171126] p-4"
            >
              <div className="flex items-center justify-between">
                <h2 id="map-title" className="font-display text-lg font-bold">
                  Mapa da EEEP
                </h2>
                <button
                  type="button"
                  aria-label="Fechar mapa"
                  onClick={() => setShowMap(false)}
                  className="rounded-lg border border-white/10 p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SchoolMap done={done} trail={trail} nextRoomId={nextRoomId} player={mapSnapshot} />
              <ol className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {trail.map((mission, index) => (
                  <li
                    key={mission.id}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      mission.room === nextRoomId ? "bg-amber-400/15" : ""
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                        done[mission.id] ? "bg-emerald-500" : "bg-white/10"
                      }`}
                    >
                      {done[mission.id] ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {roomById[mission.room]?.name}
                      <span className="text-white/45"> · {mission.title}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Fim da visita (modo escola) ---------------- */}
      <AnimatePresence>
        {schoolEnd && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0f0b1e]/85 p-4 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              role="dialog"
              aria-modal="true"
              aria-labelledby="school-end-title"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="game-card my-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-violet-300/25 bg-[#171126] p-6 text-center short:p-4"
            >
              <div className="flex justify-center">
                <GuidePortrait size="lg" />
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-xs uppercase tracking-widest text-amber-300">
                <Flag className="h-3.5 w-3.5" /> Visita concluída
              </p>
              <h2 id="school-end-title" className="font-display text-2xl font-bold">
                Obrigado pela visita, {player.nome}!
              </h2>
              <p className="mt-3 text-white/80">
                Você conheceu o Auditório, a Sala dos Professores, os laboratórios, a quadra e as
                salas do 1º, 2º e 3º ano da EEEP Dr. Salomão Alves de Moura. Esperamos você por
                aqui!
              </p>
              <p className="mt-1 text-sm text-white/55">— {guide.name}, seu guia</p>
              <div className={`mt-5 grid gap-3 ${concluiuCurso ? "" : "sm:grid-cols-2"}`}>
                {/* o curso já foi feito nesta sessão: só resta voltar ao início */}
                {!concluiuCurso && (
                  <button
                    type="button"
                    onClick={switchToCourse}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-[#1c1206]"
                  >
                    <GraduationCap className="h-4 w-4" /> Conhecer o Curso
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    stop();
                    onExit();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold"
                >
                  <Home className="h-4 w-4" /> Voltar ao Início
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Teletransporte para as salas de DS ---------------- */}
      <AnimatePresence>
        {teleporting && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#0f0b1e]"
            initial={{ opacity: coverNow.current ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="font-display text-lg font-bold text-violet-100">{teleporting}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------- Quiz final do curso + ranking ---------------- */}
      <AnimatePresence>
        {quiz && (
          <CourseQuiz
            player={player}
            mode={quiz.mode}
            previous={quiz.previous}
            onFinish={finishQuiz}
            onSchool={concluiuEscola ? null : switchToSchool}
            onRestart={() => {
              stop();
              onExit();
            }}
          />
        )}
      </AnimatePresence>
      {/* Celular/tablet em pé: pede para deitar o aparelho (some ao virar). Necessário no
          iPhone, onde o Safari não deixa travar a orientação. */}
      {touch && <RotateHint />}
    </main>
  );
}

function RotateHint() {
  return (
    <div
      role="alert"
      className="absolute inset-0 z-[100] hidden flex-col items-center justify-center gap-5 bg-[#0f0b1e]/95 px-8 text-center backdrop-blur portrait:flex"
    >
      <Smartphone className="animate-rotate-phone h-20 w-20 text-violet-300" strokeWidth={1.5} />
      <div>
        <p className="font-display text-2xl font-bold">Gire o celular</p>
        <p className="mt-2 text-white/75">
          Deite o aparelho na horizontal para ver a escola inteira e jogar melhor.
        </p>
      </div>
    </div>
  );
}

const MAP_LABELS: Record<string, string> = {
  sala1: "1º Desenv.",
  sala2: "2º Desenv.",
  sala3: "3º Desenv.",
  auditorio: "Auditório",
  biblioteca: "Biblioteca",
  secretaria: "Secretaria",
  professores: "Profs.",
  linguas: "Línguas",
  informatica: "Informát.",
  "sanitario-f": "WC F",
  "sanitario-m": "WC M",
  ciencias: "Lab. Ciências",
  cantina: "Refeitório",
  quadra: "Quadra",
};

function SchoolMap({
  done,
  trail,
  nextRoomId,
  player,
}: {
  done: Done;
  trail: Mission[];
  nextRoomId: string | null;
  player: Vec2;
}) {
  const level = levelOf(player.y ?? 0);
  const [floor, setFloor] = useState(level);
  return (
    <div className="mt-3">
      <div className="mb-2 flex gap-1.5 text-xs font-semibold" role="group" aria-label="Andar">
        {(["Térreo", "2º andar"] as const).map((label, i) => (
          <button
            key={label}
            type="button"
            aria-pressed={floor === i}
            onClick={() => setFloor(i as 0 | 1)}
            className={`rounded-full px-3 py-1 ${
              floor === i ? "bg-amber-400 text-[#1c1206]" : "bg-white/10 text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <svg
        viewBox="-21 -37.5 42 61.5"
        className="max-h-[45dvh] w-full rounded-xl bg-[#8cbf5f]"
        role="img"
        aria-label={`Mapa da escola · ${floor === 1 ? "2º andar" : "térreo"}`}
      >
        {/* prédio */}
        <rect
          x={-OUTER_X}
          y={BACK_Z}
          width={2 * OUTER_X}
          height={FACADE_Z - BACK_Z}
          fill="#e7e5e4"
          opacity={floor === 1 ? 0.35 : 1}
        />
        {floor === 0 &&
          [hall, courtyard, courtyardEast].map((r, i) => (
            <rect
              key={i}
              x={r.x0}
              y={r.z0}
              width={r.x1 - r.x0}
              height={r.z1 - r.z0}
              fill={i === 0 ? "#c9cbcd" : "#a7c98a"}
            />
          ))}
        {floor === 1 &&
          [upperCorridor, bridge].map((r, i) => (
            <rect
              key={i}
              x={r.x0}
              y={r.z0}
              width={r.x1 - r.x0}
              height={r.z1 - r.z0}
              fill="#e8cfae"
              stroke="#901a1e"
              strokeWidth={0.25}
            />
          ))}
        {/* rampa em ziguezague e plataforma */}
        {[ramp.a, ramp.landing, ramp.b, ramp.top].map((r, i) => (
          <rect
            key={i}
            x={r.x0}
            y={r.z0}
            width={r.x1 - r.x0}
            height={r.z1 - r.z0}
            fill={i === 2 ? "#7a171a" : "#901a1e"}
          />
        ))}
        <text
          x={(ramp.a.x0 + ramp.a.x1) / 2}
          y={ramp.a.z1 + 1.2}
          fontSize={0.9}
          textAnchor="middle"
          fill="#7a171a"
          fontWeight="bold"
        >
          RAMPA
        </text>
        {floor === 0 && (
          <rect
            x={-ENTRANCE_HALF}
            y={FACADE_Z}
            width={ENTRANCE_HALF * 2}
            height={8}
            fill="#e4ded3"
          />
        )}
        {rooms
          .filter((room) => roomLevel(room) === floor)
          .map((room) => {
            const [sx, sz] = worldSize(room);
            const mission = trail.find((m) => m.room === room.id);
            const isDone = mission ? Boolean(done[mission.id]) : false;
            return (
              <g key={room.id}>
                <rect
                  x={room.x - sx / 2}
                  y={room.z - sz / 2}
                  width={sx}
                  height={sz}
                  fill={room.accent}
                  fillOpacity={room.id === nextRoomId ? 0.95 : 0.6}
                  stroke={room.id === nextRoomId ? "#facc15" : "#f8fafc"}
                  strokeWidth={room.id === nextRoomId ? 0.5 : 0.2}
                />
                <text
                  x={room.x}
                  y={room.z + 0.4}
                  fontSize={1.05}
                  textAnchor="middle"
                  fill="#fff"
                  fontWeight="bold"
                >
                  {isDone ? "✓ " : ""}
                  {MAP_LABELS[room.id] ?? room.name}
                </text>
              </g>
            );
          })}
        {level === floor && (
          <circle
            cx={player.x}
            cy={player.z}
            r={1}
            fill="#facc15"
            stroke="#1c1206"
            strokeWidth={0.3}
          />
        )}
        <text x={0} y={22} fontSize={1.4} textAnchor="middle" fill="#14532d" fontWeight="bold">
          ENTRADA
        </text>
      </svg>
    </div>
  );
}

function WebGLFallback() {
  return (
    <div
      role="alert"
      className="flex h-full items-center justify-center bg-[#0f0b1e] px-6 text-center text-white"
    >
      Seu navegador não oferece suporte a WebGL. Tente abrir o jogo em um navegador atualizado.
    </div>
  );
}
