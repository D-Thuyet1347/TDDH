import React from 'react';
import { NavLink } from 'react-router-dom';
import { FileSpreadsheet, Files, LayoutDashboard, TableProperties, Upload } from 'lucide-react';

const navigation = [
  { to: '/dashboard', label: 'Tổng quan', icon: LayoutDashboard },
  { to: '/export', label: 'Xuất Excel', icon: Upload },
  { to: '/reports', label: 'Báo cáo', icon: Files },
  { to: '/data', label: 'Dữ liệu', icon: TableProperties },
];

export default function QcLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#f5f7fb] font-sans text-slate-800">
      <nav className="border-b border-[#e5e9f2] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 font-extrabold text-[#1e2944]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4c63ba]">
              <FileSpreadsheet size={19} />
            </span>
            <span>HRC2 QC</span>
          </NavLink>
          <div className="flex flex-wrap items-center gap-1">
            {navigation.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold transition ${
                  isActive ? 'bg-[#eef3ff] text-[#405bb0]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={15} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
