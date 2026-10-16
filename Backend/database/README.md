# Schema lifecycle

The reviewed Sequelize QueryInterface migration creates explicit SPM_M/SPM_T tables and indexes. It is run only through the initialization script, never application startup. Schema version 1 is verified on connection. SQL Server is the reference target; SQLite is for local development. MySQL/SQL Server execution requires a dedicated approved server and separate verification.

The supplied governance has conflicting SQL-file instructions; no `.sql` is needed for this migration, but equivalent deployment SQL still requires DX review. QueryInterface is a controlled deployment boundary, not permission for runtime DDL.
