"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Mic,
  MicOff,
  Check,
  X,
  Edit3,
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

interface ExtractedFields {
  title: string;
  description: string;
  patient: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string;
  confidence: number;
}

// --- API helpers ---

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

async function extractFromText(text: string): Promise<ExtractedFields> {
  const res = await fetch("/api/trpc/ai.extractFromText", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { text } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.json?.message ?? "Extraction failed");
  }
  const data = await res.json();
  const r = data.result?.data?.json;
  return {
    title: r.title ?? "",
    description: r.description ?? "",
    patient: r.patient ?? "",
    priority: r.priority ?? "medium",
    dueDate: r.dueDate ?? "",
    confidence: r.confidence ?? 0.5,
  };
}

async function extractFromVoice(
  audioBase64: string,
  mimeType: string
): Promise<{ transcript: string; task: ExtractedFields }> {
  const res = await fetch("/api/trpc/ai.extractFromVoice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { audioBase64, mimeType } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.json?.message ?? "Voice extraction failed");
  }
  const data = await res.json();
  const r = data.result?.data?.json;
  return {
    transcript: r.transcript ?? "",
    task: {
      title: r.task?.title ?? "",
      description: r.task?.description ?? "",
      patient: r.task?.patient ?? "",
      priority: r.task?.priority ?? "medium",
      dueDate: r.task?.dueDate ?? "",
      confidence: r.task?.confidence ?? 0.5,
    },
  };
}

async function confirmAndSaveTask(fields: ExtractedFields): Promise<Task> {
  const res = await fetch("/api/trpc/ai.confirmAndSave", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      json: {
        title: fields.title,
        description: fields.description || undefined,
        patient: fields.patient || undefined,
        priority: fields.priority,
        dueAt: fields.dueDate || undefined,
      },
    }),
  });
  const data = await res.json();
  return data.result?.data?.json;
}

// --- Utilities ---

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

function cycleStatus(current: string): "open" | "in_progress" | "done" {
  if (current === "open") return "in_progress";
  if (current === "in_progress") return "done";
  return "open";
}

// --- Component ---

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<
    "low" | "medium" | "high" | "urgent"
  >("medium");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // AI extraction state
  const [aiInput, setAiInput] = useState("");
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiExtracted, setAiExtracted] = useState<ExtractedFields | null>(null);
  const [aiEditMode, setAiEditMode] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const data = await fetchTasks(filter === "all" ? undefined : filter);
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

  // AI extraction handlers
  const handleAiExtract = async () => {
    if (!aiInput.trim()) return;
    setAiExtracting(true);
    setAiError(null);
    try {
      const result = await extractFromText(aiInput.trim());
      setAiExtracted(result);
      setAiEditMode(true);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setAiExtracting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          setAiExtracting(true);
          try {
            const result = await extractFromVoice(base64, "audio/webm");
            setAiInput(result.transcript);
            setAiExtracted(result.task);
            setAiEditMode(true);
          } catch {
            setAiError("Voice extraction failed");
          } finally {
            setAiExtracting(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setAiError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  };

  const handleAiSave = async () => {
    if (!aiExtracted) return;
    setAiSaving(true);
    try {
      await confirmAndSaveTask(aiExtracted);
      setAiExtracted(null);
      setAiEditMode(false);
      setAiInput("");
      setAiError(null);
      loadTasks();
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setAiSaving(false);
    }
  };

  const handleAiDiscard = () => {
    setAiExtracted(null);
    setAiEditMode(false);
    setAiError(null);
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

      {/* AI Task Extraction */}
      <div className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <h2 className="text-sm font-semibold text-purple-900">
            AI Task Extraction
          </h2>
        </div>

        {!aiEditMode ? (
          <>
            <div className="relative">
              <textarea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder='Describe a task naturally, e.g. "Need to review Mrs. Johnson&#39;s lab results urgently before her appointment tomorrow"'
                className="w-full px-3 py-2 pr-12 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white resize-none"
                rows={3}
                disabled={aiExtracting}
              />
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={aiExtracting}
                className={`absolute right-2 top-2 p-2 rounded-lg transition-colors ${
                  isRecording
                    ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
                title={isRecording ? "Stop recording" : "Record voice"}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[10px] text-purple-500">
                {isRecording
                  ? "Recording... click mic to stop"
                  : "Type or use voice input"}
              </span>
              <button
                onClick={handleAiExtract}
                disabled={!aiInput.trim() || aiExtracting}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {aiExtracting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Extract Task
              </button>
            </div>
          </>
        ) : aiExtracted ? (
          <div className="space-y-3">
            {aiExtracted.confidence < 0.7 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600 shrink-0" />
                <span className="text-xs text-yellow-800">
                  Low confidence ({Math.round(aiExtracted.confidence * 100)}%)
                  — please review carefully
                </span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Title
              </label>
              <input
                type="text"
                value={aiExtracted.title}
                onChange={(e) =>
                  setAiExtracted({ ...aiExtracted, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={aiExtracted.description}
                onChange={(e) =>
                  setAiExtracted({
                    ...aiExtracted,
                    description: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Patient
                </label>
                <input
                  type="text"
                  value={aiExtracted.patient}
                  onChange={(e) =>
                    setAiExtracted({ ...aiExtracted, patient: e.target.value })
                  }
                  placeholder="None"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Priority
                </label>
                <div className="flex gap-1">
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setAiExtracted({ ...aiExtracted, priority: p })
                      }
                      className={`px-2 py-1.5 rounded text-[10px] font-medium border transition-colors ${
                        aiExtracted.priority === p
                          ? priorityColors[p]
                          : "bg-white text-gray-400 border-gray-200"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={
                    aiExtracted.dueDate
                      ? new Date(aiExtracted.dueDate).toISOString().slice(0, 16)
                      : ""
                  }
                  onChange={(e) =>
                    setAiExtracted({
                      ...aiExtracted,
                      dueDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : "",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-purple-100">
              <span className="text-[10px] text-purple-500">
                Confidence: {Math.round(aiExtracted.confidence * 100)}%
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleAiDiscard}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Discard
                </button>
                <button
                  onClick={() => {
                    setAiEditMode(false);
                    setAiExtracted(null);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Re-extract
                </button>
                <button
                  onClick={handleAiSave}
                  disabled={!aiExtracted.title.trim() || aiSaving}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {aiSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Save Task
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {aiError && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-xs text-red-700">{aiError}</span>
          </div>
        )}
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
