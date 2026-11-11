import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { getSheetColumns } from '../skinConstants';

export default function GenericSkinSheet({
  activeSheet,
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
}) {
  const columns = getSheetColumns(activeSheet);

  return (
    <div className="flex flex-col gap-3">
      {/* Virtual Table */}
      <div className="flex-1 min-w-0 w-full">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Chưa có dữ liệu {activeSheet}</p>
            <p className="mt-1 text-slate-500">
              Bấm <strong>"+ Thêm dòng"</strong> hoặc <strong>"Dán từ Excel"</strong> để nhập dữ liệu.
            </p>
          </div>
        ) : (
          <SkinVirtualTable
            activeSheet={activeSheet}
            columns={columns}
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
