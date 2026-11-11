import React, { useState } from 'react';
import {
  ClipboardPaste,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function GetDataPoModal({
  isOpen,
  onClose,
  poType = 'skin', // 'skin' | 'hsm'
  onConfirmCollect,
  collecting,
}) {
  const [poRawText, setPoRawText] = useState('');
  const [clearFirst, setClearFirst] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!poRawText.trim()) return;
    onConfirmCollect(poType, poRawText, clearFirst);
    setPoRawText('');
  };

  const lineCount = poRawText.split(/\r?\n/).filter((l) => l.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <ClipboardPaste size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {poType === 'skin' ? 'Điền PO Skin vào đây' : 'Điền PO HSM vào đây'}
              </h3>
              <p className="text-xs text-slate-500">
                {poType === 'skin'
                  ? 'Tự động truy xuất 11 cột: Tháng, Đợt, KH, PO_HSM, PO_SPM, Tên gọi_HSM, Tên gọi_SPM, CW, KH_Loại 1, Mục đích sử dụng'
                  : 'Tự động truy xuất 9 cột: Tháng, Đợt, KH, PO_HSM, Tên gọi_HSM, CW, KH_Loại 1, Mục đích sử dụng'}
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Dán danh sách PO (mỗi dòng 1 mã PO):
              </label>
              <span className="text-xs font-mono text-emerald-600 font-semibold">
                {lineCount} PO nhận diện
              </span>
            </div>
            <textarea
              rows={8}
              value={poRawText}
              onChange={(e) => setPoRawText(e.target.value)}
              placeholder={'Dán các mã PO vào đây...\nVí dụ:\nPO240101\nPO240102\nPO240103'}
              className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-y bg-slate-50/50"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="clearFirstGetDataPo"
                checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="clearFirstGetDataPo" className="text-xs text-slate-600 font-medium cursor-pointer">
                Xóa dữ liệu cũ của sheet trước khi nạp
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              * Hệ thống sẽ tự động tra cứu dữ liệu từ file Theo dõi đơn hàng NM.HRC2 (SharePoint / cache PO) và chuyển đổi tên gọi theo quy tắc chuẩn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            disabled={collecting}
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-slate-700"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={collecting || !poRawText.trim()}
            onClick={handleConfirm}
            className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            {collecting ? (
              <>
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                Đang truy xuất dữ liệu...
              </>
            ) : (
              <>
                <ClipboardPaste size={14} className="mr-1.5" />
                Thu thập dữ liệu
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
