import { AddLessonForm, AddModuleForm, LessonEditor, ModuleTitleEditor } from "@/components/courses/ModuleLessonForms";

interface OutlineModule {
  id: string;
  title: string;
  lessons: { id: string; title: string; content: string }[];
}

// The modules and lessons of a course, each one editable in place, with
// forms to add more. Used on the course management page and on the
// Update course page.
export function CourseOutline({
  courseId,
  modules,
  mediaCountByLesson,
}: {
  courseId: string;
  modules: OutlineModule[];
  mediaCountByLesson: Map<string, number>;
}) {
  return (
    <>
      <div className="flex flex-col gap-4">
        {modules.map((moduleItem, index) => (
          <div key={moduleItem.id} className="rounded-xl border border-ink-100 bg-white p-4">
            <ModuleTitleEditor moduleId={moduleItem.id} number={index + 1} title={moduleItem.title} />
            <ul className="mt-2 flex flex-col divide-y divide-ink-100 text-sm text-ink-700">
              {moduleItem.lessons.map((lesson, li) => (
                <li key={lesson.id}>
                  <LessonEditor
                    lessonId={lesson.id}
                    number={`${index + 1}.${li + 1}`}
                    title={lesson.title}
                    content={lesson.content}
                    mediaCount={mediaCountByLesson.get(lesson.id) ?? 0}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <AddLessonForm moduleId={moduleItem.id} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <AddModuleForm courseId={courseId} />
      </div>
    </>
  );
}
