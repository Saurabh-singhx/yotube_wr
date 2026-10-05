import { getZoomRuntimeScript } from '../../src/utils/zoomScript';

describe('zoomScript utility', () => {
  it('generates runtime 2-finger pinch zoom script', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain('__ytPinchZoomLoaded');
    expect(script).toContain('__applyVideoZoom');
    expect(script).toContain('yt-zoom-toast');
  });

  it('includes GPU transform scaling around center without layout reflows', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain("v.style.setProperty('transform-origin', 'center center', 'important')");
    expect(script).toContain("v.style.setProperty('transform', 'scale(' + currentScale + ')', 'important')");
  });

  it('calculates dynamic fill scale based on player and video aspect ratio', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain('function getFillScale()');
    expect(script).toContain('playerAspect / videoAspect');
  });

  it('applies micro-overscan in portrait mode to remove 1px-2px black line gaps', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain('1.02');
    expect(script).toContain('isLandscape');
  });

  it('intercepts multi-touch gesture events in capture phase', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain("document.addEventListener('touchstart', onTouchStart, { capture: true");
    expect(script).toContain("document.addEventListener('touchmove', onTouchMove, { capture: true");
    expect(script).toContain("document.addEventListener('touchend', onTouchEnd, { capture: true");
  });

  it('detects 2-finger pinch distance dynamically', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain('e.touches.length === 2');
    expect(script).toContain('Math.hypot(dx, dy)');
    expect(script).toContain('isPinching');
  });

  it('supports center double-tap toggle between Original and Zoomed to fill', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain('lastTapTime');
    expect(script).toContain('touchX > screenW * 0.32 && touchX < screenW * 0.68');
  });

  it('displays YouTube pill toast for Zoomed to fill and Original', () => {
    const script = getZoomRuntimeScript();
    expect(script).toContain("showToast('Zoomed to fill')");
    expect(script).toContain("showToast('Original')");
  });
});
