#!/bin/sh
set -eu

# The alpine/minio image ships /data owned by root while the server drops
# privileges to the `minio` user (uid 100), so a freshly created named volume
# is not writable. Fix the ownership once, then hand control back to MinIO.
chown -R minio:minio /data

exec su -s /bin/sh minio -c 'exec minio server /data --console-address ":9001"'
