import clsx from "clsx";
import { initials } from "@/lib/profile";

/** A user's profile photo, or their initials when they haven't added one. */
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-600 font-display font-semibold text-white",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small, private, already-resized photo
        <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
