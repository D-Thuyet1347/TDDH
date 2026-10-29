import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const QC_API_URL = `${API_URL}/api/qc`;
const NC_API_URL = `${API_URL}/api/nc`;

export const getReportFileUrl = (reportId) =>
  `${QC_API_URL}/reports/${encodeURIComponent(reportId)}/file`;

export const getQcExportFileUrl = (jobId) =>
  `${QC_API_URL}/exports/jobs/${encodeURIComponent(jobId)}/file`;

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

export const getReportRows = ({
  reportId,
  sheet,
  search = '',
  filters = {},
  limit = 100,
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

export const getReportColumnValues = ({ reportId, sheet, signal }) =>
  request(axios.get(
    `${QC_API_URL}/reports/${encodeURIComponent(reportId)}/column-values`,
    {
      params: { sheet },
      signal,
    }
  ));

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
  limit = 50,
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
