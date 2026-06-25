/* viewport.js — IntersectionObserver gating, animation loop, reduced-motion. */
import { redrawAll } from './canvas.js';

const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
export const motion = { ok: !mq.matches };

const visible = new Set();
export const isVisible = id => visible.has(id);

const io = ('IntersectionObserver' in window)
  ? new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id);
      const a = document.querySelector('nav a[href="#' + e.target.id + '"]');
      if (a) a.classList.toggle('actif', e.isIntersecting);
    }), { rootMargin: '-12% 0px -55% 0px' })
  : null;

/** Observe a section (by element id) for visibility + nav highlight. */
export function observe(id) {
  const el = document.getElementById(id);
  if (el && io) io.observe(el);
}

/**
 * Run `frame` once (static state), then on every animation frame while the
 * section is visible, motion is allowed, and the tab is foregrounded.
 */
export function anim(id, frame) {
  frame();
  function loop() {
    if (motion.ok && visible.has(id) && !document.hidden) frame();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

mq.addEventListener('change', e => { motion.ok = !e.matches; redrawAll(); });
