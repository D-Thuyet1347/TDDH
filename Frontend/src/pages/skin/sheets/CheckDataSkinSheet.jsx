import React from 'react';
import {
  Sparkles,
  LoaderCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { CHECK_DATA_SKIN_COLUMNS } from '../skinConstants';
import { nf } from '../../../utils/ultils';

export default function CheckDataSkinSheet({
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
  syncingCheckData,
  onSyncCheckData,
}) {
  const hrc1Count = rows.filter(r => r.values?.['ID HRC_1']).length;
  const spm2Count = rows.filter(r => r.values?.['ID HRC_2']).length;

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR CHECK_DATA_SKIN */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={onSyncCheckData}
            disabled={syncingCheckData}
            className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all"
            title="Tự động so khớp dữ liệu giữa DATA_SOURCE (HRC 1) và DATA_MES (SPM 2)"
          >
            {syncingCheckData ? (
              <LoaderCircle size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} />
            )}
            <span>Check Data</span>
          </Button>
        </div>

        {/* Count Badges */}
        <div className="hidden lg:flex items-center gap-2 text-[11px]">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
            SKIN & SKIN_CUST: {nf(hrc1Count)} cuộn
          </Badge>
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
            SKIN_RCL_AGAIN & CXL: {nf(spm2Count)} cuộn
          </Badge>
        </div>
      </div>

      {/* Virtual Table */}
      <div className="flex-1 min-w-0 w-full">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
            <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Chưa có dữ liệu so khớp Check_data_SKIN</p>
            <p className="mt-1 text-slate-500">
              Bấm nút <strong>"Check Data (So khớp HRC 1 &amp; SPM 2)"</strong> ở trên để tự động chạy so khớp.
            </p>
          </div>
        ) : (
          <SkinVirtualTable
            activeSheet="CHECK_DATA_SKIN"
            columns={CHECK_DATA_SKIN_COLUMNS}
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
