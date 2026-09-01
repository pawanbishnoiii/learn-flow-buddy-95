import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger, useGSAP);

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Monospace number that counts up to `value` whenever it changes. */
export function CountUp({
  value,
  decimals = 1,
  suffix = "",
  className = "",
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const from = { n: reduced() ? value : prev.current };
    prev.current = value;
    const tween = gsap.to(from, {
      n: value,
      duration: reduced() ? 0 : 1,
      ease: "power2.out",
      onUpdate: () => {
        node.textContent = from.n.toFixed(decimals) + suffix;
      },
    });
    return () => {
      tween.kill();
    };
  }, [value, decimals, suffix]);

  return (
    <span ref={el} className={`num ${className}`}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Idle breathing glow for the primary CTA. */
export function useIdleGlow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.to(ref.current, {
        boxShadow: "var(--shadow-glow)",
        duration: 1.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    },
    { scope: ref },
  );
  return ref;
}

/** Scroll-triggered reveal for a page section. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.from(ref.current, {
        opacity: 0,
        y: 22,
        duration: 0.6,
        delay,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 92%", once: true },
      });
    },
    { scope: ref, dependencies: [delay] },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Staggered reveal of children matched by `selector` inside this wrapper. */
export function StaggerGrid({
  children,
  selector,
  className = "",
}: {
  children: ReactNode;
  selector: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current || reduced()) return;
      gsap.from(ref.current.querySelectorAll(selector), {
        opacity: 0,
        scale: 0.85,
        stagger: 0.02,
        duration: 0.4,
        ease: "power2.out",
        scrollTrigger: { trigger: ref.current, start: "top 95%", once: true },
      });
    },
    { scope: ref, dependencies: [selector] },
  );
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
