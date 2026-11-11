import React, { useState, useMemo } from 'react';
import {
  Play,
  Download,
  Copy,
  RefreshCw,
  LoaderCircle,
  FileSpreadsheet,
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
  skin2Target,
  setSkin2Target,
  skin4Target,
  setSkin4Target,
  runningKeHoach,
  onRunKeHoach,
  keHoachMatrixData,
  loadingKeHoachMatrix,
  onRefreshMatrix,
}) {
  const [selectedKeHoachPairIdx, setSelectedKeHoachPairIdx] = useState(0);
  const [textjoinDelimiter, setTextjoinDelimiter] = useState(' ');

  const currentMatrixPair = useMemo(() => {
    if (!keHoachMatrixData?.matrix_pairs?.length) return null;
    const idx = Math.min(Math.max(0, selectedKeHoachPairIdx), keHoachMatrixData.matrix_pairs.length - 1);
    return keHoachMatrixData.matrix_pairs[idx] || null;
  }, [keHoachMatrixData, selectedKeHoachPairIdx]);

  const handleQuickCopyText = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    successToast(`Đã copy TEXTJOIN của ${label}!`);
  };

  const handleQuickCopyCell = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    successToast(`Đã copy mã cuộn: ${text}`);
  };

  const handleCopyMatrixCol = (pair, colKey, label) => {
    if (!pair?.grid_rows?.length) return;
    const items = pair.grid_rows.map(r => r[colKey]).filter(Boolean);
    if (!items.length) {
      errorToast(`Không có cuộn nào trong cột ${label}`);
      return;
    }
    const text = items.join(textjoinDelimiter === '\\n' ? '\r\n' : textjoinDelimiter);
    navigator.clipboard.writeText(text);
    successToast(`Đã copy ${items.length} cuộn của cột ${label}!`);
  };

  const handleCopyMatrixAll = (pair) => {
    if (!pair?.grid_rows?.length) return;
    const headers = [
      `1.Skin 2 (${pair.skin2_p1_id || ''})`,
      `2.Skin 2 (${pair.skin2_p2_id || ''})`,
      `1.Skin 4 (${pair.skin4_p1_id || ''})`,
      `2.Skin 4 (${pair.skin4_p2_id || ''})`,
    ];
    const topRow = [
      pair.top_row?.s1_2 || '',
      pair.top_row?.s2_2 || '',
      pair.top_row?.s1_4 || '',
      pair.top_row?.s2_4 || '',
    ];
    const lines = [
      topRow.join('\t'),
      headers.join('\t'),
      ...pair.grid_rows.map(r => [r.s1_2 || '', r.s2_2 || '', r.s1_4 || '', r.s2_4 || ''].join('\t'))
    ];
    navigator.clipboard.writeText(lines.join('\r\n'));
    successToast(`Đã copy toàn bộ 4 cột ma trận của ${pair.pair_title}!`);
  };

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
              onChange={(e) => setSkin2Target(Math.max(40, parseInt(e.target.value) || 40))}
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
              onChange={(e) => setSkin4Target(Math.max(40, parseInt(e.target.value) || 40))}
              className="w-14 h-6 text-center font-bold text-xs bg-yellow-200 border border-yellow-400 rounded focus:outline-none focus:ring-1 focus:ring-yellow-500"
              title="Số lượng cuộn mục tiêu cho 1 Plan của Skin 4 (Mặc định 50, tối thiểu 40)"
            />
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
            />
          )}
        </div>

        {/* RIGHT: 4-Column Matrix Sidebar matching Screenshots */}
        {rows.length > 0 && (
          <div className="w-full xl:w-[500px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
            {/* Header */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-800">Ma trận cuộn Plan (2 Skin)</span>
                  {currentMatrixPair && (
                    <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-mono text-[11px] font-bold">
                      {currentMatrixPair.pair_title}
                    </Badge>
                  )}
                </div>
                {currentMatrixPair && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopyMatrixAll(currentMatrixPair)}
                    className="h-7 text-[11px] bg-slate-800 hover:bg-slate-700 text-white font-bold px-2.5 rounded-lg flex items-center gap-1 shadow-2xs"
                    title="Sao chép toàn bộ 4 cột ma trận (Tab-separated để dán trực tiếp vào Excel)"
                  >
                    <Copy size={12} /> Copy 4 cột
                  </Button>
                )}
              </div>

              {/* Plan pair switcher / selector */}
              {keHoachMatrixData?.matrix_pairs?.length > 1 && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Chọn bộ Plan:</label>
                  <select
                    value={selectedKeHoachPairIdx}
                    onChange={(e) => setSelectedKeHoachPairIdx(Number(e.target.value))}
                    className="h-7 text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 flex-1 truncate cursor-pointer"
                  >
                    {keHoachMatrixData.matrix_pairs.map((pair, idx) => (
                      <option key={idx} value={idx}>
                        {pair.pair_title} ({pair.skin2_coils_count + pair.skin4_coils_count} cuộn)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Plan Checkbox list in Col H & I matching Screenshot */}
              {keHoachMatrixData?.plans_list?.length > 0 && (
                <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold px-0.5">
                    <span>Cột H &amp; I: Danh sách Plan ID (Click để xem / copy)</span>
                    <span>{keHoachMatrixData.plans_list.length} Plans</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-white border border-slate-200/70 rounded-lg">
                    {keHoachMatrixData.plans_list.map((pItem, pIdx) => {
                      const isSelected = currentMatrixPair?.selected_plan_ids?.includes(pItem.id);
                      return (
                        <div
                          key={pIdx}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border font-mono transition-colors ${
                            isSelected
                              ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold shadow-2xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span
                            onClick={() => {
                              const foundIdx = keHoachMatrixData.matrix_pairs.findIndex(pr =>
                                pr.selected_plan_ids?.includes(pItem.id)
                              );
                              if (foundIdx !== -1) setSelectedKeHoachPairIdx(foundIdx);
                            }}
                            className="cursor-pointer flex items-center gap-1"
                            title="Click để chuyển ma trận đến bộ chứa Plan này"
                          >
                            <span className={isSelected ? "text-amber-800 font-bold" : "text-slate-400"}>
                              {isSelected ? "☑" : "☐"}
                            </span>
                            <span>{pItem.id}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyPlanByPlanId(pItem.id)}
                            className="hover:opacity-80 text-slate-500 hover:text-slate-800 p-0.5 ml-0.5"
                            title={`Copy 50 cuộn của ${pItem.id}`}
                          >
                            <Copy size={9} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TEXTJOIN Quick Copy Bar (Copy 1 lần 50 cuộn) */}
              {currentMatrixPair && (
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200/90 bg-amber-50/50 p-2 rounded-lg mt-0.5">
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Copy size={12} className="text-amber-700" /> Copy 1 lần 50 cuộn (Textjoin):
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyPlanCoils('s1_2')}
                      className="h-7 text-xs bg-sky-700 hover:bg-sky-600 text-white font-bold px-2 rounded-lg flex items-center justify-center gap-1 shadow-2xs truncate"
                      title={`Copy 50 cuộn của 1.Skin 2 (${currentMatrixPair.skin2_p1_id}) dạng TEXTJOIN`}
                    >
                      <Copy size={11} />
                      <span className="truncate">1.Skin 2 ({currentMatrixPair.skin2_p1_id || '—'})</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyPlanCoils('s2_2')}
                      className="h-7 text-xs bg-sky-600 hover:bg-sky-500 text-white font-bold px-2 rounded-lg flex items-center justify-center gap-1 shadow-2xs truncate"
                      title={`Copy 50 cuộn của 2.Skin 2 (${currentMatrixPair.skin2_p2_id}) dạng TEXTJOIN`}
                    >
                      <Copy size={11} />
                      <span className="truncate">2.Skin 2 ({currentMatrixPair.skin2_p2_id || '—'})</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyPlanCoils('s1_4')}
                      className="h-7 text-xs bg-rose-700 hover:bg-rose-600 text-white font-bold px-2 rounded-lg flex items-center justify-center gap-1 shadow-2xs truncate"
                      title={`Copy 50 cuộn của 1.Skin 4 (${currentMatrixPair.skin4_p1_id}) dạng TEXTJOIN`}
                    >
                      <Copy size={11} />
                      <span className="truncate">1.Skin 4 ({currentMatrixPair.skin4_p1_id || '—'})</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyPlanCoils('s2_4')}
                      className="h-7 text-xs bg-rose-600 hover:bg-rose-500 text-white font-bold px-2 rounded-lg flex items-center justify-center gap-1 shadow-2xs truncate"
                      title={`Copy 50 cuộn của 2.Skin 4 (${currentMatrixPair.skin4_p2_id}) dạng TEXTJOIN`}
                    >
                      <Copy size={11} />
                      <span className="truncate">2.Skin 4 ({currentMatrixPair.skin4_p2_id || '—'})</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleCopyPlanCoils('all')}
                      className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Copy toàn bộ cuộn của cả 4 Plan trong bộ"
                    >
                      <Copy size={10} /> Copy cả 4 Plan ({currentMatrixPair.skin2_coils_count + currentMatrixPair.skin4_coils_count} cuộn)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopyMatrixAll(currentMatrixPair)}
                      className="text-slate-600 hover:text-slate-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      title="Copy dạng 4 cột chuẩn Excel"
                    >
                      <Copy size={10} /> Copy 4 cột ma trận (Excel)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Matrix Table */}
            <div className="flex-1 overflow-auto max-h-[60vh] border-b border-slate-100">
              <table className="w-full text-center text-xs border-collapse font-mono select-text">
                <thead className="sticky top-0 z-10 shadow-xs">
                  {/* Row 1: Yellow cells showing TEXTJOIN string */}
                  <tr className="bg-yellow-300 border-b border-yellow-400 font-bold text-amber-950">
                    <th
                      className="py-2 px-1 border-r border-yellow-400 truncate w-1/4 text-[11px] cursor-pointer hover:bg-yellow-200 transition-colors group"
                      title={`Bấm để copy 50 cuộn chuẩn TEXTJOIN(" ", TRUE, ...):\n${currentMatrixPair?.top_row?.s1_2 || ''}`}
                      onClick={() => currentMatrixPair?.top_row?.s1_2 && handleQuickCopyText(currentMatrixPair.top_row.s1_2, `1.Skin 2 (${currentMatrixPair.skin2_p1_id || ''})`)}
                    >
                      <div className="flex items-center justify-between px-1 gap-1">
                        <span className="truncate">{currentMatrixPair?.top_row?.s1_2 || '—'}</span>
                        <Copy size={10} className="shrink-0 text-amber-900 opacity-60 group-hover:opacity-100" />
                      </div>
                    </th>
                    <th
                      className="py-2 px-1 border-r border-yellow-400 truncate w-1/4 text-[11px] cursor-pointer hover:bg-yellow-200 transition-colors group"
                      title={`Bấm để copy 50 cuộn chuẩn TEXTJOIN(" ", TRUE, ...):\n${currentMatrixPair?.top_row?.s2_2 || ''}`}
                      onClick={() => currentMatrixPair?.top_row?.s2_2 && handleQuickCopyText(currentMatrixPair.top_row.s2_2, `2.Skin 2 (${currentMatrixPair.skin2_p2_id || ''})`)}
                    >
                      <div className="flex items-center justify-between px-1 gap-1">
                        <span className="truncate">{currentMatrixPair?.top_row?.s2_2 || '—'}</span>
                        <Copy size={10} className="shrink-0 text-amber-900 opacity-60 group-hover:opacity-100" />
                      </div>
                    </th>
                    <th
                      className="py-2 px-1 border-r border-yellow-400 truncate w-1/4 text-[11px] cursor-pointer hover:bg-yellow-200 transition-colors group"
                      title={`Bấm để copy 50 cuộn chuẩn TEXTJOIN(" ", TRUE, ...):\n${currentMatrixPair?.top_row?.s1_4 || ''}`}
                      onClick={() => currentMatrixPair?.top_row?.s1_4 && handleQuickCopyText(currentMatrixPair.top_row.s1_4, `1.Skin 4 (${currentMatrixPair.skin4_p1_id || ''})`)}
                    >
                      <div className="flex items-center justify-between px-1 gap-1">
                        <span className="truncate">{currentMatrixPair?.top_row?.s1_4 || '—'}</span>
                        <Copy size={10} className="shrink-0 text-amber-900 opacity-60 group-hover:opacity-100" />
                      </div>
                    </th>
                    <th
                      className="py-2 px-1 truncate w-1/4 text-[11px] cursor-pointer hover:bg-yellow-200 transition-colors group"
                      title={`Bấm để copy 50 cuộn chuẩn TEXTJOIN(" ", TRUE, ...):\n${currentMatrixPair?.top_row?.s2_4 || ''}`}
                      onClick={() => currentMatrixPair?.top_row?.s2_4 && handleQuickCopyText(currentMatrixPair.top_row.s2_4, `2.Skin 4 (${currentMatrixPair.skin4_p2_id || ''})`)}
                    >
                      <div className="flex items-center justify-between px-1 gap-1">
                        <span className="truncate">{currentMatrixPair?.top_row?.s2_4 || '—'}</span>
                        <Copy size={10} className="shrink-0 text-amber-900 opacity-60 group-hover:opacity-100" />
                      </div>
                    </th>
                  </tr>

                  {/* Row 2: Sub-column Headers */}
                  <tr className="font-bold text-white text-[11px] select-none">
                    <th className="py-1.5 px-1 bg-sky-600 border-r border-sky-700 w-1/4">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <span>1.Skin 2</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMatrixCol(currentMatrixPair, 's1_2', `1.Skin 2 (${currentMatrixPair?.skin2_p1_id || ''})`)}
                            title="Copy cột 1.Skin 2"
                            className="hover:opacity-80 p-0.5"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        {currentMatrixPair?.skin2_p1_id && (
                          <span className="text-[10px] font-mono text-sky-200 font-semibold">{currentMatrixPair.skin2_p1_id}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-1.5 px-1 bg-sky-600 border-r border-sky-700 w-1/4">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <span>2.Skin 2</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMatrixCol(currentMatrixPair, 's2_2', `2.Skin 2 (${currentMatrixPair?.skin2_p2_id || ''})`)}
                            title="Copy cột 2.Skin 2"
                            className="hover:opacity-80 p-0.5"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        {currentMatrixPair?.skin2_p2_id && (
                          <span className="text-[10px] font-mono text-sky-200 font-semibold">{currentMatrixPair.skin2_p2_id}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-1.5 px-1 bg-rose-600 border-r border-rose-700 w-1/4">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <span>1.Skin 4</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMatrixCol(currentMatrixPair, 's1_4', `1.Skin 4 (${currentMatrixPair?.skin4_p1_id || ''})`)}
                            title="Copy cột 1.Skin 4"
                            className="hover:opacity-80 p-0.5"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        {currentMatrixPair?.skin4_p1_id && (
                          <span className="text-[10px] font-mono text-rose-200 font-semibold">{currentMatrixPair.skin4_p1_id}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-1.5 px-1 bg-rose-600 w-1/4">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <span>2.Skin 4</span>
                          <button
                            type="button"
                            onClick={() => handleCopyMatrixCol(currentMatrixPair, 's2_4', `2.Skin 4 (${currentMatrixPair?.skin4_p2_id || ''})`)}
                            title="Copy cột 2.Skin 4"
                            className="hover:opacity-80 p-0.5"
                          >
                            <Copy size={10} />
                          </button>
                        </div>
                        {currentMatrixPair?.skin4_p2_id && (
                          <span className="text-[10px] font-mono text-rose-200 font-semibold">{currentMatrixPair.skin4_p2_id}</span>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentMatrixPair?.grid_rows?.length ? (
                    currentMatrixPair.grid_rows.map((grow, gIdx) => (
                      <tr key={gIdx} className="hover:bg-slate-50 transition-colors">
                        <td
                          className="py-1 px-1 border-r border-slate-100 text-sky-950 hover:bg-sky-50 cursor-pointer font-bold"
                          onClick={() => grow.s1_2 && handleQuickCopyCell(grow.s1_2)}
                          title="Bấm để copy ID cuộn"
                        >
                          {grow.s1_2 || ''}
                        </td>
                        <td
                          className="py-1 px-1 border-r border-slate-100 text-sky-950 hover:bg-sky-50 cursor-pointer font-bold"
                          onClick={() => grow.s2_2 && handleQuickCopyCell(grow.s2_2)}
                          title="Bấm để copy ID cuộn"
                        >
                          {grow.s2_2 || ''}
                        </td>
                        <td
                          className="py-1 px-1 border-r border-slate-100 text-rose-950 hover:bg-rose-50 cursor-pointer font-bold"
                          onClick={() => grow.s1_4 && handleQuickCopyCell(grow.s1_4)}
                          title="Bấm để copy ID cuộn"
                        >
                          {grow.s1_4 || ''}
                        </td>
                        <td
                          className="py-1 px-1 text-rose-950 hover:bg-rose-50 cursor-pointer font-bold"
                          onClick={() => grow.s2_4 && handleQuickCopyCell(grow.s2_4)}
                          title="Bấm để copy ID cuộn"
                        >
                          {grow.s2_4 || ''}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-sans text-xs">
                        {loadingKeHoachMatrix ? 'Đang tải ma trận...' : 'Chưa có cuộn nào trong Plan này'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer info */}
            <div className="p-2 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
              <span>{currentMatrixPair?.grid_rows?.length || 0} hàng cuộn</span>
              <span className="text-[10px] text-slate-400">Click mã cuộn hoặc ô vàng để copy</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
