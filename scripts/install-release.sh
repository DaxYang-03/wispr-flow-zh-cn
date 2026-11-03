#!/bin/bash
# Download one pinned release, verify the ZIP checksum, then run its installer.
set -euo pipefail
version=v0.1.0
repository=https://github.com/DaxYang-03/wispr-flow-zh-cn
asset="Wispr-Flow-Chinese-${version}-macOS.zip"
if [[ "$(/usr/bin/uname -s)" != Darwin ]]; then echo '此补丁仅支持 macOS。'; exit 1; fi
if [[ "$(id -u)" == 0 ]]; then echo '请以当前登录用户运行，不要使用 sudo。'; exit 1; fi
workspace="$(/usr/bin/mktemp -d "${TMPDIR:-/tmp}/wispr-chinese.XXXXXX")"
trap '/bin/rm -rf "$workspace"' EXIT
base="$repository/releases/download/$version"
/usr/bin/curl -fLSs --retry 3 --connect-timeout 15 "$base/$asset" -o "$workspace/$asset"
/usr/bin/curl -fLSs --retry 3 --connect-timeout 15 "$base/SHA256SUMS.txt" -o "$workspace/SHA256SUMS.txt"
(cd "$workspace" && /usr/bin/shasum -a 256 -c SHA256SUMS.txt)
/usr/bin/ditto -x -k "$workspace/$asset" "$workspace/unpacked"
package="$workspace/unpacked/Wispr-Flow-Chinese-$version"
/bin/bash "$package/bootstrap.sh" install
printf '\n正在打开中文界面……\n'
/bin/bash "$package/bootstrap.sh" launch
