#!/usr/bin/env bash
# CI-only encrypted backup/restore rehearsal. Uses synthetic MySQL data.
# Never reads Aiven student rows, real GitHub secrets or real backup passwords.
set -euo pipefail
set +x
umask 077
if [[ "${LINGUA_PORTAL_MYSQL_QA:-}" != "1" ]]; then
  echo "Refusing backup rehearsal outside disposable CI QA" >&2
  exit 1
fi
if [[ "${DATABASE_URL:-}" != "mysql://lingua_qa:disposable-only-pass@127.0.0.1:3306/lingua_portal_qa" ]]; then
  echo "Refusing unexpected database target" >&2
  exit 1
fi
for program in docker gpg openssl; do
  command -v "$program" >/dev/null || { echo "Missing required QA program: $program" >&2; exit 1; }
done
container="$(docker ps --filter 'ancestor=mysql:8.4' --format '{{.ID}}' | head -n 1)"
if [[ -z "$container" ]]; then
  echo "Disposable MySQL container not found" >&2
  exit 1
fi
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
# The passphrase is generated for this one synthetic run, never printed, and
# never reused as or compared with a real Aiven backup passphrase.
openssl rand -hex 48 > "$work/passphrase"
test -s "$work/passphrase"
dbcli=(docker exec -e MYSQL_PWD=disposable-only-root "$container" mysql -uroot --batch --skip-column-names)
# Stream SQL through gzip and AES-256; NO plaintext SQL backup is persisted.
docker exec -e MYSQL_PWD=disposable-only-root "$container" \
  mysqldump -uroot --single-transaction --quick --no-tablespaces \
    --routines --triggers --events --hex-blob \
    --set-gtid-purged=OFF lingua_portal_qa \
  | gzip -1 \
  | gpg --quiet --batch --yes --pinentry-mode loopback \
      --passphrase-file "$work/passphrase" --symmetric \
      --cipher-algo AES256 --output "$work/synthetic.sql.gz.gpg"
test -s "$work/synthetic.sql.gz.gpg" || { echo "Encrypted QA backup is empty" >&2; exit 1; }
# Decrypt and validate the compressed data without exposing backup contents.
gpg --quiet --batch --yes --pinentry-mode loopback \
  --passphrase-file "$work/passphrase" \
  --decrypt "$work/synthetic.sql.gz.gpg" | gzip -t
# Prove the archive is not readable without its per-run passphrase.
openssl rand -hex 48 > "$work/wrong-passphrase"
if gpg --quiet --batch --yes --pinentry-mode loopback \
    --passphrase-file "$work/wrong-passphrase" \
    --decrypt "$work/synthetic.sql.gz.gpg" > /dev/null 2>&1; then
  echo "Encrypted archive unexpectedly decryptable with invalid passphrase" >&2
  exit 1
fi
"${dbcli[@]}" -e 'CREATE DATABASE lingua_restore_qa;'
# Decrypt only in a pipe to a DIFFERENT disposable database; mysql output is
# suppressed except for failure, preserving QA fixture privacy in logs.
gpg --quiet --batch --yes --pinentry-mode loopback \
  --passphrase-file "$work/passphrase" \
  --decrypt "$work/synthetic.sql.gz.gpg" \
  | gzip -dc \
  | docker exec -i -e MYSQL_PWD=disposable-only-root "$container" mysql -uroot lingua_restore_qa
# Compare both row counts AND SHA-256 of canonical SQL row exports.
# Row hashes protect against same-row-count content drift. SQL goes directly
# into sha256sum and is never printed, persisted or uploaded as an artifact.
row_sha256(){
  local schema="$1" table="$2"
  docker exec -e MYSQL_PWD=disposable-only-root "$container" \
    mysqldump -uroot --no-create-info --skip-extended-insert \
      --compact --no-tablespaces --skip-lock-tables --set-gtid-purged=OFF \
      "$schema" "$table" | sha256sum | cut -d' ' -f1
}
# Counts and structure compared only after complete restore. Do not trust a
# successful gpg run alone as proof that the database is recoverable.
for table in learnerPrivacyPreferences portalMembershipGrants portalPartners \
             portalPartnerInquiries portalInquiryMessages portalPartnerAds portalTopics; do
  source_count="$("${dbcli[@]}" lingua_portal_qa -e "SELECT COUNT(*) FROM \`$table\`;")"
  restored_count="$("${dbcli[@]}" lingua_restore_qa -e "SELECT COUNT(*) FROM \`$table\`;")"
  if [[ "$source_count" != "$restored_count" ]]; then
    echo "Restore row-count mismatch for $table" >&2
    exit 1
  fi
  if [[ "$(row_sha256 lingua_portal_qa "$table")" != "$(row_sha256 lingua_restore_qa "$table")" ]]; then
    echo "Restore row-content mismatch for $table" >&2
    exit 1
  fi
done
source_tables="$("${dbcli[@]}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lingua_portal_qa';")"
restored_tables="$("${dbcli[@]}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='lingua_restore_qa';")"
[[ "$source_tables" -eq "$restored_tables" ]] || { echo "Restored table-count mismatch" >&2; exit 1; }
# Negative-control test: a tampered restored row must change the digest
# even though the table's row count remains identical.
before_hash="$(row_sha256 lingua_restore_qa portalTopics)"
topic_rows="$("${dbcli[@]}" lingua_restore_qa -e "SELECT COUNT(*) FROM portalTopics;")"
[[ "$topic_rows" -gt 0 ]] || { echo "Missing synthetic topic for corruption test" >&2; exit 1; }
"${dbcli[@]}" lingua_restore_qa -e "UPDATE portalTopics SET title='QA TAMPER DETECTED' ORDER BY id LIMIT 1;"
after_hash="$(row_sha256 lingua_restore_qa portalTopics)"
[[ "$before_hash" != "$after_hash" ]] || { echo "Hash failed to detect synthetic tampering" >&2; exit 1; }
echo "PASS: synthetic SQL -> gzip -> GPG AES256 -> independent restore; schema/count/row SHA-256 match."
echo "PASS: integrity check detected an altered restored row at unchanged row count."
echo "IMPORTANT: No Aiven connection, student data, real backup artifact or real backup password was used."
