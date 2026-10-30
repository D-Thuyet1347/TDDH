import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  PieChart as PieChartIcon,
  Percent,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Table,
  Boxes,
  ArrowUpRight,
  ShieldAlert,
  Layers,
  Sparkles,
  Award,
  Tag,
  Info,
  Eye,
  EyeOff,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import { getOrderDemandReports, getOrderDemandRows } from '../AllAPIs';
import QcLayout from '../components/QcLayout';
import { Alert } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { nf } from '../utils/ultils';

const SHEET_NAME = 'Nhu cầu đơn hàng HRC';

// Bảng màu cho biểu đồ
const CHART_COLORS = [
  '#4f46e5', // indigo-600
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
  '#64748b', // slate-500
];

const QUALITY_COLORS = {
  nhu_cau: '#4f46e5', // Indigo - Nhu cầu
  loai_1: '#10b981', // Emerald - Đạt loại 1
  cho_xu_ly: '#f59e0b', // Amber - Chờ xử lý / skin
  loai_2: '#f43f5e', // Rose - Loại 2
};

const parseNum = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const str = String(val).trim().replace(/,/g, '');
  const n = Number.parseFloat(str);
  return Number.isFinite(n) ? n : 0;
};

const normalizeVal = (val) => String(val ?? '').trim();

export default function OrderChartsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedReportId = searchParams.get('job_id') || '';

  const [reports, setReports] = useState([]);
  const [reportId, setReportId] = useState('');
  const [rows, setRows] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [error, setError] = useState('');

  // Bộ lọc nhanh trên dashboard
  const [filterMonth, setFilterMonth] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterSteelGrade, setFilterSteelGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Trạng thái cho khu vực phân tích Mác Thép
  const [steelGradeView, setSteelGradeView] = useState('bar'); // 'bar' | 'rate' | 'pie' | 'table'
  const [steelGradeLimit, setSteelGradeLimit] = useState(0); // 0 = TOÀN BỘ mác thép, 8, 15, 25
  const [showDataLabels, setShowDataLabels] = useState(true); // Hiển thị nhãn số liệu trực tiếp trên biểu đồ
  const [searchGrade, setSearchGrade] = useState('');
  const [selectedGradeName, setSelectedGradeName] = useState('');

  // Tải danh sách báo cáo
  useEffect(() => {
    const controller = new AbortController();
    setLoadingReports(true);
    getOrderDemandReports({ limit: 100, signal: controller.signal })
      .then((res) => {
        const available = res?.reports || [];
        setReports(available);
        if (available.length > 0) {
          const matched = available.find((r) => r.job_id === requestedReportId);
          setReportId(matched ? matched.job_id : available[0].job_id);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingReports(false);
      });
    return () => controller.abort();
  }, [requestedReportId]);

  // Tải dữ liệu các dòng
  const fetchReportRows = useCallback(() => {
    if (!reportId) {
      setRows([]);
      return;
    }
    const controller = new AbortController();
    setLoadingRows(true);
    setError('');
    getOrderDemandRows({
      reportId,
      sheetName: SHEET_NAME,
      limit: 50000,
      offset: 0,
      signal: controller.signal,
    })
      .then((res) => {
        setRows(res?.rows || []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingRows(false);
      });
    return () => controller.abort();
  }, [reportId]);

  useEffect(() => {
    fetchReportRows();
  }, [fetchReportRows]);

  const selectReport = (e) => {
    const nextId = e.target.value;
    setReportId(nextId);
    setSearchParams(nextId ? { job_id: nextId } : {});
    setFilterMonth('');
    setFilterCustomer('');
    setFilterSteelGrade('');
    setFilterStatus('');
    setSelectedGradeName('');
  };

  const selectedReport = reports.find((r) => r.job_id === reportId);

  // Danh sách các giá trị duy nhất phục vụ Dropdown lọc
  const filterOptions = useMemo(() => {
    const months = new Set();
    const customers = new Set();
    const steelGrades = new Set();
    const statuses = new Set();

    rows.forEach((r) => {
      const v = r.values || {};
      const m = normalizeVal(v.thang || v['Tháng']);
      const c = normalizeVal(v.khach_hang || v['Khách hàng']);
      const s = normalizeVal(v.mac_thep || v['Mác thép']);
      const st = normalizeVal(v.tinh_trang || v['Tình trạng']);

      if (m) months.add(m);
      if (c) customers.add(c);
      if (s) steelGrades.add(s);
      if (st) statuses.add(st);
    });

    return {
      months: Array.from(months).sort(),
      customers: Array.from(customers).sort(),
      steelGrades: Array.from(steelGrades).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [rows]);

  // Dữ liệu sau khi áp dụng bộ lọc nhanh
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const v = r.values || {};
      const m = normalizeVal(v.thang || v['Tháng']);
      const c = normalizeVal(v.khach_hang || v['Khách hàng']);
      const s = normalizeVal(v.mac_thep || v['Mác thép']);
      const st = normalizeVal(v.tinh_trang || v['Tình trạng']);

      if (filterMonth && m !== filterMonth) return false;
      if (filterCustomer && c !== filterCustomer) return false;
      if (filterSteelGrade && s !== filterSteelGrade) return false;
      if (filterStatus && st !== filterStatus) return false;
      return true;
    });
  }, [rows, filterMonth, filterCustomer, filterSteelGrade, filterStatus]);

  // 1. TỔNG HỢP CHỈ SỐ KPI TỔNG THỂ
  const kpiStats = useMemo(() => {
    let totalDemand = 0;
    let totalL1 = 0;
    let totalL2 = 0;
    let totalWaitSkin = 0;
    let totalWaitProcess = 0;
    let totalKcs = 0;

    filteredRows.forEach((r) => {
      const v = r.values || {};
      totalDemand += parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      totalL1 += parseNum(v.loai_1 || v['Loại 1']);
      totalL2 += parseNum(v.loai_2 || v['Loại 2']);
      totalWaitSkin += parseNum(v.cho_skin || v['Chờ skin']);
      totalWaitProcess += parseNum(v.cho_xu_ly || v['Chờ xử lý']);
      totalKcs += parseNum(v.tong_sl_sx_kcs || v['Tổng SL sx KCS']);
    });

    const totalWaiting = totalWaitSkin + totalWaitProcess;
    const progressRate = totalDemand > 0 ? (totalL1 / totalDemand) * 100 : 0;
    const kcsRate = totalDemand > 0 ? (totalKcs / totalDemand) * 100 : 0;
    const l2Rate = totalDemand > 0 ? (totalL2 / totalDemand) * 100 : 0;

    return {
      rowCount: filteredRows.length,
      totalDemand,
      totalL1,
      totalL2,
      totalWaiting,
      totalKcs,
      progressRate,
      kcsRate,
      l2Rate,
    };
  }, [filteredRows]);

  // 2. DỮ LIỆU PHÂN TÍCH TOÀN BỘ MÁC THÉP VỚI ĐẦY ĐỦ THÔNG SỐ
  const steelGradeDetailData = useMemo(() => {
    const map = new Map();
    let totalAllDemand = 0;

    filteredRows.forEach((r) => {
      const v = r.values || {};
      const grade = normalizeVal(v.mac_thep || v['Mác thép']) || 'Chưa phân loại';
      const demand = parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      const l1 = parseNum(v.loai_1 || v['Loại 1']);
      const l2 = parseNum(v.loai_2 || v['Loại 2']);
      const wait = parseNum(v.cho_xu_ly || v['Chờ xử lý']) + parseNum(v.cho_skin || v['Chờ skin']);
      const kcs = parseNum(v.tong_sl_sx_kcs || v['Tổng SL sx KCS']);
      const tonPhoi = parseNum(v.ton_phoi || v['Tồn phôi']);
      const thuaThieu = parseNum(v.thua_thieu_so_voi_zbc04b || v['Thừa thiếu so với ZBC04B']);
      const cust = normalizeVal(v.khach_hang || v['Khách hàng']);
      const thick = parseNum(v.t || v['T']);

      totalAllDemand += demand;

      if (!map.has(grade)) {
        map.set(grade, {
          name: grade,
          nhu_cau: 0,
          loai_1: 0,
          loai_2: 0,
          cho_xu_ly: 0,
          tong_kcs: 0,
          ton_phoi: 0,
          thua_thieu: 0,
          count: 0,
          customers: new Set(),
          thicknesses: new Set(),
        });
      }
      const item = map.get(grade);
      item.nhu_cau += demand;
      item.loai_1 += l1;
      item.loai_2 += l2;
      item.cho_xu_ly += wait;
      item.tong_kcs += kcs;
      item.ton_phoi += tonPhoi;
      item.thua_thieu += thuaThieu;
      item.count += 1;
      if (cust) item.customers.add(cust);
      if (thick > 0) item.thicknesses.add(thick);
    });

    const list = Array.from(map.values()).map((item) => {
      const percent = totalAllDemand > 0 ? (item.nhu_cau / totalAllDemand) * 100 : 0;
      const rateL1 = item.nhu_cau > 0 ? (item.loai_1 / item.nhu_cau) * 100 : 0;
      const rateL2 = item.nhu_cau > 0 ? (item.loai_2 / item.nhu_cau) * 100 : 0;
      return {
        ...item,
        percent: Number(percent.toFixed(1)),
        rateL1: Number(rateL1.toFixed(1)),
        rateL2: Number(rateL2.toFixed(1)),
        customersList: Array.from(item.customers),
        thicknessesList: Array.from(item.thicknesses).sort((a, b) => a - b),
      };
    });

    list.sort((a, b) => b.nhu_cau - a.nhu_cau);
    return list;
  }, [filteredRows]);

  // Tổng hợp thông số cho Toàn bộ Mác Thép
  const steelGradeTotals = useMemo(() => {
    let sumDemand = 0;
    let sumL1 = 0;
    let sumL2 = 0;
    let sumWait = 0;
    let sumKcs = 0;
    let sumTonPhoi = 0;
    let sumThuaThieu = 0;
    let sumOrders = 0;

    steelGradeDetailData.forEach((item) => {
      sumDemand += item.nhu_cau;
      sumL1 += item.loai_1;
      sumL2 += item.loai_2;
      sumWait += item.cho_xu_ly;
      sumKcs += item.tong_kcs;
      sumTonPhoi += item.ton_phoi;
      sumThuaThieu += item.thua_thieu;
      sumOrders += item.count;
    });

    const rateL1 = sumDemand > 0 ? (sumL1 / sumDemand) * 100 : 0;
    const rateL2 = sumDemand > 0 ? (sumL2 / sumDemand) * 100 : 0;

    return {
      totalGrades: steelGradeDetailData.length,
      sumDemand,
      sumL1,
      sumL2,
      sumWait,
      sumKcs,
      sumTonPhoi,
      sumThuaThieu,
      sumOrders,
      rateL1: Number(rateL1.toFixed(1)),
      rateL2: Number(rateL2.toFixed(1)),
    };
  }, [steelGradeDetailData]);

  // Danh sách mác thép sau khi tìm kiếm và phân trang/giới hạn
  const displayedSteelGrades = useMemo(() => {
    let result = steelGradeDetailData;
    if (searchGrade.trim()) {
      const q = searchGrade.toLowerCase().trim();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (steelGradeLimit > 0) {
      result = result.slice(0, steelGradeLimit);
    }
    return result;
  }, [steelGradeDetailData, searchGrade, steelGradeLimit]);

  // Mác thép đang được chọn để soi thông số chi tiết
  const activeSelectedGrade = useMemo(() => {
    if (!selectedGradeName) return null;
    return steelGradeDetailData.find((g) => g.name === selectedGradeName) || null;
  }, [steelGradeDetailData, selectedGradeName]);

  const steelGradePieData = useMemo(() => {
    if (steelGradeDetailData.length <= 10) return steelGradeDetailData;
    const top9 = steelGradeDetailData.slice(0, 9);
    const others = steelGradeDetailData.slice(9);
    const othersDemand = others.reduce((acc, cur) => acc + cur.nhu_cau, 0);
    const othersPercent = others.reduce((acc, cur) => acc + cur.percent, 0);
    return [
      ...top9,
      {
        name: 'Mác thép khác',
        nhu_cau: othersDemand,
        percent: Number(othersPercent.toFixed(1)),
      },
    ];
  }, [steelGradeDetailData]);

  // 3. BIỂU ĐỒ TIẾN ĐỘ & PHÂN BỔ CHẤT LƯỢNG THEO KHÁCH HÀNG (TOP 10)
  const customerChartData = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const v = r.values || {};
      const customer = normalizeVal(v.khach_hang || v['Khách hàng']) || 'Khác';
      const demand = parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      const l1 = parseNum(v.loai_1 || v['Loại 1']);
      const l2 = parseNum(v.loai_2 || v['Loại 2']);
      const wait = parseNum(v.cho_xu_ly || v['Chờ xử lý']) + parseNum(v.cho_skin || v['Chờ skin']);

      if (!map.has(customer)) {
        map.set(customer, {
          name: customer,
          nhu_cau: 0,
          loai_1: 0,
          loai_2: 0,
          cho_xu_ly: 0,
        });
      }
      const item = map.get(customer);
      item.nhu_cau += demand;
      item.loai_1 += l1;
      item.loai_2 += l2;
      item.cho_xu_ly += wait;
    });

    return Array.from(map.values())
      .sort((a, b) => b.nhu_cau - a.nhu_cau)
      .slice(0, 10);
  }, [filteredRows]);

  // 4. BIỂU ĐỒ TIẾN ĐỘ THEO THÁNG / ĐỢT
  const monthTimelineData = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const v = r.values || {};
      const month = normalizeVal(v.thang || v['Tháng']) || 'Khác';
      const demand = parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      const l1 = parseNum(v.loai_1 || v['Loại 1']);
      const l2 = parseNum(v.loai_2 || v['Loại 2']);
      const kcs = parseNum(v.tong_sl_sx_kcs || v['Tổng SL sx KCS']);

      if (!map.has(month)) {
        map.set(month, {
          thang: month,
          nhu_cau: 0,
          loai_1: 0,
          loai_2: 0,
          tong_kcs: 0,
        });
      }
      const item = map.get(month);
      item.nhu_cau += demand;
      item.loai_1 += l1;
      item.loai_2 += l2;
      item.tong_kcs += kcs;
    });

    return Array.from(map.values()).sort((a, b) => a.thang.localeCompare(b.thang, 'vi-VN', { numeric: true }));
  }, [filteredRows]);

  // 5. BIỂU ĐỒ TÌNH TRẠNG ĐƠN HÀNG
  const statusChartData = useMemo(() => {
    const map = new Map();
    filteredRows.forEach((r) => {
      const v = r.values || {};
      const st = normalizeVal(v.tinh_trang || v['Tình trạng']) || 'Chưa xác định';
      const demand = parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      if (!map.has(st)) {
        map.set(st, { name: st, count: 0, weight: 0 });
      }
      const item = map.get(st);
      item.count += 1;
      item.weight += demand;
    });

    return Array.from(map.values()).sort((a, b) => b.weight - a.weight);
  }, [filteredRows]);

  // 6. BIỂU ĐỒ PHÂN BỔ THEO DẢI ĐỘ DÀY T (mm)
  const thicknessRangeData = useMemo(() => {
    const ranges = [
      { name: '< 2.0 mm', min: 0, max: 2.0, weight: 0, count: 0 },
      { name: '2.0 - 3.0 mm', min: 2.0, max: 3.0, weight: 0, count: 0 },
      { name: '3.0 - 5.0 mm', min: 3.0, max: 5.0, weight: 0, count: 0 },
      { name: '5.0 - 8.0 mm', min: 5.0, max: 8.0, weight: 0, count: 0 },
      { name: '> 8.0 mm', min: 8.0, max: 999, weight: 0, count: 0 },
    ];

    filteredRows.forEach((r) => {
      const v = r.values || {};
      const t = parseNum(v.t || v['T'] || v.day_muc_tieu || v['Dày mục tiêu']);
      const weight = parseNum(v.kl_1c || v['KL_1C'] || v.kl_1d || v['KL_1D']);
      if (t > 0) {
        const found = ranges.find((rg) => t >= rg.min && t < rg.max);
        if (found) {
          found.weight += weight;
          found.count += 1;
        }
      }
    });

    return ranges;
  }, [filteredRows]);

  const hasFilters = filterMonth || filterCustomer || filterSteelGrade || filterStatus;
  const resetFilters = () => {
    setFilterMonth('');
    setFilterCustomer('');
    setFilterSteelGrade('');
    setFilterStatus('');
    setSelectedGradeName('');
  };

  return (
    <QcLayout>
      <div className="space-y-6 sm:space-y-8 w-full pb-10">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200/70">
              <BarChart3 size={14} className="text-indigo-600" /> Trung tâm Phân tích & Trực quan hóa
            </div>
            <h1 className="text-[clamp(28px,3vw,36px)] font-extrabold leading-tight tracking-tight text-slate-900">
              Biểu đồ Nhu cầu Đơn hàng HRC
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Trực quan hóa khối lượng đặt hàng, tiến độ cán, phân bổ chất lượng Loại 1, Loại 2 và toàn bộ thông số mác thép.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <Link to={`/orders${reportId ? `?job_id=${encodeURIComponent(reportId)}` : ''}`}>
                <Table size={14} className="mr-1.5 text-indigo-600" /> Xem bảng chi tiết
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchReportRows}
              disabled={loadingRows}
              className="h-10 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <RefreshCw size={14} className={`mr-1.5 ${loadingRows ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
              Làm mới dữ liệu
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="flex items-center gap-2 rounded-2xl p-4 text-xs font-semibold">
            <ShieldAlert size={18} /> {error}
          </Alert>
        )}

        {/* Bảng điều khiển bộ lọc & Chọn Báo cáo */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-5">
            <label className="sm:col-span-2 md:col-span-1">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Chọn báo cáo</span>
              <Select
                value={reportId}
                onChange={selectReport}
                disabled={loadingReports || reports.length === 0}
                className="h-10 w-full text-xs font-semibold"
              >
                <option value="">{loadingReports ? 'Đang tải…' : 'Chưa có báo cáo'}</option>
                {reports.map((r) => (
                  <option key={r.job_id} value={r.job_id}>
                    {r.filename}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Lọc Tháng</span>
              <Select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                disabled={loadingRows || filterOptions.months.length === 0}
                className="h-10 w-full text-xs font-medium"
              >
                <option value="">Tất cả các tháng ({filterOptions.months.length})</option>
                {filterOptions.months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Lọc Khách hàng</span>
              <Select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                disabled={loadingRows || filterOptions.customers.length === 0}
                className="h-10 w-full text-xs font-medium"
              >
                <option value="">Tất cả khách hàng ({filterOptions.customers.length})</option>
                {filterOptions.customers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Lọc Mác thép</span>
              <Select
                value={filterSteelGrade}
                onChange={(e) => setFilterSteelGrade(e.target.value)}
                disabled={loadingRows || filterOptions.steelGrades.length === 0}
                className="h-10 w-full text-xs font-medium"
              >
                <option value="">Tất cả mác thép ({filterOptions.steelGrades.length})</option>
                {filterOptions.steelGrades.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>

            <label>
              <span className="mb-1.5 block text-xs font-bold text-slate-700">Lọc Tình trạng</span>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                disabled={loadingRows || filterOptions.statuses.length === 0}
                className="h-10 w-full text-xs font-medium"
              >
                <option value="">Tất cả tình trạng ({filterOptions.statuses.length})</option>
                {filterOptions.statuses.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs">
            <span className="font-medium text-slate-500">
              Đang phân tích: <strong className="text-slate-900">{nf(kpiStats.rowCount)}</strong> / {nf(rows.length)} đơn hàng
              {selectedReport && ` · File: ${selectedReport.filename}`}
            </span>

            {hasFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border-indigo-200 bg-indigo-50/70 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100/80"
              >
                <RotateCcw size={12} /> Xóa bộ lọc đang áp dụng
              </Button>
            )}
          </div>
        </Card>

        {/* 1. THẺ KPI TỔNG THỂ */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Tổng nhu cầu */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tổng Nhu Cầu Đặt Hàng</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Boxes size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-slate-900">{nf(kpiStats.totalDemand, 1)} <span className="text-xs font-semibold text-slate-400">tấn</span></p>
            <p className="mt-1 text-[11px] font-semibold text-slate-400">Từ {nf(kpiStats.rowCount)} dòng PO/xx</p>
          </Card>

          {/* Đạt Loại 1 */}
          <Card className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">Sản Xuất Đạt Loại 1</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-emerald-700">{nf(kpiStats.totalL1, 1)} <span className="text-xs font-semibold text-emerald-600">tấn</span></p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
              <span className="text-emerald-700">Tỷ lệ hoàn thành:</span>
              <span className="text-emerald-800">{kpiStats.progressRate.toFixed(1)}%</span>
            </div>
          </Card>

          {/* Chờ xử lý / Skin */}
          <Card className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">Chờ Xử Lý & Chờ Skin</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Clock size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-amber-700">{nf(kpiStats.totalWaiting, 1)} <span className="text-xs font-semibold text-amber-600">tấn</span></p>
            <p className="mt-1 text-[11px] font-semibold text-amber-700">Đang chờ hoàn thiện chất lượng</p>
          </Card>

          {/* Loại 2 */}
          <Card className="rounded-2xl border border-rose-100 bg-rose-50/30 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">Phát Sinh Loại 2</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-rose-700">{nf(kpiStats.totalL2, 1)} <span className="text-xs font-semibold text-rose-600">tấn</span></p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
              <span className="text-rose-700">Tỷ lệ Loại 2:</span>
              <span className="text-rose-800">{kpiStats.l2Rate.toFixed(1)}%</span>
            </div>
          </Card>

          {/* Tổng SL sx KCS */}
          <Card className="rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-800">Tổng SL Sản Xuất KCS</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Layers size={18} />
              </span>
            </div>
            <p className="mt-3 text-2xl font-black text-blue-700">{nf(kpiStats.totalKcs, 1)} <span className="text-xs font-semibold text-blue-600">tấn</span></p>
            <div className="mt-1 flex items-center justify-between text-[11px] font-bold">
              <span className="text-blue-700">Tỷ lệ KCS:</span>
              <span className="text-blue-800">{kpiStats.kcsRate.toFixed(1)}%</span>
            </div>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* KHU VỰC PHÂN TÍCH TOÀN BỘ MÁC THÉP VÀ CÁC LABEL THÔNG SỐ (ENHANCED)     */}
        {/* ========================================================================= */}
        <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-card">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-100">
                  <Award size={18} />
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Phân tích Toàn bộ Mác Thép & Nhãn Thông Số Chi Tiết
                </h2>
                <Badge className="bg-indigo-600 text-white font-bold">
                  {steelGradeTotals.totalGrades} Mác Thép
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Trực quan hóa toàn diện mọi mác thép với nhãn thông số trực tiếp trên cột (Nhu cầu, Đạt Loại 1, Chờ xử lý, Loại 2, Tỷ lệ %).
              </p>
            </div>

            {/* Điều khiển: View, Switch Labels, Selector */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Nút bật/tắt nhãn số liệu trên cột */}
              <button
                type="button"
                onClick={() => setShowDataLabels((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-all ${
                  showDataLabels
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Bật/Tắt nhãn số liệu hiển thị trực tiếp trên đầu các cột"
              >
                {showDataLabels ? <Eye size={14} /> : <EyeOff size={14} />}
                {showDataLabels ? 'Hiện nhãn số liệu' : 'Ẩn nhãn số liệu'}
              </button>

              {/* Nhóm nút chọn chế độ xem */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSteelGradeView('bar')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    steelGradeView === 'bar'
                      ? 'bg-white font-bold text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 size={14} /> Cột Tiến độ
                </button>
                <button
                  type="button"
                  onClick={() => setSteelGradeView('rate')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    steelGradeView === 'rate'
                      ? 'bg-white font-bold text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Percent size={14} /> Tỷ lệ Đạt Loại 1
                </button>
                <button
                  type="button"
                  onClick={() => setSteelGradeView('pie')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    steelGradeView === 'pie'
                      ? 'bg-white font-bold text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PieChartIcon size={14} /> Cơ cấu %
                </button>
                <button
                  type="button"
                  onClick={() => setSteelGradeView('table')}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                    steelGradeView === 'table'
                      ? 'bg-white font-bold text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table size={14} /> Bảng Thông số
                </button>
              </div>

              {/* Bộ lọc số lượng mác thép */}
              {steelGradeView !== 'pie' && (
                <Select
                  value={String(steelGradeLimit)}
                  onChange={(e) => setSteelGradeLimit(Number(e.target.value))}
                  className="h-9 text-xs font-semibold w-40 rounded-xl"
                >
                  <option value="0">Tất cả ({steelGradeTotals.totalGrades} mác thép)</option>
                  <option value="10">Top 10 mác lớn nhất</option>
                  <option value="15">Top 15 mác lớn nhất</option>
                  <option value="25">Top 25 mác lớn nhất</option>
                </Select>
              )}
            </div>
          </div>

          {/* DẢI THẺ NHÃN (LABELS) TỔNG HỢP CHO TỪNG THÔNG SỐ CỦA MÁC THÉP */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7 text-xs">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-indigo-700">🏷️ Nhu Cầu Đặt Hàng</span>
              <span className="text-sm font-extrabold text-indigo-900">{nf(steelGradeTotals.sumDemand, 1)} t</span>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-emerald-700">🏷️ Đạt Loại 1</span>
              <span className="text-sm font-extrabold text-emerald-900">{nf(steelGradeTotals.sumL1, 1)} t <span className="text-[10px] text-emerald-700 font-bold">({steelGradeTotals.rateL1}%)</span></span>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-amber-700">🏷️ Chờ Xử Lý / Skin</span>
              <span className="text-sm font-extrabold text-amber-900">{nf(steelGradeTotals.sumWait, 1)} t</span>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-rose-700">🏷️ Phát Sinh Loại 2</span>
              <span className="text-sm font-extrabold text-rose-900">{nf(steelGradeTotals.sumL2, 1)} t <span className="text-[10px] text-rose-700 font-bold">({steelGradeTotals.rateL2}%)</span></span>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-blue-700">🏷️ Tổng SL KCS</span>
              <span className="text-sm font-extrabold text-blue-900">{nf(steelGradeTotals.sumKcs, 1)} t</span>
            </div>
            <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-cyan-700">🏷️ Tồn Phôi</span>
              <span className="text-sm font-extrabold text-cyan-900">{nf(steelGradeTotals.sumTonPhoi, 1)} t</span>
            </div>
            <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-2.5">
              <span className="block text-[11px] font-bold text-purple-700">🏷️ Thừa / Thiếu</span>
              <span className="text-sm font-extrabold text-purple-900">{nf(steelGradeTotals.sumThuaThieu, 1)} t</span>
            </div>
          </div>

          {/* HỘP TRA CỨU NHANH & CHỌN MÁC THÉP ĐỂ XEM HỒ SƠ CHI TIẾT */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-64">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search size={14} className="text-indigo-600" /> Tìm kiếm mác:
              </span>
              <Input
                type="text"
                placeholder="Nhập tên mác thép (VD: SAE1006, SS400...)"
                value={searchGrade}
                onChange={(e) => setSearchGrade(e.target.value)}
                className="h-8 max-w-xs text-xs font-medium bg-white"
              />
              {searchGrade && (
                <button
                  type="button"
                  onClick={() => setSearchGrade('')}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Xóa tìm kiếm
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Xem hồ sơ mác:</span>
              <Select
                value={selectedGradeName}
                onChange={(e) => setSelectedGradeName(e.target.value)}
                className="h-8 text-xs font-semibold w-48 rounded-xl bg-white"
              >
                <option value="">-- Chọn mác thép chi tiết --</option>
                {steelGradeDetailData.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({nf(g.nhu_cau, 0)} t)
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* NẾU CÓ MÁC THÉP ĐƯỢC CHỌN -> HIỂN THỊ HỒ SƠ THÔNG SỐ ĐẦY ĐỦ */}
          {activeSelectedGrade && (
            <div className="mt-4 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white p-4.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-xs">
                    ★
                  </span>
                  <h4 className="text-sm font-extrabold text-indigo-950">
                    Hồ sơ Thông số Mác Thép: <span className="text-indigo-600 text-base">{activeSelectedGrade.name}</span>
                  </h4>
                  <Badge className="bg-indigo-100 text-indigo-800 font-bold border-indigo-200">
                    {activeSelectedGrade.count} đơn hàng
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedGradeName('')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  ✕ Đóng hồ sơ
                </button>
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
                <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-500 font-medium">Nhu cầu đặt hàng</span>
                  <p className="mt-1 text-base font-black text-slate-900">{nf(activeSelectedGrade.nhu_cau, 1)} t</p>
                  <span className="text-[10px] font-bold text-indigo-600">{activeSelectedGrade.percent}% tổng nhu cầu</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-emerald-200 shadow-2xs">
                  <span className="text-emerald-700 font-medium">Đạt Loại 1</span>
                  <p className="mt-1 text-base font-black text-emerald-700">{nf(activeSelectedGrade.loai_1, 1)} t</p>
                  <span className="text-[10px] font-bold text-emerald-800">Hoàn thành: {activeSelectedGrade.rateL1}%</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-amber-200 shadow-2xs">
                  <span className="text-amber-700 font-medium">Chờ xử lý / Skin</span>
                  <p className="mt-1 text-base font-black text-amber-700">{nf(activeSelectedGrade.cho_xu_ly, 1)} t</p>
                  <span className="text-[10px] text-amber-600">Đang kiểm định</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-rose-200 shadow-2xs">
                  <span className="text-rose-700 font-medium">Loại 2 (Phế/Thứ)</span>
                  <p className="mt-1 text-base font-black text-rose-700">{nf(activeSelectedGrade.loai_2, 1)} t</p>
                  <span className="text-[10px] font-bold text-rose-800">Tỷ lệ lỗi: {activeSelectedGrade.rateL2}%</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-blue-200 shadow-2xs">
                  <span className="text-blue-700 font-medium">Tổng SL sx KCS</span>
                  <p className="mt-1 text-base font-black text-blue-700">{nf(activeSelectedGrade.tong_kcs, 1)} t</p>
                  <span className="text-[10px] text-blue-600">Thực tế sản xuất</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-cyan-200 shadow-2xs">
                  <span className="text-cyan-700 font-medium">Tồn phôi</span>
                  <p className="mt-1 text-base font-black text-cyan-700">{nf(activeSelectedGrade.ton_phoi, 1)} t</p>
                  <span className="text-[10px] text-slate-500">Phôi sẵn sàng</span>
                </div>
              </div>

              {/* Khách hàng & Độ dày của mác này */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-indigo-100/70 pt-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700">Khách hàng đặt:</span>
                  {activeSelectedGrade.customersList.slice(0, 6).map((c) => (
                    <span key={c} className="rounded-md bg-indigo-100/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
                      {c}
                    </span>
                  ))}
                  {activeSelectedGrade.customersList.length > 6 && (
                    <span className="text-[11px] font-semibold text-slate-400">+{activeSelectedGrade.customersList.length - 6} khách khác</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700">Độ dày T (mm):</span>
                  {activeSelectedGrade.thicknessesList.slice(0, 8).map((t) => (
                    <span key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {t}mm
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 1: BIỂU ĐỒ CỘT TIẾN ĐỘ & PHÂN BỔ CHẤT LƯỢNG KÈM LABELS TRỰC TIẾP */}
          {steelGradeView === 'bar' && (
            <div className="pt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>So sánh Nhu cầu đặt hàng vs Đạt Loại 1 vs Chờ xử lý vs Loại 2 (Đơn vị: Tấn) · {showDataLabels ? '🏷️ Đang hiển thị nhãn số liệu trên đầu cột' : ''}</span>
                <span className="font-semibold text-slate-700">Đang hiển thị {displayedSteelGrades.length} / {steelGradeTotals.totalGrades} mác thép</span>
              </div>
              {displayedSteelGrades.length === 0 ? (
                <div className="flex h-80 items-center justify-center text-xs text-slate-400">Không có dữ liệu mác thép phù hợp</div>
              ) : (
                <div className="overflow-x-auto pb-3">
                  <div style={{ minWidth: Math.max(800, displayedSteelGrades.length * 75), height: 420 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayedSteelGrades} margin={{ top: 28, right: 20, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${nf(val)}`} />
                        <Tooltip
                          formatter={(val, name) => {
                            const labels = {
                              nhu_cau: 'Nhu cầu đặt hàng',
                              loai_1: 'Đạt Loại 1',
                              cho_xu_ly: 'Chờ xử lý / Skin',
                              loai_2: 'Loại 2',
                            };
                            return [`${nf(val, 1)} tấn`, labels[name] || name];
                          }}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        />
                        <Legend
                          verticalAlign="top"
                          height={36}
                          formatter={(value) => {
                            const labels = {
                              nhu_cau: 'Nhu cầu đặt hàng',
                              loai_1: 'Đạt Loại 1',
                              cho_xu_ly: 'Chờ xử lý / Skin',
                              loai_2: 'Loại 2',
                            };
                            return <span className="text-xs font-semibold text-slate-700">{labels[value] || value}</span>;
                          }}
                        />
                        <Bar
                          dataKey="nhu_cau"
                          fill={QUALITY_COLORS.nhu_cau}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                          onClick={(entry) => setSelectedGradeName(entry.name)}
                          className="cursor-pointer"
                        >
                          {showDataLabels && (
                            <LabelList
                              dataKey="nhu_cau"
                              position="top"
                              formatter={(val) => (val > 0 ? `${nf(val, 0)}` : '')}
                              style={{ fontSize: 10, fontWeight: 700, fill: '#4338ca' }}
                            />
                          )}
                        </Bar>
                        <Bar
                          dataKey="loai_1"
                          fill={QUALITY_COLORS.loai_1}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                          onClick={(entry) => setSelectedGradeName(entry.name)}
                          className="cursor-pointer"
                        >
                          {showDataLabels && (
                            <LabelList
                              dataKey="loai_1"
                              position="top"
                              formatter={(val) => (val > 0 ? `${nf(val, 0)}` : '')}
                              style={{ fontSize: 10, fontWeight: 700, fill: '#059669' }}
                            />
                          )}
                        </Bar>
                        <Bar
                          dataKey="cho_xu_ly"
                          fill={QUALITY_COLORS.cho_xu_ly}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                          onClick={(entry) => setSelectedGradeName(entry.name)}
                          className="cursor-pointer"
                        >
                          {showDataLabels && (
                            <LabelList
                              dataKey="cho_xu_ly"
                              position="top"
                              formatter={(val) => (val > 0 ? `${nf(val, 0)}` : '')}
                              style={{ fontSize: 10, fontWeight: 700, fill: '#d97706' }}
                            />
                          )}
                        </Bar>
                        <Bar
                          dataKey="loai_2"
                          fill={QUALITY_COLORS.loai_2}
                          radius={[4, 4, 0, 0]}
                          maxBarSize={30}
                          onClick={(entry) => setSelectedGradeName(entry.name)}
                          className="cursor-pointer"
                        >
                          {showDataLabels && (
                            <LabelList
                              dataKey="loai_2"
                              position="top"
                              formatter={(val) => (val > 0 ? `${nf(val, 0)}` : '')}
                              style={{ fontSize: 10, fontWeight: 700, fill: '#e11d48' }}
                            />
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: BIỂU ĐỒ TỶ LỆ ĐẠT LOẠI 1 (%) KÈM LABELS TRỰC TIẾP */}
          {steelGradeView === 'rate' && (
            <div className="pt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                <span>Tỷ lệ hoàn thành Loại 1 (%) theo từng mác thép · {showDataLabels ? '🏷️ Nhãn % hiển thị trực tiếp trên đầu cột' : ''}</span>
                <div className="flex items-center gap-3 text-[11px] font-semibold">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≥ 80% (Tốt)</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 50% - 80%</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> &lt; 50%</span>
                </div>
              </div>

              {displayedSteelGrades.length === 0 ? (
                <div className="flex h-80 items-center justify-center text-xs text-slate-400">Không có dữ liệu mác thép phù hợp</div>
              ) : (
                <div className="overflow-x-auto pb-3">
                  <div style={{ minWidth: Math.max(800, displayedSteelGrades.length * 75), height: 420 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={displayedSteelGrades} margin={{ top: 28, right: 20, left: 10, bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }}
                          angle={-25}
                          textAnchor="end"
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          tickFormatter={(val) => `${val}%`}
                          domain={[0, (dataMax) => Math.max(100, Math.ceil(dataMax / 10) * 10)]}
                        />
                        <Tooltip
                          formatter={(val, name, item) => [
                            `${val}% (Đạt: ${nf(item.payload.loai_1, 1)} / ${nf(item.payload.nhu_cau, 1)} tấn)`,
                            'Tỷ lệ hoàn thành Loại 1',
                          ]}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                        />
                        <Bar
                          dataKey="rateL1"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={44}
                          onClick={(entry) => setSelectedGradeName(entry.name)}
                          className="cursor-pointer"
                        >
                          {displayedSteelGrades.map((entry) => {
                            const color = entry.rateL1 >= 80 ? '#10b981' : entry.rateL1 >= 50 ? '#f59e0b' : '#f43f5e';
                            return <Cell key={`cell-rate-${entry.name}`} fill={color} />;
                          })}
                          {showDataLabels && (
                            <LabelList
                              dataKey="rateL1"
                              position="top"
                              formatter={(val) => `${val}%`}
                              style={{ fontSize: 11, fontWeight: 800, fill: '#1e293b' }}
                            />
                          )}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: BIỂU ĐỒ TRÒN CƠ CẤU % VỚI LABEL CHỈ THỊ RÕ RÀNG */}
          {steelGradeView === 'pie' && (
            <div className="pt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={steelGradePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="nhu_cau"
                      label={({ name, percent }) => `${name} (${percent}%)`}
                      labelLine={true}
                    >
                      {steelGradePieData.map((entry, index) => (
                        <Cell key={`cell-pie-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [`${nf(val, 1)} tấn (${item.payload.percent}%)`, name]}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="lg:col-span-5 space-y-2 max-h-96 overflow-y-auto pr-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tỷ trọng các chủng loại mác thép:</p>
                {steelGradePieData.map((item, index) => (
                  <div
                    key={item.name}
                    onClick={() => setSelectedGradeName(item.name)}
                    className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/50 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-bold text-slate-800 truncate" title={item.name}>{item.name}</span>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-extrabold text-slate-900">{nf(item.nhu_cau, 1)} tấn</span>
                      <span className="ml-2 font-bold text-indigo-600">({item.percent}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 4: BẢNG TOÀN BỘ THÔNG SỐ CỦA MÁC THÉP */}
          {steelGradeView === 'table' && (
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3">Mác thép</th>
                    <th className="py-3 px-3 text-center">Số đơn</th>
                    <th className="py-3 px-3 text-right">Nhu cầu (Tấn)</th>
                    <th className="py-3 px-3 text-right">Cơ cấu %</th>
                    <th className="py-3 px-3 text-right text-emerald-700">Đạt Loại 1 (Tấn)</th>
                    <th className="py-3 px-3 text-right text-amber-700">Chờ xử lý/Skin (Tấn)</th>
                    <th className="py-3 px-3 text-right text-rose-700">Loại 2 (Tấn)</th>
                    <th className="py-3 px-3 text-right text-blue-700">Tổng KCS (Tấn)</th>
                    <th className="py-3 px-3 text-right text-cyan-700">Tồn phôi (Tấn)</th>
                    <th className="py-3 px-3 text-center">Tiến độ Loại 1</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedSteelGrades.map((g, idx) => (
                    <tr
                      key={g.name}
                      onClick={() => setSelectedGradeName(g.name)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors"
                      title="Click để xem hồ sơ mác thép này"
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {g.name}
                        {selectedGradeName === g.name && (
                          <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] text-white">Đang chọn</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-slate-500">{nf(g.count)}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">{nf(g.nhu_cau, 1)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-indigo-600">{g.percent}%</td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-700">{nf(g.loai_1, 1)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-amber-700">{nf(g.cho_xu_ly, 1)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-rose-700">{nf(g.loai_2, 1)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-blue-700">{nf(g.tong_kcs, 1)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-cyan-700">{nf(g.ton_phoi, 1)}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${g.rateL1 >= 80 ? 'bg-emerald-500' : g.rateL1 >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, Math.max(0, g.rateL1))}%` }}
                            />
                          </div>
                          <span className={`text-[11px] font-bold min-w-9 text-right ${g.rateL1 >= 80 ? 'text-emerald-700' : g.rateL1 >= 50 ? 'text-amber-700' : 'text-rose-700'}`}>
                            {g.rateL1}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* HÀNG BIỂU ĐỒ 2: TIẾN ĐỘ THEO TOP KHÁCH HÀNG & PHÂN BỔ ĐỘ DÀY T */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Biểu đồ Cột Chồng: Top Khách Hàng (2/3 width) */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tiến độ & Phân bổ Chất lượng theo Top 10 Khách hàng lớn nhất</h3>
                <p className="text-xs text-slate-400">So sánh Khối lượng đặt hàng vs Loại 1 vs Chờ xử lý vs Loại 2 (Đơn vị: Tấn)</p>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 font-bold border-indigo-200">
                Top 10 Khách hàng
              </Badge>
            </div>

            {customerChartData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-xs text-slate-400">Chưa có dữ liệu phù hợp</div>
            ) : (
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerChartData} margin={{ top: 20, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${nf(val)}`} />
                    <Tooltip
                      formatter={(val, name) => {
                        const labels = {
                          nhu_cau: 'Nhu cầu đặt hàng',
                          loai_1: 'Đạt Loại 1',
                          cho_xu_ly: 'Chờ xử lý / Skin',
                          loai_2: 'Loại 2',
                        };
                        return [`${nf(val, 1)} tấn`, labels[name] || name];
                      }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        const labels = {
                          nhu_cau: 'Nhu cầu đặt hàng',
                          loai_1: 'Đạt Loại 1',
                          cho_xu_ly: 'Chờ xử lý / Skin',
                          loai_2: 'Loại 2',
                        };
                        return <span className="text-xs font-semibold text-slate-700">{labels[value] || value}</span>;
                      }}
                    />
                    <Bar dataKey="nhu_cau" fill={QUALITY_COLORS.nhu_cau} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="loai_1" fill={QUALITY_COLORS.loai_1} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="cho_xu_ly" fill={QUALITY_COLORS.cho_xu_ly} radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="loai_2" fill={QUALITY_COLORS.loai_2} radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Biểu đồ Phân bổ Chiều Dày T (mm) (1/3 width) */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <div className="mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Phân bổ theo Dải Độ Dày T (mm)</h3>
              <p className="text-xs text-slate-400">Sản lượng đặt hàng theo các dải chiều dày cán</p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={thicknessRangeData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${nf(val)}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} />
                  <Tooltip
                    formatter={(val, name, item) => [`${nf(val, 1)} tấn (${item.payload.count} đơn)`, 'Khối lượng']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="weight" fill="#06b6d4" radius={[0, 6, 6, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* HÀNG BIỂU ĐỒ 3: DIỄN BIẾN THEO THÁNG & TÌNH TRẠNG TIẾN ĐỘ */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Biểu đồ Area: Nhu cầu & Hoàn thành qua các Tháng (2/3 width) */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card lg:col-span-2">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Diễn biến Kế hoạch & Thực hiện qua các Tháng</h3>
                <p className="text-xs text-slate-400">So sánh Tổng nhu cầu đặt hàng vs Sản lượng hoàn thành Loại 1 vs Tổng KCS</p>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 font-bold border-emerald-200">
                Theo Tháng
              </Badge>
            </div>

            {monthTimelineData.length === 0 ? (
              <div className="flex h-72 items-center justify-center text-xs text-slate-400">Chưa có dữ liệu tháng</div>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthTimelineData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorL1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="thang" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `${nf(val)}`} />
                    <Tooltip
                      formatter={(val, name) => {
                        const labels = {
                          nhu_cau: 'Nhu cầu đặt hàng',
                          loai_1: 'Đạt Loại 1',
                          tong_kcs: 'Tổng SL sx KCS',
                        };
                        return [`${nf(val, 1)} tấn`, labels[name] || name];
                      }}
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => {
                        const labels = {
                          nhu_cau: 'Nhu cầu đặt hàng',
                          loai_1: 'Đạt Loại 1',
                          tong_kcs: 'Tổng SL sx KCS',
                        };
                        return <span className="text-xs font-semibold text-slate-700">{labels[value] || value}</span>;
                      }}
                    />
                    <Area type="monotone" dataKey="nhu_cau" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDemand)" />
                    <Area type="monotone" dataKey="loai_1" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorL1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Biểu đồ Donut: Phân loại Tình trạng đơn hàng (1/3 width) */}
          <Card className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card flex flex-col justify-between">
            <div className="mb-3 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Cơ cấu Tình trạng Đơn hàng</h3>
              <p className="text-xs text-slate-400">Phân loại theo trạng thái tiến độ cán</p>
            </div>

            {statusChartData.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-xs text-slate-400">Chưa có dữ liệu tình trạng</div>
            ) : (
              <>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="weight"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-st-${entry.name}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name, item) => [`${nf(val, 1)} tấn (${item.payload.count} đơn)`, name]}
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {statusChartData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="font-semibold text-slate-700 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <span className="font-bold text-slate-900 shrink-0 ml-2">{nf(item.weight, 1)} tấn</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* BẢNG TỔNG HỢP CHI TIẾT TOP KHÁCH HÀNG */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
          <div className="border-b border-slate-100 px-5 py-4 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bảng Tổng hợp Tiến độ Top Khách hàng</h3>
              <p className="text-xs text-slate-400">Chi tiết sản lượng đặt hàng, đạt loại 1, loại 2 và tỷ lệ hoàn thành</p>
            </div>
            <Link
              to={`/orders${reportId ? `?job_id=${encodeURIComponent(reportId)}` : ''}`}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Mở toàn bộ dữ liệu <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-100/70 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4 text-right">Nhu cầu (Tấn)</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Loại 1 (Tấn)</th>
                  <th className="py-3 px-4 text-right text-amber-700">Chờ xử lý / Skin (Tấn)</th>
                  <th className="py-3 px-4 text-right text-rose-700">Loại 2 (Tấn)</th>
                  <th className="py-3 px-4 text-center">Tiến độ hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customerChartData.map((c) => {
                  const rate = c.nhu_cau > 0 ? (c.loai_1 / c.nhu_cau) * 100 : 0;
                  return (
                    <tr key={c.name} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">{nf(c.nhu_cau, 1)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-700">{nf(c.loai_1, 1)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-700">{nf(c.cho_xu_ly, 1)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-rose-700">{nf(c.loai_2, 1)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2 max-w-xs mx-auto">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-indigo-600 rounded-full"
                              style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 min-w-10 text-right">
                            {rate.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </QcLayout>
  );
}
