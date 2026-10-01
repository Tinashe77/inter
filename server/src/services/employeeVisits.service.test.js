import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagedEmployeeVisits } from './employeeVisits.service.js';

test('parses top-level paginated SLIS response', () => {
  const parsed = parsePagedEmployeeVisits({
    Records: [{ LabNumber: 'ILH1' }],
    PageNumber: 1,
    TotalPages: 3,
    TotalRecords: 123,
    RecordsPerPage: 50
  });

  assert.deepEqual(parsed.rows, [{ LabNumber: 'ILH1' }]);
  assert.equal(parsed.page, 1);
  assert.equal(parsed.totalPages, 3);
  assert.equal(parsed.totalRecords, 123);
  assert.equal(parsed.pageSize, 50);
});

test('parses nested paginated SLIS response with casing variants', () => {
  const parsed = parsePagedEmployeeVisits({
    data: { items: [{ LabNumber: 'ILH2' }] },
    pagination: {
      currentPage: 2,
      numberOfPages: 4,
      numberOfRecords: 175,
      numberOfRecordsPerPage: 50
    }
  }, 2);

  assert.deepEqual(parsed.rows, [{ LabNumber: 'ILH2' }]);
  assert.equal(parsed.page, 2);
  assert.equal(parsed.totalPages, 4);
  assert.equal(parsed.totalRecords, 175);
  assert.equal(parsed.pageSize, 50);
});

test('continues to accept a direct array response', () => {
  const rows = [{ LabNumber: 'ILH3' }];
  assert.deepEqual(parsePagedEmployeeVisits(rows, 1), {
    rows,
    page: 1,
    totalPages: 1
  });
});

test('parses the SLIS employee Patients response contract', () => {
  const parsed = parsePagedEmployeeVisits({
    Status: 'Success',
    Message: 'Success 8/208 records found',
    PageNumber: 5,
    TotalPages: 5,
    TotalDayCount: 208,
    PageRecordsCount: 8,
    Patients: [
      { LabNumber: 'ILH_TEST_1', PatientName: 'Test Patient' },
      { LabNumber: 'ILH_TEST_2', PatientName: 'Test Patient Two' }
    ]
  }, 5);

  assert.equal(parsed.page, 5);
  assert.equal(parsed.totalPages, 5);
  assert.equal(parsed.totalRecords, 208);
  assert.equal(parsed.pageRecordsCount, 8);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].LabNumber, 'ILH_TEST_1');
});
