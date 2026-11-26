#!/bin/sh
# Stand-in for /usr/local/bin/app-backup (contract C2). The scenario picks the
# outcome through /sim/state/backup-mode.
echo "$*|${BACKUP_LABEL:-}" >> /sim/state/backup.log

case "$(cat /sim/state/backup-mode)" in
  ok)
    echo "backing up"
    echo "snapshot=snap$(wc -l < /sim/state/backup.log | tr -d ' ')"
    ;;
  no-snapshot-line)
    echo "backing up"
    ;;
  no-postgres)
    echo "postgres container is missing" >&2
    exit 3
    ;;
  *)
    echo "backup failed" >&2
    exit 1
    ;;
esac
