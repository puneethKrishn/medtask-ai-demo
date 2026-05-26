"use client";

import {
  LayoutDashboard,
  ListTodo,
  Calendar,
  Users,
  Settings,
  Sparkles,
  Stethoscope,
  Bell,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/", active: true },
  { icon: ListTodo, label: "Tasks", href: "/", active: false },
  { icon: Calendar, label: "Schedule", href: "/", active: false },
  { icon: Users, label: "Patients", href: "/", active: false },
  { icon: Bell, label: "Notifications", href: "/", active: false },
];

const bottomItems = [
  { icon: Settings, label: "Settings", href: "/" },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white border-r border-slate-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">MedTask</span>
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-indigo-700 text-[10px] font-semibold rounded-md flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5">Task Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                item.active
                  ? "bg-blue-50 text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] ${item.active ? "text-blue-600" : ""}`} />
              {item.label}
              {item.active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
              )}
            </a>
          ))}
        </div>

        <div className="mt-6 mb-3 px-3">
          <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">System</p>
        </div>
        <div className="space-y-1">
          {bottomItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all"
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            DR
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">Dr. Demo</p>
            <p className="text-[11px] text-slate-400 truncate">demo@medtask.ai</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  );
}
