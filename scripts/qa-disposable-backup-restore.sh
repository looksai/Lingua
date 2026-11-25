#!/usr/bin/env bash
# Synthetic restore rehearsal. Runs only in CI against its disposable mysql:8.0
# service container. Never downloads or opens actual Aiven student backups.
set -euo pipefail
if [[ "${LINGUA_PORTAL_MYSQL_QA:-}" != "1" ]]; then
  echo "Refusing backup rehearsal outside disposable CI QA" >&2
  exit 1
fi
if [[ "${DATABASE_URL:-}" != "mysql://lingua_qa:disposable-only-pass@127.0.0.1:3306/lingua_portal_qa" ]]; then
  echo "Refusing unexpected database target" >&2
  exit 1
fi
container="$(docker ps --filter 'ancestor=mysql:8.0' --format '{{.ID}}' | head -n 1)"
if [[ -z "$container" ]]; then
  echo "Disposable MySQL container not found" >&2
  exit 1
fi
dump_file="$(mktemp)"
trap 'rm -f "$dump_file"' EXIT
# This synthetic root password is declared in this workflow only and must
# never be replaced with actual Render/Aiven credentials.
dbcli=(docker exec -e MYSQL_PWD=disposable-only-root "$container" mysql -uroot --batch --skip-column-names)
docker exec -e MYSQL_PWD=disposable-only-root "$container" \
  mysqldump -uroot --single-transaction --no-tablespaces \
    --set-gtid-purged=OFF lingua_portal_qa > "$dump_file"
if [[ ! -s "$dump_file" ]]; then
  echo "Synthetic SQL dump is empty" >&2
  exit 1
fi
"${dbcli[@]}" -e 'CREATE DATABASE lingua_restore_qa;'
docker exec -i -e MYSQL_PWD=disposable-only-root "$container" \
  mysql -uroot lingua_restore_qa < "$dump_file"
for table in learnerPrivacyPreferences portalMembershipGrants portalPartners \
             portalPartnerInquiries portalInquiryMessages portalPartnerAds portalTopics; do
  source_count="$("${dbcli[@]}" lingua_portal_qa -e "SELECT COUNT(*) FROM \`$table\`;")"
  restored_count="$("${dbcli[@]}" lingua_restore_qa -e "SELECT COUNT(*) FROM \`$table\`;")"
  if [[ "$source_count" != "$restored_count" ]]; then
    echo "Restore mismatch for $table" >&2
    exit 1
  fi
done
source_tables="$("${dbcli[@]}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lingua_portal_qa';")"
restored_tables="$("${dbcli[@]}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lingua_restore_qa';")"
[[ "$source_tables" -eq "$restored_tables" ]] || { echo "Restored table-count mismatch" >&2; exit 1; }
echo "PASS: isolated synthetic MySQL dump restored to a separate database; counts match."
echo "IMPORTANT: This DOES NOT validate the real encrypted Aiven backup or its password."
