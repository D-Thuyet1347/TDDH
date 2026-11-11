import React, { useState } from 'react';
import { Columns, LoaderCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function ColumnPasteModal({
  isOpen,
  onClose,
  activeSheet,
  columns = [],
  onConfirmPasteColumn,
  pasting,
}) {
  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '');
  const [pasteColumnRawText, setPasteColumnRawText] = useState('');

  if (!isOpen) return null;

  const currentSelected = selectedColumn || columns[0] || '';
  const lines = pasteColumnRawText.split(/\r?\n/).filter((l) => l.trim());

  const handleConfirm = () => {
    if (!pasteColumnRawText.trim()) return;
    onConfirmPasteColumn(currentSelected, pasteColumnRawText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-teal-50 via-cyan-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
              <Columns size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Dán dữ liệu theo cột — Sheet {activeSheet}
              </h3>
              <p className="text-xs text-slate-500">
                Chọn cột đích và dán dữ liệu copy từ 1 cột Excel (xuống dòng theo từng hàng)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Select Column */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              1. Chọn cột cần dán dữ liệu:
            </label>
            <select
              value={currentSelected}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  Cột: {col}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                2. Dán dữ liệu (copy 1 cột từ Excel và Ctrl + V vào đây):
              </label>
              <span className="text-xs font-mono text-teal-600 font-semibold">
                {lines.length} giá trị nhận diện
              </span>
            </div>
            <textarea
              rows={8}
              value={pasteColumnRawText}
              onChange={(e) => setPasteColumnRawText(e.target.value)}
              placeholder={'Dán các giá trị từ Excel vào đây...\nVí dụ:\nPO_HSM_001\nPO_HSM_002\nPO_HSM_003'}
              className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none resize-y bg-slate-50/50"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Mỗi dòng là 1 giá trị tương ứng từ hàng 1 trở đi. Nếu sheet chưa có đủ số hàng, hệ thống sẽ tự động bổ sung hàng mới.
            </p>
          </div>

          {/* Preview */}
          {pasteColumnRawText.trim() && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                3. Xem trước 10 giá trị đầu tiên:
              </label>
              <div className="max-h-36 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs">
                {lines.slice(0, 10).map((val, idx) => (
                  <div key={idx} className="flex items-center gap-2 py-0.5 border-b border-slate-100 last:border-b-0 text-slate-600">
                    <span className="w-8 text-slate-400 font-sans text-[11px]">#{idx + 1}</span>
                    <span className="font-semibold text-slate-800">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 bg-slate-50">
          <div className="text-xs text-slate-500">
            Dán vào cột <strong className="text-teal-700">{currentSelected}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pasting}
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-slate-700"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={pasting || !pasteColumnRawText.trim()}
              onClick={handleConfirm}
              className="h-9 px-5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20"
            >
              {pasting ? (
                <>
                  <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                  Đang dán...
                </>
              ) : (
                'Xác nhận dán'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
