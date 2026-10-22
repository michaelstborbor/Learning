import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

// Floating button that opens the course's study buddy chat, in the corner
// where people expect a chat button on their phone.
export function TutorLauncher({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const href = `/learn/${courseId}/tutor${lessonId ? `?lesson=${lessonId}` : ""}`;
  return (
    <Link
      href={href}
      className="group fixed bottom-24 right-4 z-40 flex min-h-14 items-center gap-2 rounded-full bg-brand-600 pl-4 pr-5 text-white shadow-overlay transition-[scale,background-color] hover:bg-brand-700 active:scale-95 sm:bottom-6 sm:right-6"
    >
      <span className="relative grid h-8 w-8 place-items-center">
        <Icon name="chat" size={26} />
        <span aria-hidden="true" className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-brand-600 bg-[#25d366]" />
      </span>
      <span className="text-sm font-semibold">Ask study buddy</span>
    </Link>
  );
}
