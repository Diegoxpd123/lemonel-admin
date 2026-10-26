import gsap from 'gsap'

export const sinMovimiento = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const entrada = (raiz: HTMLElement | null, selector = ':scope > *') => {
  if (!raiz || sinMovimiento()) return
  const items = raiz.querySelectorAll(selector)
  gsap.fromTo(items, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, clearProps: 'transform,opacity,visibility' })
}

export const aparecer = (el: HTMLElement | null) => {
  if (!el || sinMovimiento()) return
  gsap.fromTo(el, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out', clearProps: 'transform,opacity,visibility' })
}

export const modalIn = (fondo: HTMLElement | null, panel: HTMLElement | null) => {
  if (sinMovimiento()) return
  if (fondo) gsap.fromTo(fondo, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' })
  if (panel) gsap.fromTo(panel, { y: 24, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.4, ease: 'power3.out' })
}

export const deslizar = (el: HTMLElement | null) => {
  if (!el || sinMovimiento()) return
  gsap.fromTo(el, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' })
}

export const contar = (el: HTMLElement | null, hasta: number) => {
  if (!el) return
  if (sinMovimiento()) {
    el.textContent = String(hasta)
    return
  }
  const o = { v: 0 }
  gsap.to(o, { v: hasta, duration: 0.9, ease: 'power2.out', onUpdate: () => (el.textContent = String(Math.round(o.v))) })
}
