"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Wand2, Loader2 } from "lucide-react";

interface HandwritingCanvasProps {
  height?: number;
  onResult: (text: string | null, uncertain: boolean) => void;
}

export default function HandwritingCanvas({ height = 160, onResult }: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.width) / rect.width,
      y: ((e.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    lastPoint.current = getPos(e);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !lastPoint.current) return;
    const pos = getPos(e);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPoint.current = pos;
    setHasContent(true);
  }

  function handlePointerUp() {
    drawing.current = false;
    lastPoint.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  }

  async function convert() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    try {
      const imageBase64 = canvas.toDataURL("image/png").split(",")[1];
      const res = await fetch("/api/ai/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64 }),
      });
      const data = await res.json();
      onResult(data.text ?? null, !!data.uncertain);
    } catch {
      onResult(null, false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={700}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full border border-stone-200 rounded-xl bg-white touch-none cursor-crosshair"
        style={{ height }}
      />
      <div className="flex items-center gap-3 mt-2">
        <button onClick={clear} className="text-xs text-stone-500 font-medium flex items-center gap-1 hover:text-stone-700">
          <Eraser size={13} /> Clear
        </button>
        <button
          onClick={convert}
          disabled={!hasContent || loading}
          className="text-xs bg-teal-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-teal-800"
        >
          {loading ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
          {loading ? "Converting…" : "Convert to Text"}
        </button>
      </div>
    </div>
  );
}
