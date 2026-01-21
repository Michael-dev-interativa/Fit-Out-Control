import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Simple signature component using canvas
const SimpleSignaturePad = React.forwardRef(({ isDark }, ref) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpi = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    ctx.scale(dpi, dpi);
    ctx.fillStyle = isDark ? '#374151' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [isDark]);

  const getCanvasPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = isDark ? '#ffffff' : '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const point = getCanvasPoint(e);
    ctx.moveTo(point.x, point.y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(e);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.closePath();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isDark ? '#374151' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  React.useImperativeHandle(ref, () => ({
    clear,
    toDataURL: (type = 'image/png', quality = 0.92) => canvasRef.current?.toDataURL(type, quality),
    isEmpty: () => {
        const canvas = canvasRef.current;
        if (!canvas) return true;

        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvas.width;
        blankCanvas.height = canvas.height;
        const blankCtx = blankCanvas.getContext('2d');
        blankCtx.fillStyle = isDark ? '#374151' : '#ffffff';
        blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);

        return canvas.toDataURL() === blankCanvas.toDataURL();
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full cursor-crosshair touch-none ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
    />
  );
});

export default function SignatureDialog({ open, onOpenChange, onSave, isDark = false }) {
  const [signatureMode, setSignatureMode] = useState('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const signaturePadRef = useRef(null);

  const handleSave = () => {
    if (signatureMode === 'type') {
      if (!typedSignature.trim()) {
        toast.error("Por favor, digite sua assinatura.");
        return;
      }

      // Criar canvas com texto - tamanho maior para melhor visualização
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 230;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#000000';
      ctx.font = '120px Calibri';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSignature, canvas.width / 2, canvas.height / 2);

      const signatureDataUrl = canvas.toDataURL('image/png', 0.92);
      onSave(signatureDataUrl);
      setTypedSignature('');
    } else {
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        const signatureDataUrl = signaturePadRef.current.toDataURL();
        onSave(signatureDataUrl);
      } else {
        toast.error("Por favor, faça uma assinatura antes de salvar.");
      }
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-gray-800 text-white' : ''}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>Adicionar Assinatura</DialogTitle>
          <DialogDescription className={isDark ? 'text-gray-400' : ''}>
            Escolha entre desenhar ou digitar sua assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={signatureMode === 'draw' ? 'default' : 'outline'}
            onClick={() => setSignatureMode('draw')}
            className="flex-1"
          >
            Desenhar
          </Button>
          <Button
            type="button"
            variant={signatureMode === 'type' ? 'default' : 'outline'}
            onClick={() => setSignatureMode('type')}
            className="flex-1"
          >
            Digitar
          </Button>
        </div>

        {signatureMode === 'draw' ? (
          <div className={`border rounded-md overflow-hidden h-52 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200'}`}>
            <SimpleSignaturePad ref={signaturePadRef} isDark={isDark} />
          </div>
        ) : (
          <div className="space-y-2">
            <Label className={isDark ? 'text-gray-300' : ''}>Digite sua assinatura</Label>
            <Input
              type="text"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Digite seu nome..."
              className="text-sm"
              style={{ fontFamily: 'Calibri, sans-serif' }}
            />
            <p className="text-xs text-gray-500">Será exibida em fonte Calibri</p>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          {signatureMode === 'draw' && (
            <Button
              variant="outline"
              onClick={handleClear}
              className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
            >
              Limpar
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className={isDark ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}>
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}