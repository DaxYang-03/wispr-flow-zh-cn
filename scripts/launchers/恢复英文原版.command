#!/bin/zsh
set -eu
bundle_dir="${0:A:h}"
/bin/bash "$bundle_dir/bootstrap.sh" disable
