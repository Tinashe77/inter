import { slisGet, slisPost } from './slisApi.service.js';

export const DEVICE_LOOKUP_TYPES = ['RegNumber', 'DeviceID'];

export async function registerSlisDevice(input) {
  const payload = {
    RegNumber: '', DeviceID: input.deviceId, Type: input.type,
    PhoneNumber: input.phoneNumber, CountryCode: input.countryCode,
    DeviceStatus: '', DefaultUserType: input.defaultUserType,
    RegDate: formatRegistrationDate(input.registrationDate || new Date())
  };
  const response = await slisPost('/api/Devices', payload);
  return { response, regNumber: findValue(response, ['RegNumber', 'regNumber', 'RegistrationNumber']), deviceId: input.deviceId };
}

export async function checkSlisDevice({ lookupType, device }) {
  if (!DEVICE_LOOKUP_TYPES.includes(lookupType)) throw new Error('Device lookup must use RegNumber or DeviceID.');
  return slisGet(`/api/Devices/${lookupType}`, { headers: { Device: device } });
}

export function formatRegistrationDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid device registration date.');
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function findValue(value, keys) {
  if (!value || typeof value !== 'object') return null;
  for (const key of keys) if (value[key] != null && String(value[key]).trim()) return String(value[key]).trim();
  for (const nested of Object.values(value)) { const match = findValue(nested, keys); if (match) return match; }
  return null;
}
