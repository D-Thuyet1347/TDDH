import React, { useState } from 'react';
import { Plus, LoaderCircle, X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

export default function BatchAddRowsModal({
  isOpen,
  onClose,
  activeSheet,
  onConfirmAdd,
  adding,
}) {
  const [batchCount, setBatchCount] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Thêm nhiều dòng vào {activeSheet}
              </h3>
              <p className="text-xs text-slate-500">
                Tối đa <strong>1.000 dòng</strong> mỗi lần thêm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Preset Buttons */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Chọn nhanh số dòng:
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 5, 10, 20, 50, 100, 500, 1000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setBatchCount(num)}
                className={`h-8 rounded-lg text-xs font-bold border transition-colors ${
                  Number(batchCount) === num
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                +{num}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Number Input */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1.5">
            Hoặc nhập số lượng tùy ý (1 - 1.000 dòng):
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={1000}
              value={batchCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) setBatchCount('');
                else setBatchCount(Math.max(1, Math.min(1000, v)));
              }}
              className="h-10 text-sm font-bold text-slate-900 border-slate-300 focus:ring-emerald-500"
              placeholder="Nhập số dòng (1 - 1000)"
            />
            <span className="text-xs font-bold text-slate-500 shrink-0">dòng</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            ⚡ Xử lý chèn dữ liệu hàng loạt siêu tốc (1.000 dòng chỉ mất ~ 0.05 giây).
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            disabled={adding}
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold text-slate-700"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={adding || !batchCount || Number(batchCount) < 1}
            onClick={() => onConfirmAdd(batchCount)}
            className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
          >
            {adding ? (
              <>
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <Plus size={14} className="mr-1.5" />
                Thêm {batchCount || 0} dòng
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
