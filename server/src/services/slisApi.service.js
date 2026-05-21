import axios from 'axios';

const slis = axios.create({
  baseURL: process.env.SLIS_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0'
  }
});

const slisReports = axios.create({
  baseURL: process.env.SLIS_REPORTS_BASE_URL || process.env.SLIS_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json,text/plain,*/*',
    'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0'
  }
});

export async function slisPost(path, data) {
  const response = await slis.post(path, data);
  return response.data;
}

export async function slisPut(path, data) {
  const response = await slis.put(path, data);
  return response.data;
}

export async function slisGet(path, config = {}) {
  const response = await slis.get(path, config);
  return response.data;
}

export async function slisReportPost(path, data) {
  const response = await slisReports.post(path, data);
  return response.data;
}

export function buildPdfUrl(labNumber) {
  return `${process.env.SLIS_BASE_URL}/Results/${encodeURIComponent(labNumber)}_Test_Results.pdf`;
}
