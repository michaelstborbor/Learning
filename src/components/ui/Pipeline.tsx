const STAGES = ["Learn", "Practice", "Demonstrate", "Certify", "Connect"];

interface PipelineProps {
  activeIndex?: number; // for showing a learner's current stage, e.g. on a course page
}

// This sequence is the product's core philosophy, so it earns a real
// numbered/step visual treatment (see DESIGN.md). Use this component
// sparingly — the hero section and course-structure views are its two
// legitimate homes. Do not scatter it decoratively across the product.
export function Pipeline({ activeIndex }: PipelineProps) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {STAGES.map((stage, i) => {
        const isActive = activeIndex === i;
        const isPast = activeIndex !== undefined && i < activeIndex;
        return (
          <li key={stage} className="flex flex-1 items-center gap-3">
            <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold ${
                  isActive
                    ? "bg-action-500 text-white"
                    : isPast
                      ? "bg-verified-500 text-white"
                      : "bg-ink-100 text-ink-500"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={`text-sm font-medium ${
                  isActive ? "text-ink-900" : "text-ink-500"
                }`}
              >
                {stage}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className="hidden h-px flex-1 bg-ink-300 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
