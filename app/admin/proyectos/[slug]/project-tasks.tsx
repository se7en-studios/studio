"use client";

// Las tareas de un proyecto, con alta rápida ya vinculada.
import { useState } from "react";
import { CheckSquare } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { compareTasks, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { Card, CardLink } from "../../kit";
import { useToast } from "../../overlay";
import { QuickAdd, TaskDrawer, TaskRow } from "../../tareas/task-ui";
import { useTasks } from "../../tareas/use-tasks";

export function ProjectTasks({
  slug,
  tasks,
  links,
  me,
  owner,
}: {
  slug: string;
  tasks: Task[];
  links: TaskLinks;
  me: LeadOwner;
  owner: LeadOwner | null;
}) {
  const flash = useToast();
  const api = useTasks(tasks, flash);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const list = api.tasks.filter((t) => t.project_slug === slug).sort(compareTasks);
  const openTasks = list.filter((t) => !t.done_at);
  const done = list.length - openTasks.length;
  const shown = showDone ? list : openTasks;
  const open = list.find((t) => t.id === openId) ?? null;

  return (
    <Card
      title="Tareas"
      icon={<CheckSquare size={14} />}
      count={openTasks.length || undefined}
      action={
        done > 0 ? (
          <button onClick={() => setShowDone((v) => !v)} className="focus-ring text-[12px] text-muted hover:text-foreground">
            {showDone ? "Ocultar hechas" : `Ver ${done} hechas`}
          </button>
        ) : (
          <CardLink href="/admin/tareas">Todas →</CardLink>
        )
      }
    >
      <div className="p-2">
        <QuickAdd
          me={me}
          links={links}
          fixed={{ lead_id: null, project_slug: slug }}
          defaultAssignee={owner ?? me}
          onAdd={(input) => api.add(input, me)}
          placeholder="Nueva tarea del proyecto…"
        />
      </div>
      {shown.length > 0 ? (
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} links={links} hideLink onToggle={(d) => api.toggle(t.id, d)} onOpen={() => setOpenId(t.id)} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-[var(--line)] px-4 py-5 text-[13px] text-muted">Nada pendiente en este proyecto.</p>
      )}
      {open && (
        <TaskDrawer
          key={open.id}
          task={open}
          links={links}
          onClose={() => setOpenId(null)}
          onPatch={(p) => api.patch(open.id, p)}
          onToggle={(d) => api.toggle(open.id, d)}
          onDelete={() => {
            api.remove(open.id);
            setOpenId(null);
          }}
        />
      )}
    </Card>
  );
}
