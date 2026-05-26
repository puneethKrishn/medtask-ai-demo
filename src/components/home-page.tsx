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
  ListTodo,
  TrendingUp,
  Zap,
  ClipboardList,
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
  in_progress: <Clock className="w-4 h-4 text-amber-500" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
  snoozed: <Clock className="w-4 h-4 text-slate-400" />,
};

const priorityConfig: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  urgent: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  medium: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  low: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
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

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/medcorp";

async function fetchTasks(filter?: string): Promise<Task[]> {
  const input = filter ? JSON.stringify({ status: filter }) : undefined;
  const url = input
    ? `${BASE_PATH}/api/trpc/tasks.list?input=${encodeURIComponent(JSON.stringify({ json: JSON.parse(input) }))}`
    : `${BASE_PATH}/api/trpc/tasks.list`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result?.data?.json ?? [];
}

async function createTask(input: {
  title: string;
  priority: string;
}): Promise<Task> {
  const res = await fetch(`${BASE_PATH}/api/trpc/tasks.create`, {
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
  const res = await fetch(`${BASE_PATH}/api/trpc/tasks.update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const data = await res.json();
  return data.result?.data?.json;
}

async function deleteTaskApi(id: string): Promise<void> {
  await fetch(`${BASE_PATH}/api/trpc/tasks.delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: { id } }),
  });
}

async function extractFromText(text: string): Promise<ExtractedFields> {
  const res = await fetch(`${BASE_PATH}/api/trpc/ai.extractFromText`, {
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
  const res = await fetch(`${BASE_PATH}/api/trpc/ai.extractFromVoice`, {
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
  const res = await fetch(`${BASE_PATH}/api/trpc/ai.confirmAndSave`, {
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

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// --- Stat Card ---

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// --- Component ---

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
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
  const [showAiPanel, setShowAiPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    const [filtered, all] = await Promise.all([
      fetchTasks(filter === "all" ? undefined : filter),
      filter === "all" ? Promise.resolve([]) : fetchTasks(),
    ]);
    setTasks(filtered);
    setAllTasks(filter === "all" ? filtered : all);
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
      setShowAiPanel(false);
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

  const statsSource = filter === "all" ? tasks : allTasks;
  const counts = {
    total: statsSource.length,
    open: statsSource.filter((t) => t.status === "open").length,
    in_progress: statsSource.filter((t) => t.status === "in_progress").length,
    done: statsSource.filter((t) => t.status === "done").length,
    overdue: statsSource.filter(
      (t) => t.dueAt && formatDue(t.dueAt) === "Overdue"
    ).length,
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, Dr. Demo
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAiPanel(!showAiPanel)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium shadow-md shadow-purple-200"
          >
            <Sparkles className="w-4 h-4" />
            AI Extract
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={ClipboardList}
          label="Total Tasks"
          value={counts.total}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          icon={Circle}
          label="Open"
          value={counts.open}
          color="text-sky-600"
          bgColor="bg-sky-50"
        />
        <StatCard
          icon={TrendingUp}
          label="In Progress"
          value={counts.in_progress}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
        <StatCard
          icon={Zap}
          label="Completed"
          value={counts.done}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
        />
      </div>

      {/* AI Task Extraction Panel */}
      {showAiPanel && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-purple-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  AI Task Extraction
                </h2>
                <p className="text-[11px] text-slate-400">
                  Describe a task naturally or use voice input
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowAiPanel(false);
                handleAiDiscard();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!aiEditMode ? (
            <>
              <div className="relative">
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder='e.g. "Need to review Mrs. Johnson&#39;s lab results urgently before her appointment tomorrow"'
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-slate-50 resize-none placeholder:text-slate-400"
                  rows={3}
                  disabled={aiExtracting}
                />
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={aiExtracting}
                  className={`absolute right-3 top-3 p-2 rounded-xl transition-colors ${
                    isRecording
                      ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
              <div className="flex justify-between items-center mt-3">
                <span className="text-[11px] text-slate-400">
                  {isRecording
                    ? "Recording... click mic to stop"
                    : "Type or use voice input"}
                </span>
                <button
                  onClick={handleAiExtract}
                  disabled={!aiInput.trim() || aiExtracting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-sm"
                >
                  {aiExtracting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  Extract Task
                </button>
              </div>
            </>
          ) : aiExtracted ? (
            <div className="space-y-4">
              {aiExtracted.confidence < 0.7 && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs text-amber-800">
                    Low confidence ({Math.round(aiExtracted.confidence * 100)}%)
                    — please review carefully
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={aiExtracted.title}
                  onChange={(e) =>
                    setAiExtracted({ ...aiExtracted, title: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
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
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                    Patient
                  </label>
                  <input
                    type="text"
                    value={aiExtracted.patient}
                    onChange={(e) =>
                      setAiExtracted({
                        ...aiExtracted,
                        patient: e.target.value,
                      })
                    }
                    placeholder="None"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
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
                        className={`px-2 py-2 rounded-lg text-[10px] font-medium border transition-colors ${
                          aiExtracted.priority === p
                            ? priorityColors[p]
                            : "bg-white text-slate-400 border-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      aiExtracted.dueDate
                        ? new Date(aiExtracted.dueDate)
                            .toISOString()
                            .slice(0, 16)
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
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Confidence: {Math.round(aiExtracted.confidence * 100)}%
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleAiDiscard}
                    className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Discard
                  </button>
                  <button
                    onClick={() => {
                      setAiEditMode(false);
                      setAiExtracted(null);
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-xs text-purple-600 hover:text-purple-700 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    <Edit3 className="w-3 h-3" />
                    Re-extract
                  </button>
                  <button
                    onClick={handleAiSave}
                    disabled={!aiExtracted.title.trim() || aiSaving}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
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
            <div className="mt-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
              <span className="text-xs text-red-700">{aiError}</span>
            </div>
          )}
        </div>
      )}

      {/* Create Task Form */}
      {showCreate && (
        <div className="mb-6 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">
            Create New Task
          </h3>
          <form onSubmit={handleCreate}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3 bg-slate-50"
              autoFocus
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setNewPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      newPriority === p
                        ? priorityColors[p]
                        : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
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
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {creating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Create"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Task List Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        {/* Section header with filters */}
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-900">Tasks</h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded-full">
                {tasks.length}
              </span>
            </div>
            <div className="flex gap-1.5">
              {(["all", "open", "in_progress", "done"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === s
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {s === "all" ? "All" : statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              No tasks yet
            </h3>
            <p className="text-sm text-slate-400 text-center max-w-sm mb-6">
              Get started by creating a task manually or use AI to extract tasks
              from natural language descriptions.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAiPanel(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Try AI Extract
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Manually
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`group px-5 py-4 hover:bg-slate-50/50 transition-colors ${
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
                            ? "line-through text-slate-400"
                            : "text-slate-900"
                        }`}
                      >
                        {task.title}
                      </h3>
                      {task.source === "ai_extracted" && (
                        <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-medium rounded-md flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" />
                          AI
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${priorityConfig[task.priority].bg} ${priorityConfig[task.priority].text}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority].dot}`}
                        />
                        {task.priority}
                      </span>
                      {task.dueAt && (
                        <span
                          className={`flex items-center gap-1 text-[10px] ${
                            formatDue(task.dueAt) === "Overdue"
                              ? "text-red-600 font-medium"
                              : "text-slate-400"
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
                      <span className="text-[10px] text-slate-300">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
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
    </div>
  );
}
