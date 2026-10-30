import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  Files,
  LayoutDashboard,
  TableProperties,
  Upload,
} from 'lucide-react';

const navigation = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/export', label: 'Xuất Excel', icon: Upload },
  { to: '/reports', label: 'Kho báo cáo', icon: Files },
  { to: '/orders', label: 'Nhu cầu HRC', icon: ClipboardList },
  { to: '/order-charts', label: 'Biểu đồ Nhu cầu', icon: BarChart3 },
  { to: '/data', label: 'Dữ liệu', icon: TableProperties },
];

function NavigationLink({ to, label, icon: Icon, compact = false }) {
  return (
    <NavLink
      to={to}
      end={to === '/data'}
      className={({ isActive }) => `group relative inline-flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
        compact ? 'shrink-0 px-3.5 py-2' : 'w-full px-3.5 py-2.5'
      } ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-blue-600 font-semibold text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/10'
          : 'font-medium text-slate-400 hover:bg-slate-800/60 hover:text-white'
      }`}
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
              isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
            }`}
          />
          <span className="tracking-tight">{label}</span>
          {isActive && !compact && (
            <span
              className="absolute right-3 h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function Brand() {
  return (
    <NavLink to="/dashboard" className="group flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-sky-400 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-105">
        <FileSpreadsheet size={22} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-bold tracking-tight text-white group-hover:text-indigo-200 transition-colors">
          HRC2 QC
        </span>
        <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-400">
          Data Center
        </span>
      </span>
    </NavLink>
  );
}

export default function QcLayout({ children }) {
  return (
    <div className="relative min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top subtle ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 right-0 top-0 z-0 h-96 opacity-60 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.08),rgba(255,255,255,0))]"
      />

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-800/80 bg-gradient-to-b from-[#0b1329] via-[#0f172a] to-[#090d18] px-5 py-6 shadow-2xl lg:flex">
        <Brand />

        <div className="mt-9">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Không gian làm việc
          </p>
          <nav aria-label="Điều hướng chính" className="space-y-1.5">
            {navigation.map((item) => (
              <NavigationLink key={item.to} {...item} />
            ))}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl border border-slate-800/90 bg-slate-800/40 p-4 backdrop-blur-md transition hover:border-slate-700">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </span>
            Hệ thống theo dõi
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-400">
            Dữ liệu QC được đồng bộ thời gian thực và lưu trữ tập trung trên MongoDB Atlas.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span>HRC2 QC System</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-mono text-slate-400">v6.4</span>
        </div>
      </aside>

      {/* Content Canvas */}
      <div className="relative z-10 min-h-screen lg:pl-[260px]">
        {/* Mobile Header */}
        <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0b1329]/95 backdrop-blur-xl lg:hidden">
          <div className="px-4 pt-3.5">
            <Brand />
          </div>
          <nav aria-label="Điều hướng chính" className="mt-2 flex gap-1.5 overflow-x-auto px-3 pb-3">
            {navigation.map((item) => (
              <NavigationLink key={item.to} {...item} compact />
            ))}
          </nav>
        </header>

        {/* Main page content container */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-8 sm:py-9 xl:px-11">
          {children}
        </main>
      </div>
    </div>
  );
}
