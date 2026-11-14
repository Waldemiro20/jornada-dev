/**
 * Tela cheia + orientação paisagem para celulares e tablets.
 *
 * Os navegadores só permitem `requestFullscreen()` dentro de um gesto do usuário (clique),
 * e no Android `screen.orientation.lock()` só funciona depois de entrar em tela cheia.
 * No iPhone (Safari) nenhum dos dois existe para páginas comuns: lá vale o aviso visual
 * "gire o celular" (ver RotateHint).
 */

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

/** Celular ou tablet: tela de toque e sem mouse como ponteiro principal. */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (!touch) return false;
  // notebook com tela touch, mas usado com mouse/touchpad: trata como PC
  return !window.matchMedia("(pointer: fine)").matches;
}

const isFullscreen = () => {
  const doc = document as FullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
};

async function lockLandscape() {
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    await orientation?.lock?.("landscape");
  } catch {
    // iOS / navegador sem suporte: fica o aviso "gire o celular"
  }
}

/**
 * Chame DIRETO no clique de "Começar": entra em tela cheia e trava em paisagem.
 * Não faz nada no PC. Nunca lança erro.
 */
export function enterImmersive(): void {
  if (!isTouchDevice()) return;
  try {
    const root = document.documentElement as FullscreenElement;
    if (isFullscreen()) {
      void lockLandscape();
      return;
    }
    const request = root.requestFullscreen
      ? root.requestFullscreen({ navigationUI: "hide" })
      : root.webkitRequestFullscreen?.();
    Promise.resolve(request)
      .then(lockLandscape)
      .catch(() => lockLandscape());
  } catch {
    void lockLandscape();
  }
}

/** Ao voltar para a tela inicial: solta a orientação e sai da tela cheia. */
export function exitImmersive(): void {
  if (typeof document === "undefined") return;
  try {
    (screen.orientation as LockableOrientation | undefined)?.unlock?.();
  } catch {
    // sem suporte
  }
  try {
    if (!isFullscreen()) return;
    const doc = document as FullscreenDocument;
    const exit = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.();
    Promise.resolve(exit).catch(() => undefined);
  } catch {
    // sem suporte
  }
}
