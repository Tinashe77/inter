import axios from 'axios';
import http from 'node:http';
import https from 'node:https';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: Number(process.env.SLIS_MAX_SOCKETS || 20),
  maxFreeSockets: Number(process.env.SLIS_MAX_FREE_SOCKETS || 10),
  timeout: Number(process.env.SLIS_SOCKET_TIMEOUT_MS || 120000)
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: Number(process.env.SLIS_MAX_SOCKETS || 20),
  maxFreeSockets: Number(process.env.SLIS_MAX_FREE_SOCKETS || 10),
  timeout: Number(process.env.SLIS_SOCKET_TIMEOUT_MS || 120000)
});

const sharedConfig = {
  timeout: 60000,
  httpAgent,
  httpsAgent,
  headers: {
    Accept: 'application/json,text/plain,*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'User-Agent': 'Mozilla/5.0 InterpathResultsPWA/1.0'
  }
};

const slis = axios.create({
  baseURL: process.env.SLIS_BASE_URL,
  ...sharedConfig
});

const slisReports = axios.create({
  baseURL: process.env.SLIS_REPORTS_BASE_URL || process.env.SLIS_BASE_URL,
  ...sharedConfig
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
