#!/bin/bash -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cbl_version=${1:-1.0.0}

cbl_build=$(curl -s "http://proget.build.couchbase.com:8080/api/get_version?product=couchbase-lite-js&version=$cbl_version&ee=true" | jq .BuildNumber)

pushd $SCRIPT_DIR/../modules/ROOT/examples/code_snippets
npm install --no-audit --no-fund @couchbase/lite-js@$cbl_version-$cbl_build --registry https://proget.sc.couchbase.com/npm/cbl-npm/
npm install
npm run build