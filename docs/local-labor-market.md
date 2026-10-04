# Local Labor-Market Layer

Career Quest stores local labor-market data in local tables and reads only from those tables during user request flows.

## Sources

- BLS OEWS publishes annual occupation wage and employment estimates for the nation, states, and metropolitan/nonmetropolitan areas: https://www.bls.gov/oes/
- OEWS data tables include national, state, metro/nonmetro, and all-data downloads. The current table page exposes May 2025 XLSX/TXT downloads: https://www.bls.gov/oes/tables.htm
- CareerOneStop-style training and job-availability data is represented as cached snapshots. The app does not call CareerOneStop or other external services during page/API requests.

## Tables

- `labor_market_regions`: national, state, metro, and nonmetro regions. Metro/nonmetro rows point to a parent state when known.
- `labor_market_occupation_estimates`: BLS OEWS estimates keyed by `region_id`, SOC code, and data year.
- `labor_market_training_options`: cached training options keyed by region and O*NET code.
- `labor_market_job_availability`: cached job availability snapshots keyed by region and O*NET code.
- `user_profiles.labor_market_region_id`: persisted region selector for each user/profile.

## Import Flow

Use:

```bash
pnpm seed:labor-market
```

or:

```bash
pnpm tsx scripts/ingest-local-labor-market.ts --file path/to/oews.csv
```

The importer accepts CSV or TSV files with BLS-style columns such as `AREA`, `AREA_TITLE`, `AREA_TYPE`, `PRIM_STATE`, `OCC_CODE`, `OCC_TITLE`, `TOT_EMP`, `EMP_PRSE`, `H_MEDIAN`, `A_MEDIAN`, `H_MEAN`, and `A_MEAN`. Optional cached training/job columns are also supported: `ONET_CODE`, `TRAINING_PROVIDER`, `TRAINING_PROGRAM`, `CREDENTIAL_TYPE`, `ACTIVE_POSTINGS`, and `ANNUAL_OPENINGS`.

Before writing, the importer validates every OEWS SOC prefix against local O*NET occupation codes. Missing SOC prefixes fail the import by default; use `--allow-missing-soc` only when intentionally loading data before the O*NET mirror supports those occupations.

## Fallback Policy

The UI resolves labor-market data in this order:

1. Selected region estimate, such as a metro.
2. Parent state estimate, when a metro/nonmetro estimate is missing.
3. National OEWS estimate.
4. National O*NET pay mirror.
5. Missing-data state with a clear label.

Training options and job availability use the same selected -> state -> national region fallback. Every UI surface labels the resolved source, data year when available, and resolved region.
