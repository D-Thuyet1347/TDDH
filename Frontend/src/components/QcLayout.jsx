import React from 'react';
import { NavLink } from 'react-router-dom';
import {
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
  { to: '/data', label: 'Dữ liệu', icon: TableProperties },
];

function NavigationLink({ to, label, icon: Icon, compact = false }) {
  return (
    <NavLink
      to={to}
      end={to === '/data'}
      className={({ isActive }) => `group inline-flex items-center gap-3 rounded-xl text-sm font-medium transition-colors ${
        compact ? 'shrink-0 px-3 py-2.5' : 'w-full px-3 py-2.5'
      } ${
        isActive
          ? 'bg-blue-50 text-blue-700'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={18} strokeWidth={1.8} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

function Brand() {
  return (
    <NavLink to="/dashboard" className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
        <FileSpreadsheet size={20} strokeWidth={1.8} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold tracking-tight text-slate-900">HRC2 QC</span>
        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">
          Data center
        </span>
      </span>
    </NavLink>
  );
}

export default function QcLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f6f8fc] font-sans text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col border-r border-slate-200/80 bg-white px-5 py-6 lg:flex">
        <Brand />
        <div className="mt-10">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Không gian làm việc
          </p>
          <nav aria-label="Điều hướng chính" className="space-y-1">
            {navigation.map((item) => <NavigationLink key={item.to} {...item} />)}
          </nav>
        </div>
        <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Hệ thống vận hành
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">
            Dữ liệu QC được đồng bộ và lưu trữ tập trung.
          </p>
        </div>
        <p className="mt-5 px-1 text-[10px] text-slate-400">HRC2 QC · Data Center</p>
      </aside>

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
          <div className="px-4 pt-3">
            <Brand />
          </div>
          <nav aria-label="Điều hướng chính" className="mt-2 flex gap-1 overflow-x-auto px-3 pb-3">
            {navigation.map((item) => <NavigationLink key={item.to} {...item} compact />)}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
