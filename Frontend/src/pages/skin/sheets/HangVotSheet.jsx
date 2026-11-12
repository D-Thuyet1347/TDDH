import React from 'react';
import {
  RefreshCw,
  Upload,
  LoaderCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { HANG_VOT_COLUMNS } from '../skinConstants';

export default function HangVotSheet({
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
  onCopySelectedIds,
  idColumnName,
  syncingHangVot,
  onSyncHangVot,
  onOpenUploadModal,
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR HANG_VOT */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Synchronize directly from SharePoint OneDrive link */}
          <Button
            type="button"
            onClick={onSyncHangVot}
            disabled={syncingHangVot}
            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all"
            title="Đồng bộ tự động từ file Xác nhận chuyển loại XCTT_NM.HRC2.xlsx (Cột A đến E)"
          >
            {syncingHangVot ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
            <span>Đồng bộ Hàng Vớt (SharePoint)</span>
          </Button>

          {/* Upload Other Sources */}
          <Button
            type="button"
            variant="outline"
            onClick={onOpenUploadModal}
            className="h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-2.5 flex items-center gap-1.5"
            title="Tùy chọn nạp dữ liệu Hàng Vớt (Chọn file / Dán Excel / Đặt đường dẫn)"
          >
            <Upload size={13} /> Nạp nguồn khác
          </Button>
        </div>
      </div>

      {/* Virtual Table */}
      <div className="flex-1 min-w-0 w-full">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Chưa có dữ liệu Hàng Vớt</p>
            <p className="mt-1 text-slate-500">
              Bấm nút <strong>"Đồng bộ Hàng Vớt (SharePoint)"</strong> ở trên để nạp tự động dữ liệu từ file Xác nhận chuyển loại.
            </p>
          </div>
        ) : (
          <SkinVirtualTable
            activeSheet="HANG_VOT"
            columns={HANG_VOT_COLUMNS}
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
            onCopySelectedIds={onCopySelectedIds}
            idColumnName={idColumnName}
          />
        )}
      </div>
    </div>
  );
}
