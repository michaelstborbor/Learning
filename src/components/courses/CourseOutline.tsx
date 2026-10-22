import { AddLessonForm, AddModuleForm, LessonEditor, ModuleTitleEditor } from "@/components/courses/ModuleLessonForms";
import { AttachMedia, type AttachedMediaItem } from "@/components/courses/AttachMedia";

interface OutlineModule {
  id: string;
  title: string;
  lessons: { id: string; title: string; content: string }[];
}

interface OutlineMedia extends AttachedMediaItem {
  lessonId: string | null;
  moduleId: string | null;
}

// The modules and lessons of a course, each one editable in place with its
// own "Add video or audio" button, and forms to add more. Used on the
// course management page and on the Update course page.
export function CourseOutline({
  courseId,
  modules,
  media,
}: {
  courseId: string;
  modules: OutlineModule[];
  media: OutlineMedia[];
}) {
  const pick = (items: OutlineMedia[]) => items.map(({ id, kind, title }) => ({ id, kind, title }));
  return (
    <>
      <div className="flex flex-col gap-4">
        {modules.map((moduleItem, index) => (
          <div key={moduleItem.id} className="rounded-xl border border-ink-100 bg-white p-4">
            <ModuleTitleEditor moduleId={moduleItem.id} number={index + 1} title={moduleItem.title} />
            <AttachMedia
              courseId={courseId}
              target={{ lessonId: null, moduleId: moduleItem.id }}
              name={`module ${index + 1}`}
              media={pick(media.filter((m) => m.moduleId === moduleItem.id))}
            />
            <ul className="mt-2 flex flex-col divide-y divide-ink-100 border-t border-ink-100 text-sm text-ink-700">
              {moduleItem.lessons.map((lesson, li) => (
                <li key={lesson.id} className="py-1">
                  <LessonEditor
                    lessonId={lesson.id}
                    number={`${index + 1}.${li + 1}`}
                    title={lesson.title}
                    content={lesson.content}
                  />
                  <div className="pl-6">
                    <AttachMedia
                      courseId={courseId}
                      target={{ lessonId: lesson.id, moduleId: null }}
                      name={`lesson ${index + 1}.${li + 1}`}
                      media={pick(media.filter((m) => m.lessonId === lesson.id))}
                    />
                  </div>
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
