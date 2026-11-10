# Smart POS Suite — Local Starter

A single-machine local demo for four business types:
- Restaurant / Cafe
- Hospital / Clinic (appointment reference demo only)
- Grocery store
- Retail shop

## Requirements
- Node.js 18 or newer
- VS Code (optional, recommended)

## Run on Windows
1. Extract the ZIP.
2. Open the extracted `smart-pos-suite` folder in VS Code.
3. Open **Terminal → New Terminal**.
4. Run:
   ```bash
   npm start
   ```
5. Open this address in Chrome:
   `http://localhost:3000`

No npm packages or paid APIs are required. The server uses Node.js built-in modules.

## Data storage
Records are stored locally in `data/db.json`. Keep a backup of this file. Do not edit it while the server is running.

## Included
- Business onboarding and setup
- Business-specific workspace labels and tools
- Product / service catalogue
- POS cart, checkout and printable receipt
- Stock deduction on sale
- Stock receiving / purchase records
- Customers and suppliers
- Expenses
- Sales, CSV export, reports and estimated profit
- JSON backup and reset

## Important limitations
This is a local learning/demo starter, not production business software. It has no login, user roles, cloud sync, encryption, audit logs, tax compliance, payment gateway, or multi-device access.

The hospital option is deliberately limited to fictional appointment references and basic scheduling. Do not enter real patient names, diagnoses, medical records, contact details, or other sensitive health information. It is not an electronic medical record system and must not be used for clinical decisions.

Restaurant-specific tables are simple operational placeholders. Grocery expiry/batch tracking, retail returns, barcode scanner device integration, printer integration, and advanced accounting are not included yet.
