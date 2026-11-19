import type { CSSProperties } from "react";
import "./feature-atmosphere.css";

const atmospheres: Partial<Record<string, string>> = {
  "tide-letter": "rain",
  "starlight-contract": "wisteria",
  "dragon-archive": "leaves",
  "neon-pulse-zero": "signals",
};

// Spread the foreground accents across the artwork with a repeatable wind pattern.
const paths = [
  { x: 42, y: 31, phase: 1.8 }, { x: 80, y: 15, phase: 0.6 },
  { x: 17, y: 57, phase: 3.1 }, { x: 58, y: 68, phase: 4.4 },
  { x: 92, y: 37, phase: 2.6 }, { x: 34, y: 12, phase: 0.2 },
  { x: 66, y: 22, phase: 3.8 }, { x: 8, y: 38, phase: 1.3 },
  { x: 53, y: 9, phase: 4.1 }, { x: 86, y: 73, phase: 2.2 },
  { x: 25, y: 25, phase: 0.9 }, { x: 73, y: 54, phase: 3.4 },
  { x: 38, y: 65, phase: 2.9 }, { x: 97, y: 27, phase: 1.6 },
];

export function FeatureAtmosphere({ workId }: { workId: string }) {
  const scene = atmospheres[workId];
  if (!scene) return null;
  const particles = scene === "rain" ? paths : paths.slice(0, 10);

  return <div className="cu-feature-atmosphere" data-scene={scene} aria-hidden="true">
    {particles.map(({ x, y, phase }) => <span key={x} style={{
      left: x + "%",
      "--height-in-scene": y + "%",
      animationDelay: -phase + "s",
    } as CSSProperties} />)}
  </div>;
}
