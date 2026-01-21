import React from 'react';

export const SimpleSignaturePad = React.forwardRef((props, ref) => {
    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = React.useState(false);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const dpi = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpi;
        canvas.height = canvas.offsetHeight * dpi;
        ctx.scale(dpi, dpi);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }, []);

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
        ctx.strokeStyle = '#000000';
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
        ctx.fillStyle = '#ffffff';
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
            blankCtx.fillStyle = '#ffffff';
            blankCtx.fillRect(0, 0, blankCanvas.width, blankCanvas.height);
            return canvas.toDataURL() === blankCanvas.toDataURL();
        }
    }));

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair touch-none border border-gray-200 bg-white"
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