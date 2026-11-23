/** Column shape inspection for guarded Aiven MySQL 0007.
 * MySQL information_schema returns uppercase metadata names unless explicitly
 * aliased. Consume only our deterministic SELECT aliases.
 */
export type UserIdMetadata = {
  columnName?: unknown;
  dataType?: unknown;
  columnType?: unknown;
  nullable?: unknown;
};

export function signedIntUserIdColumn(row: UserIdMetadata | undefined): boolean {
  if (!row || row.columnName !== "id" || row.nullable !== "NO") return false;
  const dataType = typeof row.dataType === "string" ? row.dataType.toLowerCase() : "";
  const columnType = typeof row.columnType === "string" ? row.columnType.toLowerCase() : "";
  // Signed INT only: the foreign key in 0007 is defined as INT, not UNSIGNED/BIGINT.
  return dataType === "int" && /^int(?:[(][0-9]+[)])?$/.test(columnType);
}

export function describeUserIdColumn(row: UserIdMetadata | undefined): string {
  // Names/types are schema metadata, not a student record. Keep bounded.
  const safe = (value: unknown) =>
    typeof value === "string" && /^[a-zA-Z0-9_() ]{1,40}$/.test(value) ? value : "(unexpected)";
  return `users.id metadata: dataType=${safe(row?.dataType)}, columnType=${safe(row?.columnType)}, nullable=${safe(row?.nullable)}`;
}
