#!/bin/bash
# Old name, kept so the original command still works.
# Everything now lives in process-photos.sh, which handles every photo folder.
exec "$(dirname "$0")/process-photos.sh" "$@"
