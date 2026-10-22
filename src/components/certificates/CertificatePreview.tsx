import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import QRCode from "qrcode";
import { formatCertificateDate } from "@/lib/certificate-format";

// An on-screen copy of the PDF certificate (src/lib/certificate-pdf.ts),
// drawn to the same A4 landscape proportions. Sizes are in points of the
// A4 page, turned into container widths so it scales with the screen.
const pt = (value: number) => `${((value / 841.89) * 100).toFixed(3)}cqw`;

const serif = "'Cormorant Garamond', Georgia, serif";
const label = "'Space Grotesk', system-ui, sans-serif";
const body = "Inter, system-ui, sans-serif";

function starburst(points: number, outer: number, inner: number): string {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points;
    d += `${i === 0 ? "M" : "L"}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}

function Seal({ year }: { year: string }) {
  return (
    <svg viewBox="-62 -62 124 136" aria-hidden="true" style={{ width: pt(124), height: pt(136) }}>
      <path d="M -25 22 L -3 22 L -11 80 L -26 70 L -37 84 Z" fill="#115e59" />
      <path d="M 25 22 L 3 22 L 11 80 L 26 70 L 37 84 Z" fill="#115e59" />
      <path d={starburst(36, 54, 49.5)} fill="#ea580c" />
      <circle r="46" fill="#0b3b38" />
      <circle r="43" fill="none" stroke="#ea580c" strokeWidth="0.8" />
      <circle r="24" fill="none" stroke="#5eead4" strokeWidth="0.6" />
      <defs>
        <path id="seal-ring" d="M 0 -30 A 30 30 0 1 1 -0.01 -30" />
      </defs>
      <text fill="#fff" fontSize="6.4" fontFamily={label} fontWeight={600} textLength={186} lengthAdjust="spacing">
        <textPath href="#seal-ring">ELITESKILLS ACADEMY • CERTIFIED COMPLETION •</textPath>
      </text>
      <text y="3" textAnchor="middle" fill="#fff" fontSize="17" fontFamily={serif} fontWeight={600}>
        ESA
      </text>
      <text y="13" textAnchor="middle" fill="#99f6e4" fontSize="7" fontFamily={body} fontWeight={600}>
        {year}
      </text>
    </svg>
  );
}

function Arcs({ corner }: { corner: "top-left" | "bottom-right" }) {
  const rings = Array.from({ length: 15 }, (_, i) => 36 + i * 13);
  const cx = corner === "top-left" ? 0 : 230;
  const cy = corner === "top-left" ? 0 : 230;
  return (
    <svg
      viewBox="0 0 230 230"
      aria-hidden="true"
      className="absolute"
      style={{
        width: pt(230),
        height: pt(230),
        ...(corner === "top-left" ? { left: pt(26), top: pt(26) } : { right: pt(26), bottom: pt(26) }),
      }}
    >
      {rings.map((r, i) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#5eead4"
          strokeWidth="0.7"
          strokeOpacity={Math.max(0.08, 0.5 - i * 0.03)}
        />
      ))}
    </svg>
  );
}

export async function CertificatePreview({
  certificateNumber,
  learnerName,
  courseTitle,
  completedAt,
  verifyUrl,
}: {
  certificateNumber: string;
  learnerName: string;
  courseTitle: string;
  completedAt: Date;
  verifyUrl: string;
}) {
  const date = formatCertificateDate(completedAt);
  // Generated here from our own URL, so it's safe to inline.
  const qr = await QRCode.toString(verifyUrl, { type: "svg", margin: 2, color: { dark: "#0b3b38", light: "#ffffff" } });

  return (
    <div className="@container w-full overflow-hidden rounded-md shadow-overlay">
      <div
        className="relative aspect-[297/210] w-full bg-white text-center"
        role="img"
        aria-label={`Certificate of Completion. ${learnerName} has successfully completed the course ${courseTitle}, completed on ${date}. Certificate ID ${certificateNumber}. Sponsored by Elite Network Limited.`}
      >
        <Arcs corner="top-left" />
        <Arcs corner="bottom-right" />
        <div className="absolute" style={{ inset: pt(10.5), border: `${pt(7)} solid #0b3b38` }} />
        <div className="absolute" style={{ inset: pt(22.4), border: `${pt(1.2)} solid #ea580c` }} />
        <div className="absolute" style={{ inset: pt(26), border: `${pt(0.5)} solid #0d9488` }} />

        <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: pt(66) }} aria-hidden="true">
          <p style={{ fontFamily: label, fontWeight: 600, fontSize: pt(15), color: "#115e59", lineHeight: 1 }}>
            EliteSkills Academy
          </p>
          <p style={{ fontFamily: serif, fontWeight: 600, fontSize: pt(50), color: "#0b3b38", lineHeight: 1, marginTop: pt(14) }}>
            Certificate of Completion
          </p>
          <span className="relative block" style={{ width: pt(68), height: pt(1.6), background: "#ea580c", marginTop: pt(12) }}>
            <span
              className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rotate-45"
              style={{ width: pt(5.6), height: pt(5.6), background: "#ea580c" }}
            />
          </span>
          <p style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: pt(18), color: "#334155", marginTop: pt(14) }}>
            This is to certify that
          </p>
          {/* The full name word for word, as on the PDF: it shrinks, then
              wraps onto two lines, but is never cut short. */}
          <p
            className="max-w-[74cqw] text-balance break-words"
            style={{
              fontFamily: serif,
              fontWeight: 600,
              fontSize: pt(learnerName.length > 52 ? 26 : learnerName.length > 34 ? 34 : 46),
              color: "#0b3b38",
              lineHeight: 1.1,
              marginTop: pt(8),
            }}
          >
            {learnerName.trim()}
          </p>
          <span className="block" style={{ width: pt(440), height: pt(0.8), background: "#5eead4", marginTop: pt(4) }} />
          <p style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 500, fontSize: pt(18), color: "#334155", marginTop: pt(10) }}>
            has successfully completed the course
          </p>
          <p
            className="max-w-[74cqw] text-balance"
            style={{ fontFamily: label, fontWeight: 600, fontSize: pt(courseTitle.length > 48 ? 19 : 24), color: "#115e59", lineHeight: 1.25, marginTop: pt(10) }}
          >
            {courseTitle}
          </p>
          <p style={{ fontFamily: body, fontSize: pt(11.5), color: "#64748b", marginTop: pt(14) }}>Completed on {date}</p>
        </div>

        <div
          className="absolute flex items-end justify-between text-left"
          style={{ left: pt(58), right: pt(58), bottom: pt(36) }}
          aria-hidden="true"
        >
          <div className="flex items-end" style={{ gap: pt(10), width: pt(250) }}>
            <span className="block shrink-0 [&>svg]:h-full [&>svg]:w-full" style={{ width: pt(74), height: pt(74) }} dangerouslySetInnerHTML={{ __html: qr }} />
            <div style={{ fontFamily: body, lineHeight: 1.25 }}>
              <p style={{ fontSize: pt(7.5), color: "#64748b" }}>Certificate ID</p>
              <p style={{ fontSize: pt(10.5), fontWeight: 600, color: "#0f172a" }}>{certificateNumber}</p>
              <p style={{ fontSize: pt(7.5), color: "#64748b", marginTop: pt(5) }}>Date completed</p>
              <p style={{ fontSize: pt(10.5), fontWeight: 600, color: "#0f172a" }}>{date}</p>
              <p style={{ fontSize: pt(7.5), color: "#115e59", marginTop: pt(5) }}>
                Verify at {verifyUrl.replace(/^https?:\/\//, "").replace(/\?.*$/, "")}
              </p>
            </div>
          </div>
          <Seal year={String(completedAt.getUTCFullYear())} />
          <div className="flex items-end justify-end" style={{ gap: pt(12), width: pt(250) }}>
            <div className="text-right" style={{ lineHeight: 1.3, paddingBottom: pt(14) }}>
              <p style={{ fontFamily: body, fontSize: pt(7.5), color: "#64748b" }}>Sponsored by</p>
              <p style={{ fontFamily: label, fontWeight: 600, fontSize: pt(13), color: "#0b3b38" }}>Elite Network Limited</p>
              <p style={{ fontFamily: body, fontSize: pt(8.5), color: "#64748b" }}>Sierra Leone</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed 256px logo, scaled with the certificate */}
            <img src="/logo.png" alt="" style={{ width: pt(78), height: pt(78) }} />
          </div>
        </div>
      </div>
    </div>
  );
}
