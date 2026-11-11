import React, { useState, useMemo } from 'react';
import {
  ClipboardPaste,
  FileText,
  Plus,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  getSheetPasteColumns,
  getSheetPasteSample,
  parsePastedTextForSheet,
} from '../skinConstants';

export default function PasteExcelModal({
  isOpen,
  onClose,
  activeSheet,
  onConfirmPaste,
  pastingSubmitting,
}) {
  const [pasteTab, setPasteTab] = useState('paste'); // 'paste' | 'single'
  const [pasteRawText, setPasteRawText] = useState('');
  const [singleForm, setSingleForm] = useState({});

  const targetPasteColumns = useMemo(() => getSheetPasteColumns(activeSheet), [activeSheet]);

  const parsedPasteRows = useMemo(() => {
    return parsePastedTextForSheet(pasteRawText, activeSheet);
  }, [pasteRawText, activeSheet]);

  const handleFillSamplePaste = () => {
    const sample = getSheetPasteSample(activeSheet);
    setPasteRawText(sample);
  };

  const handleConfirm = () => {
    if (pasteTab === 'paste') {
      onConfirmPaste(parsedPasteRows);
    } else {
      onConfirmPaste([singleForm]);
    }
  };

  if (!isOpen) return null;

  const maxLimit = (activeSheet === 'SKIN_HRC2' || activeSheet === 'HANG_VOT' || activeSheet === 'GET_DATA_PO') ? '15.000' : '1.000';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 shadow-2xs">
              <ClipboardPaste size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Form Thêm &amp; Dán Dữ Liệu ({targetPasteColumns.length} cột)
                <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                  {activeSheet}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1" title={targetPasteColumns.join(' • ')}>
                Định dạng chuẩn: <strong>{targetPasteColumns.join(' • ')}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 pt-3 bg-white">
          <button
            type="button"
            onClick={() => setPasteTab('paste')}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-xs font-bold transition-all ${
              pasteTab === 'paste'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardPaste size={14} /> Dán từ Excel (Nhiều dòng, tối đa {maxLimit})
          </button>
          <button
            type="button"
            onClick={() => setPasteTab('single')}
            className={`flex items-center gap-1.5 border-b-2 px-3 pb-2.5 text-xs font-bold transition-all ${
              pasteTab === 'single'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={14} /> Nhập thủ công 1 dòng ({targetPasteColumns.length} trường)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {pasteTab === 'paste' ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span>Dán nội dung sao chép từ Excel ({targetPasteColumns.length} cột) vào đây:</span>
                  <span className="text-[11px] font-normal text-slate-400">(Tự động nhận diện tab &amp; newline)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillSamplePaste}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Dán dữ liệu mẫu thử ({activeSheet})
                  </button>
                  {pasteRawText && (
                    <button
                      type="button"
                      onClick={() => setPasteRawText('')}
                      className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 underline cursor-pointer"
                    >
                      Xóa trắng
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                placeholder={`Dán (Ctrl + V) các cột copy từ file Excel vào đây...\nThứ tự các cột tương ứng:\n${targetPasteColumns.join('\t')}`}
                className="w-full h-36 rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y bg-slate-50/50"
              />

              {/* Preview Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">
                    Xem trước bảng dữ liệu nhận diện ({targetPasteColumns.length} cột):
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    parsedPasteRows.length > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    Đã nhận diện: {parsedPasteRows.length} dòng
                  </span>
                </div>

                {parsedPasteRows.length > 0 ? (
                  <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-2.5 py-2 w-12 text-center border-r border-slate-200">STT</th>
                          {targetPasteColumns.map((col) => (
                            <th key={col} className="px-2.5 py-2 border-r border-slate-200 whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {parsedPasteRows.slice(0, 100).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-2.5 py-1.5 text-center font-medium text-slate-400 border-r border-slate-200 bg-slate-50">
                              {idx + 1}
                            </td>
                            {targetPasteColumns.map((col) => (
                              <td key={col} className="px-2.5 py-1.5 border-r border-slate-100 max-w-xs truncate">
                                {r[col] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedPasteRows.length > 100 && (
                      <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 border-t border-slate-200 font-medium">
                        ... và {parsedPasteRows.length - 100} dòng tiếp theo (toàn bộ {parsedPasteRows.length} dòng sẽ được chèn vào sheet {activeSheet})
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                    <ClipboardPaste size={24} className="mb-1 text-slate-300" />
                    <span>Chưa có dữ liệu. Vui lòng copy đúng các cột từ Excel rồi nhấn <strong>Ctrl + V</strong> vào ô trên.</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Single manual row form dynamically adapting to activeSheet */
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                Điền các thông tin cho 1 dòng mới trong sheet <strong>{activeSheet}</strong> ({targetPasteColumns.length} cột):
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {targetPasteColumns.map((col, idx) => (
                  <div key={col}>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      {idx + 1}. {col} {idx === 0 && <span className="text-rose-500">*</span>}:
                    </label>
                    <Input
                      value={singleForm[col] ?? ''}
                      onChange={(e) => setSingleForm({ ...singleForm, [col]: e.target.value })}
                      placeholder={`Nhập ${col}...`}
                      className="h-9 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50">
          <div className="text-xs text-slate-500">
            <span>Dán vào sheet <strong>{activeSheet}</strong> ({targetPasteColumns.length} cột)</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pastingSubmitting}
              onClick={onClose}
              className="h-9 px-4 text-xs font-semibold text-slate-700"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={
                pastingSubmitting ||
                (pasteTab === 'paste'
                  ? parsedPasteRows.length === 0
                  : !Object.values(singleForm).some((v) => String(v || '').trim() !== ''))
              }
              onClick={handleConfirm}
              className="h-9 px-5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
            >
              {pastingSubmitting ? (
                <>
                  <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                  Đang lưu dữ liệu...
                </>
              ) : (
                <>
                  <Plus size={14} className="mr-1.5" />
                  {pasteTab === 'paste'
                    ? `Xác nhận thêm ${parsedPasteRows.length || 0} dòng vào ${activeSheet}`
                    : `Xác nhận thêm 1 dòng vào ${activeSheet}`}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
