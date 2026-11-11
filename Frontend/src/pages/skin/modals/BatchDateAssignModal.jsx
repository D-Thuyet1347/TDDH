import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { getTodayFormatted } from '../skinConstants';

const getTomorrowFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

export default function BatchDateAssignModal({
  isOpen,
  onClose,
  selectedRowIds,
  rows,
  onConfirmAssignDate,
  assigningDate,
}) {
  const [assignDateInput, setAssignDateInput] = useState(getTodayFormatted());
  const [assignCoilsText, setAssignCoilsText] = useState('');

  if (!isOpen) return null;

  const coilCount = assignCoilsText.split(/[\r\n\t,; ]+/).filter(Boolean).length;

  const handleUseSelectedRows = () => {
    const selectedRowsList = rows.filter(r => selectedRowIds.has(r.id));
    const ids = selectedRowsList.map(r => r.values?.['ID Cuộn Bó']).filter(Boolean);
    setAssignCoilsText(ids.join('\n'));
  };

  const handleConfirm = () => {
    onConfirmAssignDate(assignDateInput, assignCoilsText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-[#0e5374] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/20 text-white">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Gán ngày Kế hoạch cho cuộn
              </h3>
              <p className="text-xs text-sky-100">
                Cập nhật cột "Kế hoạch" trong sheet SKIN_HRC2 (tối đa 1.000 cuộn)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Kế hoạch dd/mm hoặc chữ */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kế hoạch (định dạng dd/mm nếu là ngày, hoặc chữ/ký tự bất kỳ): <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5">
              <Input
                type="text"
                value={assignDateInput}
                onChange={(e) => setAssignDateInput(e.target.value)}
                placeholder="Ví dụ: 09/11, Chờ xử lý, Ưu tiên..."
                className="font-bold text-slate-900 border-slate-300 focus:border-[#0e5374] flex-1"
              />
              <button
                type="button"
                onClick={() => setAssignDateInput(getTodayFormatted())}
                className="h-9 px-2.5 text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300 rounded-lg hover:bg-sky-100 whitespace-nowrap cursor-pointer"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setAssignDateInput(getTomorrowFormatted())}
                className="h-9 px-2.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 whitespace-nowrap cursor-pointer"
              >
                Ngày mai
              </button>
            </div>
          </div>

          {/* Danh sách cuộn */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Dán danh sách ID Cuộn Bó (tối đa 1.000 cuộn): <span className="text-rose-500">*</span>
              </label>
              <span className={`text-xs font-mono font-bold ${
                coilCount > 1000 ? 'text-rose-600' : 'text-sky-700'
              }`}>
                {coilCount} / 1000 cuộn
              </span>
            </div>

            {selectedRowIds.size > 0 && (
              <button
                type="button"
                onClick={handleUseSelectedRows}
                className="w-full mb-1.5 text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 py-1.5 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus size={12} /> + Lấy {selectedRowIds.size} cuộn đang tích chọn trong bảng
              </button>
            )}
            <textarea
              rows={8}
              value={assignCoilsText}
              onChange={(e) => setAssignCoilsText(e.target.value)}
              placeholder="Dán các mã ID Cuộn Bó vào đây (mỗi dòng 1 cuộn hoặc phân cách bởi dấu cách, phẩy)...&#10;Ví dụ:&#10;EA026451014&#10;EA026451012&#10;IA026451339"
              className="w-full rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-[#0e5374] focus:ring-1 focus:ring-[#0e5374] outline-none resize-y bg-slate-50/50"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              Hệ thống sẽ đối chiếu và gán giá trị cột <strong>Kế hoạch</strong> cho các cuộn này trong sheet <strong>SKIN_HRC2</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            disabled={assigningDate}
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-slate-700"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={assigningDate || !assignDateInput.trim() || !assignCoilsText.trim()}
            onClick={handleConfirm}
            className="h-9 px-5 bg-[#0e5374] hover:bg-[#0b435e] text-white text-xs font-bold shadow-md shadow-[#0e5374]/20"
          >
            {assigningDate ? (
              <>
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                Đang gán ngày...
              </>
            ) : (
              <>
                <Calendar size={14} className="mr-1.5" />
                Xác nhận gán ngày
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
