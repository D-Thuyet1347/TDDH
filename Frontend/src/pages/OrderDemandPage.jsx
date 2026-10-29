import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  Download,
  Filter,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createOrderDemandRow,
  deleteOrderDemandRow,
  getOrderDemandReportFileUrl,
  getOrderDemandReports,
  getOrderDemandRows,
  updateOrderDemandRow,
} from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Table } from '../components/ui/table';

const SHEET_NAME = 'Nhu cầu đơn hàng HRC';
const PAGE_SIZE = 50;
const LOAD_MORE_THRESHOLD = 240;

const columnDefinitions = [
  { key: 'nhu_cau', title: 'Nhu cầu', width: 'min-w-28', color: 'bg-[#dce6f8]' },
  { key: 'thang', title: 'Tháng', width: 'min-w-20', color: 'bg-[#b8d5fa]' },
  { key: 'dot', title: 'Đợt', width: 'min-w-20', color: 'bg-[#dce6f8]' },
  { key: 'khach_hang', title: 'Khách hàng', width: 'min-w-44', color: 'bg-[#dce6f8]' },
  { key: 'thoi_gian_giao_hang', title: 'Thời gian giao hàng', width: 'min-w-36', color: 'bg-[#dce6f8]' },
  { key: 'cw', title: 'CW', width: 'min-w-16', color: 'bg-[#dce6f8]' },
  { key: 'po', title: 'PO', width: 'min-w-28', color: 'bg-[#dce6f8]' },
  { key: 'xx', title: 'xx', width: 'min-w-16', color: 'bg-[#dce6f8]' },
  { key: 'tdc_code', title: 'TDC Code', width: 'min-w-44', color: 'bg-[#f5b5bd] text-red-700' },
  { key: 'tdc', title: 'TDC', width: 'min-w-56', color: 'bg-[#dce6f8]' },
  { key: 'yeu_cau_dac_biet_skin_skin', title: 'Yêu cầu đặc biệt Skin/Skin', width: 'min-w-64', color: 'bg-[#dce6f8]' },
  { key: 'ten_goi', title: 'Tên gọi', width: 'min-w-48', color: 'bg-[#dce6f8]' },
  { key: 'ycdb', title: 'YCĐB', width: 'min-w-24', color: 'bg-[#dce6f8]' },
  { key: 'txw', title: 'TxW', width: 'min-w-24', color: 'bg-[#dce6f8]' },
  { key: 'mac_thep', title: 'Mác thép', width: 'min-w-28', color: 'bg-[#dce6f8]' },
  { key: 't', title: 'T', width: 'min-w-16', color: 'bg-[#dce6f8]' },
  { key: 'w', title: 'W', width: 'min-w-16', color: 'bg-[#dce6f8]' },
  { key: 'kl_1c', title: 'KL_1C', width: 'min-w-20', color: 'bg-[#dce6f8]' },
  { key: 'kl_1d', title: 'KL_1D', width: 'min-w-20', color: 'bg-[#dce6f8]' },
  { key: 'thua_thieu_so_voi_zbc04b', title: 'Thừa thiếu so với ZBC04B', width: 'min-w-28', color: 'bg-rose-100 text-rose-800' },
  { key: 'loai_1', title: 'Loại 1', width: 'min-w-20', color: 'bg-lime-200 text-lime-950' },
  { key: 'loai_2', title: 'Loại 2', width: 'min-w-20', color: 'bg-amber-200 text-amber-950' },
  { key: 'cho_xu_ly', title: 'Chờ xử lý', width: 'min-w-20', color: 'bg-yellow-100 text-yellow-900' },
  { key: 'cho_skin', title: 'Chờ skin', width: 'min-w-20', color: 'bg-yellow-100 text-yellow-900' },
  { key: 'tong_sl_sx_kcs', title: 'Tổng SL sx KCS', width: 'min-w-24', color: 'bg-emerald-100 text-emerald-900' },
  { key: 'ke_hoach_can', title: 'Kế hoạch cán', width: 'min-w-24', color: 'bg-emerald-100 text-emerald-900' },
  { key: 'tinh_trang', title: 'Tình trạng', width: 'min-w-28', color: 'bg-yellow-100 text-yellow-900' },
  { key: 'ton_phoi', title: 'Tồn phôi', width: 'min-w-24', color: 'bg-emerald-100 text-emerald-900' },
  {
    key: 'phoi_tam_6_12m_ty_le_1a_hoac_loai_1ab_sau_skin_ty_le_1b_sau_skin',
    title: 'Phôi tấm 6-12m · Tỷ lệ 1A hoặc loại 1AB sau skin · Tỷ lệ 1B sau skin',
    width: 'min-w-72',
    color: 'bg-[#dce6f8]',
  },
  { key: 'quy_cach_phoi_tam', title: 'Quy cách phôi tấm', width: 'min-w-72', color: 'bg-[#dce6f8]' },
  { key: 'ket_qua_can', title: 'Kết quả cán', width: 'min-w-36', color: 'bg-emerald-100 text-emerald-900' },
  { key: 'ma_khach_hang', title: 'Mã khách hàng', width: 'min-w-44', color: 'bg-blue-700 text-white' },
  { key: 'day_muc_tieu', title: 'Dày mục tiêu', width: 'min-w-24', color: 'bg-[#dce6f8]' },
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
  const [filterDraft, setFilterDraft] = useState('');
  const [activeFilterColumn, setActiveFilterColumn] = useState('');
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [formValues, setFormValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [deletingRowId, setDeletingRowId] = useState('');
  const tableScrollRef = useRef(null);
  const queryVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const activeFilterCount = Object.values(filters).filter((value) => value.trim()).length;

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
          color: 'bg-[#dce6f8]',
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
    setNotice('');
  };

  const toggleColumnFilter = (columnKey) => {
    if (activeFilterColumn === columnKey) {
      setActiveFilterColumn('');
      return;
    }
    setFilterDraft(filters[columnKey] || '');
    setActiveFilterColumn(columnKey);
  };

  const applyColumnFilter = (columnKey) => {
    const value = filterDraft.trim();
    setFilters((current) => {
      const next = { ...current };
      if (value) next[columnKey] = value;
      else delete next[columnKey];
      return next;
    });
    setActiveFilterColumn('');
  };

  const clearColumnFilter = (columnKey) => {
    setFilters((current) => {
      const next = { ...current };
      delete next[columnKey];
      return next;
    });
    setFilterDraft('');
    setActiveFilterColumn('');
  };

  const syncRows = () => {
    setError('');
    setNotice('');
    setReloadKey((key) => key + 1);
  };

  const openDialog = (row = null, copy = false) => {
    setDialog({
      mode: copy ? 'copy' : row ? 'edit' : 'create',
      rowId: copy || !row ? '' : row._id,
    });
    setFormValues(createEmptyValues(
      columns.map((column) => column.key),
      row?.values
    ));
    setError('');
    setNotice('');
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(false);
  };

  const saveRow = async (event) => {
    event.preventDefault();
    if (!selectedReport || saving) return;
    setSaving(true);
    setError('');
    try {
      if (dialog?.mode === 'edit') {
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
      <div className="space-y-5 w-1450px max-w-full">
        <header>
          <Link
            to="/data"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#526bb9] hover:underline"
          >
            <ArrowLeft size={14} /> Tất cả dữ liệu
          </Link>
          <p className="mt-3 text-xs font-semibold text-blue-700">
            Theo dõi đơn hàng
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            Nhu cầu đơn hàng HRC
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Quản lý dữ liệu nhu cầu đơn hàng trong báo cáo Excel đã tải lên.
          </p>
        </header>

        {error && (
          <Alert variant="destructive" className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {error}
          </Alert>
        )}
        {notice && !error && (
          <Alert role="status" variant="success" className="rounded-xl px-4 py-3 text-sm">
            {notice}
          </Alert>
        )}

        <Card className="w-full overflow-hidden rounded-2xl border-slate-200/80">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <ClipboardList size={17} className="text-[#526bb9]" />
            <h2 className="text-sm font-extrabold text-slate-800">
              Bảng nhu cầu đơn hàng
            </h2>
            <span className="text-xs text-slate-400">{columns.length} cột</span>
            <label className="ml-auto min-w-48 flex-1 sm:max-w-64">
              <span className="sr-only">Báo cáo</span>
              <Select
                value={reportId}
                onChange={selectReport}
                disabled={loadingReports || reports.length === 0}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7992dc]"
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
            {selectedReport && (
              <Button asChild variant="outline" size="sm">
                <a href={getOrderDemandReportFileUrl(reportId)}><Download size={15} /> Tải Excel</a>
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <label className="relative min-w-56 flex-1 sm:max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Tìm trong tất cả cột…"
                className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-[#7992dc]"
              />
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncRows}
              disabled={!reportId || loadingRows}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={loadingRows ? 'animate-spin' : ''} />
              Đồng bộ dữ liệu
            </Button>
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                    setFilters({});
                  }}
                className="h-9 rounded-lg px-3 text-sm font-bold text-[#405bb0] hover:bg-blue-50"
              >
                Xóa {activeFilterCount} bộ lọc
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={() => openDialog()}
              disabled={!selectedReport || loadingReports}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#405bb0] px-3 text-sm font-bold text-white hover:bg-[#334a98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} /> Thêm dòng
            </Button>
          </div>

          <div
            ref={tableScrollRef}
            onScroll={handleTableScroll}
            className="max-h-[75vh] overflow-auto"
          >
            <Table wrapperClassName="contents" className="w-full min-w-max border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      scope="col"
                      className={`${column.width} relative border-b border-r border-white/70 px-2 py-2.5 text-center align-middle text-[11px] font-extrabold leading-4 ${column.color}`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="whitespace-normal">{column.title}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Mở bộ lọc cột ${column.title}`}
                          aria-expanded={activeFilterColumn === column.key}
                          title={filters[column.key] ? `Đang lọc: ${filters[column.key]}` : `Lọc ${column.title}`}
                          onClick={() => toggleColumnFilter(column.key)}
                          className={`shrink-0 rounded p-1 transition hover:bg-black/10 ${
                            filters[column.key] ? 'text-[#263f94]' : 'text-slate-500'
                          }`}
                        >
                          <Filter size={13} />
                        </Button>
                      </div>
                      {activeFilterColumn === column.key && (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            applyColumnFilter(column.key);
                          }}
                          onClick={(event) => event.stopPropagation()}
                          className="absolute left-0 top-full z-30 w-60 rounded-lg border border-slate-200 bg-white p-3 text-left font-normal text-slate-700 shadow-xl"
                        >
                          <label className="block text-xs font-bold text-slate-700">
                            Lọc cột: {column.title}
                            <Input
                              autoFocus
                              type="search"
                              aria-label={`Giá trị lọc cho cột ${column.title}`}
                              value={filterDraft}
                              onChange={(event) => setFilterDraft(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') setActiveFilterColumn('');
                              }}
                              placeholder="Nhập nội dung cần tìm…"
                              className="mt-2 h-9 w-full rounded-md border border-slate-200 px-2.5 text-sm font-normal outline-none focus:border-[#7992dc]"
                            />
                          </label>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => clearColumnFilter(column.key)}
                              className="rounded-md px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Xóa lọc
                            </Button>
                            <Button
                              type="submit"
                              className="rounded-md bg-[#405bb0] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#334a98]"
                            >
                              Áp dụng
                            </Button>
                          </div>
                        </form>
                      )}
                    </th>
                  ))}
                  <th scope="col" className="sticky right-0 min-w-24 border-b border-slate-200 bg-slate-100 px-2 py-2 text-center text-[11px] font-extrabold text-slate-600">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {loadingRows ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="h-24 text-center text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle size={17} className="animate-spin" /> Đang tải dữ liệu…
                      </span>
                    </td>
                  </tr>
                ) : rows.length ? rows.map((row) => (
                  <tr key={row._id} className="hover:bg-blue-50/50">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${column.width} h-10 border-b border-r border-slate-200 px-2 text-xs text-slate-700`}
                      >
                        <span className="block max-w-80 truncate" title={formatCell(row.values?.[column.key])}>
                          {formatCell(row.values?.[column.key])}
                        </span>
                      </td>
                    ))}
                    <td className="sticky right-0 border-b border-slate-200 bg-white px-2">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          aria-label="Sao chép để sửa và thêm đơn hàng mới"
                          title="Sao chép nội dung để sửa rồi thêm thành dòng mới"
                          onClick={() => openDialog(row, true)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          <Copy size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Sửa dòng"
                          title="Sửa dòng"
                          onClick={() => openDialog(row)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="rounded-md p-2 text-[#405bb0] hover:bg-blue-50 disabled:opacity-50"
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Xóa dòng"
                          title="Xóa dòng"
                          onClick={() => removeRow(row)}
                          disabled={Boolean(deletingRowId || saving)}
                          className="rounded-md p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                        >
                          {deletingRowId === row._id
                            ? <LoaderCircle size={15} className="animate-spin" />
                            : <Trash2 size={15} />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length + 1} className="h-24 text-center text-sm text-slate-500">
                      {selectedReport ? 'Không có dòng dữ liệu phù hợp.' : 'Chưa có báo cáo chứa sheet nhu cầu đơn hàng.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 border-t border-slate-100 py-3 text-xs text-slate-500">
                <LoaderCircle size={15} className="animate-spin" /> Đang tải thêm dòng…
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <span className="text-xs text-slate-500">
              Đang hiển thị {rows.length.toLocaleString('vi-VN')} / {total.toLocaleString('vi-VN')} dòng
            </span>
          </div>
        </Card>
      </div>

      <Dialog
        open={Boolean(dialog)}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        {dialog && (
          <DialogContent closeDisabled={saving} className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
            <DialogHeader className="flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
              <DialogTitle className="font-extrabold text-slate-800">
                {dialog?.mode === 'edit'
                  ? 'Sửa dòng nhu cầu'
                  : dialog?.mode === 'copy'
                    ? 'Sửa nội dung sao chép và thêm dòng mới'
                    : 'Thêm dòng nhu cầu'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={saveRow} className="flex min-h-0 flex-1 flex-col">
              <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-3">
                {columns.map((column) => (
                  <label key={column.key} className="min-w-0">
                    <span className="mb-1 block truncate text-xs font-bold text-slate-600" title={column.title}>
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
                      className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#7992dc]"
                    />
                  </label>
                ))}
              </div>
              <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
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
