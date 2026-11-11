import React, { useState, useRef } from 'react';
import {
  Database,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Upload,
  ClipboardPaste,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

export const HANG_VOT_SHAREPOINT_URL =
  "https://hoaphatcomvn-my.sharepoint.com/:x:/g/personal/nguyenvanthuc5_hoaphat_com_vn/IQDPX3Im9eftR4SWQZ2Ztyg3Ae4j-SCH9wqr9kjOEnd-2Sk";

export default function HangVotSourceModal({
  isOpen,
  onClose,
  syncingHangVot,
  onSyncHangVot,
  onUploadExcel,
  uploadingExcel,
  onConfirmPaste,
}) {
  const [hangVotPasteText, setHangVotPasteText] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handlePasteSubmit = () => {
    if (!hangVotPasteText.trim()) return;
    onConfirmPaste(hangVotPasteText);
    setHangVotPasteText('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadExcel(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-amber-50 via-orange-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-md shadow-amber-600/20">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Nguồn Dữ Liệu Hàng Vớt
              </h3>
              <p className="text-xs text-slate-500">
                Tự động trích xuất từ bảng <span className="font-semibold text-amber-700">[Xác nhận chuyển loại XCTT_NM.HRC2.xlsx]</span> sheet <span className="font-semibold text-slate-700">TỔNG HỢP ID SKIN</span>
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
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Info Card & SharePoint Link */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" />
                Công thức Excel tham chiếu:
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => window.open(HANG_VOT_SHAREPOINT_URL, '_blank')}
                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1"
              >
                <ExternalLink size={12} />
                Mở file trên SharePoint
              </Button>
            </div>
            <pre className="p-2 rounded bg-slate-900 text-amber-300 font-mono text-[10px] overflow-x-auto whitespace-pre leading-relaxed select-all">
{`=LET(
    Data; '...[Xác nhận chuyển loại XCTT_NM.HRC2.xlsx]TỔNG HỢP ID SKIN'!$A$1:$E$10000;
    FILTER(Data; BYROW(Data; LAMBDA(r; COUNTA(r)>0)))
)`}
            </pre>
            <p className="text-[11px] text-amber-800 leading-normal">
              Hệ thống sẽ lấy phạm vi cột A - E loại bỏ dòng trống, lưu bản sao cố định để các lần sau chỉ cần bấm nút <b>"Đồng bộ Hàng Vớt (SharePoint)"</b> là xong.
            </p>
          </div>

          {/* Option 1 & 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <RefreshCw size={14} className="text-emerald-600" />
                Cách 1: Quét máy tính / OneDrive
              </div>
              <p className="text-slate-500 text-[11px]">
                Tự động tìm kiếm file trong OneDrive, Downloads hoặc các thư mục đã lưu trước đó.
              </p>
              <Button
                type="button"
                disabled={syncingHangVot}
                onClick={onSyncHangVot}
                className="w-full h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                {syncingHangVot ? (
                  <>
                    <LoaderCircle size={13} className="mr-1.5 animate-spin" />
                    Đang quét...
                  </>
                ) : (
                  'Tự động quét & Lấy dữ liệu'
                )}
              </Button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <Upload size={14} className="text-amber-600" />
                Cách 2: Chọn tệp Excel từ máy
              </div>
              <p className="text-slate-500 text-[11px]">
                Tải lên tệp <i>Xác nhận chuyển loại XCTT_NM.HRC2.xlsx</i> trực tiếp từ máy của bạn.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.xlsm"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                disabled={uploadingExcel}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-8 border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs rounded-lg"
              >
                {uploadingExcel ? (
                  <>
                    <LoaderCircle size={13} className="mr-1.5 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  'Chọn file từ máy tính...'
                )}
              </Button>
            </div>
          </div>

          {/* Option 3: Copy / Paste direct from Excel */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ClipboardPaste size={14} className="text-blue-600" />
                Cách 3: Dán dữ liệu trực tiếp từ Excel (Cột A - E)
              </div>
              {hangVotPasteText.trim() && (
                <span className="text-xs font-mono text-blue-600 font-semibold">
                  {hangVotPasteText.split(/\r?\n/).filter((l) => l.trim()).length} dòng
                </span>
              )}
            </div>
            <textarea
              rows={4}
              value={hangVotPasteText}
              onChange={(e) => setHangVotPasteText(e.target.value)}
              placeholder="Mở sheet TỔNG HỢP ID SKIN trên Excel / SharePoint, bôi đen từ ô A1:E... rồi Copy và Dán vào đây..."
              className="w-full rounded-xl border border-slate-300 p-2.5 font-mono text-[11px] leading-relaxed focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y bg-white"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={syncingHangVot || !hangVotPasteText.trim()}
                onClick={handlePasteSubmit}
                className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                {syncingHangVot ? (
                  <>
                    <LoaderCircle size={13} className="mr-1.5 animate-spin" />
                    Đang nạp...
                  </>
                ) : (
                  'Xác nhận dán dữ liệu'
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3.5 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-8 px-4 text-xs font-semibold"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
