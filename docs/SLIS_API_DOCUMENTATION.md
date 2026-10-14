# SLIS API Integration Documentation

**System:** Interpath SLIS Mobile API  
**Consumer:** Interpath Results PWA, mobile application, and backend  
**Document version:** 1.1
**Last updated:** 14 October 2026
**Status:** Implementation-aligned integration reference

## 1. Purpose

This document describes the SLIS endpoints currently consumed by the Interpath Results platform. It covers authentication, visits, result details, PDFs, clinics, reports, devices, patient registration, password management, and sample collection.

The contract in this document is derived from the working Interpath integration and the latest device-registration specification supplied by the SLIS team. The SLIS team should confirm undocumented response properties before treating this as the canonical SLIS server specification.

## Contents

1. Purpose
2. Architecture and environments
3. General conventions
4. Authentication and accounts
5. Visits and pagination
6. Result details and PDFs
7. Clinics
8. Reports
9. Patient registration
10. Device registration and validation
11. Sample collection
12. Error handling
13. Performance and caching
14. Security
15. Postman examples
16. Change management

## 2. Architecture and environments

### 2.1 Recommended request flow

```text
PWA / Android / iOS
        |
        | HTTPS — Interpath session token
        v
Interpath integration API
        |
        | HTTPS — SLIS token and SLIS-specific headers
        v
SLIS Mobile API
```

The PWA and native applications must not call SLIS directly. The integration API owns SLIS authentication, response normalisation, caching, timeout handling, auditing, and protection of SLIS tokens.

### 2.2 Base URLs

| Name | URL |
|---|---|
| SLIS API base URL | `https://www.interpathresults.com/SLISMOB` |
| Reports base URL | `https://www.interpathresults.com/SLISMOB` |
| Interpath integration API | `https://inter-8puh.onrender.com/api` |

The SLIS URLs are configured through environment variables:

```env
SLIS_BASE_URL=https://www.interpathresults.com/SLISMOB
SLIS_REPORTS_BASE_URL=https://www.interpathresults.com/SLISMOB
SLIS_CLINICS_URL=https://www.interpathresults.com/slismob/api/clinics/na
```

### 2.3 Interpath-to-SLIS endpoint map

| Feature | Client-facing integration endpoint | Upstream SLIS endpoint |
|---|---|---|
| Login | `POST /api/auth/login` | `POST /api/Main/{userType}` |
| Patient registration | `POST /api/patients/register` | `POST /api/Main` |
| Register device | `POST /api/devices` | `POST /api/Devices` |
| Check by registration number | `GET /api/devices/check/RegNumber?device=...` | `GET /api/Devices/RegNumber` with `Device` header |
| Check by platform device ID | `GET /api/devices/check/DeviceID?device=...` | `GET /api/Devices/DeviceID` with `Device` header |
| Employee visits | `GET /api/visits?branch=...&date=...&page=...` | `GET /api/List/{pageNumber}` |
| Result detail | `GET /api/results/{labNumber}` | Role-dependent `/api/Main/...` endpoint |
| Result PDF | `GET /api/results/{labNumber}/pdf` | Generated PDF URL returned by SLIS |
| Clinics | `GET /api/clinics` | `GET /api/clinics/na` |
| Reports | `POST /api/reports` | `POST /api/Reports` |

All client-facing paths in this table are relative to the Interpath integration API.

## 3. General request conventions

### 3.1 Content types

JSON requests should use:

```http
Content-Type: application/json
Accept: application/json,text/plain,*/*
```

### 3.2 Authentication

Login returns an SLIS token in the response body. Authenticated SLIS endpoints use this token in one of three ways, depending on the endpoint:

- `Authorization: Bearer {SLIS_TOKEN}` header;
- a `Token` property in a JSON request body; or
- a URL path segment.

The token must be treated as a secret. It must not be logged, placed in source control, included in screenshots, or exposed to unauthorised clients.

### 3.3 URL encoding

Every dynamic path segment must be URL-encoded. This includes branch names, usernames, laboratory numbers, test names, telephone numbers, addresses, and tokens.

### 3.4 Date formats

| Context | Format | Example |
|---|---|---|
| Visit-list path | `DDMMYYYY` | `30092026` |
| Report body | `YYYY/MM/DD` | `2026/09/30` |
| Device registration | `DD/MM/YYYY` | `14/10/2026` |
| Client-facing query | `YYYY-MM-DD` or `DDMMYYYY` | `2026-09-30` |

### 3.5 Header names are case-sensitive contracts

Use the header names documented for each endpoint. In particular, device lookup uses the header `Device`; it does not use `DeviceID` as the header name.

## 4. Authentication and account endpoints

### 4.1 Login

```http
POST /api/Main/{userType}
```

Supported user types:

- `Patient`
- `Clinic_Doctor`
- `Employee`

Request:

```json
{
  "Username": "example.user",
  "Password": "REDACTED"
}
```

Successful response properties currently consumed:

```json
{
  "status": "Success",
  "token": "SLIS_TOKEN",
  "id": "USER_ID",
  "usertype": "Employee",
  "username": "example.user",
  "name": "Example User"
}
```

The application treats any status other than `Success` as a failed login.

### 4.2 Change password

```http
PUT /api/Main/{userType}/na
```

Request:

```json
{
  "Username": "example.user",
  "Password": "CURRENT_PASSWORD",
  "NewPassword": "NEW_PASSWORD"
}
```

Supported by the integration for `Patient` and `Clinic_Doctor` users.

### 4.3 Forgotten password

```http
PUT /api/Main/{userType}/{username}/{phoneOrAfhoz}
```

`userType` must be `Patient` or `Clinic_Doctor`.

Example:

```http
PUT /api/Main/Patient/example.user/263771234567
```

## 5. Visits and result lists

### 5.1 Employee visit list by branch and date (paginated)

```http
GET /api/List/{pageNumber}
Authorization: Bearer {SLIS_TOKEN}
Branch: {BRANCH_IN_UPPERCASE}
Date: {DDMMYYYY}
```

`pageNumber` is a positive integer. Each page contains up to 50 records. The confirmed response contract is:

```json
{
  "Status": "Success",
  "Message": "Success 50/208 records found",
  "PageNumber": 1,
  "TotalPages": 5,
  "TotalDayCount": 208,
  "PageRecordsCount": 50,
  "Patients": [
    {
      "LabNumber": "ILH_TEST_1",
      "PatientName": "Test Patient",
      "Tests": "FBC",
      "VisitDate": "24/09/2026 08:00:00",
      "Clinic": "EXAMPLE CLINIC",
      "PaymentMode": "ACCOUNT",
      "Sex": "FEMALE",
      "DateOfBirth": "01/01/1990",
      "Status": "COMPLETED",
      "Critical": ""
    }
  ]
}
```

`TotalDayCount` is the total number of records for the selected branch and date. `PageRecordsCount` is the number of records on the current page; it is not the configured page size.

Example:

```http
GET /api/List/1
Authorization: Bearer {SLIS_TOKEN}
Branch: HARARE
Date: 30092026
```

The integration requests page 1 first, reads the page count, then requests the remaining pages concurrently with a configurable concurrency limit. Results are merged and deduplicated by laboratory number before being returned to the existing clients.

### 5.2 Legacy employee visit list

The previous endpoint remains an automatic fallback while the new paginated endpoint is being rolled out:

```http
GET /api/List/{branch}/{DDMMYYYY}
Authorization: Bearer {SLIS_TOKEN}
```

Visit fields currently consumed:

```json
[
  {
    "LabNumber": "ILH26000000",
    "OLBNumber": "",
    "PatientName": "Example Patient",
    "Sex": "Female",
    "DateOfBirth": "1990-01-01",
    "VisitDate": "2026-09-30",
    "PaymentMode": "Cash",
    "Clinic": "CLINIC_CODE_OR_NAME",
    "ClinicName": "Example Clinic",
    "ClinicNo": "123",
    "Branch": "HARARE",
    "Location": "HARARE",
    "CollectionPoint": "Main Lab",
    "Critical": "",
    "Tests": "Full Blood Count",
    "Status": "Completed"
  }
]
```

The exact SLIS response may contain additional properties. The application accepts completed, authorised, reported, result-ready, success, or final statuses. It explicitly rejects statuses containing `partial`, `pending`, or `incomplete`; therefore `PARTIALLY COMPLETED` is not eligible for result delivery.

### 5.3 Patient visits

```http
GET /api/Main/{SLIS_TOKEN}/na/na/na
```

### 5.4 Clinic or doctor visits by date range

```http
GET /api/Main/{DDMMYYYY_FROM}/{DDMMYYYY_TO}/{SLIS_TOKEN}/na/na/na
```

Example:

```http
GET /api/Main/01092026/30092026/{SLIS_TOKEN}/na/na/na
```

### 5.5 SLIS list-response convention

Some SLIS list endpoints return a status row as the first array element. Examples include:

```json
[
  {
    "LabNumber": "Status-Success",
    "PatientName": "No records found"
  }
]
```

or:

```json
[
  {
    "LabNumber": "Status-Failed",
    "PatientName": "Failure description"
  }
]
```

The integration removes a leading status row before returning data to clients. `Status-Success` with `No records found` is treated as an empty list, while `Status-Failed` is treated as an SLIS error.

## 6. Result details and PDFs

### 6.1 Employee result details

```http
GET /api/Main/{labNumber}?format=pdf
Authorization: Bearer {SLIS_TOKEN}
format: pdf
```

Example:

```http
GET /api/Main/ILH26000000?format=pdf
Authorization: Bearer {SLIS_TOKEN}
format: pdf
```

Response properties currently consumed include:

```json
{
  "Status": "Success",
  "Message": "",
  "PatientDetailes": {},
  "Profile": [],
  "Credential": [],
  "PDF": "https://www.interpathresults.com/SLISMOB/Results/example.pdf"
}
```

`PatientDetails`, `Pdf`, and lowercase property variants are also accepted by the integration.

Typical result properties inside a profile/test response include:

- `Department`
- `Profile`
- `LabNumber`
- `Test` or `TestName`
- `Result`
- `Units`
- `Flag`
- `Range` or `ReferenceRange`
- `Comment`
- `Fcomment` or `FComment`

### 6.2 Patient or clinic result details

```http
GET /api/Main/{labNumber}/{SLIS_TOKEN}/na/na/na
```

### 6.3 Generated employee PDF

First request the employee result-details endpoint with `format=pdf`. Read the PDF URL from the `PDF`, `Pdf`, or `pdf` response property, then request that URL with:

```http
Accept: application/pdf,*/*
Authorization: Bearer {SLIS_TOKEN}
```

### 6.4 Legacy/static PDF path

```http
GET /Results/{labNumber}_Test_Results.pdf
```

Example:

```http
GET /Results/ILH26000000_Test_Results.pdf
```

The employee flow should prefer the generated URL returned by the result-details endpoint.

### 6.5 Covid certificate

Primary request:

```http
GET /api/Main/{labNumber}/{SLIS_TOKEN}/na/na/na/na/na/na
```

Fallback request:

```http
GET /Patient/{labNumber}/{SLIS_TOKEN}/na/na/na/na/na/na
```

## 7. Clinic directory

### 7.1 List clinics

```http
GET /api/clinics/na
Authorization: Bearer {SLIS_TOKEN}
```

Expected response envelope:

```json
{
  "status": "Success",
  "Message": "Records found",
  "Clinics": [
    {
      "ClinicNo": "123",
      "ClinicName": "Example Clinic",
      "Doctor": "Example Doctor",
      "phone": "+263771234567"
    }
  ]
}
```

The integration also accepts `Phone` or `PhoneNumber` in place of `phone`.

### 7.2 Filter clinic detail

Use the same endpoint with the clinic name in the `Clinic` request header:

```http
GET /api/clinics/na
Authorization: Bearer {SLIS_TOKEN}
Clinic: Example Clinic
```

## 8. Reports

### 8.1 Main paginated report

```http
POST /api/Reports
```

Request:

```json
{
  "Token": "SLIS_TOKEN",
  "Branch": "HARARE",
  "DateFrom": "2026/09/01",
  "DateTo": "2026/09/30",
  "Page": 1
}
```

### 8.2 Named report

```http
POST /api/Reports/{reportName}
```

Request:

```json
{
  "Token": "SLIS_TOKEN",
  "Branch": "HARARE",
  "DateFrom": "2026/09/01",
  "DateTo": "2026/09/30"
}
```

`reportName` must be URL-encoded.

## 9. Patient registration

```http
POST /api/Main
```

Request:

```json
{
  "IDNumber": "00-000000-A-00",
  "PatientName": "Example Patient",
  "DateOfBirth": "01/01/1990",
  "PhoneNumber": "+263771234567",
  "Email": "patient@example.com",
  "Gender": "Female",
  "Password": "REDACTED"
}
```

`Gender` is currently expected to be `Male` or `Female` by the consuming application.

## 10. Device endpoints

Device registration applies to new and existing accounts. A registration belongs to a device or app installation, not globally to the user account. Each additional device or browser installation must be registered separately.

The assigned SLIS `RegNumber` must be stored on the device after successful registration:

- Flutter mobile application: encrypted secure storage;
- PWA: persistent browser storage associated with that installation.

On subsequent application launches, the stored registration number is checked against SLIS. A temporary check failure should be reported or retried without deleting the stored registration number.

### 10.1 Register device

```http
POST /api/Devices
```

Request:

```json
{
  "RegNumber": "",
  "DeviceID": "DEVICE_IDENTIFIER",
  "Type": "Android",
  "PhoneNumber": "771234567",
  "CountryCode": "+263",
  "DeviceStatus": "",
  "DefaultUserType": "Patient",
  "RegDate": "14/10/2026"
}
```

Field contract:

| Field | Required value |
|---|---|
| `RegNumber` | Blank when registering; generated by SLIS |
| `DeviceID` | Android ID, iOS identifier, or stable PWA installation UUID |
| `Type` | `Android`, `IOS`, `PWA`, or another agreed platform name |
| `PhoneNumber` | Owner phone number as a JSON string |
| `CountryCode` | Dialling code including `+`, for example `+263` |
| `DeviceStatus` | Blank when registering; managed by SLIS |
| `DefaultUserType` | `Patient`, `Clinic_Doctor`, or `Employee` |
| `RegDate` | Registration date in `DD/MM/YYYY` format |

The application must persist the `RegNumber` returned by SLIS. If SLIS accepts the request but does not return a registration number, the device must not be considered fully registered.

### 10.2 Check device using the SLIS registration number

```http
GET /api/Devices/RegNumber
Device: {SLIS_REGISTRATION_NUMBER}
```

Example:

```http
GET /api/Devices/RegNumber
Device: DEV-000123
```

### 10.3 Check device using the platform device ID

```http
GET /api/Devices/DeviceID
Device: {ANDROID_ID_OR_IOS_ID}
```

The final URL segment determines what the `Device` header contains:

| Final URL segment | `Device` header value |
|---|---|
| `RegNumber` | SLIS-assigned registration number |
| `DeviceID` | Android ID, iOS identifier, or stable installation identifier |

### 10.4 Registration flows

**New PWA patient account**

1. Create the patient account.
2. Register the current browser installation with SLIS.
3. Store the returned `RegNumber`.
4. Validate it on future launches.

**Existing account or native mobile application**

1. Select **Register this device**.
2. Supply the owner phone number, country code, and default user type.
3. Register the platform device ID with SLIS.
4. Store the returned `RegNumber` securely.
5. Validate it on future launches.

## 11. Sample collection request

```http
PUT /api/Main/{SLIS_TOKEN}/{tests}/{phoneNumber}/{address}/na/na/na
```

This endpoint is used by authenticated `Clinic_Doctor` users. All dynamic values must be URL-encoded.

Example structure:

```http
PUT /api/Main/{SLIS_TOKEN}/FBC%2CU%26E/263771234567/87%20Fife%20Avenue/na/na/na
```

## 12. Error handling

The SLIS API may express failure through an HTTP error, an object with `status: "Failed"`, or a status row in an array.

The Interpath integration normalises common failures as follows:

| Integration code | Meaning | HTTP status |
|---|---|---:|
| `TOKEN_EXPIRED` | SLIS token expired | 401 |
| `TOKEN_NOT_FOUND` | SLIS token is missing or invalid | 401 |
| `INVALID_CREDENTIALS` | Username or password rejected | 401 |
| `ACCESS_DENIED` | User is not authorised | 403 |
| `NO_RECORDS` | No matching records | 404 |
| `LAB_NOT_FOUND` | Laboratory number not found | 404 |
| `COVID_NOT_REQUESTED` | No Covid test was requested | 404 |
| `COVID_RESULTS_PENDING` | Covid result is not ready | 404 |
| `PDF_NOT_GENERATED` | Official PDF is not ready | 404 |
| `INVALID_DATE` | Date format is invalid | 400 |
| `SLIS_TIMEOUT` | SLIS did not respond before timeout | 504 |
| `SLIS_ENDPOINT_UNAVAILABLE` | Endpoint is unavailable or incompatible | 502 |
| `SLIS_ERROR` | SLIS returned another application error | 502 |

Example normalised error:

```json
{
  "code": "SLIS_TIMEOUT",
  "message": "The laboratory system is taking longer than expected. Please retry this date in a moment."
}
```

## 13. Performance and caching

The employee visit-list endpoint has been observed taking more than 80 seconds to produce its first byte. The response download itself is small, so the delay is upstream processing rather than network transfer.

Current integration defaults:

| Setting | Default |
|---|---:|
| SLIS visit request timeout | 120 seconds |
| Fresh visit cache | 5 minutes |
| Stale visit cache | 30 minutes |
| Maximum visit-cache entries | 100 |
| Concurrent SLIS page requests | 4 |
| Fresh clinic cache | 30 minutes |
| Stale clinic cache | 6 hours |
| Maximum concurrent SLIS sockets | 20 |

The backend uses stale-while-revalidate caching, proactive refresh for recently active branch/date combinations, in-flight request deduplication, and HTTP keep-alive. A first request for a previously uncached branch/date still depends on SLIS response time.

Recommended SLIS-side actions for `GET /api/List/{branch}/{date}`:

1. Profile the database query and execution plan.
2. Verify a suitable composite index for branch and visit date.
3. Remove table scans and N+1 queries.
4. Return only fields required by the client.
5. Add server-side pagination and deterministic ordering.
6. Publish response-time and availability targets.

## 14. Security requirements

- Use HTTPS for all environments containing personal or medical information.
- Never place an SLIS token in a query string, log, repository, analytics event, or client-visible error.
- Never expose the SLIS device registration number in analytics or public logs.
- Restrict endpoint access by user type and laboratory relationship.
- Validate the association between a laboratory result and its intended clinic or doctor before sharing.
- Do not send walk-in patient results through the healthcare-provider WhatsApp workflow.
- Use synthetic or anonymised records for testing and demonstrations.
- Audit result views, downloads, shares, and sample-collection requests.
- Apply data-retention and deletion rules appropriate to medical and personal information.

## 15. Postman examples

Define these Postman variables:

```text
slisBaseUrl = https://www.interpathresults.com/SLISMOB
slisToken   = <token returned by login>
branch      = HARARE
date        = 30092026
labNumber   = ILH26000000
deviceId    = <Android ID, iOS identifier, or test installation UUID>
deviceRegNo = <SLIS-assigned registration number>
```

Employee visits, page 1:

```http
GET {{slisBaseUrl}}/api/List/1
Authorization: Bearer {{slisToken}}
Branch: {{branch}}
Date: {{date}}
```

Employee result detail:

```http
GET {{slisBaseUrl}}/api/Main/{{labNumber}}?format=pdf
Authorization: Bearer {{slisToken}}
format: pdf
```

Register a device:

```http
POST {{slisBaseUrl}}/api/Devices
Content-Type: application/json

{
  "RegNumber": "",
  "DeviceID": "{{deviceId}}",
  "Type": "Android",
  "PhoneNumber": "771234567",
  "CountryCode": "+263",
  "DeviceStatus": "",
  "DefaultUserType": "Patient",
  "RegDate": "14/10/2026"
}
```

Check a registered device:

```http
GET {{slisBaseUrl}}/api/Devices/RegNumber
Device: {{deviceRegNo}}
```

Do not export an environment containing a real token when sharing a Postman collection.

## 16. Change-management recommendations

Any SLIS API change should include:

- a versioned contract or backward-compatibility plan;
- advance notice to consuming applications;
- example request and response bodies;
- documented validation and error codes;
- a test environment with synthetic data; and
- performance testing for branch/date queries before production deployment.
