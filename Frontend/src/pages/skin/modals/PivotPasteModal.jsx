import React, { useState } from 'react';
import {
  ClipboardPaste,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function PivotPasteModal({
  isOpen,
  onClose,
  targetBlock = 'coil', // 'coil' | 'po' | 'priority'
  onConfirmSave,
  saving,
}) {
  const [pasteRawText, setPasteRawText] = useState('');
  const [clearFirst, setClearFirst] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!pasteRawText.trim()) return;
    onConfirmSave(targetBlock, pasteRawText, clearFirst);
    setPasteRawText('');
  };

  const getTitle = () => {
    if (targetBlock === 'coil') return 'Dán dữ liệu: Yêu cầu đặc biệt theo ID cuộn';
    if (targetBlock === 'po') return 'Dán dữ liệu: Yêu cầu đặc biệt theo PO';
    return 'Dán dữ liệu: Ưu tiên đơn hàng';
  };

  const getSubtitle = () => {
    if (targetBlock === 'coil') return 'Định dạng 2 cột: ID Cuộn [TAB] Yêu cầu đặc biệt';
    if (targetBlock === 'po') return 'Định dạng 2 cột: PO [TAB] Yêu cầu đặc biệt';
    return 'Định dạng 2 cột: PO / ID cuộn [TAB] Mức ưu tiên';
  };

  const lineCount = pasteRawText.split(/\r?\n/).filter((l) => l.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <ClipboardPaste size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">{getTitle()}</h3>
              <p className="text-xs text-slate-500">{getSubtitle()}</p>
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Dán dữ liệu từ Excel (Ctrl + V):
              </label>
              <span className="text-xs font-mono text-blue-600 font-semibold">
                {lineCount} dòng nhận diện
              </span>
            </div>
            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder={'Dán 2 cột từ Excel vào đây...\nVí dụ:\n24011501\tSkin bóng cao\n24011502\tCắt mẫu thử nghiệm'}
              className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y bg-slate-50/50"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="clearFirstPivot"
                checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="clearFirstPivot" className="text-xs text-slate-600 font-medium cursor-pointer">
                Xóa dữ liệu cũ của bảng này trước khi dán
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-slate-700"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={saving || !pasteRawText.trim()}
            onClick={handleConfirm}
            className="h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
          >
            {saving ? (
              <>
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                Đang lưu vào bảng...
              </>
            ) : (
              <>
                <ClipboardPaste size={14} className="mr-1.5" />
                Xác nhận lưu
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
