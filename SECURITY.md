# Security policy

GasFind is a live, free web application. It has no user accounts and stores no personal data;
the server only reads public price sources and caches the results.

If you believe you have found a security vulnerability, please report it privately instead of
opening a public issue:

- GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting).
- Please include steps to reproduce and the affected component (web app, API functions, data adapters).

You will get an acknowledgement as soon as possible, and a fix will be prioritised based on severity.
Please do not run load tests against the production deployment or against the official data sources it reads.

## Scope

- The web app and API at https://gasfind-three.vercel.app
- The code in this repository (`public/`, `api/`, `lib/`, `scripts/`)

## Out of scope

- Denial-of-service or volumetric attacks
- Issues in third-party services (Vercel, OpenFreeMap, the official data sources)
- Prices that are wrong at the source
