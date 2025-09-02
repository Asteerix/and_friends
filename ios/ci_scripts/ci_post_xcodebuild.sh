#!/usr/bin/env bash
set -euo pipefail

BUNDLE="${CI_RESULT_BUNDLE_PATH:-/Volumes/workspace/resultbundle.xcresult}"
echo "== Dumping XCResult errors from: $BUNDLE =="

# Export le JSON du .xcresult
xcrun xcresulttool get --path "$BUNDLE" --format json > /Volumes/workspace/xcresult.json

# Parcours minimal pour sortir les erreurs lisibles dans les logs
/usr/bin/python3 - <<'PY'
import json, pathlib
p = pathlib.Path('/Volumes/workspace/xcresult.json')
d = json.loads(p.read_text())

def values(o, key):
    if isinstance(o, dict):
        for k,v in o.items():
            if k == key: yield v
            else: yield from values(v, key)
    elif isinstance(o, list):
        for i in o: yield from values(i, key)

# Cherche les "errorSummaries" et affiche message + localisation
for issues in values(d, 'issues'):
    for bucket in ('errorSummaries','testFailureSummaries'):
        s = issues.get(bucket, {})
        for it in s.get('_values', []):
            msg = it.get('message') or it.get('subtitle') or ''
            loc = it.get('documentLocationInCreatingWorkspace', '')
            print(f"[ERROR] {msg}")
            if loc: print(f"      at {loc}")
PY

echo "== End of XCResult error dump =="