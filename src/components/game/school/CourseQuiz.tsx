import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Check,
  Home,
  Lock,
  MapPin,
  Medal,
  MessageCircle,
  School,
  Star,
  Trophy,
  X,
} from "lucide-react";
import { GuidePortrait } from "./GuidePortrait";
import type { Player } from "../LoginScreen";
import { guide } from "@/game/people";
import {
  courseQuiz,
  labInfo,
  QUIZ_POINTS,
  roomById,
  roomContent,
  type Mission,
  type Route,
} from "@/game/school";
import { loadRanking, sortRanking, type RankEntry } from "@/game/ranking";

/** Mensagem oficial exibida assim que o jogador termina o quiz. */
export const GOOD_LUCK_MESSAGE =
  "Todo o seu esforço, dedicação e noites preparadas te trouxeram até aqui. Acredite no seu potencial e vá com a cabeça erguida: a banca só vai confirmar o talento que você já tem. Muita boa sorte na EEEP!";

/** Texto do botão para pular a pergunta de expectativas. */
export const SKIP_TEXT = "Prefiro não responder";

/** Fundo escurecido + cartão dos diálogos. */
function Dialog({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0f0b1e]/85 p-3 backdrop-blur"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="game-card max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl border border-violet-300/25 bg-[#171126] p-5 text-[clamp(0.875rem,0.8rem+0.3vw,1rem)] shadow-2xl short:p-4"
      >
        {children}
      </motion.section>
    </motion.div>
  );
}

/** Card curto de uma parada da trilha guiada do modo "Conhecer a Escola". */
export function VisitCard({
  mission,
  step,
  total,
  onContinue,
}: {
  mission: Mission;
  step: number;
  total: number;
  onContinue: () => void;
}) {
  const lab = labInfo[mission.room];
  return (
    <Dialog labelledBy="visit-title">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
        <MapPin className="h-3 w-3" /> Conhecer a Escola · parada {step} de {total}
      </p>
      <h2 id="visit-title" className="font-display text-xl font-bold">
        {mission.title}
      </h2>
      {mission.type === "visit" && mission.image && (
        <img
          src={mission.image}
          alt={mission.title}
          className="mt-3 aspect-video max-h-[40dvh] w-full rounded-2xl border border-white/10 object-contain short:max-h-[45dvh]"
        />
      )}
      <p className="mt-3 text-white/85">{mission.intro}</p>
      {lab && (
        <dl className="mt-3 space-y-2">
          {lab.sections.slice(0, 2).map((section) => (
            <div
              key={section.name}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm"
            >
              <dt className="font-bold text-violet-200">{section.name}</dt>
              <dd className="mt-0.5 text-white/75">{section.text}</dd>
            </div>
          ))}
        </dl>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="mt-4 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold"
      >
        {(mission.type === "visit" && mission.button) || "Continuar"}
      </button>
    </Dialog>
  );
}

/**
 * Painel de uma sala de Desenvolvimento, nos dois modos.
 * Parte superior: o que se estuda naquele ano (base comum no modo escola, DS no modo curso).
 * Parte inferior: pergunta aberta de expectativas, com "Enviar e Avançar" e
 * "Prefiro não responder" (ambos avançam para a próxima sala).
 */
export function ExpectationPanel({
  route,
  roomId,
  nextLabel,
  onSubmit,
}: {
  route: Route;
  roomId: string;
  /** texto do que acontece ao avançar (próxima sala, quiz ou fim da visita) */
  nextLabel: string;
  /** resposta digitada, ou null para "Prefiro não responder" */
  onSubmit: (answer: string | null) => void;
}) {
  const content = roomContent(route, roomId);
  const [draft, setDraft] = useState("");
  if (!content) return null;
  const answer = draft.trim();
  return (
    <Dialog labelledBy="room-title">
      <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
        {route === "curso" ? "Conhecer o Curso · Desenvolvimento de Sistemas" : "Conhecer a Escola"}
      </p>
      <h2 id="room-title" className="font-display text-xl font-bold">
        {roomById[roomId]?.name}
      </h2>

      {/* parte superior: o que se estuda no ano */}
      <div className="mt-3 rounded-2xl border border-violet-300/20 bg-violet-500/10 p-3">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-200">
          <BookOpen className="h-3.5 w-3.5" />
          {route === "curso"
            ? `O que você estuda no ${content.year} do curso`
            : `O que se estuda na escola no ${content.year}`}
        </p>
        <ul className="mt-2 space-y-2">
          {content.topics.map((topic) => (
            <li key={topic.name} className="text-sm">
              <b className="text-white">{topic.name}</b>
              <span className="block text-white/70">{topic.text}</span>
            </li>
          ))}
        </ul>
        {content.highlight && (
          <div className="mt-3 rounded-xl border border-amber-300/50 bg-amber-400/10 p-3 text-sm">
            <p className="flex items-center gap-1.5 font-bold text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" /> {content.highlight.name}
            </p>
            <p className="mt-1 text-white/80">{content.highlight.text}</p>
          </div>
        )}
      </div>

      {/* parte inferior: expectativas */}
      <div className="mt-4 border-t border-white/10 pt-4">
        <label
          htmlFor="expectation"
          className="flex items-start gap-1.5 font-semibold text-white/90"
        >
          <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          {content.question}
        </label>
        <textarea
          id="expectation"
          rows={3}
          maxLength={1000}
          value={draft}
          onChange={(event) => setDraft(event.currentTarget.value)}
          placeholder="Escreva aqui..."
          className="mt-2 w-full resize-y rounded-xl border border-white/10 bg-[#0f0b1e] px-4 py-3 text-white outline-none placeholder:text-white/35 focus:border-violet-400"
        />
        <button
          type="button"
          disabled={answer.length === 0}
          onClick={() => onSubmit(answer)}
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold disabled:opacity-40"
        >
          Enviar e Avançar
        </button>
        <button
          type="button"
          onClick={() => onSubmit(null)}
          className="mt-2 w-full rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-white/80"
        >
          {SKIP_TEXT}
        </button>
        <p className="mt-2 text-center text-xs text-white/50">{nextLabel}</p>
      </div>
    </Dialog>
  );
}

/**
 * Quiz final do modo "Conhecer o Curso" (só depois da sala do 3º ano).
 * - mode "quiz": abertura → 6 perguntas fáceis → ranking (com "Voltar ao início").
 * - mode "blocked": este nome já fez o quiz; mostra a pontuação registrada e o ranking.
 */
export function CourseQuiz({
  player,
  mode,
  previous,
  onFinish,
  onRestart,
  onSchool,
}: {
  player: Player;
  mode: "quiz" | "blocked";
  /** resultado já registrado (modo "blocked") */
  previous: RankEntry | null;
  /** salva a pontuação (uma vez por nome) e devolve a entrada do ranking */
  onFinish: (acertos: number, tempo: number) => RankEntry | null;
  onRestart: () => void;
  /**
   * fecha o ranking e começa o modo "Conhecer a Escola" pela Entrada;
   * null quando a escola já foi visitada nesta sessão (só "Voltar ao Início")
   */
  onSchool: (() => void) | null;
}) {
  const startedAt = useRef(Date.now());
  const [stage, setStage] = useState<"intro" | "question" | "blocked" | "ranking">(
    mode === "quiz" ? "intro" : "blocked",
  );
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [mine, setMine] = useState<RankEntry | null>(previous);
  const [finished, setFinished] = useState(false);

  if (stage === "ranking") {
    const saved = loadRanking();
    // sem armazenamento disponível, a entrada recém-criada aparece só nesta sessão
    const ranking =
      mine && !saved.some((r) => r.id === mine.id) ? sortRanking([...saved, mine]) : saved;
    return (
      <RankingBoard
        ranking={ranking}
        me={mine}
        message={finished ? GOOD_LUCK_MESSAGE : undefined}
        onRestart={onRestart}
        onSchool={onSchool}
      />
    );
  }

  const question = courseQuiz[index]!;
  const isLast = index === courseQuiz.length - 1;

  return (
    <Dialog labelledBy="quiz-title">
      {stage === "blocked" ? (
        <div className="text-center">
          <div className="flex justify-center">
            <GuidePortrait size="lg" />
          </div>
          <p className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-amber-300">
            <Lock className="h-3 w-3" /> Quiz já realizado
          </p>
          <h2 id="quiz-title" className="font-display text-2xl font-bold">
            Que bom te ver de novo, {player.nome}!
          </h2>
          <p className="mt-3 text-white/85">
            O jogador “{previous?.nome ?? player.nome}” já respondeu o quiz do curso. Cada pessoa só
            pode responder uma única vez.
          </p>
          {previous && (
            <p className="mt-3 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3">
              Pontuação registrada: <b className="text-amber-300">{previous.score} pontos</b> (
              {previous.acertos}/{courseQuiz.length} acertos)
            </p>
          )}
          <p className="mt-1 text-sm text-white/55">— {guide.name}, seu guia</p>
          <button
            type="button"
            onClick={() => setStage("ranking")}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-[#1c1206]"
          >
            <Trophy className="h-4 w-4" /> Ver ranking
          </button>
        </div>
      ) : stage === "intro" ? (
        <div className="text-center">
          <div className="flex justify-center">
            <GuidePortrait size="lg" />
          </div>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-amber-300">
            Quiz final do curso
          </p>
          <h2 id="quiz-title" className="font-display text-2xl font-bold">
            Mandou bem, {player.nome}!
          </h2>
          <p className="mt-3 text-white/85">
            Você conheceu as três salas de Desenvolvimento. Agora responda {courseQuiz.length}{" "}
            perguntas bem fáceis e veja sua posição no ranking. Atenção: o quiz só pode ser feito
            uma vez!
          </p>
          <p className="mt-1 text-sm text-white/55">— {guide.name}, seu guia</p>
          <button
            type="button"
            onClick={() => {
              startedAt.current = Date.now();
              setStage("question");
            }}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 py-3 font-bold text-[#1c1206]"
          >
            Começar o quiz
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-300">
                Quiz final do curso
              </p>
              <h2 id="quiz-title" className="font-display text-xl font-bold">
                Pergunta {index + 1} de {courseQuiz.length}
              </h2>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-1 text-xs font-bold text-[#1c1206]">
              <Star className="h-3 w-3 fill-current" /> {hits * QUIZ_POINTS} pts
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-amber-400 transition-all"
              style={{
                width: `${((index + (picked !== null ? 1 : 0)) / courseQuiz.length) * 100}%`,
              }}
            />
          </div>

          <p className="mt-4 font-semibold text-white/90">{question.question}</p>

          <div className="mt-4 space-y-2">
            {question.options.map((option, i) => {
              const answered = picked !== null;
              const right = answered && i === question.answer;
              const wrong = answered && i === picked && i !== question.answer;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={answered}
                  onClick={() => {
                    setPicked(i);
                    if (i === question.answer) setHits((h) => h + 1);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    right
                      ? "border-emerald-300 bg-emerald-500/25"
                      : wrong
                        ? "border-rose-400/60 bg-rose-500/20"
                        : answered
                          ? "border-white/10 bg-white/[0.03] text-white/45"
                          : "border-white/15 bg-white/[0.05] active:scale-[0.99]"
                  }`}
                >
                  {option}
                  {right && <Check className="h-4 w-4 shrink-0 text-emerald-300" />}
                  {wrong && <X className="h-4 w-4 shrink-0 text-rose-300" />}
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <div
              className={`mt-3 rounded-xl border p-3 text-sm ${
                picked === question.answer
                  ? "border-emerald-300/40 bg-emerald-500/10"
                  : "border-rose-300/40 bg-rose-500/10"
              }`}
            >
              <p
                className={`font-bold ${picked === question.answer ? "text-emerald-300" : "text-rose-300"}`}
              >
                {picked === question.answer ? `Acertou! +${QUIZ_POINTS} pontos` : "Quase!"}
              </p>
              <p className="mt-1 text-white/80">{question.explanation}</p>
              <button
                type="button"
                onClick={() => {
                  if (!isLast) {
                    setIndex((i) => i + 1);
                    setPicked(null);
                    return;
                  }
                  const tempo = Math.round((Date.now() - startedAt.current) / 1000);
                  setMine(onFinish(hits, tempo));
                  setFinished(true);
                  setStage("ranking");
                }}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-500 py-3 font-bold"
              >
                {isLast ? "Concluir e ver o ranking" : "Próxima pergunta"}
              </button>
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}

const MEDALS = ["text-amber-300", "text-slate-200", "text-orange-400"];

/** Painel grande do ranking geral, centralizado na tela. */
function RankingBoard({
  ranking,
  me: mine,
  message,
  onRestart,
  onSchool,
}: {
  ranking: RankEntry[];
  me: RankEntry | null;
  /** mensagem de boa sorte, logo após concluir o quiz */
  message?: string | undefined;
  onRestart: () => void;
  onSchool: (() => void) | null;
}) {
  const myId = mine?.id ?? null;
  const position = myId ? ranking.findIndex((r) => r.id === myId) + 1 : 0;
  const me = position > 0 ? ranking[position - 1] : undefined;
  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center bg-[#0f0b1e]/90 p-3 backdrop-blur sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="ranking-title"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="game-card game-card-wide flex h-full max-h-[94dvh] w-full max-w-4xl flex-col overflow-y-auto overscroll-contain rounded-[2rem] border-2 border-amber-300/40 bg-[#171126] p-5 shadow-[0_0_80px_rgba(250,204,21,0.15)] sm:p-8 short:rounded-2xl short:p-3"
      >
        <header className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-[#1c1206] sm:h-16 sm:w-16">
            <Trophy className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs uppercase tracking-widest text-amber-300">
              Quiz do curso de DS
            </p>
            <h2 id="ranking-title" className="font-display text-3xl font-bold sm:text-4xl">
              Ranking geral
            </h2>
          </div>
        </header>

        {message && (
          <blockquote className="mt-4 rounded-2xl border border-violet-300/25 bg-violet-500/10 px-4 py-3 text-sm leading-relaxed text-white/85 sm:text-base">
            “{message}” <span className="text-white/50">— {guide.name}</span>
          </blockquote>
        )}
        {me && (
          <p className="mt-4 rounded-2xl border border-amber-300/50 bg-amber-400/10 px-4 py-3 text-base sm:text-lg">
            <b className="text-amber-300">{me.nome}</b>, você fez{" "}
            <b className="text-amber-300">{me.score} pontos</b> ({me.acertos}/{courseQuiz.length}{" "}
            acertos) e está em <b className="text-white">{position}º lugar</b> entre{" "}
            {ranking.length} {ranking.length === 1 ? "participante" : "participantes"}.
          </p>
        )}

        <div className="mt-4 grid grid-cols-[3rem_1fr_auto] gap-3 px-4 text-xs font-bold uppercase tracking-wider text-white/45">
          <span>Pos.</span>
          <span>Jogador</span>
          <span>Pontos</span>
        </div>
        <ol className="mt-2 min-h-[7rem] flex-1 space-y-2 overflow-y-auto pr-1">
          {ranking.length === 0 && (
            <li className="rounded-xl border border-white/10 p-6 text-center text-white/55">
              Ninguém fez o quiz ainda.
            </li>
          )}
          {ranking.map((entry, i) => {
            const mine = entry.id === myId;
            return (
              <li
                key={entry.id}
                className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-2xl border px-4 py-3 ${
                  mine ? "border-amber-300/70 bg-amber-400/15" : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <span className="flex justify-center font-display text-xl font-bold">
                  {i < 3 ? <Medal className={`h-7 w-7 ${MEDALS[i]}`} /> : `${i + 1}º`}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-semibold sm:text-lg">
                    {entry.nome}
                    {mine && <span className="text-amber-300"> (você)</span>}
                  </span>
                  <span className="block truncate text-xs text-white/50 sm:text-sm">
                    {entry.local} · {entry.acertos}/{courseQuiz.length} acertos · {entry.tempo}s
                  </span>
                </span>
                <span className="font-display text-xl font-bold text-amber-300 sm:text-2xl">
                  {entry.score}
                </span>
              </li>
            );
          })}
        </ol>

        <footer
          className={`mt-5 grid shrink-0 gap-3 border-t border-white/10 pt-5 short:mt-3 short:pt-3 ${onSchool ? "sm:grid-cols-2" : ""}`}
        >
          {onSchool && (
            <button
              type="button"
              onClick={onSchool}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 py-4 font-display text-lg font-bold"
            >
              <School className="h-5 w-5" /> Conhecer a Escola
            </button>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 px-6 py-4 font-display text-lg font-bold shadow-[0_0_24px_rgba(124,58,237,0.35)]"
          >
            <Home className="h-5 w-5" /> Voltar ao Início
          </button>
        </footer>
      </motion.section>
    </motion.div>
  );
}
