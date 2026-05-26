"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: "open" | "in_progress" | "done" | "snoozed";
  priority: "low" | "medium" | "high" | "urgent";
  dueAt: string | null;
  source: "manual" | "ai_extracted" | "ehr_sync";
  createdAt: string;
}

const statusIcons: Record<string, React.ReactNode> = {
  open: <Circle className="w-4 h-4 text-blue-500" />,
  in_progress: <Clock className="w-4 h-4 text-yellow-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  snoozed: <Clock className="w-4 h-4 text-gray-400" />,
};

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  snoozed: "Snoozed",
};

type StatusFilter = "all" | "open" | "in_progress" | "done" | "snoozed";

async function fetchTasks(filter?: string): Promise<Task[]> {
  const input = filter ? JSON.stringify({ status: filter }) : undefined;
  const url = input
    ? `/api/trpc/tasks.list?input=${encodeURIComponent(JSON.stringify({ json: JSON.parse(input) }))}`
    : `/api/trpc/tasks.list`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result?.data?.json ?? [];
}

async function createTask(input: {
  title: string;
  priority: string;
}): Promise<Task> {
  const res = await fetch("/api/trpc/tasks.create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  return data.result?.data?.json;
}

async function updateTask(input: {
  id: string;
  status?: string;
}): Promise<Task> {
  const res = await fetch("/api/trpc/tasks.update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  return data.result?.data?.json;
}

async function deleteTaskApi(id: string): Promise<void> {
  await fetch("/api/trpc/tasks.delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { id } }),
  });
}

function formatDue(date: string | null): string | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const hours = Math.round(diff / (1000 * 60 * 60));
  if (hours < 0) return "Overdue";
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function cycleStatus(
  current: string
): "open" | "in_progress" | "done" {
  if (current === "open") return "in_progress";
  if (current === "in_progress") return "done";
  return "open";
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const data = await fetchTasks(
      filter === "all" ? undefined : filter
    );
    setTasks(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    await createTask({ title: newTitle.trim(), priority: newPriority });
    setNewTitle("");
    setShowCreate(false);
    setCreating(false);
    loadTasks();
  };

  const handleStatusToggle = async (task: Task) => {
    await updateTask({ id: task.id, status: cycleStatus(task.status) });
    loadTasks();
  };

  const handleDelete = async (id: string) => {
    await deleteTaskApi(id);
    loadTasks();
  };

  const counts = {
    open: tasks.filter((t) => t.status === "open").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-sm text-gray-500 mt-1">
            {counts.open} open, {counts.in_progress} in progress
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(["all", "open", "in_progress", "done"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              filter === s
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "All" : statusLabels[s]}
          </button>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                      newPriority === p
                        ? priorityColors[p]
                        : "bg-white text-gray-400 border-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || creating}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No tasks yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`group p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all ${
                task.status === "done" ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleStatusToggle(task)}
                  className="mt-0.5 hover:scale-110 transition-transform"
                  title={`Click to mark as ${cycleStatus(task.status)}`}
                >
                  {statusIcons[task.status]}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`text-sm font-medium ${
                        task.status === "done"
                          ? "line-through text-gray-400"
                          : "text-gray-900"
                      }`}
                    >
                      {task.title}
                    </h3>
                    {task.source === "ai_extracted" && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded">
                        AI
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        priorityColors[task.priority]
                      }`}
                    >
                      {task.priority}
                    </span>
                    {task.dueAt && (
                      <span
                        className={`flex items-center gap-1 text-[10px] ${
                          formatDue(task.dueAt) === "Overdue"
                            ? "text-red-600"
                            : "text-gray-500"
                        }`}
                      >
                        {formatDue(task.dueAt) === "Overdue" ? (
                          <AlertTriangle className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {formatDue(task.dueAt)}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
