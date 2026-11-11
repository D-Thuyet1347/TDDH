import React from 'react';
import {
  Download,
  Upload,
  ArrowRight,
  LoaderCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { DATA_SOURCE_COLUMNS } from '../skinConstants';
import { nf } from '../../../utils/ultils';

export default function DataSourceSheet({
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
  stats,
  loadingDataSource,
  onLoadDefault,
  onOpenUploadModal,
  transferring,
  onTransferToSkin,
}) {
  const currentMonth = new Date().getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR DATA_SOURCE */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Load Default (Current month & prev month) */}
          <Button
            type="button"
            onClick={onLoadDefault}
            disabled={loadingDataSource}
            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all"
            title="Lấy toàn bộ dữ liệu của tháng hiện tại và tháng trước đó từ page Dữ liệu"
          >
            {loadingDataSource ? (
              <>
                <LoaderCircle size={13} className="animate-spin" />
                <span>Đang nạp T.{currentMonth} &amp; T.{prevMonth}...</span>
              </>
            ) : (
              <>
                <Download size={13} />
                <span>Load dữ liệu (T.{currentMonth} &amp; T.{prevMonth})</span>
              </>
            )}
          </Button>

          {/* Upload Other Sources */}
          <Button
            type="button"
            variant="outline"
            onClick={onOpenUploadModal}
            className="h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-2.5 flex items-center gap-1.5"
            title="Tùy chọn nạp dữ liệu (Chọn tháng / Chọn file Excel / Dán dữ liệu)"
          >
            <Upload size={13} /> Nạp nguồn khác
          </Button>

          {/* Transfer to SKIN_HRC2 button */}
          <Button
            type="button"
            disabled={transferring || selectedRowIds.size === 0}
            onClick={onTransferToSkin}
            className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 px-3 ${
              selectedRowIds.size > 0
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
            title="Chuyển các dòng được chọn từ DATA_SOURCE sang sheet SKIN_HRC2"
          >
            {transferring ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <ArrowRight size={13} />
            )}
            <span>Chuyển sang SKIN_HRC2 ({selectedRowIds.size} dòng)</span>
          </Button>
        </div>

        {/* Month Distribution Badges */}
        {stats?.months_distribution?.length > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500">
            <span>Tháng có dữ liệu:</span>
            {stats.months_distribution.map((item) => (
              <span key={item.month} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-bold text-slate-700 shadow-2xs">
                T{item.month}: {nf(item.count)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Virtual Table */}
      <div className="flex-1 min-w-0 w-full">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Chưa có dữ liệu DATA_SOURCE</p>
            <p className="mt-1 text-slate-500">
              Bấm nút <strong>"Load dữ liệu (T.{currentMonth} &amp; T.{prevMonth})"</strong> ở trên để nạp cuộn SKIN từ page Dữ liệu.
            </p>
          </div>
        ) : (
          <SkinVirtualTable
            activeSheet="DATA_SOURCE"
            columns={DATA_SOURCE_COLUMNS}
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
    </div>
  );
}
