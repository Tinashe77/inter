import assert from 'node:assert/strict';
import test from 'node:test';

import { formatRegistrationDate } from './deviceRegistration.service.js';

test('formats the SLIS device registration date as dd/MM/yyyy', () => {
  assert.equal(formatRegistrationDate(new Date(2026, 9, 3)), '03/10/2026');
});
