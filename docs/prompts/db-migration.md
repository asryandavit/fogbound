# FOGBOUND — Database Migration Prompts

## Global Rule for All Prompts
Always check the generated file for TypeScript errors
after creating it. If any errors exist fix them before
finishing. The project uses:
- module: node16
- moduleResolution: node16  
- strictNullChecks: true
- noImplicitAny: false
- NestJS 11 with TypeScript 5.9.x

## Template 1 — Create New Table Migration

Use this template when creating a new table migration.
Replace all UPPERCASE placeholders with actual values.

---

```
Create a node-pg-migrate migration file at
backend/db/migrations/NNN_create_TABLE_NAME_table.js

Requirements:
- Use node-pg-migrate up/down format
- Add a comment on every single column explaining its purpose
- Create a TABLE_NAME table with these exact columns:
  COLUMN DEFINITIONS HERE
- Add indexes on: COLUMN NAMES
- Add check constraints: CONSTRAINT DEFINITIONS
- down migration must cleanly drop the table
```

---

## Template 2 — Add Column Migration

Use this when adding a new column to existing table.

---

```
Create a node-pg-migrate migration file at
backend/db/migrations/NNN_add_COLUMN_NAME_to_TABLE_NAME.js

Requirements:
- Use node-pg-migrate up/down format
- Add column COLUMN_NAME to TABLE_NAME table:
  type: COLUMN_TYPE
  notNull: true/false
  default: DEFAULT_VALUE
  comment: COLUMN_DESCRIPTION
- down migration must drop the column cleanly
```

---

## Template 3 — Add Index Migration

Use this when adding a new index to existing table.

---

```
Create a node-pg-migrate migration file at
backend/db/migrations/NNN_add_index_to_TABLE_NAME.js

Requirements:
- Use node-pg-migrate up/down format
- Add index on TABLE_NAME table for COLUMN_NAME
- Index should be: unique/non-unique
- down migration must drop the index cleanly
```

---

## Template 4 — Rename Column Migration

Use this when renaming a column.

---

```
Create a node-pg-migrate migration file at
backend/db/migrations/NNN_rename_COLUMN_NAME_in_TABLE_NAME.js

Requirements:
- Use node-pg-migrate up/down format
- Rename column OLD_NAME to NEW_NAME in TABLE_NAME table
- down migration must rename it back to OLD_NAME
```

---

## Rules

- Never edit existing migration files
- Always create a new migration for any change
- Migration numbers must be sequential NNN format
- Always include both up and down migrations
- Always add comments on new columns
