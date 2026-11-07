import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Download,
  Plus,
  Trash2,
  Copy,
  LoaderCircle,
  Calendar,
  Layers,
  Upload,
  AlertCircle,
  Sparkles,
  RotateCcw,
  CheckSquare,
  ArrowRight,
  ClipboardPaste,
  FileText,
  RefreshCw,
  Columns,
  X,
  Undo2,
  Calculator,
  Link2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QcLayout from '../components/QcLayout';
import ExcelFilterDropdown from '../components/ExcelFilterDropdown';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table } from '../components/ui/table';
import {
  getSkinSheetRows,
  loadSkinDataSource,
  uploadSkinDataSource,
  addSkinRow,
  addSkinRowsBatch,
  importSkinPasteRows,
  pasteSkinColumnData,
  copyPoHsmToSkin,
  syncCheckDataSkin,
  transferDataSourceToSkin,
  deleteSkinRowsBatch,
  updateSkinRow,
  deleteSkinRow,
  clearSkinSheet,
  getSkinStats,
  getSkinUndoInfo,
  undoSkinSheetAction,
  recalculateSkinSheet,
  autoLinkSkinPoNew,
  generateSkinGetData,
  getExportSkinGetDataUrl,
  fetchSkinGhc,
} from '../AllAPIs';
import { nf } from '../utils/ultils';
import { successToast, errorToast } from '../utils/toast';

const PASTE_FORM_COLUMNS = [
  'ID Cuộn Bó',
  'Material Description',
  'Khối lượng',
  'Ngày sản xuất',
  'Ca',
  'Vị trí',
  'Order',
];

const SKIN_HRC2_COLUMNS = [
  'HƯỚNG XỬ LÝ_WEB',
  'Loại',
  'Kế hoạch',
  'PO Tháng',
  'PO Xử lý',
  'Material Description_SPM',
  'Khách hàng',
  'Đã chạy',
  'Check Trùng',
  'ID Cuộn Bó',
  'Material Description',
  'Khối lượng',
  'Ngày sản xuất',
  'Ca',
  'Vị trí',
  'Order',
  'Thickness',
  'DVKTKH',
  'Chỉ định Skin',
  'Mục đích sử dụng',
  'Ưu tiên đơn hàng',
  'Lỗi lệch',
  'Tháng',
];

const DATA_SOURCE_COLUMNS = [
  'ORDER',
  'TỔNG CẤP CHẤT LƯỢNG',
  'PHÂN LOẠI',
  'TÌNH TRẠNG CHẤT LƯỢNG',
  'HƯỚNG XỬ LÝ',
  'LỖI LỆCH TDC',
  'NGÀY SẢN XUẤT',
  'ID XỬ LÝ',
  'ID GỐC',
  'KHỐI LƯỢNG TỊNH',
  'GHC',
  'Elongation',
  'Ghi Chú',
];

const PO_HSM_COLUMNS = [
  'Tháng',
  'Đợt',
  'Khách hàng',
  'PO_HSM',
  'Tên gọi_HSM',
  'CW',
  'KH_Loại 1',
  'Mục đích sử dụng',
  'KL_Chờ SKIN',
  'KL_Loại 1',
  'Min_CW',
  'Chỉ định đặc biệt',
];

const PO_SKIN_COLUMNS = [
  'Tháng',
  'Đợt',
  'Khách hàng',
  'PO_HSM',
  'PO_SPM',
  'Tên gọi_HSM',
  'Tên gọi_SPM',
  'CW',
  'KH_Loại 1',
  'Mục đích sử dụng',
  'PO_NEW',
  'KL_Chờ SKIN',
  'KL_Loại 1',
  'Min_CW',
  'Chỉ định đặc biệt',
];

const DATA_MES_COLUMNS = [
  'Line',
  'Plan',
  'ID HRC',
  'Comment',
  'PO',
  'Thickness',
  'Width',
  'Weight',
  'Grade',
  'Status',
  'Location',
  'Weight_2',
];

const GET_DATA_COLUMNS = [
  'Line',
  'Yêu cầu đặt biệt',
  'STT',
  'Plan ID',
  'ID Coil',
  'Tên gọi',
  'PO',
  'Thickness',
  'Width',
  'Weight',
  'Steel grade',
  'Ngày sản xuất',
  'Mục đích sử dụng',
  'CW',
  'Giới hạn cắt (nếu có)',
  'NM ĐỀ XUẤT',
  'P.DVKTKH & P.QLCL',
  'Tống hợp lỗi',
];

const CHECK_DATA_SKIN_COLUMNS = [
  'ID HRC_1',
  'Hướng Xử lý_1',
  'Loại_1',
  'Ngày sản xuất_1',
  'ID HRC_2',
  'ID SPM_2',
  'Hướng Xử lý_2',
  'Loại_2',
  'Ngày sản xuất_2',
];

const SHEET_TABS = [
  { id: 'SKIN_HRC2', label: 'SKIN_HRC2', statKey: 'skin_hrc2_count' },
  { id: 'DATA_SOURCE', label: 'DATA_SOURCE', statKey: 'data_source_count' },
  { id: 'PO_HSM', label: 'PO_HSM', statKey: 'po_hsm_count' },
  { id: 'PO_SKIN', label: 'PO_SKIN', statKey: 'po_skin_count' },
  { id: 'DATA_MES', label: 'Data MES', statKey: 'data_mes_count' },
  { id: 'GET_DATA', label: 'Get Data', statKey: 'get_data_count' },
  { id: 'CHECK_DATA_SKIN', label: 'Check_data_SKIN', statKey: 'check_data_skin_count' },
];

const getSheetColumns = (sheetId) => {
  switch (sheetId) {
    case 'SKIN_HRC2': return SKIN_HRC2_COLUMNS;
    case 'DATA_SOURCE': return DATA_SOURCE_COLUMNS;
    case 'PO_HSM': return PO_HSM_COLUMNS;
    case 'PO_SKIN': return PO_SKIN_COLUMNS;
    case 'DATA_MES': return DATA_MES_COLUMNS;
    case 'GET_DATA': return GET_DATA_COLUMNS;
    case 'CHECK_DATA_SKIN': return CHECK_DATA_SKIN_COLUMNS;
    default: return SKIN_HRC2_COLUMNS;
  }
};

const parsePastedTextForSheet = (rawText, sheetId) => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const targetColumns = sheetId === 'SKIN_HRC2' ? PASTE_FORM_COLUMNS : getSheetColumns(sheetId);
  const parsed = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let cells = line.split('\t');
    if (cells.length === 1 && line.includes(';')) {
      cells = line.split(';');
    } else if (cells.length === 1 && line.includes(',')) {
      cells = line.split(',');
    }
    cells = cells.map((c) => c.trim());

    // Skip header row if copied with headers
    const firstCellNorm = (cells[0] || '').toLowerCase().replace(/[\s_]+/g, '');
    if (
      firstCellNorm === 'idcuonbo' ||
      firstCellNorm === 'idcuon' ||
      firstCellNorm === 'stt' ||
      firstCellNorm === 'thang' ||
      firstCellNorm === 'line' ||
      firstCellNorm === 'materialdescription'
    ) {
      continue;
    }

    const rowObj = {};
    targetColumns.forEach((col, idx) => {
      rowObj[col] = cells[idx] || '';
    });

    parsed.push(rowObj);
    if (parsed.length >= 1000) break;
  }
  return parsed;
};

const CHECK_DATA_LABELS = {
  'ID HRC_1': 'ID HRC',
  'Hướng Xử lý_1': 'Hướng Xử lý',
  'Loại_1': 'Loại',
  'Ngày sản xuất_1': 'Ngày sản xuất',
  'ID HRC_2': 'ID HRC',
  'ID SPM_2': 'ID SPM',
  'Hướng Xử lý_2': 'Hướng Xử lý',
  'Loại_2': 'Loại',
  'Ngày sản xuất_2': 'Ngày sản xuất',
};

export default function SkinPage() {
  const [activeSheet, setActiveSheet] = useState('SKIN_HRC2');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);

  // Month selection for loading data
  const currentMonth = new Date().getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));

  // Action states
  const [loadingDataSource, setLoadingDataSource] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [pastingSubmitting, setPastingSubmitting] = useState(false);
  const [pasteTab, setPasteTab] = useState('paste'); // 'paste' | 'single'
  const [singleForm, setSingleForm] = useState({
    'ID Cuộn Bó': '',
    'Material Description': '',
    'Khối lượng': '',
    'Ngày sản xuất': '',
    Ca: '',
    'Vị trí': '',
    Order: '',
  });
  const [batchCount, setBatchCount] = useState(1);
  const [addingBatch, setAddingBatch] = useState(false);
  const [transferring, setTransferring] = useState(false);

  // Column paste states (for PO_HSM)
  const [showPasteColumnModal, setShowPasteColumnModal] = useState(false);
  const [pasteColumnSelected, setPasteColumnSelected] = useState('PO_HSM');
  const [pasteColumnRawText, setPasteColumnRawText] = useState('');
  const [pastingColumnSubmitting, setPastingColumnSubmitting] = useState(false);

  // Special sheet actions states
  const [syncingCheckData, setSyncingCheckData] = useState(false);
  const [copyingPoHsm, setCopyingPoHsm] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [autoLinkingPoNew, setAutoLinkingPoNew] = useState(false);
  const [generatingGetData, setGeneratingGetData] = useState(false);
  const [fetchingGhc, setFetchingGhc] = useState(false);

  // Undo state
  const [undoInfo, setUndoInfo] = useState({ can_undo: false, action_description: null });
  const [undoing, setUndoing] = useState(false);

  // Pagination state (Fix UI Overload)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const [editingCell, setEditingCell] = useState(null); // { rowId, col }
  const [editValue, setEditValue] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [filters, setFilters] = useState({});

  const fileInputRef = useRef(null);
  const cellInputRef = useRef(null);

  const columns = useMemo(() => getSheetColumns(activeSheet), [activeSheet]);

  // Load stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getSkinStats();
      setStats(res);
    } catch (err) {
      console.warn('Lỗi tải thống kê Skin:', err.message);
    }
  }, []);

  // Fetch undo info
  const fetchUndoInfo = useCallback(async () => {
    try {
      const res = await getSkinUndoInfo({ sheetName: activeSheet });
      setUndoInfo(res || { can_undo: false, action_description: null });
    } catch {
      setUndoInfo({ can_undo: false, action_description: null });
    }
  }, [activeSheet]);

  // Load rows for active sheet
  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSkinSheetRows({
        sheetName: activeSheet,
        limit: 100000,
        offset: 0,
        search,
      });
      setRows(res.rows || []);
      setTotalRows(res.total || 0);
    } catch (err) {
      errorToast('Lỗi tải dữ liệu sheet: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSheet, search]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchRows();
    fetchUndoInfo();
    setCurrentPage(1);
    setSelectedRowIds(new Set());
    setActiveRowId(null);
  }, [fetchRows, fetchUndoInfo]);

  // Undo action
  const handleUndo = useCallback(async () => {
    if (!undoInfo?.can_undo || undoing) return;
    setUndoing(true);
    try {
      const res = await undoSkinSheetAction({ sheetName: activeSheet });
      successToast(res.message || 'Đã hoàn tác thao tác thành công!');
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi khi hoàn tác: ' + err.message);
    } finally {
      setUndoing(false);
    }
  }, [undoInfo?.can_undo, undoing, activeSheet, fetchRows, fetchStats, fetchUndoInfo]);

  // Keyboard shortcut Ctrl + Z for Undo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
          return;
        }
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Recalculate sheet formulas (SKIN_HRC2, PO_HSM, PO_SKIN)
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await recalculateSkinSheet({ sheetName: activeSheet });
      successToast(res.message || 'Đã tính toán lại công thức thành công!');
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi tính toán: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // Auto-link PO_NEW in PO_SKIN
  const handleAutoLinkPoNew = async () => {
    setAutoLinkingPoNew(true);
    try {
      const res = await autoLinkSkinPoNew();
      successToast(res.message || 'Đã cập nhật PO_NEW!');
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi cập nhật PO_NEW: ' + err.message);
    } finally {
      setAutoLinkingPoNew(false);
    }
  };

  // Generate Get Data
  const handleGenerateGetData = async () => {
    setGeneratingGetData(true);
    try {
      const res = await generateSkinGetData({ selectedPlans: null });
      successToast(res.message || 'Đã xuất dữ liệu Get Data thành công!');
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi xuất dữ liệu Get Data: ' + err.message);
    } finally {
      setGeneratingGetData(false);
    }
  };

  // Download Get Data Excel
  const handleDownloadGetDataExcel = () => {
    window.open(getExportSkinGetDataUrl(), '_blank');
  };

  // Fetch GHC (YieldPoint) from QC Dashboard for DATA_SOURCE
  const handleFetchGhc = async () => {
    setFetchingGhc(true);
    try {
      const selectedIds = selectedRowIds.size > 0 ? Array.from(selectedRowIds) : null;
      const res = await fetchSkinGhc({ rowIds: selectedIds, onlyMissing: true });
      successToast(res.message || 'Đã cập nhật GHC thành công!');
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi khi lấy GHC từ Dashboard QC: ' + err.message);
    } finally {
      setFetchingGhc(false);
    }
  };


  // Load DATA_SOURCE from QC for current and previous month
  const handleLoadDefault = async () => {
    setLoadingDataSource(true);
    try {
      const res = await loadSkinDataSource({ months: [currentMonth, prevMonth] });
      successToast(res.message || 'Đã nạp dữ liệu thành công!');
      await fetchStats();
      if (activeSheet === 'DATA_SOURCE') {
        await fetchRows();
      } else {
        setActiveSheet('DATA_SOURCE');
      }
    } catch (err) {
      errorToast('Lỗi lấy dữ liệu từ page Dữ liệu: ' + err.message);
    } finally {
      setLoadingDataSource(false);
    }
  };

  // Load DATA_SOURCE by selected month
  const handleLoadByMonth = async () => {
    if (!selectedMonth) return;
    setLoadingDataSource(true);
    try {
      const res = await loadSkinDataSource({ months: [Number(selectedMonth)] });
      successToast(res.message || `Đã lấy dữ liệu tháng ${selectedMonth} thành công!`);
      await fetchStats();
      if (activeSheet === 'DATA_SOURCE') {
        await fetchRows();
      } else {
        setActiveSheet('DATA_SOURCE');
      }
    } catch (err) {
      errorToast('Lỗi lấy dữ liệu theo tháng: ' + err.message);
    } finally {
      setLoadingDataSource(false);
    }
  };

  // Upload Excel directly into DATA_SOURCE
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadSkinDataSource(file);
      successToast(res.message || 'Đã nạp file Excel thành công!');
      await fetchStats();
      if (activeSheet === 'DATA_SOURCE') {
        await fetchRows();
      } else {
        setActiveSheet('DATA_SOURCE');
      }
    } catch (err) {
      errorToast(err.message || 'Lỗi khi nạp file.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add 1 new row
  const handleAddRow = async () => {
    try {
      const res = await addSkinRow({ sheetName: activeSheet, values: {} });
      if (res?.row) {
        setRows((prev) => [res.row, ...prev]);
        setTotalRows((t) => t + 1);
        setActiveRowId(res.row.id);
        successToast('Đã thêm 1 dòng mới!');
        await fetchUndoInfo();
      }
    } catch (err) {
      errorToast('Lỗi thêm dòng: ' + err.message);
    }
  };

  // Add multiple rows (up to 1000)
  const handleBatchAddRows = async (customCount) => {
    const countToAdd = Math.max(1, Math.min(1000, Number(customCount ?? batchCount ?? 1)));
    setAddingBatch(true);
    try {
      const res = await addSkinRowsBatch({
        sheetName: activeSheet,
        count: countToAdd,
        values: null,
      });
      successToast(res.message || `Đã thêm thành công ${countToAdd} dòng mới vào sheet "${activeSheet}"!`);
      setShowAddModal(false);
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi thêm nhiều dòng: ' + err.message);
    } finally {
      setAddingBatch(false);
    }
  };

  // Parsed rows from paste textarea
  const parsedPasteRows = useMemo(() => {
    return parsePastedTextForSheet(pasteRawText, activeSheet);
  }, [pasteRawText, activeSheet]);

  // Confirm paste rows to active sheet
  const handleConfirmPasteRows = async () => {
    let rowsToInsert = [];
    if (pasteTab === 'single') {
      if (activeSheet === 'SKIN_HRC2' && !singleForm['ID Cuộn Bó'] && !singleForm['Order']) {
        errorToast('Vui lòng nhập ít nhất ID Cuộn Bó hoặc Order!');
        return;
      }
      rowsToInsert = [singleForm];
    } else {
      if (!parsedPasteRows.length) {
        errorToast('Vui lòng dán dữ liệu vào ô trước khi bấm Thêm!');
        return;
      }
      rowsToInsert = parsedPasteRows;
    }

    setPastingSubmitting(true);
    try {
      const res = await importSkinPasteRows({
        sheetName: activeSheet,
        rows: rowsToInsert,
      });
      successToast(res.message || `Đã thêm thành công ${rowsToInsert.length} dòng vào sheet ${activeSheet}!`);
      setShowPasteModal(false);
      setPasteRawText('');
      setSingleForm({
        'ID Cuộn Bó': '',
        'Material Description': '',
        'Khối lượng': '',
        'Ngày sản xuất': '',
        Ca: '',
        'Vị trí': '',
        Order: '',
      });
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi khi thêm dòng: ' + err.message);
    } finally {
      setPastingSubmitting(false);
    }
  };

  // Sync Check Data SKIN
  const handleSyncCheckData = async () => {
    setSyncingCheckData(true);
    try {
      const res = await syncCheckDataSkin();
      successToast(res.message || 'Đã tổng hợp Check Data thành công!');
      await fetchStats();
      if (activeSheet === 'CHECK_DATA_SKIN') {
        await fetchRows();
      } else {
        setActiveSheet('CHECK_DATA_SKIN');
      }
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi tổng hợp Check Data: ' + err.message);
    } finally {
      setSyncingCheckData(false);
    }
  };

  // Copy PO_HSM to PO_SKIN
  const handleCopyPoHsmToSkin = async () => {
    setCopyingPoHsm(true);
    try {
      const res = await copyPoHsmToSkin();
      successToast(res.message || 'Đã sao chép từ PO_HSM sang PO_SKIN thành công!');
      await fetchStats();
      if (activeSheet === 'PO_SKIN') {
        await fetchRows();
      } else {
        setActiveSheet('PO_SKIN');
      }
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi sao chép: ' + err.message);
    } finally {
      setCopyingPoHsm(false);
    }
  };

  // Paste Column Data (for PO_HSM)
  const handleConfirmPasteColumn = async () => {
    if (!pasteColumnRawText.trim()) {
      errorToast('Vui lòng nhập hoặc dán dữ liệu cho cột!');
      return;
    }
    const values = pasteColumnRawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!values.length) {
      errorToast('Không tìm thấy giá trị hợp lệ để dán.');
      return;
    }

    setPastingColumnSubmitting(true);
    try {
      const res = await pasteSkinColumnData({
        sheetName: activeSheet,
        columnName: pasteColumnSelected,
        values,
      });
      successToast(res.message || `Đã dán thành công ${values.length} giá trị vào cột "${pasteColumnSelected}"!`);
      setShowPasteColumnModal(false);
      setPasteColumnRawText('');
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi dán cột: ' + err.message);
    } finally {
      setPastingColumnSubmitting(false);
    }
  };

  // Sample paste data
  const handleFillSamplePaste = () => {
    const sample = [
      '24011501\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t25480\t2026-10-15\t1\tA-01\tORD-2026-001',
      '24011502\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t24320\t2026-10-15\t2\tA-02\tORD-2026-002',
      '24011503\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t26100\t2026-10-16\t1\tB-03\tORD-2026-003',
    ].join('\n');
    setPasteRawText(sample);
  };

  // Transfer selected rows from DATA_SOURCE to SKIN_HRC2
  const handleTransferToSkin = async () => {
    if (!selectedRowIds.size) {
      errorToast('Vui lòng tick chọn ít nhất 1 dòng từ DATA_SOURCE để thêm vào SKIN_HRC2!');
      return;
    }
    const rowIds = Array.from(selectedRowIds).slice(0, 1000);
    setTransferring(true);
    try {
      const res = await transferDataSourceToSkin({ rowIds });
      successToast(res.message || `Đã chuyển ${res.count || rowIds.length} dòng vào SKIN_HRC2 thành công!`);
      setSelectedRowIds(new Set());
      await fetchStats();
      setActiveSheet('SKIN_HRC2');
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi chuyển dòng sang SKIN_HRC2: ' + err.message);
    } finally {
      setTransferring(false);
    }
  };

  // Delete active row
  const handleDeleteRow = async (rowId) => {
    const idToDelete = rowId || activeRowId;
    if (!idToDelete) {
      errorToast('Vui lòng chọn 1 dòng cần xóa!');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa dòng này?')) return;

    try {
      await deleteSkinRow({ sheetName: activeSheet, rowId: idToDelete });
      setRows((prev) => prev.filter((r) => r.id !== idToDelete));
      setTotalRows((t) => Math.max(0, t - 1));
      if (activeRowId === idToDelete) setActiveRowId(null);
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(idToDelete);
        return next;
      });
      successToast('Đã xóa dòng thành công!');
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi xóa dòng: ' + err.message);
    }
  };

  // Batch delete selected rows
  const handleBatchDelete = async () => {
    if (!selectedRowIds.size) {
      errorToast('Vui lòng chọn ít nhất 1 dòng cần xóa!');
      return;
    }
    const count = selectedRowIds.size;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${count} dòng đã chọn khỏi sheet "${activeSheet}"?`)) {
      return;
    }
    try {
      const rowIds = Array.from(selectedRowIds);
      const res = await deleteSkinRowsBatch({ sheetName: activeSheet, rowIds });
      successToast(res.message || `Đã xóa ${count} dòng thành công!`);
      setSelectedRowIds(new Set());
      setActiveRowId(null);
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi xóa nhiều dòng: ' + err.message);
    }
  };

  // Clear sheet
  const handleClearSheet = async () => {
    if (!window.confirm(`Bạn có chắc muốn xóa toàn bộ dữ liệu trong sheet "${activeSheet}"?`)) return;
    try {
      await clearSkinSheet({ sheetName: activeSheet });
      setRows([]);
      setTotalRows(0);
      setActiveRowId(null);
      await fetchStats();
      await fetchUndoInfo();
      successToast(`Đã xóa sạch dữ liệu sheet "${activeSheet}"!`);
    } catch (err) {
      errorToast('Lỗi xóa sheet: ' + err.message);
    }
  };

  // Inline edit
  const handleStartEdit = (row, col) => {
    setActiveRowId(row.id);
    setEditingCell({ rowId: row.id, col });
    setEditValue(String(row.values?.[col] ?? ''));
    setTimeout(() => {
      cellInputRef.current?.focus();
      cellInputRef.current?.select();
    }, 40);
  };

  const handleCommitEdit = async () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    const val = editValue.trim();

    try {
      await updateSkinRow({
        sheetName: activeSheet,
        rowId,
        values: { [col]: val },
      });
      setRows((prev) =>
        prev.map((r) => {
          if (r.id === rowId) {
            return { ...r, values: { ...r.values, [col]: val } };
          }
          return r;
        })
      );
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi lưu ô: ' + err.message);
    } finally {
      setEditingCell(null);
    }
  };

  // Export sheet to .xlsx
  const handleExportExcel = () => {
    const sourceRows = filteredAndSortedRows.length ? filteredAndSortedRows : rows;
    if (!sourceRows.length) {
      errorToast('Chưa có dữ liệu để xuất file Excel!');
      return;
    }

    const data = sourceRows.map((r, idx) => {
      const obj = { STT: idx + 1 };
      columns.forEach((col) => {
        obj[col] = r.values?.[col] ?? '';
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeSheet);
    XLSX.writeFile(wb, `Theo_Doi_${activeSheet}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    successToast(`Đã xuất sheet "${activeSheet}" ra file Excel thành công!`);
  };

  // Copy IDs
  const handleCopyIds = (type) => {
    const idField = type === 'ID XỬ LÝ' ? 'ID XỬ LÝ' : 'ID GỐC';
    const sourceRows = filteredAndSortedRows.length ? filteredAndSortedRows : rows;
    const list = sourceRows
      .map((r) => r.values?.[idField] || r.values?.['ID Cuộn Bó'])
      .filter(Boolean);

    if (!list.length) {
      errorToast(`Không có mã ${idField} để sao chép!`);
      return;
    }
    navigator.clipboard.writeText(list.join('\n'));
    setCopiedKey(type);
    setTimeout(() => setCopiedKey(null), 2000);
    successToast(`Đã sao chép ${list.length} ${idField}!`);
  };

  // Excel filter handlers
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

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((val) => {
      if (Array.isArray(val)) return val.length > 0;
      return Boolean(String(val ?? '').trim());
    }).length,
    [filters]
  );

  useEffect(() => {
    setFilters({});
    setSortConfig({ column: null, direction: 'asc' });
    setSelectedRowIds(new Set());
    setActiveRowId(null);
  }, [activeSheet]);

  const filteredAndSortedRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi-VN');
    const result = rows.filter((row) => {
      const values = row.values || {};
      const matchesSearch = !query || Object.values(values).some((value) =>
        String(value ?? '').toLocaleLowerCase('vi-VN').includes(query)
      );

      const matchesFilters = Object.entries(filters).every(([column, filter]) => {
        if (!filter) return true;
        const cellRaw = values[column];
        const cellStr = cellRaw === null || cellRaw === undefined ? '' : String(cellRaw).trim();

        if (Array.isArray(filter)) {
          if (filter.length === 0) return true;
          if (filter.includes('__NO_MATCH__')) return false;

          return filter.some((f) => {
            if (f === '__BLANK__' || f === '' || f === '(Trống)') {
              return !cellStr || cellStr === '—' || cellStr === '-';
            }
            return cellStr.toLocaleLowerCase('vi-VN') === String(f).trim().toLocaleLowerCase('vi-VN');
          });
        }

        return cellStr.toLocaleLowerCase('vi-VN').includes(String(filter).trim().toLocaleLowerCase('vi-VN'));
      });

      return matchesSearch && matchesFilters;
    });

    if (sortConfig?.column) {
      const { column, direction } = sortConfig;
      result.sort((a, b) => {
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
    }

    return result;
  }, [rows, search, filters, sortConfig]);

  // Selection helpers
  const handleToggleSelectRow = (rowId, e) => {
    e?.stopPropagation?.();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        if (next.size >= 1000) {
          errorToast('Chỉ có thể chọn tối đa 1.000 dòng 1 lúc!');
          return next;
        }
        next.add(rowId);
      }
      return next;
    });
  };

  // Pagination calculations (fixes UI overload by displaying only pageSize rows)
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSortedRows.slice(start, start + pageSize);
  }, [filteredAndSortedRows, safeCurrentPage, pageSize]);

  // Selection helpers (operates on current page)
  const isAllPageSelected = useMemo(() => {
    if (!paginatedRows.length) return false;
    return paginatedRows.every((r) => selectedRowIds.has(r.id));
  }, [paginatedRows, selectedRowIds]);

  const isPageIndeterminate = useMemo(() => {
    if (!paginatedRows.length) return false;
    const some = paginatedRows.some((r) => selectedRowIds.has(r.id));
    return some && !isAllPageSelected;
  }, [paginatedRows, selectedRowIds, isAllPageSelected]);

  const handleToggleSelectAllPage = (e) => {
    const next = new Set(selectedRowIds);
    if (e.target.checked) {
      paginatedRows.forEach((r) => next.add(r.id));
      if (next.size > 1000) {
        const trimmed = new Set(Array.from(next).slice(0, 1000));
        setSelectedRowIds(trimmed);
        errorToast('Đã chọn tối đa 1.000 dòng!');
      } else {
        setSelectedRowIds(next);
      }
    } else {
      paginatedRows.forEach((r) => next.delete(r.id));
      setSelectedRowIds(next);
    }
  };

  const handleClearSelection = () => {
    setSelectedRowIds(new Set());
  };

  return (
    <QcLayout>
      <div className="space-y-5">
        {/* TOP HEADER */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200/70 mb-1.5">
              <Layers size={13} className="text-emerald-600" /> Kế hoạch & Điều phối Skin HRC2
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Theo dõi SKIN
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Quản lý 7 sheet: <strong>SKIN_HRC2</strong>, <strong>DATA_SOURCE</strong>, <strong>PO_HSM</strong>, <strong>PO_SKIN</strong>, <strong>Data MES</strong>, <strong>Get Data</strong>, <strong>Check_data_SKIN</strong>.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />

            {/* Load Default Button: Current & Previous Month */}
            <Button
              type="button"
              disabled={loadingDataSource}
              onClick={handleLoadDefault}
              className="h-9 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500"
              title="Lấy toàn bộ dữ liệu của tháng hiện tại và tháng trước đó từ page Dữ liệu"
            >
              {loadingDataSource ? (
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Sparkles size={14} className="mr-1.5 text-emerald-200" />
              )}
              Load toàn bộ dữ liệu (T.{currentMonth} & T.{prevMonth})
            </Button>

            {/* Load by Month Selection */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
              <span className="pl-2 text-xs font-medium text-slate-500 flex items-center gap-1">
                <Calendar size={13} /> Tháng:
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-8 rounded-lg border-none bg-transparent px-2 text-xs font-bold text-slate-800 focus:ring-0"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m} {m === currentMonth ? '(Hiện tại)' : m === prevMonth ? '(Trước)' : ''}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={loadingDataSource}
                onClick={handleLoadByMonth}
                className="h-8 rounded-lg border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Lấy theo tháng
              </Button>
            </div>

            {/* Direct Excel Upload Button */}
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Tải file Excel trực tiếp vào DATA_SOURCE"
            >
              {uploading ? (
                <LoaderCircle size={14} className="mr-1.5 animate-spin text-indigo-600" />
              ) : (
                <Upload size={14} className="mr-1.5 text-indigo-600" />
              )}
              Nạp Excel QC
            </Button>

            {/* Export Excel Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
              title="Xuất dữ liệu sheet đang xem ra file Excel .xlsx"
            >
              <Download size={14} className="mr-1.5 text-emerald-600" />
              Xuất Excel
            </Button>
          </div>
        </header>

        {/* SHEET TABS (7 SHEETS) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {SHEET_TABS.map((tab) => {
              const isCurrent = activeSheet === tab.id;
              const rowCount = stats?.[tab.statKey] || (isCurrent ? totalRows : 0);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSheet(tab.id)}
                  className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-bold transition-all whitespace-nowrap rounded-t-lg ${
                    isCurrent
                      ? 'border-emerald-600 text-emerald-900 bg-emerald-50/80 shadow-2xs'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <FileSpreadsheet size={14} className={isCurrent ? 'text-emerald-600' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <Badge variant="outline" className={`text-[10px] font-mono px-1.5 py-0 ${
                    isCurrent ? 'bg-white text-emerald-800 border-emerald-300 font-bold' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {nf(rowCount)}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* Quick stats badge for DATA_SOURCE */}
          {activeSheet === 'DATA_SOURCE' && stats?.months_distribution?.length > 0 && (
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-500 pb-1">
              <span>Tháng có dữ liệu:</span>
              {stats.months_distribution.map((item) => (
                <span key={item.month} className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
                  T{item.month}: {nf(item.count)}
                </span>
              ))}
            </div>
          )}

          {/* Quick stats badge for CHECK_DATA_SKIN */}
          {activeSheet === 'CHECK_DATA_SKIN' && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 pb-1">
              <span className="rounded bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 border border-emerald-200">
                1. Chờ Skin chưa có: {nf(stats?.check_data_skin_count || totalRows)} cuộn
              </span>
            </div>
          )}
        </div>

        {/* TOOLBAR FOR ACTIVE SHEET */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Hoàn tác (Undo) Button */}
            <Button
              type="button"
              onClick={handleUndo}
              disabled={!undoInfo?.can_undo || undoing}
              className={`h-8 rounded-lg text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all ${
                undoInfo?.can_undo
                  ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
              }`}
              title={
                undoInfo?.can_undo
                  ? `Hoàn tác thao tác trước: ${undoInfo.action_description || ''} (Phím tắt: Ctrl + Z)`
                  : 'Không có thao tác nào để hoàn tác (Ctrl + Z)'
              }
            >
              {undoing ? <LoaderCircle size={13} className="animate-spin text-white" /> : <Undo2 size={13} />}
              Hoàn tác
            </Button>

            {/* Batch Add Split Button */}
            <div className="inline-flex rounded-lg shadow-2xs overflow-hidden border border-emerald-700/20">
              <Button
                type="button"
                onClick={handleAddRow}
                className="h-8 rounded-r-none bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 border-r border-emerald-500/50"
                title="Thêm 1 dòng trống"
              >
                <Plus size={13} className="mr-1" /> Thêm dòng
              </Button>
              <Button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="h-8 rounded-l-none bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-2.5"
                title="Thêm nhiều dòng cùng một lúc (Tối đa 1.000 dòng)"
              >
                + Thêm nhiều dòng (1-1000)...
              </Button>
            </div>

            {/* Paste from Excel Button */}
            <Button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
              title={`Dán nhanh dữ liệu từ Excel vào sheet ${activeSheet}`}
            >
              <ClipboardPaste size={14} /> Dán từ Excel ({activeSheet === 'SKIN_HRC2' ? '7 cột' : 'Nhiều cột'})
            </Button>

            {/* SKIN_HRC2 Specific Buttons */}
            {activeSheet === 'SKIN_HRC2' && (
              <Button
                type="button"
                onClick={handleRecalculate}
                disabled={recalculating}
                className="h-8 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                title="Tính lại toàn bộ công thức XLOOKUP/LET từ DATA_SOURCE và PO"
              >
                {recalculating ? <LoaderCircle size={13} className="animate-spin" /> : <Calculator size={13} />}
                Tính lại công thức
              </Button>
            )}

            {/* PO_HSM Specific Buttons */}
            {activeSheet === 'PO_HSM' && (
              <>
                <Button
                  type="button"
                  onClick={() => setShowPasteColumnModal(true)}
                  className="h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Dán dữ liệu theo từng cột cụ thể từ file Excel"
                >
                  <Columns size={13} /> Dán theo cột
                </Button>
                <Button
                  type="button"
                  onClick={handleCopyPoHsmToSkin}
                  disabled={copyingPoHsm}
                  className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Sao chép các cột tương ứng từ PO_HSM sang PO_SKIN"
                >
                  {copyingPoHsm ? <LoaderCircle size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  Sao chép sang PO_SKIN
                </Button>
                <Button
                  type="button"
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="h-8 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Tính toán lại Min_CW, Chỉ định đặc biệt, KL_Loại 1, KL_Chờ SKIN"
                >
                  {recalculating ? <LoaderCircle size={13} className="animate-spin" /> : <Calculator size={13} />}
                  Tính lại công thức
                </Button>
              </>
            )}

            {/* PO_SKIN Specific Buttons */}
            {activeSheet === 'PO_SKIN' && (
              <>
                <Button
                  type="button"
                  onClick={handleCopyPoHsmToSkin}
                  disabled={copyingPoHsm}
                  className="h-8 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Lấy dữ liệu các cột chung từ PO_HSM sang PO_SKIN"
                >
                  {copyingPoHsm ? <LoaderCircle size={13} className="animate-spin" /> : <Layers size={13} />}
                  Lấy từ PO_HSM
                </Button>
                <Button
                  type="button"
                  onClick={handleAutoLinkPoNew}
                  disabled={autoLinkingPoNew}
                  className="h-8 rounded-lg bg-purple-700 hover:bg-purple-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Tự động thêm PO vào PO_NEW của tháng trước khi trùng Khách hàng và Tên gọi_HSM với tháng sau"
                >
                  {autoLinkingPoNew ? <LoaderCircle size={13} className="animate-spin" /> : <Link2 size={13} />}
                  Cập nhật PO_NEW
                </Button>
                <Button
                  type="button"
                  onClick={handleRecalculate}
                  disabled={recalculating}
                  className="h-8 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Tính toán lại Min_CW, Chỉ định đặc biệt, KL_Loại 1, KL_Chờ SKIN"
                >
                  {recalculating ? <LoaderCircle size={13} className="animate-spin" /> : <Calculator size={13} />}
                  Tính lại công thức
                </Button>
              </>
            )}

            {/* GET_DATA Specific Buttons */}
            {activeSheet === 'GET_DATA' && (
              <>
                <Button
                  type="button"
                  onClick={handleGenerateGetData}
                  disabled={generatingGetData}
                  className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Tổng hợp và xuất dữ liệu Get Data theo logic script"
                >
                  {generatingGetData ? <LoaderCircle size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Xuất dữ liệu Get Data
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadGetDataExcel}
                  className="h-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                  title="Tải file Excel định dạng chuẩn DD/MM/YYYY"
                >
                  <Download size={13} /> Tải Excel Get Data
                </Button>
              </>
            )}

            {/* CHECK_DATA_SKIN Specific Button */}
            {activeSheet === 'CHECK_DATA_SKIN' && (
              <Button
                type="button"
                onClick={handleSyncCheckData}
                disabled={syncingCheckData}
                className="h-8 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5"
                title="Tổng hợp dữ liệu đối chiếu từ DATA_SOURCE so với sheet SKIN_HRC2"
              >
                {syncingCheckData ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Tổng hợp Check Data
              </Button>
            )}

            {/* Transfer to SKIN_HRC2 button when in DATA_SOURCE */}
            {activeSheet === 'DATA_SOURCE' && (
              <>
                <Button
                  type="button"
                  disabled={transferring || selectedRowIds.size === 0}
                  onClick={handleTransferToSkin}
                  className={`h-8 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 px-3 ${
                    selectedRowIds.size > 0
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-400'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                  title="Thêm các dòng đang chọn vào sheet SKIN_HRC2 (tối đa 1.000 dòng)"
                >
                  {transferring ? (
                    <LoaderCircle size={14} className="animate-spin text-white" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Thêm vào SKIN_HRC2 ({selectedRowIds.size} dòng)
                  <ArrowRight size={13} className="opacity-80" />
                </Button>

                <Button
                  type="button"
                  onClick={handleFetchGhc}
                  disabled={fetchingGhc}
                  className="h-8 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3 shadow-2xs flex items-center gap-1.5 transition-all"
                  title="Lấy giới hạn chảy (GHC / YieldPoint) từ web Dashboard QC và cập nhật vào cột GHC"
                >
                  {fetchingGhc ? (
                    <LoaderCircle size={13} className="animate-spin text-white" />
                  ) : (
                    <Zap size={13} />
                  )}
                  {selectedRowIds.size > 0
                    ? `Lấy GHC (${selectedRowIds.size} dòng đã chọn)`
                    : 'Lấy dữ liệu GHC'}
                </Button>
              </>
            )}

            {/* Selection indicators & actions */}
            {selectedRowIds.size > 0 ? (
              <>
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 text-xs text-emerald-800 font-semibold">
                  <CheckSquare size={13} className="text-emerald-600" />
                  <span>Đã chọn: <strong>{selectedRowIds.size}</strong> dòng</span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="ml-1 text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBatchDelete}
                  className="h-8 rounded-lg border-rose-300 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  title={`Xóa ${selectedRowIds.size} dòng đã chọn`}
                >
                  <Trash2 size={13} className="mr-1 text-rose-600" /> Xóa ({selectedRowIds.size}) đã chọn
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                disabled={!activeRowId}
                onClick={() => handleDeleteRow(activeRowId)}
                className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
              >
                <Trash2 size={13} className="mr-1" /> Xóa dòng
              </Button>
            )}

            {activeSheet === 'DATA_SOURCE' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyIds('ID GỐC')}
                  className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy size={13} className="mr-1 text-slate-400" />
                  {copiedKey === 'ID GỐC' ? 'Đã sao chép ID GỐC' : 'Copy ID GỐC'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyIds('ID XỬ LÝ')}
                  className="h-8 rounded-lg border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Copy size={13} className="mr-1 text-slate-400" />
                  {copiedKey === 'ID XỬ LÝ' ? 'Đã sao chép ID XỬ LÝ' : 'Copy ID XỬ LÝ'}
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleClearSheet}
              className="h-8 rounded-lg border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50"
              title="Xóa toàn bộ dữ liệu trong sheet này"
            >
              Xóa sheet
            </Button>
          </div>

          {/* Search bar & Filter reset */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters({})}
                className="h-8 rounded-lg border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw size={12} />
                Xóa {activeFilterCount} bộ lọc
              </Button>
            )}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm trong sheet này..."
                className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-2.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* MAIN DATA TABLE */}
        <Card className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <LoaderCircle size={18} className="animate-spin text-emerald-600" /> Đang tải dữ liệu {activeSheet}...
            </div>
          ) : !rows.length ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 space-y-3">
              <AlertCircle size={32} className="text-slate-300" />
              <div>
                <p className="font-bold text-slate-800 text-sm">Chưa có dữ liệu trong sheet "{activeSheet}"</p>
                {activeSheet === 'DATA_SOURCE' ? (
                  <p className="mt-1 text-slate-500">
                    Bấm nút <strong>"Load dữ liệu (T.{currentMonth} & T.{prevMonth})"</strong> ở góc trên bên phải để nạp cuộn SKIN từ page Dữ liệu.
                  </p>
                ) : activeSheet === 'CHECK_DATA_SKIN' ? (
                  <p className="mt-1 text-slate-500">
                    Bấm nút <strong>"Tổng hợp Check Data"</strong> để quét đối chiếu các cuộn từ DATA_SOURCE chưa có trên SKIN_HRC2 hoặc chờ chạy lại.
                  </p>
                ) : activeSheet === 'PO_HSM' ? (
                  <p className="mt-1 text-slate-500">
                    Bấm <strong>"Dán theo cột"</strong> hoặc <strong>"Dán từ Excel"</strong> để nhập dữ liệu kế hoạch HSM.
                  </p>
                ) : activeSheet === 'PO_SKIN' ? (
                  <p className="mt-1 text-slate-500">
                    Bấm <strong>"Lấy từ PO_HSM"</strong> hoặc <strong>"Dán từ Excel"</strong> để nhập dữ liệu kế hoạch SKIN.
                  </p>
                ) : (
                  <p className="mt-1 text-slate-500">
                    Bấm <strong>"+ Thêm dòng"</strong> hoặc <strong>"Dán từ Excel"</strong> để nhập dữ liệu.
                  </p>
                )}
              </div>
              {activeSheet === 'DATA_SOURCE' && (
                <Button
                  type="button"
                  onClick={handleLoadDefault}
                  disabled={loadingDataSource}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  {loadingDataSource ? <LoaderCircle size={14} className="animate-spin mr-1.5" /> : null}
                  Load dữ liệu ngay
                </Button>
              )}
              {activeSheet === 'CHECK_DATA_SKIN' && (
                <Button
                  type="button"
                  onClick={handleSyncCheckData}
                  disabled={syncingCheckData}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl"
                >
                  {syncingCheckData ? <LoaderCircle size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={13} className="mr-1.5" />}
                  Tổng hợp Check Data ngay
                </Button>
              )}
            </div>
          ) : !filteredAndSortedRows.length ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-slate-500 space-y-2">
              <AlertCircle size={28} className="text-slate-300" />
              <p className="font-semibold text-slate-700">Không tìm thấy dòng phù hợp với bộ lọc đã chọn.</p>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters({})}
                  className="mt-2 h-7 rounded-lg border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  Xóa tất cả {activeFilterCount} bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto border-t border-slate-200">
              <Table wrapperClassName="contents" className="w-max min-w-full text-left text-xs border-collapse select-text">
                <thead className="sticky top-0 z-20 shadow-xs">
                  {activeSheet === 'CHECK_DATA_SKIN' ? (
                    <>
                      <tr className="border-b border-slate-300">
                        <th rowSpan={2} className="sticky left-0 top-0 z-30 px-2 py-2.5 font-bold text-slate-700 border-r border-slate-300 w-20 text-center bg-slate-200 shadow-xs select-none">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isAllPageSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isPageIndeterminate;
                              }}
                              onChange={handleToggleSelectAllPage}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              title="Chọn tất cả dòng trên trang hiện tại"
                            />
                            <span>STT</span>
                          </div>
                        </th>
                        <th colSpan={4} className="bg-emerald-700 text-white text-center py-2 px-3 font-bold border-r-2 border-emerald-900 shadow-xs uppercase tracking-wide text-[11px]">
                          Hàng chờ Skin chưa có trên sheet SKIN_HRC2
                        </th>
                        <th colSpan={5} className="bg-amber-700 text-white text-center py-2 px-3 font-bold shadow-xs uppercase tracking-wide text-[11px]">
                          Hàng Skin chờ chạy lại or chờ đánh giá chất lượng
                        </th>
                      </tr>
                      <tr className="border-b border-slate-300">
                        {columns.map((col, colIdx) => {
                          const isFiltered = Boolean(filters[col]?.length);
                          const isGroup1 = colIdx < 4;
                          const isDivider = colIdx === 3;
                          const label = CHECK_DATA_LABELS[col] || col;
                          return (
                            <th
                              key={col}
                              className={`sticky top-8 z-20 px-3 py-2 font-bold whitespace-nowrap transition-colors shadow-xs ${
                                isDivider ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-200'
                              } ${
                                isFiltered
                                  ? 'bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-600'
                                  : isGroup1
                                  ? 'bg-emerald-50 text-emerald-900'
                                  : 'bg-amber-50 text-amber-900'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="select-none font-bold">{label}</span>
                                <ExcelFilterDropdown
                                  columnKey={col}
                                  title={label}
                                  rows={rows}
                                  activeFilter={filters[col]}
                                  sortState={sortConfig.column === col ? sortConfig : null}
                                  onApplyFilter={handleApplyFilter}
                                  onClearFilter={handleClearFilter}
                                  onSort={(columnKey, dir) => setSortConfig({ column: columnKey, direction: dir })}
                                  align={colIdx >= columns.length - 2 ? 'right' : 'left'}
                                />
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-slate-300">
                      <th className="sticky left-0 top-0 z-30 px-2 py-2.5 font-bold text-slate-700 border-r border-slate-300 w-20 text-center bg-slate-200 shadow-xs select-none">
                        <div className="flex items-center justify-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={isAllPageSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isPageIndeterminate;
                            }}
                            onChange={handleToggleSelectAllPage}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            title="Chọn tất cả dòng trên trang hiện tại"
                          />
                          <span>STT</span>
                        </div>
                      </th>
                      {columns.map((col, colIdx) => {
                        const isFiltered = Boolean(filters[col]?.length);
                        return (
                          <th
                            key={col}
                            className={`sticky top-0 z-20 px-3 py-2 font-bold border-r border-slate-200 whitespace-nowrap transition-colors shadow-xs ${
                              isFiltered
                                ? 'bg-emerald-100 text-emerald-950 border-b-2 border-b-emerald-600'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="select-none font-bold">{col}</span>
                              <ExcelFilterDropdown
                                columnKey={col}
                                title={col}
                                rows={rows}
                                activeFilter={filters[col]}
                                sortState={sortConfig.column === col ? sortConfig : null}
                                onApplyFilter={handleApplyFilter}
                                onClearFilter={handleClearFilter}
                                onSort={(columnKey, dir) => setSortConfig({ column: columnKey, direction: dir })}
                                align={colIdx >= columns.length - 3 ? 'right' : colIdx < 2 ? 'left' : 'center'}
                              />
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {paginatedRows.map((row, pIdx) => {
                    const rIdx = (safeCurrentPage - 1) * pageSize + pIdx;
                    const isSelected = activeRowId === row.id;
                    const isChecked = selectedRowIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        onClick={() => setActiveRowId(row.id)}
                        className={`transition-colors cursor-pointer group ${
                          isChecked
                            ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-500/40'
                            : isSelected
                            ? 'bg-emerald-50/50 ring-1 ring-inset ring-emerald-500/30'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className={`sticky left-0 z-10 px-2 py-1.5 text-center font-medium border-r border-slate-200 shadow-xs select-none ${
                            isChecked
                              ? 'bg-emerald-100/90 text-emerald-950 font-bold'
                              : isSelected
                              ? 'bg-emerald-100/70 text-emerald-950 font-bold'
                              : 'bg-slate-50 group-hover:bg-slate-100 text-slate-500'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handleToggleSelectRow(row.id, e)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className="min-w-6 text-right font-mono">{rIdx + 1}</span>
                          </div>
                        </td>
                        {columns.map((col, cIdx) => {
                          const val = row.values?.[col];
                          const isEditing = editingCell?.rowId === row.id && editingCell?.col === col;
                          const isDivider = activeSheet === 'CHECK_DATA_SKIN' && cIdx === 3;

                          return (
                            <td
                              key={col}
                              onDoubleClick={() => handleStartEdit(row, col)}
                              className={`px-2.5 py-1.5 max-w-xs truncate ${
                                isDivider ? 'border-r-2 border-r-slate-400' : 'border-r border-slate-100'
                              } ${
                                activeSheet === 'CHECK_DATA_SKIN'
                                  ? cIdx < 4 ? 'bg-emerald-50/20' : 'bg-amber-50/20'
                                  : ''
                              }`}
                              title={String(val ?? '')}
                            >
                              {isEditing ? (
                                <input
                                  ref={cellInputRef}
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCommitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    else if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                  className="w-full rounded border border-emerald-500 bg-white px-1 py-0.5 text-xs outline-none"
                                />
                              ) : (
                                <span
                                  className={`block truncate ${
                                    col === 'Elongation'
                                      ? 'font-bold text-amber-700 bg-amber-50/70 px-1.5 py-0.5 rounded text-center inline-block'
                                      : col === 'GHC'
                                      ? 'font-bold text-indigo-700'
                                      : col.includes('HƯỚNG XỬ LÝ') || col.includes('Hướng Xử lý')
                                      ? 'font-bold text-emerald-700'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {val !== null && val !== undefined && String(val).trim() !== ''
                                    ? String(val)
                                    : '—'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}

          {/* Bottom Bar Stats & Pagination Controls */}
          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Đang hiển thị:{' '}
                  <strong>
                    {nf(paginatedRows.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0)} - {nf(Math.min(safeCurrentPage * pageSize, filteredAndSortedRows.length))}
                  </strong>{' '}
                  / <strong>{nf(filteredAndSortedRows.length)}</strong> dòng
                  {filteredAndSortedRows.length !== rows.length && (
                    <span className="text-slate-500 ml-1">
                      (trên tổng {nf(rows.length)} dòng)
                    </span>
                  )}
                  {activeFilterCount > 0 && (
                    <span className="text-emerald-700 ml-1 font-semibold">
                      • {activeFilterCount} bộ lọc
                    </span>
                  )}
                </span>
                {activeRowId && (
                  <span className="text-emerald-700 font-semibold hidden lg:inline">
                    (Nhấp đúp chuột vào ô để sửa trực tiếp)
                  </span>
                )}
              </div>

              {/* Pagination UI Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 text-[11px]">Dòng/trang:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-7 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700 focus:border-emerald-500 focus:outline-none cursor-pointer"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage(1)}
                    className="h-7 w-7 p-0 rounded-md border-slate-300"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-7 w-7 p-0 rounded-md border-slate-300"
                    title="Trang trước"
                  >
                    <ChevronLeft size={13} />
                  </Button>

                  <span className="px-2 text-xs font-bold text-slate-700 select-none">
                    Trang {safeCurrentPage} / {totalPages}
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 w-7 p-0 rounded-md border-slate-300"
                    title="Trang sau"
                  >
                    <ChevronRight size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-7 w-7 p-0 rounded-md border-slate-300"
                    title="Trang cuối"
                  >
                    <ChevronsRight size={13} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* BATCH ADD ROWS MODAL DIALOG */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
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
                  onClick={() => setShowAddModal(false)}
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
                  disabled={addingBatch}
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 text-xs font-semibold text-slate-700"
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  disabled={addingBatch || !batchCount || Number(batchCount) < 1}
                  onClick={() => handleBatchAddRows(batchCount)}
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
                >
                  {addingBatch ? (
                    <>
                      <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                      Đang tạo {batchCount} dòng...
                    </>
                  ) : (
                    <>
                      <Plus size={14} className="mr-1.5" />
                      Xác nhận thêm {batchCount || 1} dòng
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* PASTE FROM EXCEL MODAL DIALOG (7 COLUMNS) */}
        {showPasteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700 shadow-2xs">
                    <ClipboardPaste size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      Form Thêm & Dán Dữ Liệu SKIN (7 cột)
                      <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
                        SKIN_HRC2
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Định dạng chuẩn: <strong>ID Cuộn Bó</strong> • <strong>Material Description</strong> • <strong>Khối lượng</strong> • <strong>Ngày sản xuất</strong> • <strong>Ca</strong> • <strong>Vị trí</strong> • <strong>Order</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
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
                  <ClipboardPaste size={14} /> Dán từ Excel (Nhiều dòng, tối đa 1.000)
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
                  <FileText size={14} /> Nhập thủ công (1 dòng)
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {pasteTab === 'paste' ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <span>Dán nội dung sao chép từ Excel vào đây:</span>
                        <span className="text-[11px] font-normal text-slate-400">(Tự động nhận diện tab & newline)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleFillSamplePaste}
                          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                        >
                          Dán dữ liệu mẫu thử
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
                      placeholder="Dán (Ctrl + V) các cột copy từ file Excel vào đây...&#10;Ví dụ:&#10;24011501	THÉP CUỘN CÁN NÓNG...	25480	2026-10-15	1	A-01	ORD-001"
                      className="w-full h-36 rounded-xl border border-slate-300 p-3 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-y bg-slate-50/50"
                    />

                    {/* Preview Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">
                          Xem trước bảng dữ liệu nhận diện:
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
                                {PASTE_FORM_COLUMNS.map((col) => (
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
                                  {PASTE_FORM_COLUMNS.map((col) => (
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
                              ... và {parsedPasteRows.length - 100} dòng tiếp theo (toàn bộ {parsedPasteRows.length} dòng sẽ được chèn vào sheet)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                          <ClipboardPaste size={24} className="mb-1 text-slate-300" />
                          <span>Chưa có dữ liệu. Vui lòng copy các cột từ Excel rồi nhấn <strong>Ctrl + V</strong> vào ô trên.</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Single manual row form */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        1. ID Cuộn Bó <span className="text-rose-500">*</span>:
                      </label>
                      <Input
                        value={singleForm['ID Cuộn Bó']}
                        onChange={(e) => setSingleForm({ ...singleForm, 'ID Cuộn Bó': e.target.value })}
                        placeholder="Ví dụ: 24011501"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        7. Order:
                      </label>
                      <Input
                        value={singleForm['Order']}
                        onChange={(e) => setSingleForm({ ...singleForm, Order: e.target.value })}
                        placeholder="Ví dụ: ORD-2026-001"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        3. Khối lượng (kg):
                      </label>
                      <Input
                        type="number"
                        value={singleForm['Khối lượng']}
                        onChange={(e) => setSingleForm({ ...singleForm, 'Khối lượng': e.target.value })}
                        placeholder="Ví dụ: 25480"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        4. Ngày sản xuất:
                      </label>
                      <Input
                        value={singleForm['Ngày sản xuất']}
                        onChange={(e) => setSingleForm({ ...singleForm, 'Ngày sản xuất': e.target.value })}
                        placeholder="Ví dụ: 2026-10-15 hoặc 15/10/2026"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        5. Ca sản xuất:
                      </label>
                      <Input
                        value={singleForm['Ca']}
                        onChange={(e) => setSingleForm({ ...singleForm, Ca: e.target.value })}
                        placeholder="Ví dụ: 1, 2 hoặc 3"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        6. Vị trí kho/bãi:
                      </label>
                      <Input
                        value={singleForm['Vị trí']}
                        onChange={(e) => setSingleForm({ ...singleForm, 'Vị trí': e.target.value })}
                        placeholder="Ví dụ: A-01, B-02"
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        2. Material Description:
                      </label>
                      <Input
                        value={singleForm['Material Description']}
                        onChange={(e) => setSingleForm({ ...singleForm, 'Material Description': e.target.value })}
                        placeholder="Ví dụ: THÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU PO"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50">
                <div className="text-xs text-slate-500">
                  {pasteTab === 'paste' ? (
                    <span>Tự động kiểm tra trùng lặp và phân bổ Tháng theo Ngày sản xuất.</span>
                  ) : (
                    <span>Nhập thông tin để tạo 1 dòng mới vào sheet SKIN_HRC2.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pastingSubmitting}
                    onClick={() => setShowPasteModal(false)}
                    className="h-9 px-4 text-xs font-semibold text-slate-700"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      pastingSubmitting ||
                      (pasteTab === 'paste' ? parsedPasteRows.length === 0 : !singleForm['ID Cuộn Bó'] && !singleForm['Order'])
                    }
                    onClick={handleConfirmPasteRows}
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
        )}

        {/* Modal: Dán dữ liệu theo từng cột (cho PO_HSM hoặc các sheet khác) */}
        {showPasteColumnModal && (
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
                  onClick={() => setShowPasteColumnModal(false)}
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
                    value={pasteColumnSelected}
                    onChange={(e) => setPasteColumnSelected(e.target.value)}
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
                      {pasteColumnRawText.split(/\r?\n/).filter((l) => l.trim()).length} giá trị nhận diện
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    value={pasteColumnRawText}
                    onChange={(e) => setPasteColumnRawText(e.target.value)}
                    placeholder="Dán các giá trị từ Excel vào đây...&#10;Ví dụ:&#10;PO_HSM_001&#10;PO_HSM_002&#10;PO_HSM_003"
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
                      {pasteColumnRawText
                        .split(/\r?\n/)
                        .filter((l) => l.trim())
                        .slice(0, 10)
                        .map((val, idx) => (
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
                  Dán vào cột <strong className="text-teal-700">{pasteColumnSelected}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pastingColumnSubmitting}
                    onClick={() => setShowPasteColumnModal(false)}
                    className="h-9 px-4 text-xs font-semibold text-slate-700"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="button"
                    disabled={pastingColumnSubmitting || !pasteColumnRawText.trim()}
                    onClick={handleConfirmPasteColumn}
                    className="h-9 px-5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20"
                  >
                    {pastingColumnSubmitting ? (
                      <>
                        <LoaderCircle size={14} className="mr-1.5 animate-spin" />
                        Đang dán dữ liệu...
                      </>
                    ) : (
                      <>
                        <ClipboardPaste size={14} className="mr-1.5" />
                        Xác nhận dán vào cột
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </QcLayout>
  );
}

