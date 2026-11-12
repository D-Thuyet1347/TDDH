import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Download,
  LoaderCircle,
  PlusSquare,
  MinusSquare,
  Maximize2,
  Camera,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '../../../components/ui/button';
import { getSkinBaoCao } from '../../../APIs';
import { successToast, errorToast } from '../../../utils/toast';

const ALL_KEY = '__ALL__';
const EMPTY_KEY = '__EMPTY__';
const NON_EMPTY_KEY = '__NON_EMPTY__';

function formatKg(val) {
  const num = Math.round(Number(val) || 0);
  return `${num.toLocaleString('en-US')} Kg`;
}

export default function BaoCaoSkinSheet() {
  const [loading, setLoading] = useState(true);
  const [rawItems, setRawItems] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    po_thang: [],
    dvktkh: [],
    da_chay: [],
    ke_hoach: [],
  });

  // Bộ lọc mặc định giống PivotTable chuẩn: Đã chạy = (trống), Kế hoạch = (trống)
  const [poThangFilter, setPoThangFilter] = useState(ALL_KEY);
  const [daChayFilter, setDaChayFilter] = useState(EMPTY_KEY);
  const [keHoachFilter, setKeHoachFilter] = useState(EMPTY_KEY);
  const [dvktkhFilter, setDvktkhFilter] = useState(ALL_KEY);
  const [loaiXuLyFilter, setLoaiXuLyFilter] = useState(ALL_KEY);

  const [expandedDates, setExpandedDates] = useState({});
  const [expandedShifts, setExpandedShifts] = useState({});
  const [autoFit, setAutoFit] = useState(false);
  const [copyingImage, setCopyingImage] = useState(false);
  const tableRef = useRef(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSkinBaoCao();
      setRawItems(res.rows || []);
      setFilterOptions(
        res.filter_options || { po_thang: [], dvktkh: [], da_chay: [], ke_hoach: [] }
      );
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi tải Báo cáo SKIN');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const matchFilter = (val, filterVal) => {
    if (filterVal === ALL_KEY) return true;
    if (filterVal === EMPTY_KEY) return !val;
    if (filterVal === NON_EMPTY_KEY) return Boolean(val);
    return val === filterVal;
  };

  const filteredItems = useMemo(() => {
    return rawItems.filter(
      (item) =>
        matchFilter(item.po_thang, poThangFilter) &&
        matchFilter(item.da_chay, daChayFilter) &&
        matchFilter(item.ke_hoach, keHoachFilter) &&
        matchFilter(item.dvktkh, dvktkhFilter) &&
        (loaiXuLyFilter === ALL_KEY || item.loai_xu_ly === loaiXuLyFilter)
    );
  }, [rawItems, poThangFilter, daChayFilter, keHoachFilter, dvktkhFilter, loaiXuLyFilter]);

  const pivotData = useMemo(() => {
    const dateMap = new Map();
    let grandError = 0;
    let grandCust = 0;
    let grandTotal = 0;
    let grandWeight = 0;

    for (const item of filteredItems) {
      const dLabel = item.ngay_sx || '(Trống)';
      const dKey = item.date_sort_key || '9999-99-99';
      if (!dateMap.has(dLabel)) {
        dateMap.set(dLabel, {
          ngay_sx: dLabel,
          date_sort_key: dKey,
          errCount: 0,
          custCount: 0,
          totalCount: 0,
          totalWeight: 0,
          shifts: new Map(),
        });
      }
      const dNode = dateMap.get(dLabel);
      const isCust = item.loai_xu_ly === 'Khách đặt';
      if (isCust) {
        dNode.custCount += 1;
        grandCust += 1;
      } else {
        dNode.errCount += 1;
        grandError += 1;
      }
      dNode.totalCount += 1;
      dNode.totalWeight += item.weight_kg || 0;
      grandTotal += 1;
      grandWeight += item.weight_kg || 0;

      const caLabel = item.ca || '(Trống)';
      if (!dNode.shifts.has(caLabel)) {
        dNode.shifts.set(caLabel, {
          ca: caLabel,
          errCount: 0,
          custCount: 0,
          totalCount: 0,
          totalWeight: 0,
          coils: [],
        });
      }
      const sNode = dNode.shifts.get(caLabel);
      if (isCust) sNode.custCount += 1;
      else sNode.errCount += 1;
      sNode.totalCount += 1;
      sNode.totalWeight += item.weight_kg || 0;
      sNode.coils.push(item);
    }

    const dates = Array.from(dateMap.values())
      .sort((a, b) => a.date_sort_key.localeCompare(b.date_sort_key))
      .map((d) => ({
        ...d,
        shifts: Array.from(d.shifts.values()).sort((a, b) => a.ca.localeCompare(b.ca)),
      }));

    return { dates, grandError, grandCust, grandTotal, grandWeight };
  }, [filteredItems]);

  const toggleDate = (ngaySx) => {
    setExpandedDates((prev) => ({ ...prev, [ngaySx]: !prev[ngaySx] }));
  };

  const toggleShift = (ngaySx, ca) => {
    const k = `${ngaySx}__${ca}`;
    setExpandedShifts((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  const handleExportExcel = () => {
    const aoa = [
      ['PO Tháng', poThangFilter === ALL_KEY ? '(Tất cả)' : poThangFilter],
      ['Đã chạy', daChayFilter === EMPTY_KEY ? '(trống)' : daChayFilter === ALL_KEY ? '(Tất cả)' : daChayFilter],
      ['Kế hoạch', keHoachFilter === EMPTY_KEY ? '(trống)' : keHoachFilter === ALL_KEY ? '(Tất cả)' : keHoachFilter],
      ['DVKTKH', dvktkhFilter === ALL_KEY ? '(Tất cả)' : dvktkhFilter],
      [],
      ['', '', '', 'LOẠI XỬ LÝ', '', 'Tổng cộng Số lượng Cuộn', 'Tổng cộng Khối lượng (Kg)'],
      ['Ngày sản xuất', 'Ca', 'ID Cuộn Bó', 'Xử lý lỗi', 'Khách đặt', 'Số lượng Cuộn', 'Khối lượng (Kg)'],
    ];

    for (const d of pivotData.dates) {
      aoa.push([
        d.ngay_sx,
        '',
        '',
        d.errCount,
        d.custCount,
        d.totalCount,
        Math.round(d.totalWeight),
      ]);
    }
    aoa.push([
      'Tổng Cuối',
      '',
      '',
      pivotData.grandError,
      pivotData.grandCust,
      pivotData.grandTotal,
      Math.round(pivotData.grandWeight),
    ]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = [{ s: { r: 5, c: 3 }, e: { r: 5, c: 4 } }];
    // AutoFit độ rộng cột & chiều cao dòng khi xuất Excel
    const colWidths = [];
    for (let c = 0; c < 7; c++) {
      let maxLen = 10;
      for (const r of aoa) {
        const val = r[c] !== undefined && r[c] !== null ? String(r[c]) : '';
        if (val.length > maxLen) maxLen = val.length;
      }
      colWidths.push({ wch: Math.min(maxLen + 3, 45) });
    }
    ws['!cols'] = colWidths;
    ws['!rows'] = aoa.map(() => ({ hpt: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bao_Cao_SKIN');
    XLSX.writeFile(wb, `Bao_Cao_Luong_SKIN_${new Date().toISOString().slice(0, 10)}.xlsx`);
    successToast('Đã xuất Báo cáo lượng SKIN ra Excel!');
  };

  const handleCopyTableImage = async () => {
    const tableEl = tableRef.current;
    if (!tableEl) return;
    let offscreenWrap = null;
    try {
      setCopyingImage(true);

      // Tạo bản sao ẩn ở chế độ AutoFit gọn đẹp như ảnh mẫu để chụp không làm nháy giao diện
      offscreenWrap = document.createElement('div');
      offscreenWrap.style.position = 'fixed';
      offscreenWrap.style.left = '-99999px';
      offscreenWrap.style.top = '0';
      offscreenWrap.style.width = 'max-content';
      offscreenWrap.style.background = '#ffffff';
      offscreenWrap.className = 'rounded-xl border border-slate-400 overflow-hidden';

      const cloneTable = tableEl.cloneNode(true);
      cloneTable.className =
        'border-collapse text-xs w-auto table-auto [&_th]:!w-auto [&_th]:!px-2.5 [&_th]:!py-1 [&_td]:!px-2.5 [&_td]:!py-1 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap leading-tight';
      offscreenWrap.appendChild(cloneTable);
      document.body.appendChild(offscreenWrap);

      const tableRect = offscreenWrap.getBoundingClientRect();
      const width = Math.ceil(tableRect.width);
      const height = Math.ceil(tableRect.height);
      if (!width || !height) {
        errorToast('Không thể chụp bảng trống.');
        return;
      }

      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Bo góc ngoài giống khung bảng
      const radius = 10;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(0.5, 0.5, width - 1, height - 1, radius);
      ctx.clip();

      const rows = cloneTable.querySelectorAll('tr');
      rows.forEach((tr) => {
        const rowBg = window.getComputedStyle(tr).backgroundColor;
        const cells = tr.querySelectorAll('th, td');
        cells.forEach((cell) => {
          const r = cell.getBoundingClientRect();
          const x = r.left - tableRect.left;
          const y = r.top - tableRect.top;
          const cw = r.width;
          const ch = r.height;
          if (cw <= 0 || ch <= 0) return;

          const cs = window.getComputedStyle(cell);
          const cellBg = cs.backgroundColor;
          const fillBg =
            cellBg && cellBg !== 'rgba(0, 0, 0, 0)' && cellBg !== 'transparent'
              ? cellBg
              : rowBg && rowBg !== 'rgba(0, 0, 0, 0)' && rowBg !== 'transparent'
              ? rowBg
              : '#ffffff';
          ctx.fillStyle = fillBg;
          ctx.fillRect(x, y, cw, ch);

          const drawSide = (bw, bc, x1, y1, x2, y2) => {
            const wNum = parseFloat(bw);
            if (wNum > 0 && bc && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent') {
              ctx.strokeStyle = bc;
              ctx.lineWidth = wNum;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          };
          drawSide(cs.borderTopWidth, cs.borderTopColor, x, y, x + cw, y);
          drawSide(cs.borderBottomWidth, cs.borderBottomColor, x, y + ch, x + cw, y + ch);
          drawSide(cs.borderLeftWidth, cs.borderLeftColor, x, y, x, y + ch);
          drawSide(cs.borderRightWidth, cs.borderRightColor, x + cw, y, x + cw, y + ch);

          const text = (cell.innerText || '').trim();
          if (!text) return;

          const padL = parseFloat(cs.paddingLeft) || 10;
          const padR = parseFloat(cs.paddingRight) || 10;
          const svgEl = cell.querySelector('svg');
          let iconOffset = 0;

          // Vẽ icon [+] / [-] nếu ô có nút thu gọn/mở rộng
          if (svgEl) {
            const iconSize = 11;
            const ix = x + padL;
            const iy = y + (ch - iconSize) / 2;
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.1;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(ix, iy, iconSize, iconSize);
            ctx.strokeRect(ix, iy, iconSize, iconSize);
            // Dấu -
            ctx.beginPath();
            ctx.moveTo(ix + 2.5, iy + iconSize / 2);
            ctx.lineTo(ix + iconSize - 2.5, iy + iconSize / 2);
            // Nếu là PlusSquare (có >= 2 path hoặc line dọc) thì vẽ thêm dấu +
            const isMinus = svgEl.classList.contains('lucide-minus-square');
            if (!isMinus) {
              ctx.moveTo(ix + iconSize / 2, iy + 2.5);
              ctx.lineTo(ix + iconSize / 2, iy + iconSize - 2.5);
            }
            ctx.stroke();
            iconOffset = iconSize + 6;
          }

          const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
          const fontSize = parseFloat(cs.fontSize) || 12;
          const fontWeight = cs.fontWeight || '400';
          const fontFamily = cs.fontFamily || 'sans-serif';
          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = cs.color || '#0f172a';
          ctx.textBaseline = 'middle';

          const align = cs.textAlign;
          let textX = x + padL + iconOffset;
          if (align === 'right' || align === 'end') {
            ctx.textAlign = 'right';
            textX = x + cw - padR;
          } else if (align === 'center') {
            ctx.textAlign = 'center';
            textX = x + cw / 2;
          } else {
            ctx.textAlign = 'left';
          }

          const lineHeight = fontSize * 1.3;
          const totalTextH = lines.length * lineHeight;
          const startY = y + (ch - totalTextH) / 2 + lineHeight / 2;
          lines.forEach((line, idx) => {
            ctx.fillText(line, textX, startY + idx * lineHeight, Math.max(10, cw - padL - padR - iconOffset));
          });
        });
      });

      ctx.restore();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0.5, 0.5, width - 1, height - 1, radius);
      ctx.stroke();

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) {
        errorToast('Không thể tạo ảnh PNG từ bảng báo cáo.');
        return;
      }

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
        successToast('Đã copy ảnh bảng Báo cáo SKIN vào clipboard!');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bao_Cao_Luong_SKIN_${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
        successToast('Trình duyệt không hỗ trợ copy ảnh trực tiếp, đã tải file PNG về máy!');
      }
    } catch (err) {
      errorToast('Lỗi copy ảnh bảng báo cáo: ' + (err?.message || 'Không xác định'));
    } finally {
      if (offscreenWrap && offscreenWrap.parentNode) {
        offscreenWrap.parentNode.removeChild(offscreenWrap);
      }
      setCopyingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white rounded-xl border border-slate-200 p-10">
        <div className="flex items-center gap-2.5 text-slate-600 text-sm">
          <LoaderCircle className="w-5 h-5 animate-spin text-blue-600" />
          <span>Đang tổng hợp Báo cáo lượng SKIN...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto space-y-4 pr-1">
      {/* Top Bar: Filter Block + Actions */}
      <div className="flex flex-wrap items-start justify-between gap-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        {/* Excel-style Pivot Filter Table */}
        <div className="border border-slate-400 rounded overflow-hidden text-xs">
          <table className="border-collapse">
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="bg-indigo-100/80 font-semibold text-slate-900 px-3 py-1.5 border-r border-slate-300 w-28">
                  PO Tháng
                </td>
                <td className="bg-white px-2 py-1 min-w-[160px]">
                  <select
                    value={poThangFilter}
                    onChange={(e) => setPoThangFilter(e.target.value)}
                    className="w-full h-6 text-xs bg-white focus:outline-none font-medium text-slate-800"
                  >
                    <option value={ALL_KEY}>(Tất cả)</option>
                    <option value={EMPTY_KEY}>(trống)</option>
                    {filterOptions.po_thang.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="bg-indigo-100/80 font-semibold text-slate-900 px-3 py-1.5 border-r border-slate-300">
                  Đã chạy
                </td>
                <td className="bg-white px-2 py-1">
                  <select
                    value={daChayFilter}
                    onChange={(e) => setDaChayFilter(e.target.value)}
                    className="w-full h-6 text-xs bg-white focus:outline-none font-medium text-slate-800"
                  >
                    <option value={EMPTY_KEY}>(trống)</option>
                    <option value={ALL_KEY}>(Tất cả)</option>
                    <option value={NON_EMPTY_KEY}>(đã có)</option>
                    {filterOptions.da_chay.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr className="border-b border-slate-300">
                <td className="bg-indigo-100/80 font-semibold text-slate-900 px-3 py-1.5 border-r border-slate-300">
                  Kế hoạch
                </td>
                <td className="bg-white px-2 py-1">
                  <select
                    value={keHoachFilter}
                    onChange={(e) => setKeHoachFilter(e.target.value)}
                    className="w-full h-6 text-xs bg-white focus:outline-none font-medium text-slate-800"
                  >
                    <option value={EMPTY_KEY}>(trống)</option>
                    <option value={ALL_KEY}>(Tất cả)</option>
                    <option value={NON_EMPTY_KEY}>(đã có)</option>
                    {filterOptions.ke_hoach.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td className="bg-indigo-100/80 font-semibold text-slate-900 px-3 py-1.5 border-r border-slate-300">
                  DVKTKH
                </td>
                <td className="bg-white px-2 py-1">
                  <select
                    value={dvktkhFilter}
                    onChange={(e) => setDvktkhFilter(e.target.value)}
                    className="w-full h-6 text-xs bg-white focus:outline-none font-medium text-slate-800"
                  >
                    <option value={ALL_KEY}>(Tất cả)</option>
                    <option value={EMPTY_KEY}>(trống)</option>
                    {filterOptions.dvktkh.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <span className="text-xs font-bold text-slate-700">LOẠI XỬ LÝ:</span>
            <select
              value={loaiXuLyFilter}
              onChange={(e) => setLoaiXuLyFilter(e.target.value)}
              className="h-6 text-xs bg-white border border-slate-300 rounded px-1.5 font-medium"
            >
              <option value={ALL_KEY}>(Tất cả)</option>
              <option value="Xử lý lỗi">Xử lý lỗi</option>
              <option value="Khách đặt">Khách đặt</option>
            </select>
          </div>
          <Button
            type="button"
            variant={autoFit ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoFit((prev) => !prev)}
            className={`h-8 text-xs font-bold ${autoFit ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
            title="Tự động co giãn độ rộng cột & chiều cao dòng vừa khít nội dung"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1.5" />
            AutoFit Cột/Dòng
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchReport}
            className="h-8 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Làm mới
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={copyingImage}
            onClick={handleCopyTableImage}
            className="h-8 text-xs font-bold border-sky-300 text-sky-800 hover:bg-sky-50"
            title="Chụp và copy ảnh bảng Báo cáo SKIN vào clipboard"
          >
            {copyingImage ? (
              <LoaderCircle className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Camera className="w-3.5 h-3.5 mr-1.5" />
            )}
            Copy Ảnh
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Xuất Excel
          </Button>
        </div>
      </div>

      {/* Main Pivot Table */}
      <div className={`bg-white rounded-xl border border-slate-400 shadow-sm overflow-x-auto ${autoFit ? 'w-fit max-w-full' : ''}`}>
        <table
          ref={tableRef}
          className={`border-collapse text-xs ${
          autoFit
            ? 'w-auto table-auto [&_th]:!w-auto [&_th]:!px-2 [&_th]:!py-0.5 [&_td]:!px-2 [&_td]:!py-0.5 [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap leading-tight'
            : 'w-full'
        }`}>
          <thead>
            <tr className="bg-indigo-100/90 border-b border-slate-400 text-slate-900 font-bold">
              <th className="px-3 py-1.5 border-r border-slate-300 w-36"></th>
              <th className="px-2 py-1.5 border-r border-slate-300 w-16"></th>
              <th className="px-2 py-1.5 border-r border-slate-300 w-32"></th>
              <th
                colSpan={2}
                className="px-3 py-1.5 text-left border-r border-slate-300"
              >
                LOẠI XỬ LÝ
              </th>
              <th className="px-3 py-1.5 text-center border-r border-slate-300">
                Tổng cộng Số lượng Cuộn
              </th>
              <th className="px-3 py-1.5 text-center">
                Tổng cộng Khối lượng (Kg)
              </th>
            </tr>
            <tr className="bg-indigo-100/90 border-b-2 border-slate-500 text-slate-900 font-bold">
              <th className="px-3 py-1.5 text-left border-r border-slate-300">
                Ngày sản xuất
              </th>
              <th className="px-2 py-1.5 text-left border-r border-slate-300">
                Ca
              </th>
              <th className="px-2 py-1.5 text-left border-r border-slate-300">
                ID Cuộn Bó
              </th>
              <th className="px-3 py-1.5 text-left border-r border-slate-300">
                <div>Xử lý lỗi</div>
                <div className="text-[11px] font-semibold text-slate-700">Số lượng Cuộn</div>
              </th>
              <th className="px-3 py-1.5 text-left border-r border-slate-300">
                <div>Khách đặt</div>
                <div className="text-[11px] font-semibold text-slate-700">Số lượng Cuộn</div>
              </th>
              <th className="px-3 py-1.5 border-r border-slate-300"></th>
              <th className="px-3 py-1.5"></th>
            </tr>
          </thead>

          <tbody>
            {pivotData.dates.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              pivotData.dates.map((d) => {
                const isDateExp = Boolean(expandedDates[d.ngay_sx]);
                return (
                  <React.Fragment key={d.ngay_sx}>
                    <tr
                      onClick={() => toggleDate(d.ngay_sx)}
                      className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer font-semibold text-slate-900"
                    >
                      <td className="px-3 py-1.5 border-r border-slate-200 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isDateExp ? (
                            <MinusSquare size={13} className="text-slate-600 shrink-0" />
                          ) : (
                            <PlusSquare size={13} className="text-slate-600 shrink-0" />
                          )}
                          <span>{d.ngay_sx}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 border-r border-slate-200"></td>
                      <td className="px-2 py-1.5 border-r border-slate-200"></td>
                      <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-sm">
                        {d.errCount}
                      </td>
                      <td className="px-3 py-1.5 text-right border-r border-slate-200 font-mono text-sm">
                        {d.custCount}
                      </td>
                      <td className="px-3 py-1.5 text-center border-r border-slate-200 font-mono text-sm">
                        {d.totalCount}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-sm">
                        {formatKg(d.totalWeight)}
                      </td>
                    </tr>

                    {isDateExp &&
                      d.shifts.map((s) => {
                        const sKey = `${d.ngay_sx}__${s.ca}`;
                        const isShiftExp = Boolean(expandedShifts[sKey]);
                        return (
                          <React.Fragment key={sKey}>
                            <tr
                              onClick={() => toggleShift(d.ngay_sx, s.ca)}
                              className="border-b border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer text-slate-800"
                            >
                              <td className="px-3 py-1 border-r border-slate-200"></td>
                              <td className="px-2 py-1 border-r border-slate-200 font-semibold whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {isShiftExp ? (
                                    <MinusSquare size={12} className="text-slate-500 shrink-0" />
                                  ) : (
                                    <PlusSquare size={12} className="text-slate-500 shrink-0" />
                                  )}
                                  <span>{s.ca}</span>
                                </div>
                              </td>
                              <td className="px-2 py-1 border-r border-slate-200"></td>
                              <td className="px-3 py-1 text-right border-r border-slate-200 font-mono">
                                {s.errCount}
                              </td>
                              <td className="px-3 py-1 text-right border-r border-slate-200 font-mono">
                                {s.custCount}
                              </td>
                              <td className="px-3 py-1 text-center border-r border-slate-200 font-mono font-semibold">
                                {s.totalCount}
                              </td>
                              <td className="px-3 py-1 text-right font-mono">
                                {formatKg(s.totalWeight)}
                              </td>
                            </tr>

                            {isShiftExp &&
                              s.coils.map((c, idx) => (
                                <tr
                                  key={`${sKey}_${c.id_cuon}_${idx}`}
                                  className="border-b border-slate-100 bg-white text-slate-700 text-[11px]"
                                >
                                  <td className="px-3 py-0.5 border-r border-slate-200"></td>
                                  <td className="px-2 py-0.5 border-r border-slate-200"></td>
                                  <td className="px-2 py-0.5 border-r border-slate-200 font-mono">
                                    {c.id_cuon}
                                  </td>
                                  <td className="px-3 py-0.5 text-right border-r border-slate-200 font-mono">
                                    {c.loai_xu_ly === 'Xử lý lỗi' ? 1 : ''}
                                  </td>
                                  <td className="px-3 py-0.5 text-right border-r border-slate-200 font-mono">
                                    {c.loai_xu_ly === 'Khách đặt' ? 1 : ''}
                                  </td>
                                  <td className="px-3 py-0.5 text-center border-r border-slate-200 font-mono">
                                    1
                                  </td>
                                  <td className="px-3 py-0.5 text-right font-mono">
                                    {formatKg(c.weight_kg)}
                                  </td>
                                </tr>
                              ))}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>

          <tfoot>
            <tr className="bg-indigo-100/90 border-t-2 border-slate-500 text-slate-950 font-bold text-sm">
              <td className="px-3 py-2 border-r border-slate-300">Tổng Cuối</td>
              <td className="px-2 py-2 border-r border-slate-300"></td>
              <td className="px-2 py-2 border-r border-slate-300"></td>
              <td className="px-3 py-2 text-right border-r border-slate-300 font-mono">
                {pivotData.grandError}
              </td>
              <td className="px-3 py-2 text-right border-r border-slate-300 font-mono">
                {pivotData.grandCust}
              </td>
              <td className="px-3 py-2 text-center border-r border-slate-300 font-mono bg-yellow-300 text-slate-950">
                {pivotData.grandTotal}
              </td>
              <td className="px-3 py-2 text-right font-mono bg-emerald-500 text-slate-950">
                {formatKg(pivotData.grandWeight)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
