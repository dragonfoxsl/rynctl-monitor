#!/bin/sh
set -eu

mkdir -p /data/logs
chown -R rynctl:rynctl /data

exec gosu rynctl:rynctl "$@"
