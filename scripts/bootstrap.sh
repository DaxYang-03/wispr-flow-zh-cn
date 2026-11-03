#!/bin/bash
set -euo pipefail
bundle_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ "$(/usr/bin/uname -s)" != Darwin ]]; then
  echo '此补丁仅支持 macOS。'
  exit 1
fi
machine="$(/usr/bin/uname -m)"
if [[ "$machine" == arm64 ]] || [[ "$(/usr/sbin/sysctl -n hw.optional.arm64 2>/dev/null || true)" == 1 ]]; then
  runtime_arch=darwin-arm64
elif [[ "$machine" == x86_64 ]]; then
  runtime_arch=darwin-x64
else
  echo '暂不支持此处理器。'
  exit 1
fi
runtime="$bundle_dir/runtime/$runtime_arch/node"
if [[ ! -x "$runtime" || ! -f "$bundle_dir/app/manager.mjs" ]]; then
  echo '没有找到完整运行环境。请到 Releases 下载 Wispr-Flow-Chinese-v0.1.0-macOS.zip，解压后再安装。'
  echo 'https://github.com/DaxYang-03/wispr-flow-zh-cn/releases/latest'
  exit 1
fi
exec "$runtime" "$bundle_dir/app/manager.mjs" "${1:-status}"
