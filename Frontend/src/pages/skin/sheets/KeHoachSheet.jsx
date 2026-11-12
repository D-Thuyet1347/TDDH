import React, { useState, useMemo } from 'react';
import {
  Play,
  Download,
  Copy,
  RefreshCw,
  LoaderCircle,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { KE_HOACH_COLUMNS } from '../skinConstants';
import { getExportSkinKeHoachUrl } from '../../../APIs';
import { successToast, errorToast } from '../../../utils/toast';

export default function KeHoachSheet({
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
  skin2Target,
  setSkin2Target,
  skin4Target,
  setSkin4Target,
  prodFromDate,
  setProdFromDate,
  prodToDate,
  setProdToDate,
  runningKeHoach,
  onRunKeHoach,
  keHoachMatrixData,
  loadingKeHoachMatrix,
  onRefreshMatrix,
  unmatchedGrades = [],
  onGoToRulesSkin,
}) {
  const [selectedKeHoachPairIdx, setSelectedKeHoachPairIdx] = useState(0);
  const [textjoinDelimiter, setTextjoinDelimiter] = useState(' ');

  const currentMatrixPair = useMemo(() => {
    if (!keHoachMatrixData?.matrix_pairs?.length) return null;
    const idx = Math.min(Math.max(0, selectedKeHoachPairIdx), keHoachMatrixData.matrix_pairs.length - 1);
    return keHoachMatrixData.matrix_pairs[idx] || null;
  }, [keHoachMatrixData, selectedKeHoachPairIdx]);

  const handleCopyPlanCoils = (type) => {
    if (!currentMatrixPair) {
      errorToast('Chưa có dữ liệu Plan');
      return;
    }
    const delim = textjoinDelimiter === '\\n' ? '\r\n' : textjoinDelimiter;
    let coils = [];
    let label = '';

    if (type === 's1_2') {
      coils = currentMatrixPair.skin2_coils || [];
      label = `1.Skin 2 (${currentMatrixPair.skin2_p1_id || ''})`;
    } else if (type === 's2_2') {
      coils = currentMatrixPair.skin2_p2_coils || [];
      label = `2.Skin 2 (${currentMatrixPair.skin2_p2_id || ''})`;
    } else if (type === 's1_4') {
      coils = currentMatrixPair.skin4_coils || [];
      label = `1.Skin 4 (${currentMatrixPair.skin4_p1_id || ''})`;
    } else if (type === 's2_4') {
      coils = currentMatrixPair.skin4_p2_coils || [];
      label = `2.Skin 4 (${currentMatrixPair.skin4_p2_id || ''})`;
    } else if (type === 'skin2') {
      coils = [...(currentMatrixPair.skin2_coils || []), ...(currentMatrixPair.skin2_p2_coils || [])];
      label = 'Skin 2 (Cả 2 Plan)';
    } else if (type === 'skin4') {
      coils = [...(currentMatrixPair.skin4_coils || []), ...(currentMatrixPair.skin4_p2_coils || [])];
      label = 'Skin 4 (Cả 2 Plan)';
    } else if (type === 'all') {
      coils = [
        ...(currentMatrixPair.skin2_coils || []),
        ...(currentMatrixPair.skin2_p2_coils || []),
        ...(currentMatrixPair.skin4_coils || []),
        ...(currentMatrixPair.skin4_p2_coils || []),
      ];
      label = 'Tất cả 4 Plan';
    }

    if (!coils.length) {
      errorToast(`Không có cuộn nào trong ${label}`);
      return;
    }

    const text = coils.join(delim);
    navigator.clipboard.writeText(text);
    successToast(`Đã copy ${coils.length} cuộn (${label})!`);
  };

  const handleCopyPlanByPlanId = (planId) => {
    if (!planId) return;
    const planRows = rawRows.filter(r => r.values?.['Plan ID'] === planId);
    const coils = planRows.map(r => r.values?.['ID Cuộn Bó']).filter(Boolean);
    if (!coils.length) {
      errorToast(`Không tìm thấy cuộn nào thuộc Plan ${planId}`);
      return;
    }
    const delim = textjoinDelimiter === '\\n' ? '\r\n' : textjoinDelimiter;
    const text = coils.join(delim);
    navigator.clipboard.writeText(text);
    successToast(`Đã copy ${coils.length} cuộn của Plan ${planId}!`);
  };

  const handleRowClick = (row) => {
    if (row.values?.['Plan ID'] && keHoachMatrixData?.matrix_pairs?.length) {
      const pid = row.values?.['Plan ID'];
      const pIdxFound = keHoachMatrixData.matrix_pairs.findIndex(
        p => p.skin2_plan_id === pid || p.skin4_plan_id === pid || p.pair_title?.includes(pid)
      );
      if (pIdxFound !== -1) {
        setSelectedKeHoachPairIdx(pIdxFound);
      }
    }
  };

  const renderCustomCell = (row, col, val) => {
    if (col === 'Plan ID' && val) {
      return (
        <div className="flex items-center justify-between gap-1 group/plan">
          <span className="font-bold text-sky-800 font-mono">{String(val)}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyPlanByPlanId(String(val));
            }}
            className="opacity-0 group-hover/plan:opacity-100 hover:opacity-100 text-sky-600 hover:text-sky-800 p-0.5 rounded hover:bg-sky-100 transition-all cursor-pointer"
            title={`Copy 50 cuộn của Plan ${val} dạng Textjoin`}
          >
            <Copy size={11} />
          </button>
        </div>
      );
    }
    return <span>{String(val ?? '')}</span>;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR KE_HOACH */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Skin Pass Mill 2 */}
          <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-300 rounded-lg px-2.5 py-1">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Skin Pass Mill 2:</span>
            <input
              type="number"
              min={40}
              max={100}
              value={skin2Target}
              onChange={(e) => setSkin2Target(e.target.value)}
              onBlur={() => {
                const n = parseInt(skin2Target, 10);
                setSkin2Target(Number.isFinite(n) ? Math.min(100, Math.max(40, n)) : 50);
              }}
              className="w-14 h-6 text-center font-bold text-xs bg-yellow-200 border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
              title="Số lượng cuộn mục tiêu cho 1 Plan của Skin 2 (Mặc định 50, tối thiểu 40)"
            />
          </div>

          {/* Target Skin Pass Mill 4 */}
          <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-300 rounded-lg px-2.5 py-1">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Skin Pass Mill 4:</span>
            <input
              type="number"
              min={40}
              max={100}
              value={skin4Target}
              onChange={(e) => setSkin4Target(e.target.value)}
              onBlur={() => {
                const n = parseInt(skin4Target, 10);
                setSkin4Target(Number.isFinite(n) ? Math.min(100, Math.max(40, n)) : 50);
              }}
              className="w-14 h-6 text-center font-bold text-xs bg-yellow-200 border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
              title="Số lượng cuộn mục tiêu cho 1 Plan của Skin 4 (Mặc định 50, tối thiểu 40)"
            />
          </div>

          {/* Prod From Date Selector */}
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Từ ngày SX:</span>
            <input
              type="date"
              value={prodFromDate || ''}
              onChange={(e) => setProdFromDate?.(e.target.value)}
              className="h-6 text-xs font-bold bg-white border border-blue-300 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Lọc các cuộn có Ngày sản xuất từ ngày này trở đi (so với ngày hiện tại >= 2 ngày)"
            />
            {prodFromDate && (
              <button
                type="button"
                onClick={() => setProdFromDate?.('')}
                className="text-xs font-bold text-blue-600 hover:text-blue-900 px-1"
                title="Xóa bộ lọc Từ ngày SX"
              >
                ×
              </button>
            )}
          </div>

          {/* Prod To Date Selector */}
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1">
            <span className="text-xs font-bold text-slate-800 whitespace-nowrap">Đến ngày SX:</span>
            <input
              type="date"
              value={prodToDate || ''}
              onChange={(e) => setProdToDate?.(e.target.value)}
              className="h-6 text-xs font-bold bg-white border border-indigo-300 rounded px-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Chỉ lập kế hoạch cho các cuộn có Ngày sản xuất đến ngày này trở về trước (để trống nếu không giới hạn)"
            />
            {prodToDate && (
              <button
                type="button"
                onClick={() => setProdToDate?.('')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-900 px-1"
                title="Xóa bộ lọc Đến ngày SX"
              >
                ×
              </button>
            )}
          </div>

          {/* Run Ke Hoach Button */}
          <Button
            type="button"
            onClick={onRunKeHoach}
            disabled={runningKeHoach}
            className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
            title="Chạy kế hoạch Skin tự động theo thuật toán"
          >
            {runningKeHoach ? <LoaderCircle size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
            Chạy Kế hoạch Skin
          </Button>

          {/* Export Excel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(getExportSkinKeHoachUrl(skin2Target, skin4Target), '_blank')}
            className="h-8 rounded-lg border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-bold px-2.5 flex items-center gap-1.5"
            title="Xuất bảng kế hoạch và ma trận cuộn ra file Excel chuẩn"
          >
            <Download size={13} /> Xuất Excel
          </Button>

          {/* Textjoin Delimiter selector */}
          <div className="flex items-center gap-1 bg-sky-50/90 border border-sky-300 rounded-lg px-2 py-0.5">
            <span className="text-[11px] font-bold text-sky-950 whitespace-nowrap flex items-center gap-1">
              <Copy size={11} className="text-sky-700" /> Textjoin:
            </span>
            <select
              value={textjoinDelimiter}
              onChange={(e) => setTextjoinDelimiter(e.target.value)}
              className="h-6 text-[11px] font-bold rounded border border-sky-300 bg-white px-1 text-slate-800 cursor-pointer"
              title="Ký tự ngăn cách Textjoin (mặc định khoảng cách ' ')"
            >
              <option value=" ">Khoảng cách " " (=TEXTJOIN(" ", TRUE, ...))</option>
              <option value=",">Dấu phẩy (,)</option>
              <option value="\n">Xuống dòng (\n)</option>
              <option value=";">Chấm phẩy (;)</option>
              <option value=", ">Phẩy &amp; cách (, )</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleCopyPlanCoils('skin2')}
              className="h-6 text-[11px] font-bold text-sky-800 hover:bg-sky-100 border-sky-300 px-2 flex items-center gap-1"
              title="Copy 50 cuộn Plan Skin 2 dạng TEXTJOIN khoảng cách"
            >
              Copy 50c Skin 2
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleCopyPlanCoils('skin4')}
              className="h-6 text-[11px] font-bold text-rose-800 hover:bg-rose-100 border-rose-300 px-2 flex items-center gap-1"
              title="Copy 50 cuộn Plan Skin 4 dạng TEXTJOIN khoảng cách"
            >
              Copy 50c Skin 4
            </Button>
          </div>

          {/* Refresh Matrix Button */}
          <Button
            type="button"
            variant="outline"
            onClick={onRefreshMatrix}
            disabled={loadingKeHoachMatrix}
            className="h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold px-2.5 flex items-center gap-1.5"
            title="Tải lại ma trận kế hoạch"
          >
            <RefreshCw size={13} className={loadingKeHoachMatrix ? "animate-spin" : ""} /> Ma trận
          </Button>
        </div>
      </div>

      {unmatchedGrades.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="flex items-start gap-2.5 min-w-0">
            <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-rose-900">
                Có {unmatchedGrades.length} mác phôi chưa nằm trong nhóm MC / LC / HC (đã bị xếp cuối khi lập kế hoạch):
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {unmatchedGrades.map((g) => (
                  <Badge
                    key={g.grade}
                    variant="outline"
                    className="bg-white text-rose-800 border-rose-300 text-[11px] font-semibold"
                  >
                    {g.grade} ({g.count} cuộn)
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          {onGoToRulesSkin && (
            <Button
              type="button"
              size="sm"
              onClick={onGoToRulesSkin}
              className="h-8 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0"
            >
              Mở Rules_SKIN để phân nhóm
            </Button>
          )}
        </div>
      )}

      {/* MAIN CONTENT AREA: Table (left) + Matrix Panel (right) */}
      <div className="flex flex-col xl:flex-row gap-3 items-start">
        {/* LEFT: Virtual Table */}
        <div className="flex-1 min-w-0 w-full">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 rounded-xl border border-slate-200 bg-white">
              <FileSpreadsheet size={32} className="text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Chưa có dữ liệu Kế hoạch</p>
              <p className="mt-1 text-slate-500">
                Bấm nút <strong>"Chạy Kế hoạch Skin"</strong> ở trên để tự động phân bổ cuộn từ SKIN_HRC2 vào các Plan Skin 2 và Skin 4.
              </p>
            </div>
          ) : (
            <SkinVirtualTable
              activeSheet="KE_HOACH"
              columns={KE_HOACH_COLUMNS}
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
              onRowClick={handleRowClick}
              renderCustomCell={renderCustomCell}
              onCopySelectedIds={onCopySelectedIds}
              idColumnName={idColumnName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
