import React, { useState } from 'react';
import {
  Calendar,
  Copy,
  Zap,
  RefreshCw,
  X,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import SkinVirtualTable from '../../../components/SkinVirtualTable';
import { SKIN_HRC2_COLUMNS, getTodayFormatted } from '../skinConstants';
import { successToast, errorToast } from '../../../utils/toast';

const getTomorrowFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

export default function SkinHrc2Sheet({
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
  showHrc2DatePanel,
  setShowHrc2DatePanel,
  hrc2SelectedDate,
  setHrc2SelectedDate,
  hrc2PlannedCoils,
  hrc2DistinctDates,
  loadingHrc2Coils,
  fetchHrc2CoilsByDate,
  onOpenBatchDateAssignModal,
  onDirectAssignDate,
  assigningDirect,
}) {
  const [hrc2PanelTab, setHrc2PanelTab] = useState('view'); // 'view' | 'assign'
  const [hrc2DirectAssignDate, setHrc2DirectAssignDate] = useState(getTodayFormatted());
  const [hrc2DirectAssignText, setHrc2DirectAssignText] = useState('');

  const handleCopyHrc2PlannedColumn = () => {
    if (!hrc2PlannedCoils.length) {
      errorToast('Không có cuộn nào để copy');
      return;
    }
    const text = hrc2PlannedCoils.join('\r\n');
    navigator.clipboard.writeText(text);
    successToast(`Đã copy ${hrc2PlannedCoils.length} cuộn (dạng 1 cột Excel)!`);
  };

  const handleCopyHrc2PlannedTextjoin = () => {
    if (!hrc2PlannedCoils.length) {
      errorToast('Không có cuộn nào để copy');
      return;
    }
    const text = hrc2PlannedCoils.join(' ');
    navigator.clipboard.writeText(text);
    successToast(`Đã copy ${hrc2PlannedCoils.length} cuộn dạng TEXTJOIN (cách nhau ' ')!`);
  };

  const handleExecuteDirectAssign = async () => {
    if (!hrc2DirectAssignText.trim()) {
      errorToast('Vui lòng dán danh sách mã cuộn cần gán');
      return;
    }
    const success = await onDirectAssignDate(hrc2DirectAssignDate, hrc2DirectAssignText);
    if (success) {
      setHrc2DirectAssignText('');
      setHrc2PanelTab('view');
    }
  };

  const renderCustomCell = (row, col, val) => {
    if (col === 'Kế hoạch') {
      return (
        <span
          className={`font-semibold cursor-pointer ${
            val ? 'text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded' : 'text-slate-300'
          }`}
          title="Nhấp đúp chuột để chỉnh sửa giá trị (dd/mm hoặc chữ bất kỳ)"
        >
          {String(val || '—')}
        </span>
      );
    }
    if (col === 'Chỉ định Skin') {
      return (
        <span
          className={`font-bold ${
            String(val || '').toLowerCase().includes('skin 2')
              ? 'text-sky-700'
              : String(val || '').toLowerCase().includes('skin 4')
              ? 'text-rose-700'
              : 'text-slate-700'
          }`}
        >
          {String(val ?? '')}
        </span>
      );
    }
    return <span>{String(val ?? '')}</span>;
  };

  return (
    <div className="flex flex-col gap-3">
      {/* TOOLBAR FOR SKIN_HRC2 */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Date Panel Button */}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = !showHrc2DatePanel;
              setShowHrc2DatePanel(next);
              if (next && hrc2SelectedDate) {
                fetchHrc2CoilsByDate(hrc2SelectedDate);
              }
            }}
            className={`h-8 rounded-lg text-xs font-bold px-3 flex items-center gap-1.5 transition-all cursor-pointer ${
              showHrc2DatePanel
                ? 'bg-[#0e5374] text-white border-[#0e5374] shadow-xs'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Mở bảng tra cứu và sao chép cuộn theo ngày kế hoạch (giới hạn 1000 cuộn)"
          >
            <Calendar size={13} className={showHrc2DatePanel ? "text-white" : "text-[#0e5374]"} />
            <span>Kế hoạch theo ngày (1000 cuộn)</span>
          </Button>

          {/* Batch Date Assign Modal Trigger */}
          <Button
            type="button"
            variant="outline"
            onClick={onOpenBatchDateAssignModal}
            className="h-8 rounded-lg border-sky-300 text-sky-800 hover:bg-sky-50 text-xs font-bold px-2.5 flex items-center gap-1.5"
            title="Gán Kế hoạch theo ngày hoặc chữ cho các dòng được tick chọn"
          >
            <Sparkles size={13} className="text-sky-600" /> Gán ngày ({selectedRowIds.size} dòng chọn)
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT AREA: Table (left) + Date Panel (right) */}
      <div className="flex flex-col xl:flex-row gap-3 items-start">
        {/* LEFT: Virtual Table */}
        <div className="flex-1 min-w-0 w-full">
          <SkinVirtualTable
            activeSheet="SKIN_HRC2"
            columns={SKIN_HRC2_COLUMNS}
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
            renderCustomCell={renderCustomCell}
            onCopySelectedIds={onCopySelectedIds}
            idColumnName={idColumnName}
          />
        </div>

        {/* RIGHT: Date Picker & Coil Copy Panel */}
        {showHrc2DatePanel && (
          <div className="w-full xl:w-[300px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden animate-in fade-in">
            {/* Header Control Panel with Tabs */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Calendar size={13} className="text-[#0e5374]" />
                  <span>Kế hoạch theo ngày</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowHrc2DatePanel(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                  title="Đóng bảng"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Tab Selector: Xem cuộn vs Gán ID & Nhảy ngày */}
              <div className="flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setHrc2PanelTab('view')}
                  className={`flex-1 py-1 rounded-md transition-all ${
                    hrc2PanelTab === 'view'
                      ? 'bg-white text-[#0e5374] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bảng cuộn ({hrc2PlannedCoils.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHrc2PanelTab('assign')}
                  className={`flex-1 py-1 rounded-md transition-all flex items-center justify-center gap-1 ${
                    hrc2PanelTab === 'assign'
                      ? 'bg-[#0e5374] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Zap size={11} /> Gán ID &amp; Nhảy ngày
                </button>
              </div>

              {hrc2PanelTab === 'view' ? (
                <>
                  {/* Date Selector & Refresh */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={hrc2SelectedDate}
                      onChange={(e) => {
                        const d = e.target.value;
                        setHrc2SelectedDate(d);
                        fetchHrc2CoilsByDate(d);
                      }}
                      className="h-7 text-xs font-bold rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0e5374] flex-1 truncate cursor-pointer"
                      title="Chọn ngày kế hoạch để lọc cuộn"
                    >
                      <option value="">-- Tất cả cuộn có KH --</option>
                      {hrc2DistinctDates.map((d, idx) => (
                        <option key={idx} value={typeof d === 'object' ? d.date : d}>
                          Ngày {typeof d === 'object' ? `${d.date} (${d.count}c)` : d}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fetchHrc2CoilsByDate(hrc2SelectedDate)}
                      disabled={loadingHrc2Coils}
                      className="h-7 w-7 p-0 rounded-lg border-slate-300 text-slate-600 hover:bg-slate-100 shrink-0"
                      title="Tải lại danh sách cuộn"
                    >
                      <RefreshCw size={12} className={loadingHrc2Coils ? "animate-spin" : ""} />
                    </Button>
                  </div>

                  {/* Quick Date Presets */}
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-slate-400 font-medium">Nhanh:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const t = getTodayFormatted();
                        setHrc2SelectedDate(t);
                        fetchHrc2CoilsByDate(t);
                      }}
                      className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 font-semibold cursor-pointer"
                    >
                      Hôm nay ({getTodayFormatted()})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tm = getTomorrowFormatted();
                        setHrc2SelectedDate(tm);
                        fetchHrc2CoilsByDate(tm);
                      }}
                      className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 font-semibold cursor-pointer"
                    >
                      Ngày mai ({getTomorrowFormatted()})
                    </button>
                  </div>

                  {/* Custom Date / Text Input */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="text"
                      placeholder="Tìm ngày dd/mm hoặc chữ..."
                      value={hrc2SelectedDate}
                      onChange={(e) => setHrc2SelectedDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          fetchHrc2CoilsByDate(hrc2SelectedDate);
                        }
                      }}
                      className="h-6 text-[11px] font-mono px-2 py-0"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fetchHrc2CoilsByDate(hrc2SelectedDate)}
                      disabled={loadingHrc2Coils}
                      className="h-6 px-2 text-[10px] font-bold bg-[#0e5374] hover:bg-[#0b435e] text-white rounded shrink-0 cursor-pointer"
                    >
                      Lọc
                    </Button>
                  </div>

                  {/* 2 Main Quick Copy Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyHrc2PlannedColumn}
                      disabled={!hrc2PlannedCoils.length}
                      className="h-7 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-1 shadow-2xs"
                      title="Copy cả cột xuống dòng (\n) để dán trực tiếp vào cột Excel"
                    >
                      <Copy size={11} /> Copy 1 cột
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyHrc2PlannedTextjoin}
                      disabled={!hrc2PlannedCoils.length}
                      className="h-7 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center justify-center gap-1 shadow-2xs"
                      title="Copy phân cách dấu cách (=TEXTJOIN(' ', TRUE, ...)) để tra cứu MES"
                    >
                      <Zap size={11} /> Textjoin (cách)
                    </Button>
                  </div>
                </>
              ) : (
                /* TAB GÁN ID & TỰ ĐỘNG NHẢY NGÀY DÔ CỘT KẾ HOẠCH */
                <div className="flex flex-col gap-2 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                      1. Nhập Kế hoạch (dd/mm hoặc chữ/ký tự bất kỳ):
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        type="text"
                        value={hrc2DirectAssignDate}
                        onChange={(e) => setHrc2DirectAssignDate(e.target.value)}
                        placeholder="dd/mm hoặc chữ (vd: 09/11, Chờ xử lý...)"
                        className="h-7 text-xs font-bold font-mono px-2 py-0 border-slate-300 focus:border-[#0e5374] bg-white flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setHrc2DirectAssignDate(getTodayFormatted())}
                        className="px-1.5 py-1 text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200 rounded hover:bg-sky-100"
                        title="Dùng ngày hôm nay"
                      >
                        Hôm nay
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-[11px] font-bold text-slate-700">
                        2. Dán danh sách ID Cuộn (Tối đa 1.000 cuộn):
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">
                        {hrc2DirectAssignText.split(/[\r\n\t, ]+/).filter(Boolean).length}/1000
                      </span>
                    </div>
                    <Textarea
                      value={hrc2DirectAssignText}
                      onChange={(e) => setHrc2DirectAssignText(e.target.value)}
                      placeholder="Dán mã cuộn vào đây (cách nhau bởi xuống dòng, dấu cách hoặc phẩy)&#10;Ví dụ:&#10;KA026450362&#10;KA026450346&#10;EA026450241"
                      rows={5}
                      className="text-xs font-mono border-slate-300 focus:border-[#0e5374] resize-none"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleExecuteDirectAssign}
                    disabled={assigningDirect || !hrc2DirectAssignText.trim()}
                    className="h-8 bg-[#0e5374] hover:bg-[#0b435e] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    {assigningDirect ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>Gán kế hoạch ngay</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Coil List in View Mode matching Screenshot 3 */}
            {hrc2PanelTab === 'view' && (
              <>
                {/* Table Header: Chọn ngày (dd/mm) */}
                <div className="bg-[#0e5374] text-white text-center py-2 px-3 border-b border-[#0b435e] select-none">
                  <span className="font-bold text-xs tracking-wide block">Chọn ngày (dd/mm)</span>
                  {hrc2SelectedDate && (
                    <span className="text-[10px] text-sky-200 font-mono block mt-0.5">
                      {hrc2SelectedDate} • {hrc2PlannedCoils.length} cuộn
                    </span>
                  )}
                </div>

                {/* Coils Table */}
                <div className="flex-1 overflow-auto max-h-[55vh] border-b border-slate-100 bg-white">
                  {loadingHrc2Coils ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#0e5374]" />
                      <span>Đang tải danh sách cuộn...</span>
                    </div>
                  ) : hrc2PlannedCoils.length > 0 ? (
                    <table className="w-full text-center text-xs border-collapse font-mono select-text">
                      <tbody className="divide-y divide-slate-100">
                        {hrc2PlannedCoils.map((cid, idx) => (
                          <tr
                            key={idx}
                            onClick={() => {
                              navigator.clipboard.writeText(cid);
                              successToast(`Đã copy mã: ${cid}`);
                            }}
                            className="hover:bg-sky-50/70 cursor-pointer transition-colors"
                            title="Click để copy mã cuộn này"
                          >
                            <td className="py-1 px-3 text-slate-700 font-medium hover:text-[#0e5374] border-r border-slate-100">
                              {cid}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                      <ClipboardList size={24} className="text-slate-300" />
                      <span>Không có cuộn nào</span>
                      <span className="text-[10px] text-slate-400">
                        {hrc2SelectedDate ? `Không tìm thấy cuộn nào có ngày ${hrc2SelectedDate}` : 'Chưa có cuộn nào được lập kế hoạch'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Count & Quick Copy */}
                <div className="p-2 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{hrc2PlannedCoils.length} / 1.000 cuộn</span>
                  {hrc2PlannedCoils.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyHrc2PlannedColumn}
                      className="text-[#0e5374] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={10} /> Copy
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
