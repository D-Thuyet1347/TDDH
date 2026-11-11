import React, { useState } from 'react';
import {
  Table as TableIcon,
  LayoutGrid,
  ClipboardPaste,
  Trash2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { PIVOT_TABLE_COLUMNS } from '../skinConstants';
import { nf } from '../../../utils/ultils';

export default function PivotTableSheet({
  rows,
  rawRows,
  selectedRowIds,
  onToggleSelectRow,
  onToggleSelectAll,
  activeRowId,
  onSetActiveRowId,
  filters,
  onApplyFilter,
  onClearFilter,
  sortConfig,
  onSort,
  editingCell,
  editValue,
  setEditValue,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  pivotData = { coil_reqs: [], po_reqs: [], priorities: [] },
  onOpenPivotPaste,
  onClearPivotBlock,
  onDeletePivotItem,
}) {
  const [pivotViewMode, setPivotViewMode] = useState('cards'); // 'cards' | 'table'

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR PIVOT_TABLE */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          {/* Switch View Mode: 3 Cards vs Table */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setPivotViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                pivotViewMode === 'cards'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={13} /> 3 Bảng độc lập
            </button>
            <button
              type="button"
              onClick={() => setPivotViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                pivotViewMode === 'table'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={13} /> Dạng bảng tổng hợp
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500">
          <span>Tổng yêu cầu:</span>
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            Cuộn: {nf(pivotData.coil_reqs.length)}
          </Badge>
          <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-800">
            PO: {nf(pivotData.po_reqs.length)}
          </Badge>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            Ưu tiên: {nf(pivotData.priorities.length)}
          </Badge>
        </div>
      </div>

      {/* CONTENT: 3 CARDS VIEW OR VIRTUAL TABLE */}
      {pivotViewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CARD 1: Yêu cầu đặc biệt theo ID cuộn */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">1</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Yêu cầu đặc biệt theo ID cuộn</h3>
                  <p className="text-[10px] text-slate-400">Liên kết vào cột "Chỉ định Skin"</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                {nf(pivotData.coil_reqs.length)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                onClick={() => onOpenPivotPaste('coil')}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 rounded-lg flex-1 shadow-2xs"
              >
                <ClipboardPaste size={12} className="mr-1" /> Dán vào đây
              </Button>
              {pivotData.coil_reqs.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClearPivotBlock('coil')}
                  className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 px-2 rounded-lg"
                  title="Xóa toàn bộ dữ liệu bảng này"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-2 w-10 text-center border-r border-slate-200">#</th>
                    <th className="px-2.5 py-2 border-r border-slate-200">ID Cuộn</th>
                    <th className="px-2.5 py-2">Yêu cầu đặc biệt</th>
                    <th className="w-8 px-1 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {pivotData.coil_reqs.length ? (
                    pivotData.coil_reqs.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 group">
                        <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100 bg-slate-50/50">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[120px]">
                          {item.coil_id}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 truncate max-w-[160px]">
                          {item.requirement}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => onDeletePivotItem('coil', item.id)}
                            className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-opacity"
                            title="Xóa dòng này"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-sans text-xs">
                        Chưa có dữ liệu. Bấm <strong>"Dán vào đây"</strong> để nhập (ID Cuộn &amp; Yêu cầu đặc biệt).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 2: Yêu cầu đặc biệt theo PO */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">2</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Yêu cầu đặc biệt theo PO</h3>
                  <p className="text-[10px] text-slate-400">Liên kết vào cột "Chỉ định Skin"</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-blue-50 text-blue-700 border-blue-200 font-bold">
                {nf(pivotData.po_reqs.length)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                onClick={() => onOpenPivotPaste('po')}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-2.5 rounded-lg flex-1 shadow-2xs"
              >
                <ClipboardPaste size={12} className="mr-1" /> Dán vào đây
              </Button>
              {pivotData.po_reqs.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClearPivotBlock('po')}
                  className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 px-2 rounded-lg"
                  title="Xóa toàn bộ dữ liệu bảng này"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-2 w-10 text-center border-r border-slate-200">#</th>
                    <th className="px-2.5 py-2 border-r border-slate-200">PO</th>
                    <th className="px-2.5 py-2">Yêu cầu đặc biệt</th>
                    <th className="w-8 px-1 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {pivotData.po_reqs.length ? (
                    pivotData.po_reqs.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 group">
                        <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100 bg-slate-50/50">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[120px]">
                          {item.po}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 truncate max-w-[160px]">
                          {item.requirement}
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => onDeletePivotItem('po', item.id)}
                            className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-opacity"
                            title="Xóa dòng này"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-sans text-xs">
                        Chưa có dữ liệu. Bấm <strong>"Dán vào đây"</strong> để nhập (PO &amp; Yêu cầu đặc biệt).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 3: Ưu tiên đơn hàng */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex flex-col h-[650px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-700">3</span>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Ưu tiên đơn hàng</h3>
                  <p className="text-[10px] text-slate-400">Liên kết vào cột "Ưu tiên đơn hàng"</p>
                </div>
              </div>
              <Badge variant="outline" className="font-mono text-xs bg-amber-50 text-amber-700 border-amber-200 font-bold">
                {nf(pivotData.priorities.length)}
              </Badge>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Button
                type="button"
                onClick={() => onOpenPivotPaste('priority')}
                className="h-7 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 rounded-lg flex-1 shadow-2xs"
              >
                <ClipboardPaste size={12} className="mr-1" /> Dán vào đây
              </Button>
              {pivotData.priorities.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClearPivotBlock('priority')}
                  className="h-7 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 px-2 rounded-lg"
                  title="Xóa toàn bộ dữ liệu bảng này"
                >
                  <Trash2 size={12} />
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-2.5 py-2 w-10 text-center border-r border-slate-200">#</th>
                    <th className="px-2.5 py-2 border-r border-slate-200">PO / ID Cuộn</th>
                    <th className="px-2.5 py-2">Thứ tự ưu tiên</th>
                    <th className="w-8 px-1 py-2 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {pivotData.priorities.length ? (
                    pivotData.priorities.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50 group">
                        <td className="px-2 py-1.5 text-center text-slate-400 border-r border-slate-100 bg-slate-50/50">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1.5 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[120px]">
                          {item.key}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600 truncate max-w-[160px]">
                          <span className="font-bold text-amber-700">{item.priority}</span>
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => onDeletePivotItem('priority', item.id)}
                            className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-opacity"
                            title="Xóa dòng này"
                          >
                            <X size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-sans text-xs">
                        Chưa có dữ liệu. Bấm <strong>"Dán vào đây"</strong> để nhập (PO/ID cuộn &amp; Ưu tiên).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* DẠNG BẢNG TỔNG HỢP VIRTUAL TABLE */
        <div className="flex-1 min-w-0 w-full">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
              <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Chưa có dữ liệu PivotTable</p>
            </div>
          ) : (
            <SkinVirtualTable
              activeSheet="PIVOT_TABLE"
              columns={PIVOT_TABLE_COLUMNS}
              rows={rows}
              rawRows={rawRows}
              selectedRowIds={selectedRowIds}
              onToggleSelectRow={onToggleSelectRow}
              onToggleSelectAll={onToggleSelectAll}
              activeRowId={activeRowId}
              onSetActiveRowId={onSetActiveRowId}
              filters={filters}
              onApplyFilter={onApplyFilter}
              onClearFilter={onClearFilter}
              sortConfig={sortConfig}
              onSort={onSort}
              editingCell={editingCell}
              editValue={editValue}
              setEditValue={setEditValue}
              onStartEdit={onStartEdit}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}
