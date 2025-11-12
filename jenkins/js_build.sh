#!/bin/bash -e

# For some ridiculous reason, Jenkins somehow ignores the entire path setup done in
# .bashrc so do it here
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cbl_version=${1:-1.0.0}

cbl_build=$(curl -s "http://proget.build.couchbase.com:8080/api/get_version?product=couchbase-lite-js&version=$cbl_version&ee=true" | jq .BuildNumber)

pushd $SCRIPT_DIR/../modules/ROOT/examples/code_snippets
npm install --no-audit --no-fund @couchbase/lite-js@$cbl_version-$cbl_build --registry https://proget.sc.couchbase.com/npm/cbl-npm/
npm install
npm run build