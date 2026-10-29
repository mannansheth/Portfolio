import { useEffect, useRef } from 'react';

// Drop a portrait at this path to activate the pixel reveal; no component edits needed.
const PORTRAIT_SRC = `${import.meta.env.BASE_URL}images/portrait.jpg`;

export default function PortraitReveal() {
  const frame = useRef(null);
  const imageCanvas = useRef(null);
  const mosaicCanvas = useRef(null);
  const maskCanvas = useRef(null);
  const outputCanvas = useRef(null);

  useEffect(() => {
    const host = frame.current;
    const photo = new Image();
    photo.decoding = 'async';
    photo.src = PORTRAIT_SRC;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let ready = false;
    let down = false;
    let last = null;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');

    const resize = () => {
      if (!host) return;
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      width = bounds.width;
      height = bounds.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      [imageCanvas.current, mosaicCanvas.current, maskCanvas.current, outputCanvas.current].forEach(
        (canvas) => {
          canvas.width = Math.round(width * dpr);
          canvas.height = Math.round(height * dpr);
        },
      );
      if (ready) paint(true);
    };

    const paint = (reset = false) => {
      raf = 0;
      if (!ready || !width || !height) return;
      const image = imageCanvas.current.getContext('2d');
      const mosaic = mosaicCanvas.current.getContext('2d');
      const mask = maskCanvas.current.getContext('2d');
      const output = outputCanvas.current.getContext('2d');
      if (reset) {
        [image, mosaic, mask, output].forEach((ctx) =>
          ctx.clearRect(0, 0, width * dpr, height * dpr),
        );
        const scale = Math.max(width / photo.width, height / photo.height);
        const drawWidth = photo.width * scale;
        const drawHeight = photo.height * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
        image.drawImage(photo, x * dpr, y * dpr, drawWidth * dpr, drawHeight * dpr);
        const small = document.createElement('canvas');
        small.width = 42;
        small.height = Math.max(1, Math.round((42 * height) / width));
        const smallContext = small.getContext('2d');
        smallContext.drawImage(photo, 0, 0, small.width, small.height);
        mosaic.imageSmoothingEnabled = false;
        mosaic.drawImage(small, 0, 0, width * dpr, height * dpr);
        mosaic.fillStyle = 'rgb(17 19 18 / .14)';
        mosaic.fillRect(0, 0, width * dpr, height * dpr);
        if (reduced.matches) {
          output.drawImage(imageCanvas.current, 0, 0);
          return;
        }
      }
      output.clearRect(0, 0, width * dpr, height * dpr);
      output.drawImage(imageCanvas.current, 0, 0);
      output.globalCompositeOperation = 'destination-in';
      output.drawImage(maskCanvas.current, 0, 0);
      output.globalCompositeOperation = 'source-over';
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => paint());
    };
    const dab = (event) => {
      const bounds = host.getBoundingClientRect();
      const point = {
        x: (event.clientX - bounds.left) * dpr,
        y: (event.clientY - bounds.top) * dpr,
      };
      const ctx = maskCanvas.current.getContext('2d');
      const radius = (event.pointerType === 'touch' ? 74 : 88) * dpr;
      if (reduced.matches) {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const paintPoint = (x, y) => {
          const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius);
          gradient.addColorStop(0, 'rgba(255,255,255,.98)');
          gradient.addColorStop(0.58, 'rgba(255,255,255,.86)');
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        };
        const distance = last ? Math.hypot(point.x - last.x, point.y - last.y) : 0;
        const steps = Math.max(1, Math.ceil(distance / (radius * 0.28)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          paintPoint(
            last ? last.x + (point.x - last.x) * t : point.x,
            last ? last.y + (point.y - last.y) * t : point.y,
          );
        }
      }
      last = point;
      schedule();
    };
    const pointerDown = (event) => {
      down = true;
      last = null;
      host.setPointerCapture?.(event.pointerId);
      dab(event);
    };
    const pointerMove = (event) => {
      if (event.pointerType === 'mouse' || down) dab(event);
    };
    const pointerUp = () => {
      down = false;
      last = null;
    };
    const preferenceChange = () => paint(true);

    photo.onload = () => {
      ready = true;
      host?.setAttribute('data-ready', 'true');
      resize();
    };
    photo.onerror = () => host?.setAttribute('data-ready', 'false');
    const observer = new ResizeObserver(resize);
    if (host) {
      observer.observe(host);
      host.addEventListener('pointerdown', pointerDown);
      host.addEventListener('pointermove', pointerMove, { passive: true });
      host.addEventListener('pointerup', pointerUp);
      host.addEventListener('pointercancel', pointerUp);
    }
    reduced.addEventListener('change', preferenceChange);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      reduced.removeEventListener('change', preferenceChange);
      host?.removeEventListener('pointerdown', pointerDown);
      host?.removeEventListener('pointermove', pointerMove);
      host?.removeEventListener('pointerup', pointerUp);
      host?.removeEventListener('pointercancel', pointerUp);
    };
  }, []);

  return (
    <figure className="portrait-reveal-wrap">
      <div className="portrait-reveal" ref={frame} data-ready="loading">
        <img className="portrait-accessible" src={PORTRAIT_SRC} alt="Portrait of Mannan Sheth" />
        <canvas ref={mosaicCanvas} aria-hidden="true" />
        <canvas ref={imageCanvas} className="portrait-source" aria-hidden="true" />
        <canvas ref={maskCanvas} className="portrait-mask" aria-hidden="true" />
        <canvas ref={outputCanvas} className="portrait-output" aria-hidden="true" />
        <div className="portrait-fallback" aria-hidden="true">
          <span>PORTRAIT / INTERACTIVE STUDY</span>
          <strong>
            IMAGE
            <br />
            PENDING
          </strong>
          <small>
            Add your portrait at <code>frontend/public/images/portrait.jpg</code>
          </small>
        </div>
        <span className="portrait-instruction">
          {matchMedia('(pointer: coarse)').matches ? 'Tap and drag to reveal' : 'Move to reveal'}
        </span>
      </div>
      <figcaption>
        <span>01 — A closer look</span>
        <span>Move through the pixels</span>
      </figcaption>
    </figure>
  );
}
