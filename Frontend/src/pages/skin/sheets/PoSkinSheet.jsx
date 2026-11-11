import React from 'react';
import {
  Sparkles,
  LoaderCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { PO_SKIN_COLUMNS } from '../skinConstants';

export default function PoSkinSheet({
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
  creatingNewPo,
  onCreateNewPo,
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR PO_SKIN */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onCreateNewPo}
            disabled={creatingNewPo}
            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all"
            title="Tự động tính toán và tạo PO_NEW dựa trên tháng kế tiếp"
          >
            {creatingNewPo ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>Tạo PO mới</span>
          </Button>
        </div>
      </div>

      {/* Virtual Table */}
      <div className="flex-1 min-w-0 w-full">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Chưa có dữ liệu PO_SKIN</p>
          </div>
        ) : (
          <SkinVirtualTable
            activeSheet="PO_SKIN"
            columns={PO_SKIN_COLUMNS}
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
