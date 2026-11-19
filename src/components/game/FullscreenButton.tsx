import { useEffect, useState } from "react";
import { Maximize, Minimize } from "lucide-react";
import { inFullscreen, onFullscreenChange, toggleImmersive } from "@/lib/immersive";

/**
 * Botão de tela cheia (estilo YouTube), fixo no meio do topo de todas as telas.
 * Um clique: tela cheia e, no celular/tablet, tela deitada.
 */
export function FullscreenButton() {
  // só no navegador (evita diferença entre o HTML do servidor e o do cliente)
  const [mounted, setMounted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    setMounted(true);
    setFullscreen(inFullscreen());
    return onFullscreenChange(() => setFullscreen(inFullscreen()));
  }, []);
  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[150] flex justify-center">
      <button
        type="button"
        onClick={toggleImmersive}
        className="pointer-events-auto flex items-center gap-1.5 rounded-xl border-2 border-violet-300/70 bg-violet-600/90 px-3 py-1.5 text-sm font-bold text-white shadow-[0_0_18px_rgba(124,58,237,0.45)] backdrop-blur active:scale-95"
      >
        {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        {fullscreen ? "Sair da tela cheia" : "Tela cheia"}
      </button>
    </div>
  );
}
