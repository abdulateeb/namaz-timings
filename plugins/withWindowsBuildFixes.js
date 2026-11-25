/**
 * Local build fixes for this Windows laptop (8 GB RAM), applied on every prebuild:
 *  - CMake 4.1.2: its ninja 1.12 handles paths over 260 characters; the
 *    default CMake 3.22.1 ships ninja 1.10 and fails on React Native codegen paths.
 *  - At most 2 parallel C++ compile jobs, so clang does not exhaust memory.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// windows-build-fixes';

module.exports = function withWindowsBuildFixes(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.contents.includes(MARKER)) return cfg;
    cfg.modResults.contents = cfg.modResults.contents.replace(
      /android\s*\{\n/,
      (m) =>
        `${m}    ${MARKER}\n` +
        `    externalNativeBuild { cmake { version "4.1.2" } }\n` +
        `    defaultConfig { externalNativeBuild { cmake { arguments "-DCMAKE_JOB_POOLS=compile=2", "-DCMAKE_JOB_POOL_COMPILE=compile" } } }\n`,
    );
    return cfg;
  });
};
