// Column and Sheet definitions for SkinPage module

export const PASTE_FORM_COLUMNS = [
  'ID Cuộn Bó',
  'Material Description',
  'Khối lượng',
  'Ngày sản xuất',
  'Ca',
  'Vị trí',
  'Order',
  'Mác phôi',
];

export const SKIN_HRC2_COLUMNS = [
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
  'Mác phôi',
  'Thickness',
  'DVKTKH',
  'Chỉ định Skin',
  'Mục đích sử dụng',
  'Ưu tiên đơn hàng',
  'Lỗi lệch',
  'GHC',
  '% Elongation',
  'Tháng',
];

export const DATA_SOURCE_COLUMNS = [
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

export const PO_HSM_COLUMNS = [
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

export const PO_SKIN_COLUMNS = [
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

export const DATA_MES_COLUMNS = [
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

export const GET_DATA_COLUMNS = [
  'Line',
  'Yêu cầu đặt biệt',
  'STT',
  'Plan ID',
  'ID Coil',
  'GHC',
  '% Elongation',
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

export const CHECK_DATA_SKIN_COLUMNS = [
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

export const GET_DATA_PO_COLUMNS = [
  'PO',
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
];

export const PIVOT_TABLE_COLUMNS = [
  'ID Cuộn (Yêu cầu)',
  'Yêu cầu đặc biệt (Cuộn)',
  'PO (Yêu cầu)',
  'Yêu cầu đặc biệt (PO)',
  'PO/ID cuộn (Ưu tiên)',
  'Ưu tiên sản xuất',
];

export const HANG_VOT_COLUMNS = [
  'ID COIL',
  'HƯỚNG XỬ LÝ',
  'LỖI LỆCH TDC',
  'NM ĐỀ XUẤT',
  'DVKTKH & QLCL',
];

export const KE_HOACH_COLUMNS = [
  'Line',
  'Plan ID',
  'ID Cuộn Bó',
  'Material Description',
  'Ngày sản xuất',
  'Ca',
];

export const RULES_SKIN_COLUMNS = [
  'Loại Rule',
  'Nhóm / GHC',
  'Mác phôi',
  '1.2',
  '1.5',
  '2.0',
  '2.5',
  '3.0',
  '3.5',
  '4.0',
  '4.5',
  '5.0',
  '5.5',
  '6.0',
  'Ghi chú',
];

export const SHEET_TABS = [
  {
    id: 'SKIN_HRC2',
    label: 'SKIN_HRC2',
    statKey: 'skin_hrc2_count',
    activeClass: 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30',
    inactiveClass: 'bg-blue-50/80 text-blue-800 border border-blue-200 hover:bg-blue-100',
    badgeClass: 'bg-blue-100 text-blue-800 group-hover:bg-blue-200',
  },
  {
    id: 'DATA_SOURCE',
    label: 'DATA_SOURCE',
    statKey: 'data_source_count',
    activeClass: 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/30',
    inactiveClass: 'bg-indigo-50/80 text-indigo-800 border border-indigo-200 hover:bg-indigo-100',
    badgeClass: 'bg-indigo-100 text-indigo-800 group-hover:bg-indigo-200',
  },
  {
    id: 'PO_HSM',
    label: 'PO_HSM',
    statKey: 'po_hsm_count',
    activeClass: 'bg-violet-600 text-white shadow-sm ring-2 ring-violet-600/30',
    inactiveClass: 'bg-violet-50/80 text-violet-800 border border-violet-200 hover:bg-violet-100',
    badgeClass: 'bg-violet-100 text-violet-800 group-hover:bg-violet-200',
  },
  {
    id: 'PO_SKIN',
    label: 'PO_SKIN',
    statKey: 'po_skin_count',
    activeClass: 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-600/30',
    inactiveClass: 'bg-purple-50/80 text-purple-800 border border-purple-200 hover:bg-purple-100',
    badgeClass: 'bg-purple-100 text-purple-800 group-hover:bg-purple-200',
  },
  {
    id: 'DATA_MES',
    label: 'Data MES',
    statKey: 'data_mes_count',
    activeClass: 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-700/30',
    inactiveClass: 'bg-cyan-50/80 text-cyan-800 border border-cyan-200 hover:bg-cyan-100',
    badgeClass: 'bg-cyan-100 text-cyan-800 group-hover:bg-cyan-200',
  },
  {
    id: 'GET_DATA',
    label: 'Get Data',
    statKey: 'get_data_count',
    activeClass: 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-600/30',
    inactiveClass: 'bg-teal-50/80 text-teal-800 border border-teal-200 hover:bg-teal-100',
    badgeClass: 'bg-teal-100 text-teal-800 group-hover:bg-teal-200',
  },
  {
    id: 'CHECK_DATA_SKIN',
    label: 'Check_data_SKIN',
    statKey: 'check_data_skin_count',
    activeClass: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30',
    inactiveClass: 'bg-emerald-50/80 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
    badgeClass: 'bg-emerald-100 text-emerald-800 group-hover:bg-emerald-200',
  },
  {
    id: 'GET_DATA_PO',
    label: 'Get_data_PO',
    statKey: 'get_data_po_count',
    activeClass: 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/30',
    inactiveClass: 'bg-sky-50/80 text-sky-800 border border-sky-200 hover:bg-sky-100',
    badgeClass: 'bg-sky-100 text-sky-800 group-hover:bg-sky-200',
  },
  {
    id: 'PIVOT_TABLE',
    label: 'PivotTable',
    statKey: 'pivot_table_count',
    activeClass: 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30',
    inactiveClass: 'bg-amber-50/80 text-amber-800 border border-amber-200 hover:bg-amber-100',
    badgeClass: 'bg-amber-100 text-amber-800 group-hover:bg-amber-200',
  },
  {
    id: 'HANG_VOT',
    label: 'Hàng Vớt',
    statKey: 'hang_vot_count',
    activeClass: 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-600/30',
    inactiveClass: 'bg-orange-50/80 text-orange-800 border border-orange-200 hover:bg-orange-100',
    badgeClass: 'bg-orange-100 text-orange-800 group-hover:bg-orange-200',
  },
  {
    id: 'KE_HOACH',
    label: 'Kế hoạch',
    statKey: 'ke_hoach_count',
    activeClass: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30',
    inactiveClass: 'bg-rose-50/80 text-rose-800 border border-rose-200 hover:bg-rose-100',
    badgeClass: 'bg-rose-100 text-rose-800 group-hover:bg-rose-200',
  },
  {
    id: 'BAO_CAO_SKIN',
    label: 'Báo cáo SKIN',
    statKey: null,
    activeClass: 'bg-fuchsia-600 text-white shadow-sm ring-2 ring-fuchsia-600/30',
    inactiveClass: 'bg-fuchsia-50/80 text-fuchsia-800 border border-fuchsia-200 hover:bg-fuchsia-100',
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800 group-hover:bg-fuchsia-200',
  },
  {
    id: 'RULES_SKIN',
    label: 'Rules_SKIN',
    statKey: 'rules_skin_count',
    activeClass: 'bg-slate-700 text-white shadow-sm ring-2 ring-slate-700/30',
    inactiveClass: 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200',
    badgeClass: 'bg-slate-200 text-slate-800 group-hover:bg-slate-300',
  },
];

export const getSheetColumns = (sheetId) => {
  switch (sheetId) {
    case 'SKIN_HRC2': return SKIN_HRC2_COLUMNS;
    case 'DATA_SOURCE': return DATA_SOURCE_COLUMNS;
    case 'PO_HSM': return PO_HSM_COLUMNS;
    case 'PO_SKIN': return PO_SKIN_COLUMNS;
    case 'DATA_MES': return DATA_MES_COLUMNS;
    case 'GET_DATA': return GET_DATA_COLUMNS;
    case 'CHECK_DATA_SKIN': return CHECK_DATA_SKIN_COLUMNS;
    case 'GET_DATA_PO': return GET_DATA_PO_COLUMNS;
    case 'PIVOT_TABLE': return PIVOT_TABLE_COLUMNS;
    case 'HANG_VOT': return HANG_VOT_COLUMNS;
    case 'KE_HOACH': return KE_HOACH_COLUMNS;
    case 'RULES_SKIN': return RULES_SKIN_COLUMNS;
    default: return SKIN_HRC2_COLUMNS;
  }
};

export const PO_HSM_PASTE_COLUMNS = [
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

export const PO_SKIN_PASTE_COLUMNS = [
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
  'Chỉ định đặc biệt',
];

export const getSheetPasteColumns = (sheetId) => {
  switch (sheetId) {
    case 'SKIN_HRC2':
      return PASTE_FORM_COLUMNS;
    case 'DATA_SOURCE':
      return DATA_SOURCE_COLUMNS;
    case 'PO_HSM':
      return PO_HSM_PASTE_COLUMNS;
    case 'PO_SKIN':
      return PO_SKIN_PASTE_COLUMNS;
    case 'DATA_MES':
      return DATA_MES_COLUMNS;
    case 'GET_DATA':
      return GET_DATA_COLUMNS;
    case 'CHECK_DATA_SKIN':
      return CHECK_DATA_SKIN_COLUMNS;
    case 'GET_DATA_PO':
      return GET_DATA_PO_COLUMNS;
    case 'PIVOT_TABLE':
      return PIVOT_TABLE_COLUMNS;
    case 'HANG_VOT':
      return HANG_VOT_COLUMNS;
    default:
      return getSheetColumns(sheetId);
  }
};

export const getSheetPasteSample = (sheetId) => {
  switch (sheetId) {
    case 'SKIN_HRC2':
      return [
        '24011501\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t25480\t2026-10-15\t1\tA-01\tORD-2026-001\tSS400',
        '24011502\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t24320\t2026-10-15\t2\tA-02\tORD-2026-002\tSAE1006',
        '24011503\tTHÉP CUỘN CÁN NÓNG TẨY GỈ PHỦ DẦU\t26100\t2026-10-16\t1\tB-03\tORD-2026-003\tS355JR',
      ].join('\n');
    case 'DATA_SOURCE':
      return [
        'ORD-001\tĐạt\tLoại 1\tTốt\tSKIN\t0\t2026-10-15\t24011501\t24011501\t25480\t355\t2.5%\tGhi chú',
        'ORD-002\tĐạt\tLoại 1\tTốt\tSKIN_CUST\t0\t2026-10-15\t24011502\t24011502\t24320\t340\t2.0%\t',
      ].join('\n');
    case 'PO_HSM':
      return [
        '10/2026\tT10.4\tCÔNG TY TNHH CƠ KHÍ THÉP HOA SEN\t2040019586\tThép HRC 1.45x1000 SPHC\t14-20\t50\tKQCN-Cắt tấm\tƯu tiên giao sớm',
        '10/2026\tT10.4\tCÔNG TY CỔ PHẦN TẬP ĐOÀN HOA SEN\t2040019587\tThép HRC 1.75x1200 SPHC\t14-20\t100\tKQCN-Cắt tấm\t',
      ].join('\n');
    case 'PO_SKIN':
      return [
        '10/2026\tT10.4\tCÔNG TY TNHH CƠ KHÍ THÉP HOA SEN\t2040019586\t2060001076\tThép HRC 1.45x1000 SPHC\tThép HRC HSPM 1.45x1000 SPHC\t14-20\t50\tKQCN-Cắt tấm\t\tChỉ định Skin bóng',
      ].join('\n');
    case 'DATA_MES':
      return [
        'Line 1\tPlan 01\t24011501\tBình thường\t2060001076\t1.45\t1000\t25480\tSPHC\tReady\tKho A-01\t25480',
      ].join('\n');
    case 'GET_DATA':
      return [
        'Line 1\tSkin cao\t1\tPlan 01\t24011501\tThép HRC 1.45x1000\t2060001076\t1.45\t1000\t25480\tSPHC\t2026-10-15\tCắt tấm\t14-20\tKhông\tĐạt\tĐạt\tKhông lỗi',
      ].join('\n');
    case 'CHECK_DATA_SKIN':
      return [
        '24011501\tSKIN\tLoại 1\t2026-10-15\t24011502\t24011502\tSKIN_RCL\tLoại 2\t2026-10-16',
      ].join('\n');
    case 'GET_DATA_PO':
      return [
        '2060001076\t10/2026\tT10.4\tTVP\t2040019586\t2060001076\tThép HRC 1.45x1000 SPHC\tThép HRC HSPM 1.45x1000 SPHC\t14-20\t50\tKQCN',
        '2060001077\t10/2026\tT10.4\tTVP\t2040019587\t2060001077\tThép HRC 1.75x1000 SPHC\tThép HRC HSPM 1.75x1000 SPHC\t14-20\t50\tja',
      ].join('\n');
    case 'PIVOT_TABLE':
      return [
        '24011501\tSkin bóng cao\t2060001076\tƯu tiên giao sớm\t2060001076\tGiao gấp',
      ].join('\n');
    case 'HANG_VOT':
      return [
        'IA026434415\tSKIN\tGiãn biên 120m đầu 10%-15%\tNM đề xuất vớt\tP.DVKTKH: chuyển skin xử lý',
      ].join('\n');
    default:
      return '';
  }
};

export const parsePastedTextForSheet = (rawText, sheetId) => {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const targetColumns = getSheetPasteColumns(sheetId);
  const parsed = [];
  const maxLimit = (sheetId === 'SKIN_HRC2' || sheetId === 'HANG_VOT' || sheetId === 'GET_DATA_PO') ? 15000 : 1000;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let cells = line.split('\t');
    if (cells.length === 1 && line.includes(';')) {
      cells = line.split(';');
    } else if (cells.length === 1 && line.includes(',')) {
      cells = line.split(',');
    }
    cells = cells.map((c) => c.trim());

    const firstCellNorm = (cells[0] || '').toLowerCase().replace(/[\s_/]+/g, '');
    const firstColNorm = (targetColumns[0] || '').toLowerCase().replace(/[\s_/]+/g, '');
    if (
      firstCellNorm === firstColNorm ||
      firstCellNorm === 'idcoil' ||
      firstCellNorm === 'idcuonbo' ||
      firstCellNorm === 'idcuon' ||
      firstCellNorm === 'stt' ||
      firstCellNorm === 'thang' ||
      firstCellNorm === 'line' ||
      firstCellNorm === 'order' ||
      firstCellNorm === 'po' ||
      firstCellNorm === 'materialdescription'
    ) {
      continue;
    }

    const rowObj = {};
    if (sheetId === 'GET_DATA_PO' && cells.length === 1) {
      rowObj['PO'] = cells[0] || '';
      targetColumns.forEach((col) => {
        if (col !== 'PO') rowObj[col] = '';
      });
    } else {
      targetColumns.forEach((col, idx) => {
        rowObj[col] = cells[idx] || '';
      });
    }

    parsed.push(rowObj);
    if (parsed.length >= maxLimit) break;
  }
  return parsed;
};

export const CHECK_DATA_LABELS = {
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

export const getTodayFormatted = () => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

export const formatKeHoachValue = (val) => {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (!s) return '';
  // Check if string matches d/m, dd/mm, d-m, dd-mm, d.m, dd.mm
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10);
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      return `${String(d).padStart(2, '0')}/${String(mo).padStart(2, '0')}`;
    }
  }
  return s;
};
