import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  Download,
  Layers,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createOrderDemandRow,
  deleteOrderDemandRow,
  getOrderDemandColumnValues,
  getOrderDemandReportFileUrl,
  getOrderDemandReports,
  getOrderDemandRows,
  syncOrderDemandQc,
  updateOrderDemandRow,
} from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import ExcelFilterDropdown from '../components/ExcelFilterDropdown';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table } from '../components/ui/table';

const SHEET_NAME = 'Nhu cầu đơn hàng HRC';
const PAGE_SIZE = 100;
const LOAD_MORE_THRESHOLD = 240;

const columnDefinitions = [
  { key: 'nhu_cau', title: 'Nhu cầu', width: 'min-w-28', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'thang', title: 'Tháng', width: 'min-w-20', color: 'bg-blue-50/90 text-blue-900 border-blue-100' },
  { key: 'dot', title: 'Đợt', width: 'min-w-20', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'khach_hang', title: 'Khách hàng', width: 'min-w-44', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'thoi_gian_giao_hang', title: 'Thời gian giao hàng', width: 'min-w-36', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'cw', title: 'CW', width: 'min-w-16', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'po', title: 'PO', width: 'min-w-28', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'xx', title: 'xx', width: 'min-w-16', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'tdc_code', title: 'TDC Code', width: 'min-w-44', color: 'bg-rose-50/90 text-rose-900 border-rose-100' },
  { key: 'tdc', title: 'TDC', width: 'min-w-56', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'yeu_cau_dac_biet_skin_skin', title: 'Yêu cầu đặc biệt Skin/Skin', width: 'min-w-64', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'ten_goi', title: 'Tên gọi', width: 'min-w-48', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'ycdb', title: 'YCĐB', width: 'min-w-24', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'txw', title: 'TxW', width: 'min-w-24', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'mac_thep', title: 'Mác thép', width: 'min-w-28', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 't', title: 'T', width: 'min-w-16', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'w', title: 'W', width: 'min-w-16', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'kl_1c', title: 'KL_1C', width: 'min-w-20', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'kl_1d', title: 'KL_1D', width: 'min-w-20', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'thua_thieu_so_voi_zbc04b', title: 'Thừa thiếu so với ZBC04B', width: 'min-w-28', color: 'bg-rose-100/90 text-rose-900 border-rose-200' },
  { key: 'loai_1', title: 'Loại 1', width: 'min-w-20', color: 'bg-emerald-100/90 text-emerald-950 border-emerald-200' },
  { key: 'loai_2', title: 'Loại 2', width: 'min-w-20', color: 'bg-amber-100/90 text-amber-950 border-amber-200' },
  { key: 'cho_xu_ly', title: 'Chờ xử lý', width: 'min-w-20', color: 'bg-amber-50/90 text-amber-900 border-amber-100' },
  { key: 'cho_skin', title: 'Chờ skin', width: 'min-w-20', color: 'bg-amber-50/90 text-amber-900 border-amber-100' },
  { key: 'tong_sl_sx_kcs', title: 'Tổng SL sx KCS', width: 'min-w-24', color: 'bg-emerald-50/90 text-emerald-900 border-emerald-100' },
  { key: 'ke_hoach_can', title: 'Kế hoạch cán', width: 'min-w-24', color: 'bg-emerald-50/90 text-emerald-900 border-emerald-100' },
  { key: 'tinh_trang', title: 'Tình trạng', width: 'min-w-28', color: 'bg-amber-50/90 text-amber-900 border-amber-100' },
  { key: 'ton_phoi', title: 'Tồn phôi', width: 'min-w-24', color: 'bg-emerald-50/90 text-emerald-900 border-emerald-100' },
  {
    key: 'phoi_tam_6_12m_ty_le_1a_hoac_loai_1ab_sau_skin_ty_le_1b_sau_skin',
    title: 'Phôi tấm 6-12m · Tỷ lệ 1A hoặc loại 1AB sau skin · Tỷ lệ 1B sau skin',
    width: 'min-w-72',
    color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100',
  },
  { key: 'quy_cach_phoi_tam', title: 'Quy cách phôi tấm', width: 'min-w-72', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
  { key: 'ket_qua_can', title: 'Kết quả cán', width: 'min-w-36', color: 'bg-emerald-50/90 text-emerald-900 border-emerald-100' },
  { key: 'ma_khach_hang', title: 'Mã khách hàng', width: 'min-w-44', color: 'bg-indigo-600 text-white border-indigo-700' },
  { key: 'day_muc_tieu', title: 'Dày mục tiêu', width: 'min-w-24', color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100' },
];
const columnDefinitionByKey = new Map(
  columnDefinitions.map((column) => [column.key, column])
);
const columnKeyByTitle = new Map(
  columnDefinitions.map(({ key, title }) => [title, key])
);

const normalizeColumnKey = (key) => columnKeyByTitle.get(key) || key;
const normalizeRowValues = (values = {}) => {
  const normalized = {};
  for (const [key, value] of Object.entries(values)) {
    if (!columnKeyByTitle.has(key)) normalized[key] = value;
  }
  for (const [key, value] of Object.entries(values)) {
    const field = normalizeColumnKey(key);
    if (!(field in normalized)) normalized[field] = value;
  }
  return normalized;
};

const formatCell = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

const isExtraColumn = (column) =>
  /^_*EMPTY(?:_\d+)?$/i.test(column.trim()) ||
  /^(?:cot|column)_\d+$/i.test(column.trim()) ||
  /^Cột\s*\d+$/i.test(column.trim()) ||
  /^Column\s*\d+$/i.test(column.trim());

const createEmptyValues = (columns, values = {}) => {
  const normalized = normalizeRowValues(values);
  return Object.fromEntries(columns.map((column) => [column, String(normalized[column] ?? '')]));
};

export default function OrderDemandPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReportId = searchParams.get('job_id') || '';
  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState('');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [columnValues, setColumnValues] = useState({});
  const [sortState, setSortState] = useState(null); // { column: string, direction: 'asc' | 'desc' }
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [syncingQc, setSyncingQc] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState('');
  const tableScrollRef = useRef(null);
  const queryVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((val) => {
      if (Array.isArray(val)) return val.length > 0;
      return Boolean(String(val ?? '').trim());
    }).length,
    [filters]
  );

  useEffect(() => {
    const controller = new AbortController();
    getOrderDemandReports({ limit: 100, signal: controller.signal })
      .then((result) => {
        const availableReports = result.reports;
        setReports(availableReports);
        const selected = availableReports.find(
          (report) => report.job_id === requestedReportId
        ) || availableReports[0];
        setReportId(selected?.job_id || '');
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingReports(false);
      });
    return () => controller.abort();
  }, [requestedReportId]);

  const selectedReport = reports.find((report) => report.job_id === reportId);
  const sheetColumns = useMemo(
    () => selectedReport?.sheets?.find(
      (sheet) => sheet.name === SHEET_NAME
    )?.columns.map(normalizeColumnKey) || [],
    [selectedReport]
  );
  const columns = useMemo(
    () => [...new Set([...columnDefinitions.map(({ key }) => key), ...sheetColumns])]
      .map((key) => ({
        key,
        ...(columnDefinitionByKey.get(key) || {
          title: key,
          width: 'min-w-24',
          color: 'bg-indigo-50/90 text-indigo-900 border-indigo-100',
        }),
      }))
      .filter((column) => !isExtraColumn(column.key)),
    [sheetColumns]
  );

  useEffect(() => {
    const queryVersion = queryVersionRef.current + 1;
    queryVersionRef.current = queryVersion;
    loadingMoreRef.current = false;
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
    setLoadingMore(false);
    setRows([]);
    setTotal(0);

    if (!reportId) {
      setLoadingRows(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingRows(true);
    setError('');
    getOrderDemandRows({
      reportId,
      sheetName: SHEET_NAME,
      search,
      filters,
      limit: PAGE_SIZE,
      offset: 0,
      signal: controller.signal,
    })
      .then((result) => {
        if (queryVersionRef.current !== queryVersion) return;
        setRows(result.rows.map((row) => ({
          ...row,
          values: normalizeRowValues(row.values),
        })));
        setTotal(result.total);
      })
      .catch((loadError) => {
        if (!controller.signal.aborted) setError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted && queryVersionRef.current === queryVersion) {
          setLoadingRows(false);
        }
      });
    return () => controller.abort();
  }, [reportId, search, filters, reloadKey]);

  useEffect(() => {
    if (!reportId) {
      setColumnValues({});
      return undefined;
    }
    const controller = new AbortController();
    getOrderDemandColumnValues({ reportId, sheetName: SHEET_NAME, signal: controller.signal })
      .then((res) => {
        if (res?.columns) setColumnValues(res.columns);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [reportId, reloadKey]);

  const loadMoreRows = useCallback(async () => {
    if (
      !reportId ||
      loadingRows ||
      loadingMoreRef.current ||
      rows.length >= total
    ) return;

    const queryVersion = queryVersionRef.current;
    const nextOffset = rows.length;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getOrderDemandRows({
        reportId,
        sheetName: SHEET_NAME,
        search,
        filters,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      if (queryVersionRef.current === queryVersion) {
        setRows((currentRows) => [
          ...currentRows,
          ...result.rows.map((row) => ({
            ...row,
            values: normalizeRowValues(row.values),
          })),
        ]);
        setTotal(result.total);
      }
    } catch (loadError) {
      if (queryVersionRef.current === queryVersion) setError(loadError.message);
    } finally {
      if (queryVersionRef.current === queryVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [reportId, loadingRows, rows.length, total, search, filters]);

  const handleTableScroll = (event) => {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight <= LOAD_MORE_THRESHOLD) {
      void loadMoreRows();
    }
  };

  useEffect(() => {
    const element = tableScrollRef.current;
    if (
      !element ||
      loadingRows ||
      loadingMore ||
      rows.length === 0 ||
      rows.length >= total
    ) return;

    if (element.scrollHeight - element.clientHeight <= LOAD_MORE_THRESHOLD) {
      void loadMoreRows();
    }
  }, [loadMoreRows, loadingRows, loadingMore, rows.length, total]);

  const selectReport = (event) => {
    const nextReportId = event.target.value;
    setReportId(nextReportId);
    setSearchParams(nextReportId ? { job_id: nextReportId } : {});
    setSearch('');
    setFilters({});
    setSortState(null);
    setNotice('');
  };

  // Excel filter actions
  const handleApplyFilter = (columnKey, selectedValues) => {
    setFilters((current) => {
      const next = { ...current };
      if (!selectedValues || (Array.isArray(selectedValues) && selectedValues.length === 0)) {
        delete next[columnKey];
      } else {
        next[columnKey] = selectedValues;
      }
      return next;
    });
  };

  const handleClearFilter = (columnKey) => {
    setFilters((current) => {
      const next = { ...current };
      delete next[columnKey];
      return next;
    });
  };

  const handleSort = (columnKey, direction) => {
    setSortState({ column: columnKey, direction });
  };

  // Sorted rows for rendering
  const sortedRows = useMemo(() => {
    if (!sortState || !sortState.column) return rows;
    const { column, direction } = sortState;
    return [...rows].sort((a, b) => {
      const valA = a.values?.[column];
      const valB = b.values?.[column];
      const strA = valA === null || valA === undefined ? '' : String(valA).trim();
      const strB = valB === null || valB === undefined ? '' : String(valB).trim();
      const numA = Number(strA);
      const numB = Number(strB);
      let cmp = 0;
      if (!Number.isNaN(numA) && !Number.isNaN(numB) && strA !== '' && strB !== '') {
        cmp = numA - numB;
      } else {
        cmp = strA.localeCompare(strB, 'vi-VN', { numeric: true, sensitivity: 'base' });
      }
      return direction === 'desc' ? -cmp : cmp;
    });
  }, [rows, sortState]);

  const syncRows = () => {
    setError('');
    setNotice('');
    setReloadKey((key) => key + 1);
  };

  const handleSyncQc = async () => {
    if (syncingQc) return;
    setSyncingQc(true);
    setError('');
    setNotice('');
    try {
      const res = await syncOrderDemandQc({ reportId });
      setNotice(
        res.message ||
        `Đã đồng nhất thành công dữ liệu QC: Cập nhật ${res.stats?.matchedRows ?? 0} dòng nhu cầu!`
      );
      setReloadKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Lỗi khi đồng nhất dữ liệu QC.');
    } finally {
      setSyncingQc(false);
    }
  };

  const openDialog = (row = null, copy = false) => {
    setDialog({
      mode: copy ? 'copy' : row ? 'edit' : 'create',
      rowId: copy || !row ? '' : row._id,
    });
    setFormValues(createEmptyValues(
      columns.map((column) => column.key),
      row ? row.values : {}
    ));
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(false);
  };

  const saveRow = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (dialog?.mode === 'edit' && dialog.rowId) {
        await updateOrderDemandRow({
          reportId,
          sheetName: SHEET_NAME,
          rowId: dialog.rowId,
          values: formValues,
        });
        setNotice('Đã cập nhật dòng nhu cầu đơn hàng.');
      } else {
        await createOrderDemandRow({
          reportId,
          sheetName: SHEET_NAME,
          values: formValues,
        });
        setNotice(dialog?.mode === 'copy'
          ? 'Đã thêm đơn hàng mới từ nội dung đã sao chép.'
          : 'Đã thêm dòng nhu cầu đơn hàng.');
      }
      setDialog(false);
      if (dialog?.mode === 'copy') {
        setSearch('');
        setFilters({});
      }
      setReloadKey((key) => key + 1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const removeRow = async (row) => {
    if (saving || deletingRowId) return;
    if (!window.confirm('Bạn có chắc muốn xóa dòng nhu cầu đơn hàng này?')) return;
    setDeletingRowId(row._id);
    setError('');
    setNotice('');
    try {
      await deleteOrderDemandRow({
        reportId,
        sheetName: SHEET_NAME,
        rowId: row._id,
      });
      setNotice('Đã xóa dòng nhu cầu đơn hàng.');
      setReloadKey((key) => key + 1);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingRowId('');
    }
  };

  return (
    <QcLayout>
      <div className="space-y-6 sm:space-y-8 w-full">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/data"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              <ArrowLeft size={14} /> Tất cả dữ liệu
            </Link>
            <div className="mt-2 mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              <ClipboardList size={14} className="text-indigo-600" /> Theo dõi tiến độ đơn hàng
            </div>
            <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Nhu cầu đơn hàng HRC
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Quản lý và tra cứu dữ liệu nhu cầu đơn hàng với bộ lọc Excel đa năng.
            </p>
          </div>
          {selectedReport && (
            <Button asChild variant="outline" size="sm" className="h-10 rounded-xl border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50">
              <a href={getOrderDemandReportFileUrl(reportId)}>
                <Download size={15} /> Tải file Excel
              </a>
            </Button>
          )}
        </header>

        {error && (
          <Alert variant="destructive" className="flex items-start gap-2.5 rounded-2xl p-4 text-xs font-semibold">
            <AlertCircle size={18} className="mt-0.5 shrink-0" /> {error}
          </Alert>
        )}
        {notice && !error && (
          <Alert role="status" variant="success" className="rounded-2xl p-4 text-xs font-semibold">
            {notice}
          </Alert>
        )}

        <Card className="w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                <ClipboardList size={16} />
              </span>
              <h2 className="text-sm font-bold text-slate-900">
                Bảng nhu cầu đơn hàng
              </h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                {columns.length} cột
              </span>
            </div>

            <label className="ml-auto min-w-48 flex-1 sm:max-w-72">
              <span className="sr-only">Báo cáo</span>
              <Select
                value={reportId}
                onChange={selectReport}
                disabled={loadingReports || reports.length === 0}
                className="h-10 w-full"
              >
                <option value="">
                  {loadingReports ? 'Đang tải báo cáo…' : 'Chưa có báo cáo nhu cầu'}
                </option>
                {reports.map((report) => (
                  <option key={report.job_id} value={report.job_id}>
                    {report.filename}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {/* Search, Action bar & Filter reset */}
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
            <label className="relative min-w-56 flex-1 sm:max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm nhanh trong tất cả các cột…"
                className="h-10 w-full pl-10 pr-3 text-xs"
              />
            </label>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncRows}
              disabled={!reportId || loadingRows}
              className="inline-flex h-10 items-center gap-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-white"
            >
              <RefreshCw size={14} className={loadingRows ? 'animate-spin text-indigo-600' : 'text-slate-500'} />
              Làm mới
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncQc}
              disabled={syncingQc || loadingRows}
              className="inline-flex h-10 items-center gap-2 rounded-xl border-emerald-300/80 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100/80"
              title="Liên kết kiểm tra và tổng hợp khối lượng Loại 1, Loại 2, Chờ xử lý, Chờ skin từ Dữ liệu Excel theo PO và xx"
            >
              <Layers size={14} className={syncingQc ? 'animate-spin text-emerald-600' : 'text-emerald-700'} />
              {syncingQc ? 'Đang tổng hợp QC...' : 'Đồng nhất dữ liệu QC'}
            </Button>

            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border-indigo-200 bg-indigo-50/70 px-3.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100/80"
              >
                <RotateCcw size={13} />
                Xóa {activeFilterCount} bộ lọc
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={() => openDialog()}
              disabled={!selectedReport || loadingReports}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl"
            >
              <Plus size={16} /> Thêm dòng mới
            </Button>
          </div>

          {/* Main Table */}
          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="max-h-[75vh] overflow-auto"
          >
            <Table wrapperClassName="contents" className="w-full min-w-max border-collapse text-left text-xs">
              <thead className="sticky top-0 z-20 shadow-xs">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`${column.width} border-b border-r border-slate-200/80 px-2.5 py-3 text-center align-middle text-[11px] font-bold tracking-tight ${column.color}`}
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="whitespace-normal leading-4">{column.title}</span>
                        <ExcelFilterDropdown
                          columnKey={column.key}
                          title={column.title}
                          rows={rows}
                          allColumnValues={columnValues[column.key]}
                          activeFilter={filters[column.key]}
                          sortState={sortState}
                          onApplyFilter={handleApplyFilter}
                          onClearFilter={handleClearFilter}
                          onSort={handleSort}
                        />
                      </div>
                    </th>
                  ))}
                  <th scope="col" className="sticky right-0 min-w-28 border-b border-slate-200 bg-slate-100/95 px-3 py-3 text-center text-[11px] font-bold text-slate-700 uppercase tracking-wider backdrop-blur-sm z-30">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRows ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="h-28 text-center text-xs font-medium text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle size={18} className="animate-spin text-indigo-600" /> Đang tải dữ liệu…
                      </span>
                    </td>
                  </tr>
                ) : sortedRows.length ? sortedRows.map((row) => (
                  <tr key={row._id} className="transition-colors hover:bg-indigo-50/30">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${column.width} h-10 border-b border-r border-slate-100 px-2.5 py-2 text-xs text-slate-800`}
                      >
                        <span className="block max-w-80 truncate" title={formatCell(row.values?.[column.key])}>
                          {formatCell(row.values?.[column.key])}
                        </span>
                      </td>
                    ))}
                    <td className="sticky right-0 border-b border-slate-100 bg-white/95 px-2.5 py-2 backdrop-blur-xs">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Sao chép để thêm đơn hàng mới"
                          title="Sao chép nội dung dòng này để thêm mới"
                          onClick={() => openDialog(row, true)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Copy size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Sửa dòng"
                          title="Sửa dòng này"
                          onClick={() => openDialog(row)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="h-8 w-8 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Xóa dòng"
                          title="Xóa dòng này"
                          onClick={() => removeRow(row)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        >
                          {deletingRowId === row._id
                            ? <LoaderCircle size={14} className="animate-spin text-rose-600" />
                            : <Trash2 size={14} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="h-28 text-center text-xs font-medium text-slate-500">
                      {selectedReport ? 'Không có dòng dữ liệu phù hợp với bộ lọc.' : 'Chưa có báo cáo chứa sheet nhu cầu đơn hàng.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3.5 text-xs font-semibold text-slate-500 bg-slate-50/50">
                <LoaderCircle size={16} className="animate-spin text-indigo-600" /> Đang tải thêm dòng tiếp theo…
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3.5 bg-slate-50/40 text-xs font-semibold text-slate-500">
            <span>
              Đang hiển thị <strong className="text-slate-900">{rows.length.toLocaleString('vi-VN')}</strong> / {total.toLocaleString('vi-VN')} dòng
            </span>
            {sortState?.column && (
              <span className="text-[11px] font-medium text-indigo-600">
                Đang sắp xếp: {columnDefinitionByKey.get(sortState.column)?.title || sortState.column} ({sortState.direction === 'asc' ? 'A → Z' : 'Z → A'})
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* Edit / Create Dialog */}
      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        {dialog && (
          <DialogContent closeDisabled={saving} className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-3xl p-0 shadow-2xl border-slate-200">
            <DialogHeader className="flex-row items-center justify-between border-b border-slate-100 px-6 py-5 bg-slate-50/50">
              <DialogTitle className="font-extrabold text-base text-slate-900">
                {dialog?.mode === 'edit'
                  ? 'Sửa dòng nhu cầu đơn hàng'
                  : dialog?.mode === 'copy'
                    ? 'Sửa nội dung sao chép & thêm dòng mới'
                    : 'Thêm dòng nhu cầu đơn hàng mới'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveRow} className="flex min-h-0 flex-1 flex-col">
              <div className="grid gap-3.5 overflow-y-auto p-6 sm:grid-cols-2 lg:grid-cols-3">
                {columns.map((column) => (
                  <label key={column.key} className="min-w-0">
                    <span className="mb-1 block truncate text-xs font-bold text-slate-700" title={column.title}>
                      {column.title}
                    </span>
                    <Input
                      type="text"
                      maxLength={20000}
                      value={formValues[column.key] ?? ''}
                      onChange={(event) => setFormValues((values) => ({
                        ...values,
                        [column.key]: event.target.value,
                      }))}
                      className="h-9 w-full"
                    />
                  </label>
                ))}
              </div>
              <footer className="flex justify-end gap-2.5 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <Button type="button" variant="outline" size="sm" onClick={closeDialog} disabled={saving}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}
                  {dialog?.mode === 'edit' ? 'Lưu thay đổi' : 'Thêm dòng mới'}
                </Button>
              </footer>
            </form>
          </DialogContent>
        )}
      </Dialog>
    </QcLayout>
  );
}
