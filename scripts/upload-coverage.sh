#!/usr/bin/env bash
set -e

COVERAGE_DIRS=""

for f in packages/*; do
  if [ -n "$COVERAGE_ONLY" ] && [[ `basename $f` != *"$COVERAGE_ONLY"* ]]; then
    continue
  fi

  if [ -d "$f/coverage" ]; then
    COVERAGE_DIRS="-s $f/coverage $COVERAGE_DIRS"
  fi
done

bash <(curl -s https://codecov.io/bash) $COVERAGE_DIRS