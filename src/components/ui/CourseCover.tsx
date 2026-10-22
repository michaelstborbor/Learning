import clsx from "clsx";

// Cover art. With a poster the author uploaded, the image fills the cover
// under a dark scrim so text on top stays readable. Without one it falls
// back to generated art: no image downloads, so the catalogue stays light on
// slow connections. Each course gets a stable palette and the signal-arc
// motif from a hash of its title, so the same course always looks the same.
const PALETTES = [
  { bg: "#0f766e", arc: "rgb(153 246 228 / 0.22)", glow: "rgb(45 212 191 / 0.5)" },
  { bg: "#0b3b38", arc: "rgb(94 234 212 / 0.24)", glow: "rgb(234 88 12 / 0.5)" },
  { bg: "#134e4a", arc: "rgb(204 251 241 / 0.22)", glow: "rgb(45 212 191 / 0.5)" },
  { bg: "#9a3412", arc: "rgb(255 237 213 / 0.18)", glow: "rgb(251 146 60 / 0.5)" },
  { bg: "#1e293b", arc: "rgb(148 163 184 / 0.24)", glow: "rgb(13 148 136 / 0.65)" },
];

const ORIGINS = ["100% 0%", "0% 100%", "100% 100%", "0% 0%"];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h;
}

export function CourseCover({
  title,
  posterUrl,
  className,
  children,
}: {
  title: string;
  posterUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  if (posterUrl) {
    return (
      <div className={clsx("relative isolate overflow-hidden bg-ink-900", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- served by our own poster route, already resized */}
        <img src={posterUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-950/85 via-ink-950/40 to-ink-950/10" />
        {children}
      </div>
    );
  }

  const h = hash(title);
  const palette = PALETTES[h % PALETTES.length];
  const origin = ORIGINS[(h >> 3) % ORIGINS.length];
  const spacing = 22 + ((h >> 5) % 4) * 6;

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={{
        backgroundColor: palette.bg,
        backgroundImage: `radial-gradient(circle at ${origin}, ${palette.glow}, transparent 55%), repeating-radial-gradient(circle at ${origin}, transparent 0 ${spacing}px, ${palette.arc} ${spacing}px ${spacing + 1.5}px)`,
      }}
    >
      {children}
    </div>
  );
}
