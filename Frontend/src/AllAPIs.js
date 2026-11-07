import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL !== undefined
  ? process.env.REACT_APP_API_URL
  : (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:5000');
const QC_API_URL = `${API_URL}/api/qc`;
const NC_API_URL = `${API_URL}/api/nc`;

export const getReportFileUrl = (reportId) =>
  `${QC_API_URL}/reports/${encodeURIComponent(reportId)}/file`;

export const getQcExportFileUrl = (jobId, fileName, zip = false) => {
  let url = `${QC_API_URL}/exports/jobs/${encodeURIComponent(jobId)}/file`;
  const params = [];
  if (zip) params.push('zip=true');
  else if (fileName) params.push(`file=${encodeURIComponent(fileName)}`);
  return params.length ? `${url}?${params.join('&')}` : url;
};

export const getExportFileByNameUrl = (fileName) =>
  `${QC_API_URL}/exports/files/${encodeURIComponent(fileName)}`;

const request = async (promise) => {
  try {
    const response = await promise;
    return response.data;
  } catch (error) {
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      throw new Error(backendMessage);
    }
    const htmlSnippet = typeof error.response?.data === 'string' ? error.response.data : '';
    if (
      error.response?.status === 404 ||
      htmlSnippet.includes('Cannot POST') ||
      htmlSnippet.includes('Cannot GET')
    ) {
      throw new Error(
        'Đường dẫn API đồng bộ chưa nhận được trên Backend (404). Vui lòng khởi động lại Backend (nhấn Ctrl+C rồi chạy lại "npm run dev" hoặc "npm start") để Backend nạp route mới.'
      );
    }
    throw new Error(error.message || 'Không thể kết nối máy chủ');
  }
};

export const getDashboardSummary = (signal) =>
  request(axios.get(`${QC_API_URL}/dashboard-summary`, { signal }));

export const getReports = ({ limit = 6, offset = 0, search = '', signal } = {}) =>
  request(axios.get(`${QC_API_URL}/reports`, {
    params: { limit, offset, search },
    signal,
  }));

export const deleteAllQcReports = (signal) =>
  request(axios.delete(`${QC_API_URL}/reports/all`, { signal }));

export const deleteQcReport = (reportId, signal) =>
  request(axios.delete(`${QC_API_URL}/reports/${encodeURIComponent(reportId)}`, { signal }));

export const getJobs = (signal) =>
  request(axios.get(`${QC_API_URL}/jobs`, { signal }));

export const getMongoStatus = (signal) =>
  request(axios.get(`${QC_API_URL}/health`, { signal }));

export const uploadReport = (file, signal) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(axios.post(`${QC_API_URL}/reports`, formData, { signal }));
};

export const uploadOrderDemandReport = (file, signal) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(axios.post(`${NC_API_URL}/reports`, formData, { signal }));
};

export const getOrderDemandReports = ({ limit = 100, offset = 0, search = '', signal } = {}) =>
  request(axios.get(`${NC_API_URL}/reports`, {
    params: { limit, offset, search },
    signal,
  }));

export const getOrderDemandReportFileUrl = (reportId) =>
  `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/file`;

export const getQcExportAvailability = (signal) =>
  request(axios.get(`${QC_API_URL}/exports/config`, { signal }));

export const startQcExport = (filters, signal) =>
  request(axios.post(`${QC_API_URL}/exports`, filters, { signal }));

export const getQcAutoExportStatus = (signal) =>
  request(axios.get(`${QC_API_URL}/exports/auto`, { signal }));

export const enableQcAutoExport = (filters, signal) =>
  request(axios.put(`${QC_API_URL}/exports/auto`, filters, { signal }));

export const disableQcAutoExport = (signal) =>
  request(axios.delete(`${QC_API_URL}/exports/auto`, { signal }));

export const getQcExportJob = (jobId, signal) =>
  request(axios.get(`${QC_API_URL}/exports/jobs/${encodeURIComponent(jobId)}`, { signal }));

export const getQcExportJobs = (signal) =>
  request(axios.get(`${QC_API_URL}/exports/jobs`, { signal }));

export const getReportRows = ({
  reportId,
  sheet,
  search = '',
  filters = {},
  limit = 30000,
  offset = 0,
  signal,
}) =>
  request(axios.get(`${QC_API_URL}/reports/${encodeURIComponent(reportId)}/rows`, {
    params: {
      sheet,
      search: search || undefined,
      filters: filters && Object.keys(filters).length ? JSON.stringify(filters) : undefined,
      limit,
      offset,
    },
    signal,
  }));

export const getReportQualitySummary = ({ reportId, signal }) =>
  request(axios.get(
    `${QC_API_URL}/reports/${encodeURIComponent(reportId)}/quality-summary`,
    { signal }
  ));

export const getReportColumnValues = async ({ reportId, sheet, signal }) => {
  const urls = [
    `${QC_API_URL}/reports/${encodeURIComponent(reportId)}/column-values`,
    `${API_URL}/api/reports/${encodeURIComponent(reportId)}/column-values`,
  ];
  let lastError;
  for (const url of urls) {
    try {
      return await request(axios.get(url, { params: { sheet }, signal }));
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

export const getOrderDemandColumnValues = ({ reportId, sheetName, signal }) =>
  request(axios.get(
    `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/sheets/${encodeURIComponent(sheetName)}/column-values`,
    { signal }
  ));

export const getOrderDemandRows = ({
  reportId,
  sheetName,
  search = '',
  filters = {},
  limit = 30000,
  offset = 0,
  signal,
}) =>
  request(axios.get(
    `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/sheets/${encodeURIComponent(sheetName)}/rows`,
    {
      params: {
        search,
        filters: JSON.stringify(filters),
        limit,
        offset,
      },
      signal,
    }
  ));

export const createOrderDemandRow = ({ reportId, sheetName, values, signal }) =>
  request(axios.post(
    `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/sheets/${encodeURIComponent(sheetName)}/rows`,
    { values },
    { signal }
  ));

export const updateOrderDemandRow = ({
  reportId,
  sheetName,
  rowId,
  values,
  signal,
}) =>
  request(axios.put(
    `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/sheets/${encodeURIComponent(sheetName)}/rows/${encodeURIComponent(rowId)}`,
    { values },
    { signal }
  ));

export const deleteOrderDemandRow = ({ reportId, sheetName, rowId, signal }) =>
  request(axios.delete(
    `${NC_API_URL}/reports/${encodeURIComponent(reportId)}/sheets/${encodeURIComponent(sheetName)}/rows/${encodeURIComponent(rowId)}`,
    { signal }
  ));

export const syncOrderDemandQc = async ({ reportId, qcReportId, signal } = {}) => {
  const encId = encodeURIComponent(reportId || 'default');
  const urls = [
    `${NC_API_URL}/reports/${encId}/sync-qc`,
    `${NC_API_URL}/sync-qc`,
    `${QC_API_URL}/reports/${encId}/sync-qc`,
    `${QC_API_URL}/sync-qc`,
    `${API_URL}/api/sync-qc`,
  ];

  let lastError;
  for (const url of urls) {
    try {
      return await request(axios.post(url, { reportId, qcReportId }, { signal }));
    } catch (err) {
      lastError = err;
      if (err.message && err.message.includes('404')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

const SKIN_API_URL = `${API_URL}/api/skin`;

export const getSkinStats = (signal) =>
  request(axios.get(`${SKIN_API_URL}/stats`, { signal }));

export const getSkinSheetRows = ({ sheetName, limit = 100, offset = 0, search = '', signal } = {}) =>
  request(axios.get(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows`, {
    params: { limit, offset, search: search || undefined },
    signal,
  }));

export const loadSkinDataSource = ({ months = null, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/load-data-source`, { months }, { signal }));

export const uploadSkinDataSource = (file, signal) => {
  const formData = new FormData();
  formData.append('file', file);
  return request(axios.post(`${SKIN_API_URL}/upload-data-source`, formData, { signal }));
};

export const addSkinRow = ({ sheetName, values = {}, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows`, { values }, { signal }));

export const addSkinRowsBatch = ({ sheetName, count = 1, values = null, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows/batch`, { count, values }, { signal }));

export const importSkinPasteRows = ({ sheetName, rows = [], signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows/import-paste`, { rows }, { signal }));

export const transferDataSourceToSkin = ({ rowIds = [], signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/transfer-to-skin`, { row_ids: rowIds }, { signal }));

export const deleteSkinRowsBatch = ({ sheetName, rowIds = [], signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows/batch-delete`, { row_ids: rowIds }, { signal }));

export const pasteSkinColumnData = ({ sheetName, columnName, values = [], signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/paste-column`, { column_name: columnName, values }, { signal }));

export const copyPoHsmToSkin = ({ signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/copy-po-hsm-to-skin`, {}, { signal }));

export const syncCheckDataSkin = ({ signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sync-check-data`, {}, { signal }));

export const updateSkinRow = ({ sheetName, rowId, values = {}, signal } = {}) =>
  request(axios.put(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows/${encodeURIComponent(rowId)}`, { values }, { signal }));

export const deleteSkinRow = ({ sheetName, rowId, signal } = {}) =>
  request(axios.delete(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/rows/${encodeURIComponent(rowId)}`, { signal }));

export const clearSkinSheet = ({ sheetName, signal } = {}) =>
  request(axios.delete(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/clear`, { signal }));

export const getSkinUndoInfo = ({ sheetName, signal } = {}) =>
  request(axios.get(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/undo-info`, { signal }));

export const undoSkinSheetAction = ({ sheetName, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/undo`, {}, { signal }));

export const recalculateSkinSheet = ({ sheetName, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/sheets/${encodeURIComponent(sheetName)}/recalculate`, {}, { signal }));

export const autoLinkSkinPoNew = ({ signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/auto-link-po-new`, {}, { signal }));

export const generateSkinGetData = ({ selectedPlans = null, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/generate-get-data`, { selected_plans: selectedPlans }, { signal }));

export const getExportSkinGetDataUrl = () => `${SKIN_API_URL}/export-get-data`;

export const fetchSkinGhc = ({ rowIds = null, onlyMissing = true, signal } = {}) =>
  request(axios.post(`${SKIN_API_URL}/fetch-ghc`, { row_ids: rowIds, only_missing: onlyMissing }, { signal }));


