import { http } from '../api/http.js';

const DEVICE_ID_KEY = 'interpath_device_id';
const REG_NUMBER_KEY = 'interpath_slis_device_reg_number';

export function getDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export function storeRegNumber(regNumber) {
  if (regNumber) localStorage.setItem(REG_NUMBER_KEY, regNumber);
}

export async function registerCurrentDevice({ phoneNumber, countryCode, defaultUserType }) {
  const { data } = await http.post('/devices', { deviceId: getDeviceId(), type: 'PWA', phoneNumber, countryCode, defaultUserType });
  storeRegNumber(data.regNumber);
  return data;
}

export async function checkRegisteredDevice() {
  const regNumber = localStorage.getItem(REG_NUMBER_KEY);
  if (!regNumber) return null;
  const { data } = await http.get('/devices/check/RegNumber', { params: { device: regNumber } });
  return data;
}
