#!/usr/bin/env sh

DIR=`dirname $0`
cd "$DIR"/..

# For compilation:
#
# --module_resolution NODE
# --module_resolution NODE
# --generate_exports true
# --entry_point src/funfix-core
# --js node_modules/google-closure-library/closure/
# --only_closure_dependencies \
# --generate_exports \

exec java -jar node_modules/google-closure-compiler/compiler.jar \
  --new_type_inf \
  --compilation_level=ADVANCED \
  --language_in=ECMASCRIPT6_STRICT \
  --language_out=ECMASCRIPT5 \
  --jscomp_error=accessControls \
  --jscomp_error=ambiguousFunctionDecl \
  --jscomp_error=checkDebuggerStatement \
  --jscomp_error=checkEventfulObjectDisposal \
  --jscomp_error=checkRegExp \
  --jscomp_error=checkTypes \
  --jscomp_error=checkVars \
  --jscomp_error=const \
  --jscomp_error=constantProperty \
  --jscomp_error=duplicate \
  --jscomp_error=duplicateMessage \
  --jscomp_error=es5Strict \
  --jscomp_error=es3 \
  --jscomp_error=externsValidation \
  --jscomp_error=fileoverviewTags \
  --jscomp_error=globalThis \
  --jscomp_error=internetExplorerChecks \
  --jscomp_error=invalidCasts \
  --jscomp_error=missingProperties \
  --jscomp_error=strictModuleDepCheck \
  --jscomp_error=undefinedNames \
  --jscomp_error=undefinedVars \
  --jscomp_error=unknownDefines \
  --jscomp_error=uselessCode \
  --jscomp_error=visibility \
  --jscomp_warning=deprecated \
  --jscomp_off=nonStandardJsDocs \
  --checks-only \
  "$@"
