import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Layers,
  Search,
  Download,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  RotateCcw,
  Undo2,
  ClipboardPaste,
  Columns,
  RefreshCw,
  ExternalLink,
  LoaderCircle,
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QcLayout from '../components/QcLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

// Modular Constants & Utilities
import {
  SHEET_TABS,
  getSheetColumns,
  formatKeHoachValue,
  getTodayFormatted,
  GET_DATA_COLUMNS,
} from './skin/skinConstants';

// Modular Sheet Components
import {
  SkinHrc2Sheet,
  KeHoachSheet,
  DataSourceSheet,
  CheckDataSkinSheet,
  PivotTableSheet,
  HangVotSheet,
  PoSkinSheet,
  GenericSkinSheet,
} from './skin/sheets';

// Modular Modal Components
import {
  PasteExcelModal,
  BatchDateAssignModal,
  HangVotSourceModal,
  BatchAddRowsModal,
  ColumnPasteModal,
  GetDataPoModal,
  PivotPasteModal,
} from './skin/modals';

// Backend APIs
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
  collectSkinGetDataPo,
  recalculateSkinGetDataPo,
  getSkinPivotData,
  saveSkinPivotBlock,
  uploadSkinHangVotExcel,
  syncSkinHangVot,
  importSkinHangVotRows,
  generateSkinKeHoach,
  getSkinKeHoachMatrix,
  getSkinHrc2CoilsByKeHoach,
  assignSkinHrc2KeHoachBatch,
} from '../APIs';
import { nf } from '../utils/ultils';
import { successToast, errorToast } from '../utils/toast';

export default function SkinPage() {
  const [activeSheet, setActiveSheet] = useState('SKIN_HRC2');
  const [rows, setRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stats, setStats] = useState(null);

  // Debounce search input để giao diện luôn mượt mà 60 FPS, không bị đơ trình duyệt khi dán nhiều cuộn
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Month selection for loading data
  const currentMonth = new Date().getMonth() + 1;
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const [selectedMonth, setSelectedMonth] = useState(String(currentMonth));

  // Selection & Active Row
  const [activeRowId, setActiveRowId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ column: null, direction: 'asc' });
  const [filters, setFilters] = useState({});

  // Inline Cell Editing
  const [editingCell, setEditingCell] = useState(null); // { rowId, col }
  const [editValue, setEditValue] = useState('');

  // Modals Visibility
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasteColumnModal, setShowPasteColumnModal] = useState(false);
  const [showAssignDateModal, setShowAssignDateModal] = useState(false);
  const [showHangVotModal, setShowHangVotModal] = useState(false);
  const [showPivotPasteModal, setShowPivotPasteModal] = useState(false);
  const [pivotPasteTarget, setPivotPasteTarget] = useState('coil');
  const [showGetDataPoModal, setShowGetDataPoModal] = useState(false);
  const [getDataPoType, setGetDataPoType] = useState('skin');
  const [showCopyGetDataMenu, setShowCopyGetDataMenu] = useState(false);

  // Loading States
  const [loadingDataSource, setLoadingDataSource] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pastingSubmitting, setPastingSubmitting] = useState(false);
  const [addingBatch, setAddingBatch] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [pastingColumnSubmitting, setPastingColumnSubmitting] = useState(false);
  const [syncingCheckData, setSyncingCheckData] = useState(false);
  const [copyingPoHsm, setCopyingPoHsm] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [autoLinkingPoNew, setAutoLinkingPoNew] = useState(false);
  const [generatingGetData, setGeneratingGetData] = useState(false);
  const [fetchingGhc, setFetchingGhc] = useState(false);
  const [collectingGetDataPo, setCollectingGetDataPo] = useState(false);
  const [uploadingHangVotExcel, setUploadingHangVotExcel] = useState(false);
  const [syncingHangVot, setSyncingHangVot] = useState(false);
  const [savingPivotBlock, setSavingPivotBlock] = useState(false);

  // Undo State
  const [undoInfo, setUndoInfo] = useState({ can_undo: false, action_description: null });
  const [undoing, setUndoing] = useState(false);

  // Kế hoạch State
  const [skin2Target, setSkin2Target] = useState(45);
  const [skin4Target, setSkin4Target] = useState(45);
  const [runningKeHoach, setRunningKeHoach] = useState(false);
  const [keHoachMatrixData, setKeHoachMatrixData] = useState({ matrix_pairs: [], plans_list: [] });
  const [loadingKeHoachMatrix, setLoadingKeHoachMatrix] = useState(false);

  // SKIN_HRC2 Kế hoạch by Date Panel State (1,000 coils limit)
  const [showHrc2DatePanel, setShowHrc2DatePanel] = useState(false);
  const [hrc2SelectedDate, setHrc2SelectedDate] = useState(getTodayFormatted());
  const [hrc2PlannedCoils, setHrc2PlannedCoils] = useState([]);
  const [hrc2DistinctDates, setHrc2DistinctDates] = useState([]);
  const [loadingHrc2Coils, setLoadingHrc2Coils] = useState(false);
  const [assigningDate, setAssigningDate] = useState(false);
  const [assigningDirect, setAssigningDirect] = useState(false);

  // PivotTable State
  const [pivotData, setPivotData] = useState({ coil_reqs: [], po_reqs: [], priorities: [] });
  const [loadingPivotData, setLoadingPivotData] = useState(false);

  const fileInputRef = useRef(null);

  // Columns for current active sheet
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

  // Load rows for active sheet (tải toàn bộ dữ liệu vào memory, filter chạy mượt trên client)
  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSkinSheetRows({
        sheetName: activeSheet,
        limit: 100000,
        offset: 0,
      });
      setRows(res.rows || []);
      setTotalRows(res.total || 0);
    } catch (err) {
      errorToast('Lỗi tải dữ liệu sheet: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeSheet]);

  // Fetch PivotTable data
  const fetchPivotData = useCallback(async () => {
    setLoadingPivotData(true);
    try {
      const res = await getSkinPivotData();
      if (res.success) {
        setPivotData({
          coil_reqs: res.coil_reqs || [],
          po_reqs: res.po_reqs || [],
          priorities: res.priorities || [],
        });
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu PivotTable:', err.message);
    } finally {
      setLoadingPivotData(false);
    }
  }, []);

  // Fetch Kế hoạch matrix data
  const fetchKeHoachMatrix = useCallback(async () => {
    try {
      setLoadingKeHoachMatrix(true);
      const res = await getSkinKeHoachMatrix();
      if (res && res.success) {
        setKeHoachMatrixData(res);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu ma trận Kế hoạch:', err.message);
    } finally {
      setLoadingKeHoachMatrix(false);
    }
  }, []);

  // Fetch planned coils by date for SKIN_HRC2 right panel
  const fetchHrc2CoilsByDate = useCallback(async (dateQuery = '') => {
    setLoadingHrc2Coils(true);
    try {
      const res = await getSkinHrc2CoilsByKeHoach({ date: dateQuery, limit: 1000 });
      if (res?.success && res.data) {
        setHrc2PlannedCoils(res.data.coil_ids || []);
        setHrc2DistinctDates(res.data.distinct_dates || []);
      }
    } catch (err) {
      console.warn('Lỗi tải cuộn theo ngày kế hoạch:', err.message);
    } finally {
      setLoadingHrc2Coils(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSelectSheet = useCallback((sheetId) => {
    if (sheetId === activeSheet) return;
    setSearch('');
    setActiveSheet(sheetId);
  }, [activeSheet]);

  useEffect(() => {
    fetchRows();
    fetchUndoInfo();
    if (activeSheet === 'PIVOT_TABLE') {
      fetchPivotData();
    }
    if (activeSheet === 'KE_HOACH') {
      fetchKeHoachMatrix();
    }
    setSelectedRowIds(new Set());
    setActiveRowId(null);
    setFilters({});
    setSortConfig({ column: null, direction: 'asc' });
  }, [fetchRows, fetchUndoInfo, fetchPivotData, fetchKeHoachMatrix, activeSheet]);

  useEffect(() => {
    if (activeSheet === 'SKIN_HRC2' && showHrc2DatePanel && hrc2SelectedDate) {
      fetchHrc2CoilsByDate(hrc2SelectedDate);
    }
  }, [activeSheet, showHrc2DatePanel, hrc2SelectedDate, fetchHrc2CoilsByDate]);

  // Undo Handler & Ctrl+Z shortcut
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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Recalculate sheet formulas
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

  // Run Kế hoạch Skin
  const handleRunKeHoach = async () => {
    try {
      setRunningKeHoach(true);
      const res = await generateSkinKeHoach({
        skin2Target: Number(skin2Target) || 45,
        skin4Target: Number(skin4Target) || 45,
        updateSource: true,
      });
      successToast(res.message || 'Đã chạy lập kế hoạch Skin thành công!');
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
      await fetchKeHoachMatrix();
    } catch (err) {
      errorToast(err.response?.data?.detail || err.message || 'Lỗi khi chạy kế hoạch Skin');
    } finally {
      setRunningKeHoach(false);
    }
  };

  // Direct assign date from panel in SKIN_HRC2
  const handleDirectAssignFromPanel = async (targetValRaw, coilsText) => {
    const targetVal = formatKeHoachValue(targetValRaw);
    if (!targetVal) {
      errorToast('Vui lòng nhập ngày kế hoạch (dd/mm) hoặc chữ/ký tự bất kỳ!');
      return;
    }
    const lines = coilsText
      .split(/[\r\n\t,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) {
      errorToast('Vui lòng dán danh sách ID Cuộn Bó!');
      return;
    }
    if (lines.length > 1000) {
      errorToast('Giới hạn tối đa 1.000 cuộn một lần!');
      return;
    }

    setAssigningDirect(true);
    try {
      const res = await assignSkinHrc2KeHoachBatch({
        coilIds: lines,
        keHoach: targetVal,
        limit: 1000,
      });
      if (res?.success) {
        successToast(`Đã tự động gán "${targetVal}" vào cột Kế hoạch cho ${res.data?.assigned_count || 0} cuộn!`);
        setHrc2SelectedDate(targetVal);
        await fetchHrc2CoilsByDate(targetVal);
        await fetchRows();
      } else {
        errorToast(res?.message || 'Không thể gán kế hoạch');
      }
    } catch (err) {
      errorToast('Lỗi gán kế hoạch: ' + (err.message || ''));
    } finally {
      setAssigningDirect(false);
    }
  };

  // Batch modal confirm assign date
  const handleConfirmAssignDate = async (targetValRaw, coilsText) => {
    const targetVal = formatKeHoachValue(targetValRaw);
    if (!targetVal) {
      errorToast('Vui lòng nhập ngày kế hoạch (dd/mm) hoặc chữ/ký tự bất kỳ!');
      return;
    }
    const lines = coilsText
      .split(/[\r\n\t,; ]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) {
      errorToast('Vui lòng dán danh sách ID Cuộn Bó!');
      return;
    }
    if (lines.length > 1000) {
      errorToast('Giới hạn tối đa 1.000 cuộn một lần!');
      return;
    }

    setAssigningDate(true);
    try {
      const res = await assignSkinHrc2KeHoachBatch({
        coilIds: lines,
        keHoach: targetVal,
        limit: 1000,
      });
      if (res?.success) {
        successToast(`Đã tự động gán "${targetVal}" vào cột Kế hoạch cho ${res.data?.assigned_count || 0} cuộn!`);
        setShowAssignDateModal(false);
        setHrc2SelectedDate(targetVal);
        await fetchHrc2CoilsByDate(targetVal);
        await fetchRows();
      } else {
        errorToast(res?.message || 'Không thể gán kế hoạch');
      }
    } catch (err) {
      errorToast('Lỗi khi gán kế hoạch: ' + (err.message || ''));
    } finally {
      setAssigningDate(false);
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

  // Auto create new PO in PO_SKIN
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

  // Hàng Vớt Sync & Upload
  const handleRunHangVot = async (customPath = null) => {
    setSyncingHangVot(true);
    try {
      const res = await syncSkinHangVot({ customPath });
      if (res.success) {
        successToast(res.message || `Đã lấy thành công ${res.count || 0} dòng Hàng Vớt!`);
        setShowHangVotModal(false);
        await fetchRows();
        await fetchStats();
        await fetchUndoInfo();
      } else if (res.need_file) {
        setShowHangVotModal(true);
      }
    } catch (err) {
      errorToast('Lỗi lấy dữ liệu Hàng Vớt: ' + (err.message || 'Không thể kết nối máy chủ'));
      setShowHangVotModal(true);
    } finally {
      setSyncingHangVot(false);
    }
  };

  const handleUploadHangVotExcel = async (file) => {
    if (!file) return;
    setUploadingHangVotExcel(true);
    try {
      const res = await uploadSkinHangVotExcel(file);
      successToast(res.message || `Đã nhập ${res.imported_count || 0} dòng Hàng Vớt!`);
      setShowHangVotModal(false);
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi nạp file Hàng Vớt: ' + err.message);
    } finally {
      setUploadingHangVotExcel(false);
    }
  };

  const handleConfirmHangVotPaste = async (pasteText) => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsedRows = [];
    for (const line of lines) {
      let cells = line.split('\t');
      if (cells.length === 1 && line.includes(';')) cells = line.split(';');
      else if (cells.length === 1 && line.includes(',')) cells = line.split(',');
      cells = cells.map((c) => c.trim());
      if (cells[0]?.toLowerCase().includes('id') && cells[0]?.toLowerCase().includes('coil')) continue;
      parsedRows.push({
        'ID COIL': cells[0] || '',
        'HƯỚNG XỬ LÝ': cells[1] || '',
        'LỖI LỆCH TDC': cells[2] || '',
        'NM ĐỀ XUẤT': cells[3] || '',
        'DVKTKH & QLCL': cells[4] || '',
      });
      if (parsedRows.length >= 15000) break;
    }
    if (!parsedRows.length) {
      errorToast('Không tìm thấy dòng dữ liệu hợp lệ nào!');
      return;
    }
    setSyncingHangVot(true);
    try {
      const res = await importSkinHangVotRows({ rows: parsedRows, clearFirst: true });
      successToast(res.message || `Đã nạp ${parsedRows.length} dòng Hàng Vớt thành công!`);
      setShowHangVotModal(false);
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi nạp dữ liệu: ' + err.message);
    } finally {
      setSyncingHangVot(false);
    }
  };

  // DATA_SOURCE default load
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

  // DATA_SOURCE upload Excel
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

  // Transfer from DATA_SOURCE to SKIN_HRC2
  const handleTransferToSkin = async () => {
    if (!selectedRowIds.size) {
      errorToast('Vui lòng tick chọn ít nhất 1 dòng từ DATA_SOURCE để thêm vào SKIN_HRC2!');
      return;
    }
    const rowIds = Array.from(selectedRowIds).slice(0, 15000);
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

  // Add 1 row
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

  // Batch add rows
  const handleBatchAddRows = async (countToAdd) => {
    setAddingBatch(true);
    try {
      const res = await addSkinRowsBatch({
        sheetName: activeSheet,
        count: Number(countToAdd) || 1,
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

  // Confirm paste rows from modal
  const handleConfirmPasteRows = async (rowsToInsert) => {
    if (!rowsToInsert || !rowsToInsert.length) return;
    setPastingSubmitting(true);
    try {
      const res = await importSkinPasteRows({
        sheetName: activeSheet,
        rows: rowsToInsert,
      });
      successToast(res.message || `Đã thêm thành công ${rowsToInsert.length} dòng vào sheet ${activeSheet}!`);
      setShowPasteModal(false);
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi khi thêm dòng: ' + err.message);
    } finally {
      setPastingSubmitting(false);
    }
  };

  // Confirm single column paste
  const handleConfirmPasteColumn = async (columnName, rawText) => {
    const values = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!values.length) return;

    setPastingColumnSubmitting(true);
    try {
      const res = await pasteSkinColumnData({
        sheetName: activeSheet,
        columnName,
        values,
      });
      successToast(res.message || `Đã dán thành công ${values.length} giá trị vào cột "${columnName}"!`);
      setShowPasteColumnModal(false);
      await fetchStats();
      await fetchRows();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi dán cột: ' + err.message);
    } finally {
      setPastingColumnSubmitting(false);
    }
  };

  // Confirm GET_DATA_PO collect
  const handleConfirmGetDataPo = async (poType, rawText, clearFirst) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setCollectingGetDataPo(true);
    try {
      const res = await collectSkinGetDataPo({
        poList: lines,
        poType,
        clearFirst,
      });
      successToast(res.message || `Đã thu thập dữ liệu cho ${res.collected_count || 0} PO!`);
      setShowGetDataPoModal(false);
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi thu thập PO: ' + err.message);
    } finally {
      setCollectingGetDataPo(false);
    }
  };

  const handleRecalculateGetDataPo = async () => {
    setRecalculating(true);
    try {
      const res = await recalculateSkinGetDataPo();
      successToast(res.message || 'Đã tính toán và truy xuất lại dữ liệu thành công!');
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi tính toán lại: ' + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  // Confirm PivotTable paste
  const handleConfirmPivotPaste = async (blockType, rawText, clearFirst) => {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    for (const line of lines) {
      let parts = line.split('\t');
      if (parts.length === 1 && line.includes(';')) parts = line.split(';');
      else if (parts.length === 1 && line.includes(',')) parts = line.split(',');
      const col1 = (parts[0] || '').trim();
      const col2 = (parts[1] || '').trim();
      if (!col1 && !col2) continue;
      const low = col1.toLowerCase().replace(/[\s_/]+/g, '');
      if (['idcuon', 'idcuonbo', 'po', 'po/idcuon', 'stt'].includes(low)) continue;

      if (blockType === 'coil') items.push({ coil_id: col1, requirement: col2 });
      else if (blockType === 'po') items.push({ po: col1, requirement: col2 });
      else if (blockType === 'priority') items.push({ target_id: col1, priority: col2 });
    }
    if (!items.length) {
      errorToast('Không tìm thấy dòng dữ liệu hợp lệ nào!');
      return;
    }
    setSavingPivotBlock(true);
    try {
      const res = await saveSkinPivotBlock({ blockType, items, clearFirst });
      successToast(res.message || 'Đã lưu dữ liệu bảng thành công!');
      setShowPivotPasteModal(false);
      await fetchPivotData();
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi lưu PivotTable: ' + err.message);
    } finally {
      setSavingPivotBlock(false);
    }
  };

  const handleClearPivotBlock = async (blockType) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu của bảng này không?')) return;
    try {
      await saveSkinPivotBlock({ blockType, items: [], clearFirst: true });
      successToast('Đã xóa dữ liệu bảng thành công!');
      await fetchPivotData();
      await fetchRows();
      await fetchStats();
      await fetchUndoInfo();
    } catch (err) {
      errorToast('Lỗi xóa bảng: ' + err.message);
    }
  };

  const handleDeletePivotItem = async (blockType, id) => {
    try {
      let currentItems = [];
      if (blockType === 'coil') currentItems = pivotData.coil_reqs.filter((item) => item.id !== id);
      else if (blockType === 'po') currentItems = pivotData.po_reqs.filter((item) => item.id !== id);
      else if (blockType === 'priority') currentItems = pivotData.priorities.filter((item) => item.id !== id);
      await saveSkinPivotBlock({ blockType, items: currentItems, clearFirst: true });
      await fetchPivotData();
      await fetchRows();
      await fetchStats();
    } catch (err) {
      errorToast('Lỗi xóa mục: ' + err.message);
    }
  };

  // Generate & Download GET_DATA
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

  const handleDownloadGetDataExcel = () => {
    try {
      const link = document.createElement('a');
      link.href = getExportSkinGetDataUrl();
      link.setAttribute('download', 'Get_Data.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(getExportSkinGetDataUrl(), '_blank');
    }
  };

  const handleCopyGetData = async (mode = 'auto', withHeader = false) => {
    const targetRows = selectedRowIds.size > 0
      ? rows.filter((r) => selectedRowIds.has(r.id))
      : (filteredAndSortedRows.length ? filteredAndSortedRows : rows);

    if (!targetRows.length) {
      errorToast('Không có dòng dữ liệu nào trong sheet Get Data để sao chép!');
      return;
    }

    const hasYcdb = targetRows.some((r) => {
      const v = r.values?.['Yêu cầu đặt biệt'] || r.values?.['Yêu cầu đặc biệt'];
      return v !== null && v !== undefined && String(v).trim() !== '';
    });

    let startCol = 'STT';
    if (mode === 'ycdb') startCol = 'Yêu cầu đặt biệt';
    else if (mode === 'stt') startCol = 'STT';
    else startCol = hasYcdb ? 'Yêu cầu đặt biệt' : 'STT';

    const startIdx = GET_DATA_COLUMNS.indexOf(startCol);
    const endIdx = GET_DATA_COLUMNS.indexOf('Tống hợp lỗi');
    const effectiveStartIdx = startIdx >= 0 ? startIdx : 0;
    const effectiveEndIdx = endIdx >= 0 ? endIdx : GET_DATA_COLUMNS.length - 1;
    const copyColumns = GET_DATA_COLUMNS.slice(effectiveStartIdx, effectiveEndIdx + 1);

    const lines = [];
    if (withHeader) lines.push(copyColumns.join('\t'));

    targetRows.forEach((r) => {
      const rowVals = copyColumns.map((col) => {
        const val = r.values?.[col];
        if (val === null || val === undefined) return '';
        return String(val).replace(/\t|\r?\n/g, ' ');
      });
      lines.push(rowVals.join('\t'));
    });

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      const conditionDesc = hasYcdb ? 'Phát hiện có YCĐB' : 'Không có YCĐB';
      const rangeDesc = `từ [${startCol}] ➔ [Tống hợp lỗi] (${copyColumns.length} cột)`;
      successToast(`Đã sao chép ${targetRows.length} dòng Get Data (${conditionDesc}: ${rangeDesc})!`);
    } catch (err) {
      errorToast('Lỗi khi sao chép vào bộ nhớ tạm: ' + err.message);
    }
  };

  // Delete & Clear Handlers
  const handleDeleteRow = async (rowId) => {
    const idToDelete = rowId || activeRowId;
    if (!idToDelete) return;
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

  const handleBatchDelete = async () => {
    if (!selectedRowIds.size) return;
    const count = selectedRowIds.size;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${count} dòng đã chọn khỏi sheet "${activeSheet}"?`)) return;
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

  // Inline Edit Handlers
  const handleStartEdit = (row, col) => {
    setActiveRowId(row.id);
    setEditingCell({ rowId: row.id, col });
    setEditValue(String(row.values?.[col] ?? ''));
  };

  const handleCommitEdit = async () => {
    if (!editingCell) return;
    const { rowId, col } = editingCell;
    let val = editValue.trim();
    if (activeSheet === 'SKIN_HRC2' && col === 'Kế hoạch') {
      val = formatKeHoachValue(val);
    }

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

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Export Sheet to Excel (.xlsx)
  // Export Sheet to Excel (.xlsx) với chuẩn định dạng Number
  const handleExportExcel = () => {
    if (activeSheet === 'GET_DATA') {
      handleDownloadGetDataExcel();
      return;
    }

    const sourceRows = filteredAndSortedRows.length ? filteredAndSortedRows : rows;
    if (!sourceRows.length) {
      errorToast('Chưa có dữ liệu để xuất file Excel!');
      return;
    }
    const data = sourceRows.map((r, idx) => {
      const obj = { STT: idx + 1 };
      columns.forEach((col) => {
        let val = r.values?.[col] ?? '';
        const colUpper = String(col).toUpperCase();
        const isTextOnly = ['ID', 'MÃ', 'CODE', 'PO', 'ORDER', 'HỢP ĐỒNG', 'PLAN', 'LINE', 'CA', 'THÁNG', 'ĐỢT', 'GHI CHÚ'].some((k) => colUpper.includes(k));
        if (!isTextOnly && typeof val === 'string' && val.trim() !== '' && val.trim() !== '-' && val.trim() !== '—') {
          const cleanNum = val.replace(',', '.');
          if (!isNaN(cleanNum) && !isNaN(parseFloat(cleanNum))) {
            val = Number(cleanNum);
          }
        }
        obj[col] = val;
      });
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeSheet);
    XLSX.writeFile(wb, `Theo_Doi_${activeSheet}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    successToast(`Đã xuất sheet "${activeSheet}" ra file Excel thành công!`);
  };

  // Filters & Sorting Handlers
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

  const handleSort = (columnKey) => {
    setSortConfig((current) => {
      if (current.column === columnKey) {
        if (current.direction === 'asc') return { column: columnKey, direction: 'desc' };
        return { column: null, direction: 'asc' };
      }
      return { column: columnKey, direction: 'asc' };
    });
  };

  // Selection handlers
  const handleToggleSelectRow = (rowId, e) => {
    e?.stopPropagation?.();
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else {
        if (next.size >= 15000) {
          errorToast('Chỉ có thể chọn tối đa 15.000 dòng 1 lúc!');
          return next;
        }
        next.add(rowId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (e) => {
    const next = new Set(selectedRowIds);
    if (e.target.checked) {
      filteredAndSortedRows.forEach((r) => next.add(r.id));
      if (next.size > 20000) {
        const trimmed = new Set(Array.from(next).slice(0, 20000));
        setSelectedRowIds(trimmed);
        errorToast('Đã chọn tối đa 20.000 dòng!');
      } else {
        setSelectedRowIds(next);
      }
    } else {
      filteredAndSortedRows.forEach((r) => next.delete(r.id));
      setSelectedRowIds(next);
    }
  };

  // Filtered & Sorted Rows with Multi-Token Search (Tối ưu hóa cực nhanh: O(1) Set check, không bao giờ đơ trình duyệt)
  const filteredAndSortedRows = useMemo(() => {
    const rawTokens = debouncedSearch.trim().toLowerCase().split(/[\s,;]+/).filter(Boolean);
    const hasSearch = rawTokens.length > 0;
    const isMultiToken = rawTokens.length > 1;
    const tokenSet = hasSearch ? new Set(rawTokens) : null;
    const activeFilters = Object.entries(filters).filter(([_, filter]) => {
      if (!filter) return false;
      if (Array.isArray(filter) && filter.length === 0) return false;
      return true;
    });
    const hasFilters = activeFilters.length > 0;

    if (!hasSearch && !hasFilters && !sortConfig?.column) {
      return rows;
    }

    const result = rows.filter((row) => {
      const values = row.values || {};

      if (hasSearch) {
        // Kiểm tra siêu tốc O(1) qua Set cho tất cả các cột ID và PO trên mọi sheet:
        // DATA_SOURCE: ID XỬ LÝ, ID GỐC, ORDER
        // SKIN_HRC2: ID Cuộn Bó, PO Xử lý, PO Tháng, Order
        // PO_HSM / PO_SKIN: PO_HSM, PO_SPM
        // DATA_MES: ID HRC, PO
        // HANG_VOT: ID Cuộn Bó, Mã cuộn
        let matches = false;
        const vIdXl = values['ID XỬ LÝ'];
        const vIdGoc = values['ID GỐC'];
        const vIdCuon = values['ID Cuộn Bó'] || values['Mã cuộn'] || values['ID Coil'] || values['ID HRC'] || values['ID'];
        const vOrder = values['ORDER'] || values['Order'];
        const vPo = values['PO'] || values['PO Xử lý'] || values['PO Tháng'] || values['PO_HSM'] || values['PO_SPM'];

        if (vIdXl && tokenSet.has(String(vIdXl).toLowerCase())) matches = true;
        else if (vIdGoc && tokenSet.has(String(vIdGoc).toLowerCase())) matches = true;
        else if (vIdCuon && tokenSet.has(String(vIdCuon).toLowerCase())) matches = true;
        else if (vOrder && tokenSet.has(String(vOrder).toLowerCase())) matches = true;
        else if (vPo && tokenSet.has(String(vPo).toLowerCase())) matches = true;
        else if (row.id && tokenSet.has(String(row.id).toLowerCase())) matches = true;

        if (!matches) {
          // Chỉ fallback tìm kiếm từng ô nếu người dùng gõ 1 từ khóa duy nhất (như tên khách hàng, ca, ngày sản xuất...)
          // Tuyệt đối không scan chuỗi khi dán danh sách nhiều cuộn (isMultiToken) để tránh đơ trình duyệt hoàn toàn!
          if (!isMultiToken) {
            const singleToken = rawTokens[0];
            for (const key in values) {
              const val = values[key];
              if (val !== null && val !== undefined && String(val).toLowerCase().includes(singleToken)) {
                matches = true;
                break;
              }
            }
          }
        }
        if (!matches) return false;
      }

      if (hasFilters) {
        for (let i = 0; i < activeFilters.length; i++) {
          const [column, filter] = activeFilters[i];
          const cellRaw = values[column];
          const cellStr = cellRaw === null || cellRaw === undefined ? '' : String(cellRaw).trim();

          if (Array.isArray(filter)) {
            if (filter.includes('__NO_MATCH__')) return false;
            const matchesFilter = filter.some((f) => {
              if (f === '__BLANK__' || f === '' || f === '(Trống)') {
                return !cellStr || cellStr === '—' || cellStr === '-';
              }
              return cellStr.toLowerCase() === String(f).trim().toLowerCase();
            });
            if (!matchesFilter) return false;
          } else {
            if (!cellStr.toLowerCase().includes(String(filter).trim().toLowerCase())) {
              return false;
            }
          }
        }
      }

      return true;
    });

    if (sortConfig?.column) {
      const { column, direction } = sortConfig;
      const isDesc = direction === 'desc';
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
          cmp = strA.localeCompare(strB, 'vi', { numeric: true, sensitivity: 'base' });
        }
        return isDesc ? -cmp : cmp;
      });
    }

    return result;
  }, [rows, debouncedSearch, filters, sortConfig]);

  // Render sheet component dynamically
  const renderActiveSheetComponent = () => {
    const commonProps = {
      rows: filteredAndSortedRows,
      rawRows: rows,
      selectedRowIds,
      onToggleSelectRow: handleToggleSelectRow,
      onToggleSelectAll: handleToggleSelectAll,
      activeRowId,
      onSetActiveRowId: setActiveRowId,
      filters,
      onApplyFilter: handleApplyFilter,
      onClearFilter: handleClearFilter,
      sortConfig,
      onSort: handleSort,
      editingCell,
      editValue,
      setEditValue,
      onStartEdit: handleStartEdit,
      onCommitEdit: handleCommitEdit,
      onCancelEdit: handleCancelEdit,
    };

    switch (activeSheet) {
      case 'SKIN_HRC2':
        return (
          <SkinHrc2Sheet
            {...commonProps}
            showHrc2DatePanel={showHrc2DatePanel}
            setShowHrc2DatePanel={setShowHrc2DatePanel}
            hrc2SelectedDate={hrc2SelectedDate}
            setHrc2SelectedDate={setHrc2SelectedDate}
            hrc2PlannedCoils={hrc2PlannedCoils}
            hrc2DistinctDates={hrc2DistinctDates}
            loadingHrc2Coils={loadingHrc2Coils}
            fetchHrc2CoilsByDate={fetchHrc2CoilsByDate}
            onOpenBatchDateAssignModal={() => setShowAssignDateModal(true)}
            onDirectAssignDate={handleDirectAssignFromPanel}
            assigningDirect={assigningDirect}
          />
        );
      case 'KE_HOACH':
        return (
          <KeHoachSheet
            {...commonProps}
            skin2Target={skin2Target}
            setSkin2Target={setSkin2Target}
            skin4Target={skin4Target}
            setSkin4Target={setSkin4Target}
            runningKeHoach={runningKeHoach}
            onRunKeHoach={handleRunKeHoach}
            keHoachMatrixData={keHoachMatrixData}
            loadingKeHoachMatrix={loadingKeHoachMatrix}
            onRefreshMatrix={fetchKeHoachMatrix}
          />
        );
      case 'DATA_SOURCE':
        return (
          <DataSourceSheet
            {...commonProps}
            stats={stats}
            loadingDataSource={loadingDataSource}
            onLoadDefault={handleLoadDefault}
            onOpenUploadModal={() => fileInputRef.current?.click()}
            transferring={transferring}
            onTransferToSkin={handleTransferToSkin}
          />
        );
      case 'CHECK_DATA_SKIN':
        return (
          <CheckDataSkinSheet
            {...commonProps}
            syncingCheckData={syncingCheckData}
            onSyncCheckData={handleSyncCheckData}
          />
        );
      case 'PIVOT_TABLE':
        return (
          <PivotTableSheet
            {...commonProps}
            pivotData={pivotData}
            onOpenPivotPaste={(targetBlock) => {
              setPivotPasteTarget(targetBlock);
              setShowPivotPasteModal(true);
            }}
            onClearPivotBlock={handleClearPivotBlock}
            onDeletePivotItem={handleDeletePivotItem}
          />
        );
      case 'HANG_VOT':
        return (
          <HangVotSheet
            {...commonProps}
            syncingHangVot={syncingHangVot}
            onSyncHangVot={() => handleRunHangVot()}
            onOpenUploadModal={() => setShowHangVotModal(true)}
          />
        );
      case 'PO_SKIN':
        return (
          <PoSkinSheet
            {...commonProps}
            creatingNewPo={autoLinkingPoNew}
            onCreateNewPo={handleAutoLinkPoNew}
          />
        );
      default:
        return (
          <GenericSkinSheet
            activeSheet={activeSheet}
            {...commonProps}
          />
        );
    }
  };

  return (
    <QcLayout>
      <div className="space-y-4">
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
              Quản lý các sheet: <strong>SKIN_HRC2</strong>, <strong>Kế hoạch</strong>, <strong>DATA_SOURCE</strong>, <strong>PO_HSM</strong>, <strong>PO_SKIN</strong>, <strong>Hàng Vớt</strong>, <strong>PivotTable</strong>...
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

            {/* Load Default Button */}
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
              Load dữ liệu (T.{currentMonth} & T.{prevMonth})
            </Button>

            {/* Undo Button */}
            <Button
              type="button"
              disabled={!undoInfo?.can_undo || undoing}
              onClick={handleUndo}
              variant="outline"
              className={`h-9 rounded-xl px-3 text-xs font-bold transition-all ${
                undoInfo?.can_undo
                  ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 shadow-2xs'
                  : 'border-slate-200 text-slate-400 bg-slate-50 cursor-not-allowed opacity-60'
              }`}
              title={undoInfo?.can_undo ? `Hoàn tác: ${undoInfo?.action_description || 'Thao tác trước'} (Ctrl+Z)` : 'Không có thao tác nào để hoàn tác'}
            >
              {undoing ? (
                <LoaderCircle size={14} className="mr-1.5 animate-spin" />
              ) : (
                <Undo2 size={14} className="mr-1.5 text-amber-600" />
              )}
              Hoàn tác (Ctrl+Z)
            </Button>
          </div>
        </header>

        {/* SHEET TABS - HIỂN THỊ TRỌN VẸN TRÊN CÙNG 1 KHUNG KHÔNG CẦN KÉO DỮ LIỆU */}
        <div className="p-2 bg-gradient-to-r from-slate-50 via-slate-100/60 to-slate-50 border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {SHEET_TABS.map((tab) => {
              const isCurrent = activeSheet === tab.id;
              const statCount =
                stats?.[tab.statKey] ??
                stats?.[`${tab.id.toLowerCase()}_count`] ??
                stats?.by_sheet?.[tab.id] ??
                0;
              const count = isCurrent ? (totalRows || statCount) : statCount;
              const isFiltered = isCurrent && filteredAndSortedRows.length !== totalRows && search;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectSheet(tab.id)}
                  title={`Sheet ${tab.label} (${nf(statCount)} dòng)`}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer select-none ${
                    isCurrent
                      ? 'bg-[#0e5374] text-white shadow-sm ring-2 ring-[#0e5374]/30 font-bold scale-[1.02]'
                      : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/90 font-medium'
                  }`}
                >
                  <span className="tracking-tight">{tab.label}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold transition-colors ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}
                  >
                    {isFiltered ? `${nf(filteredAndSortedRows.length)}/${nf(count)}` : nf(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          {/* Multi-Token Search Input */}
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nhiều từ: EA026400063 KA026402154 (cách nhau bởi khoảng trắng)..."
              className="pl-9 pr-4 h-9 rounded-xl border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#0e5374]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1 font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Right Toolbar Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sheet-specific special actions */}
            {activeSheet === 'PO_HSM' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPasteColumnModal(true)}
                  className="h-8 rounded-xl text-xs font-bold border-teal-300 text-teal-800 hover:bg-teal-50"
                >
                  <Columns size={13} className="mr-1 text-teal-600" />
                  Dán theo cột
                </Button>
                <Button
                  type="button"
                  disabled={copyingPoHsm}
                  onClick={handleCopyPoHsmToSkin}
                  className="h-8 rounded-xl text-xs font-bold bg-teal-600 text-white hover:bg-teal-500 shadow-2xs"
                >
                  {copyingPoHsm ? <LoaderCircle size={13} className="mr-1 animate-spin" /> : <Sparkles size={13} className="mr-1" />}
                  Copy PO_HSM ➔ PO_SKIN
                </Button>
              </>
            )}

            {activeSheet === 'GET_DATA' && (
              <>
                <Button
                  type="button"
                  disabled={generatingGetData}
                  onClick={handleGenerateGetData}
                  className="h-8 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shadow-2xs"
                >
                  {generatingGetData ? <LoaderCircle size={13} className="mr-1 animate-spin" /> : <Sparkles size={13} className="mr-1" />}
                  Xuất Get Data
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadGetDataExcel}
                  className="h-8 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50"
                >
                  <Download size={13} className="mr-1" />
                  Tải file Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyGetData('auto', false)}
                  className="h-8 rounded-xl text-xs font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                >
                  <ClipboardPaste size={13} className="mr-1 text-emerald-600" />
                  Sao chép Get Data
                </Button>
              </>
            )}

            {activeSheet === 'GET_DATA_PO' && (
              <>
                <Button
                  type="button"
                  onClick={() => {
                    setGetDataPoType('skin');
                    setShowGetDataPoModal(true);
                  }}
                  className="h-8 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <ClipboardPaste size={13} className="mr-1" />
                  Điền PO Skin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setGetDataPoType('hsm');
                    setShowGetDataPoModal(true);
                  }}
                  className="h-8 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50"
                >
                  <ClipboardPaste size={13} className="mr-1" />
                  Điền PO HSM
                </Button>
                <Button
                  type="button"
                  disabled={recalculating}
                  onClick={handleRecalculateGetDataPo}
                  variant="outline"
                  className="h-8 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50"
                >
                  <RefreshCw size={13} className={`mr-1 ${recalculating ? 'animate-spin' : ''}`} />
                  Tính toán lại
                </Button>
              </>
            )}

            {['SKIN_HRC2', 'PO_HSM', 'PO_SKIN'].includes(activeSheet) && (
              <Button
                type="button"
                disabled={recalculating}
                onClick={handleRecalculate}
                variant="outline"
                className="h-8 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50 text-slate-700"
                title="Tính toán lại toàn bộ công thức cột tự động"
              >
                <RefreshCw size={13} className={`mr-1 ${recalculating ? 'animate-spin' : ''}`} />
                Tính toán lại
              </Button>
            )}

            {/* Paste from Excel Button */}
            <Button
              type="button"
              onClick={() => setShowPasteModal(true)}
              className="h-8 rounded-xl text-xs font-bold bg-[#0e5374] hover:bg-[#0b435e] text-white shadow-2xs"
            >
              <ClipboardPaste size={13} className="mr-1" />
              Dán từ Excel
            </Button>

            {/* Add Row Button */}
            <div className="flex items-center gap-1">
              <Button
                type="button"
                onClick={handleAddRow}
                variant="outline"
                className="h-8 rounded-l-xl rounded-r-none text-xs font-bold border-slate-300 hover:bg-slate-50"
                title="Thêm 1 dòng mới"
              >
                <Plus size={13} className="mr-1" /> +1 Dòng
              </Button>
              <Button
                type="button"
                onClick={() => setShowAddModal(true)}
                variant="outline"
                className="h-8 rounded-r-xl rounded-l-none text-xs font-bold border-l-0 border-slate-300 hover:bg-slate-50 px-2"
                title="Thêm nhiều dòng (lên tới 1.000 dòng)"
              >
                +N
              </Button>
            </div>

            {/* Batch Delete if rows selected */}
            {selectedRowIds.size > 0 && (
              <Button
                type="button"
                onClick={handleBatchDelete}
                className="h-8 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-2xs"
              >
                <Trash2 size={13} className="mr-1" />
                Xóa ({selectedRowIds.size})
              </Button>
            )}

            {/* Clear Sheet */}
            <Button
              type="button"
              onClick={handleClearSheet}
              variant="outline"
              className="h-8 rounded-xl text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50"
              title="Xóa toàn bộ dữ liệu trong sheet hiện tại"
            >
              <Trash2 size={13} className="mr-1 text-rose-600" />
              Xóa sheet
            </Button>

            {/* Export Sheet to Excel */}
            <Button
              type="button"
              variant="outline"
              onClick={handleExportExcel}
              className="h-8 rounded-xl text-xs font-bold border-slate-300 hover:bg-slate-50"
              title="Xuất bảng hiện tại ra file .xlsx"
            >
              <Download size={13} className="mr-1 text-slate-600" />
              Xuất Excel
            </Button>
          </div>
        </div>

        {/* ACTIVE SHEET COMPONENT RENDERING */}
        <div className="w-full">
          {renderActiveSheetComponent()}
        </div>

        {/* MODAL DIALOGS */}
        <PasteExcelModal
          isOpen={showPasteModal}
          onClose={() => setShowPasteModal(false)}
          activeSheet={activeSheet}
          onConfirmPaste={handleConfirmPasteRows}
          pastingSubmitting={pastingSubmitting}
        />

        <BatchDateAssignModal
          isOpen={showAssignDateModal}
          onClose={() => setShowAssignDateModal(false)}
          selectedRowIds={selectedRowIds}
          rows={rows}
          onConfirmAssignDate={handleConfirmAssignDate}
          assigningDate={assigningDate}
        />

        <HangVotSourceModal
          isOpen={showHangVotModal}
          onClose={() => setShowHangVotModal(false)}
          syncingHangVot={syncingHangVot}
          onSyncHangVot={handleRunHangVot}
          onUploadExcel={handleUploadHangVotExcel}
          uploadingExcel={uploadingHangVotExcel}
          onConfirmPaste={handleConfirmHangVotPaste}
        />

        <BatchAddRowsModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          activeSheet={activeSheet}
          onConfirmAdd={handleBatchAddRows}
          adding={addingBatch}
        />

        <ColumnPasteModal
          isOpen={showPasteColumnModal}
          onClose={() => setShowPasteColumnModal(false)}
          activeSheet={activeSheet}
          columns={columns}
          onConfirmPasteColumn={handleConfirmPasteColumn}
          pasting={pastingColumnSubmitting}
        />

        <GetDataPoModal
          isOpen={showGetDataPoModal}
          onClose={() => setShowGetDataPoModal(false)}
          poType={getDataPoType}
          onConfirmCollect={handleConfirmGetDataPo}
          collecting={collectingGetDataPo}
        />

        <PivotPasteModal
          isOpen={showPivotPasteModal}
          onClose={() => setShowPivotPasteModal(false)}
          targetBlock={pivotPasteTarget}
          onConfirmSave={handleConfirmPivotPaste}
          saving={savingPivotBlock}
        />
      </div>
    </QcLayout>
  );
}
