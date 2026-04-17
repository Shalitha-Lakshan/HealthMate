# Doctor-Side Test Proof

This document captures the automated test coverage added for doctor-side viva/report requirements.

## 1) Doctor appointment flow tests

Service: `backend/services/appointment-service`

Test file:
- `src/controllers/__tests__/doctor-flows-and-auth.test.js`

Covered scenarios:
- doctor approves own pending appointment
- doctor rejects own pending appointment
- doctor cancels own confirmed appointment
- doctor completes own confirmed appointment

Run:
```bash
cd backend/services/appointment-service
npm test
```

Result:
- Test Suites: 1 passed, 1 total
- Tests: 5 passed, 5 total

## 2) Authorization tests (doctor cannot access other doctor data)

Service: `backend/services/appointment-service`

Test file:
- `src/controllers/__tests__/doctor-flows-and-auth.test.js`

Covered scenario:
- listing doctor appointments with another doctor's id returns `403`

Run:
```bash
cd backend/services/appointment-service
npm test
```

Result:
- Included in the same suite above (`5/5` passed)

## 3) Telemedicine authorization tests

Service: `backend/services/telemedicine-service`

Test file:
- `src/__tests__/telemedicine-auth.test.js`

Covered scenarios:
- missing bearer token returns `401`
- doctor cannot access another doctor's appointment (`403`)
- patient cannot access another patient's appointment (`403`)
- outside allowed join window returns `403`
- valid authorized doctor gets session token (`201`)

Run:
```bash
cd backend/services/telemedicine-service
npm test
```

Result:
- Test Suites: 1 passed, 1 total
- Tests: 5 passed, 5 total

## 4) Doctor availability ownership tests

Service: `backend/services/doctor-service`

Test file:
- `src/controllers/__tests__/availability-ownership.test.js`

Covered scenarios:
- doctor cannot read another doctor's availability (`403`)
- patient can read assigned doctor availability
- doctor cannot update another doctor's availability (`403`)
- doctor can update own availability

Run:
```bash
cd backend/services/doctor-service
npm test
```

Result:
- Test Suites: 1 passed, 1 total
- Tests: 4 passed, 4 total

## 5) Prescription create/list authorization tests

Service: `backend/services/prescription-service`

Test file:
- `src/controllers/__tests__/prescription-authorization.test.js`

Covered scenarios:
- doctor cannot create prescription for consultation owned by another doctor (`403`)
- doctor can create prescription for own completed consultation (`201`)
- doctor list query is scoped to requester doctor id
- list endpoint rejects token payloads without requester id (`401`)

Run:
```bash
cd backend/services/prescription-service
npm test
```

Result:
- Test Suites: 1 passed, 1 total
- Tests: 4 passed, 4 total

## Notes for report/viva

- These tests are fully automated and do not require a running MongoDB instance.
- Mocks are used for data/model and external service calls to isolate authorization and business rules.
