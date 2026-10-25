# Local X/R test history

This optional development tool inserts clearly tagged illustrative values into ordinary local history. It never represents actual field measurements, creates no photo readings/evidence, changes no equipment or product masters, and does not satisfy operational due checks. The four supported charts are EE length, Gasket Press, Caulking Height and Hexagon Size.

From `Backend`, after installation:

```powershell
node scripts/import-local-xr-test-data.js
node scripts/import-local-xr-test-data.js --apply
```

The first command previews the exact batch, dates, line and count. The second imports seven server production dates, two separate Type uji U/V snapshots and four n4 groups per date: 56 records. Line17 is used if configured, otherwise the first configured line. Requires development mode and local SQLite; production and corporate database adapters are rejected.

Existing IDs are never overwritten. Repeating the same batch skips it. An internal manifest/checksum controls trusted statistical hydration; public API inputs cannot submit this provenance to bypass evidence checks. Reports show Data uji X/R and exported CSV has `data_origin`. Production baseline creation rejects imported cohorts.

To undo a batch, use the exact ID returned by the import:

```powershell
node scripts/import-local-xr-test-data.js --rollback xr-v1-REPLACE_WITH_RETURNED_ID
node scripts/import-local-xr-test-data.js --rollback xr-v1-REPLACE_WITH_RETURNED_ID --apply
```

Rollback previews first, then soft-deletes only owned, checksum-matching records and leaves operational records untouched. Deleted/altered data is not silently recreated. Keep the database and backups in the private runtime directory; neither belongs in Git or the transfer bundle. A receiving installation stays empty until real data is recorded or this optional tool is explicitly run.
