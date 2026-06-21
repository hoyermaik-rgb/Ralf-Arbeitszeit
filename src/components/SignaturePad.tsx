/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { Trash2, CheckCircle2, RotateCcw } from 'lucide-react';

interface SignaturePadProps {
  id: string;
  label: string;
  savedSignature: string | null;
  onSave: (signatureBase64: string) => void;
  onClear: () => void;
}

export default function SignaturePad({
  id,
  label,
  savedSignature,
  onSave,
  onClear,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Initialize canvas back-buffer to match high-resolution retina screens
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set drawing styles
    ctx.strokeStyle = '#0f172a'; // Slate-900
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [savedSignature]);

  const startDrawing = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const pos = getCoordinates(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling when drawing on touchscreen devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const pos = getCoordinates(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (
    e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    
    // Support Touch
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    
    // Support Mouse
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const signatureDataUrl = canvas.toDataURL('image/png');
    onSave(signatureDataUrl);
  };

  return (
    <div id={`${id}-card`} className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-3 font-sans">
      <div className="flex justify-between items-center">
        <label className="text-sm font-semibold text-slate-800">{label}</label>
        {savedSignature && (
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
            <CheckCircle2 size={13} /> Unterschrieben
          </span>
        )}
      </div>

      <div className="relative border border-dashed border-slate-300 rounded-lg p-1 bg-slate-50 overflow-hidden h-40">
        {savedSignature ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative p-2 bg-white">
            <img
              src={savedSignature}
              alt="Unterschrift"
              className="max-h-full max-w-full object-contain pointer-events-none"
              referrerPolicy="no-referrer"
            />
            <button
              id={`${id}-edit-button`}
              onClick={handleClear}
              className="absolute bottom-2 right-2 text-xs text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-md flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              <RotateCcw size={12} /> Neu zeichnen
            </button>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              id={`${id}-canvas`}
              width="500"
              height="160"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-full bg-white cursor-crosshair block rounded touch-none"
            />
            <div className="absolute top-1 left-1 pointer-events-none text-[10px] text-slate-400 font-mono font-bold">
              Unterschriftenfeld - Hier zeichnen
            </div>
          </>
        )}
      </div>

      {!savedSignature && (
        <div className="flex justify-between gap-2 mt-1">
          <button
            id={`${id}-clear-drawing-btn`}
            type="button"
            onClick={handleClear}
            disabled={!hasDrawn}
            className="text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 size={13} /> Leeren
          </button>
          <button
            id={`${id}-save-drawing-btn`}
            type="button"
            onClick={handleSave}
            disabled={!hasDrawn}
            className="text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <CheckCircle2 size={13} /> Unterschrift speichern
          </button>
        </div>
      )}
    </div>
  );
}
