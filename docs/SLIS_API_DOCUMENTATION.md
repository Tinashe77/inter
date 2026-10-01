# SLIS API Integration Documentation

**System:** Interpath SLIS Mobile API  
**Consumer:** Interpath Results PWA, mobile application, and backend  
**Document version:** 1.0  
**Last updated:** 30 September 2026

## 1. Purpose

This document describes the SLIS endpoints currently consumed by the Interpath Results platform. It covers authentication, visits, result details, PDFs, clinics, reports, devices, patient registration, password management, and sample collection.

The contract in this document is derived from the working Interpath integration. The SLIS team should confirm undocumented response properties before treating this as the canonical server specification.

## 2. Environments and base URLs

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

Do not call SLIS directly from a browser or mobile application. Client applications should call the Interpath integration API so SLIS tokens, error translation, audit logging, caching, and access controls remain server-side.

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
| Client-facing query | `YYYY-MM-DD` or `DDMMYYYY` | `2026-09-30` |

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

`pageNumber` is a positive integer. Each page contains up to 50 records. Page 1 also supplies the total number of pages, total records, and records per page. Exact response property names should be confirmed by the SLIS team.

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

The exact SLIS response may contain additional properties. The application treats statuses containing `complete`, `authorised`, `authorized`, `reported`, `result ready`, `success`, or `final` as completed.

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
  "DateOfBirth": "1990-01-01",
  "PhoneNumber": "+263771234567",
  "Email": "patient@example.com",
  "Gender": "Female",
  "Password": "REDACTED"
}
```

`Gender` is currently expected to be `Male` or `Female` by the consuming application.

## 10. Device endpoints

### 10.1 Register device

```http
POST /api/Devices
```

Request:

```json
{
  "RegNumber": "",
  "DeviceID": "DEVICE_IDENTIFIER",
  "Type": "PWA",
  "PhoneNumber": "771234567",
  "CountryCode": "263",
  "DeviceStatus": "",
  "DefaultUserType": "Patient",
  "RegDate": ""
}
```

`DefaultUserType` must be `Patient`, `Clinic_Doctor`, or `Employee`.

### 10.2 Get device

```http
GET /api/Devices/{deviceId}
DeviceID: {deviceId}
```

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

Do not export an environment containing a real token when sharing a Postman collection.

## 16. Change-management recommendations

Any SLIS API change should include:

- a versioned contract or backward-compatibility plan;
- advance notice to consuming applications;
- example request and response bodies;
- documented validation and error codes;
- a test environment with synthetic data; and
- performance testing for branch/date queries before production deployment.
