import { resolve, dirname, relative, win32, posix } from 'path';
import { createFilter } from '@rollup/pluginutils';
import * as defaultTs from 'typescript';
import { DiagnosticCategory } from 'typescript';
import resolveId from 'resolve';
import { readFileSync } from 'fs';

/**
 * Create a format diagnostics host to use with the Typescript type checking APIs.
 * Typescript hosts are used to represent the user's system,
 * with an API for checking case sensitivity etc.
 * @param compilerOptions Typescript compiler options. Affects functions such as `getNewLine`.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
function createFormattingHost(ts, compilerOptions) {
  return {
    /** Returns the compiler options for the project. */
    getCompilationSettings: () => compilerOptions,
    /** Returns the current working directory. */
    getCurrentDirectory: () => process.cwd(),
    /** Returns the string that corresponds with the selected `NewLineKind`. */
    getNewLine() {
      switch (compilerOptions.newLine) {
        case ts.NewLineKind.CarriageReturnLineFeed:
          return '\r\n';
        case ts.NewLineKind.LineFeed:
          return '\n';
        default:
          return ts.sys.newLine;
      }
    },
    /** Returns a lower case name on case insensitive systems, otherwise the original name. */
    getCanonicalFileName: (fileName) =>
      ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase(),
  };
}

/**
 * Create a helper for resolving modules using Typescript.
 * @param host Typescript host that extends `ModuleResolutionHost`
 * with methods for sanitizing filenames and getting compiler options.
 */
function createModuleResolver(ts, host) {
  const compilerOptions = host.getCompilationSettings();
  const cache = ts.createModuleResolutionCache(
    process.cwd(),
    host.getCanonicalFileName,
    compilerOptions,
  );
  const moduleHost = Object.assign(Object.assign({}, ts.sys), host);
  return (moduleName, containingFile) => {
    const resolved = ts.nodeModuleNameResolver(
      moduleName,
      containingFile,
      compilerOptions,
      moduleHost,
      cache,
    );
    return resolved.resolvedModule;
  };
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __rest(s, e) {
  var t = {};
  for (var p in s)
    if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
      t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === 'function')
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (
        e.indexOf(p[i]) < 0 &&
        Object.prototype.propertyIsEnumerable.call(s, p[i])
      )
        t[p[i]] = s[p[i]];
    }
  return t;
}

const resolveIdAsync = (file, opts) =>
  new Promise((fulfil, reject) =>
    resolveId(file, opts, (err, contents) =>
      err ? reject(err) : fulfil(contents),
    ),
  );
/**
 * Returns code asynchronously for the tslib helper library.
 */
function getTsLibPath() {
  return resolveIdAsync('tslib/tslib.es6.js', { basedir: __dirname });
}

/**
 * Separate the Rollup plugin options from the Typescript compiler options,
 * and normalize the Rollup options.
 * @returns Object with normalized options:
 * - `filter`: Checks if a file should be included.
 * - `tsconfig`: Path to a tsconfig, or directive to ignore tsconfig.
 * - `compilerOptions`: Custom Typescript compiler options that override tsconfig.
 * - `typescript`: Instance of Typescript library (possibly custom).
 * - `tslib`: ESM code from the tslib helper library (possibly custom).
 */
function getPluginOptions(options) {
  const { include, exclude, tsconfig, typescript, tslib } = options,
    compilerOptions = __rest(options, [
      'include',
      'exclude',
      'tsconfig',
      'typescript',
      'tslib',
    ]);
  const filter = createFilter(
    include || ['*.ts+(|x)', '**/*.ts+(|x)'],
    exclude,
  );
  return {
    filter,
    tsconfig,
    compilerOptions: compilerOptions,
    typescript: typescript || defaultTs,
    tslib: tslib || getTsLibPath(),
  };
}

/**
 * Converts a Typescript type error into an equivalent Rollup warning object.
 */
function diagnosticToWarning(ts, host, diagnostic) {
  const pluginCode = `TS${diagnostic.code}`;
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  // Build a Rollup warning object from the diagnostics object.
  const warning = {
    pluginCode,
    message: `@rollup/plugin-typescript ${pluginCode}: ${message}`,
  };
  if (diagnostic.file) {
    // Add information about the file location
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start,
    );
    warning.loc = {
      column: character + 1,
      line: line + 1,
      file: diagnostic.file.fileName,
    };
    if (host) {
      // Extract a code frame from Typescript
      const formatted = ts.formatDiagnosticsWithColorAndContext(
        [diagnostic],
        host,
      );
      // Typescript only exposes this formatter as a string prefixed with the flattened message.
      // We need to remove it here since Rollup treats the properties as separate parts.
      let frame = formatted.slice(formatted.indexOf(message) + message.length);
      const newLine = host.getNewLine();
      if (frame.startsWith(newLine)) {
        frame = frame.slice(frame.indexOf(newLine) + newLine.length);
      }
      warning.frame = frame;
    }
  }
  return warning;
}

const DEFAULT_COMPILER_OPTIONS = {
  module: 'esnext',
  skipLibCheck: true,
};
const FORCED_COMPILER_OPTIONS = {
  // Always use tslib
  noEmitHelpers: true,
  importHelpers: true,
  // Typescript needs to emit the code for us to work with
  noEmit: false,
  emitDeclarationOnly: false,
  // Preventing Typescript from resolving code may break compilation
  noResolve: false,
};

/* eslint-disable no-param-reassign */
const DIRECTORY_PROPS = ['outDir', 'declarationDir'];
/**
 * Mutates the compiler options to convert paths from relative to absolute.
 * This should be used with compiler options passed through the Rollup plugin options,
 * not those found from loading a tsconfig.json file.
 * @param compilerOptions Compiler options to _mutate_.
 * @param relativeTo Paths are resolved relative to this path.
 */
function makePathsAbsolute(compilerOptions, relativeTo) {
  for (const pathProp of DIRECTORY_PROPS) {
    if (compilerOptions[pathProp]) {
      compilerOptions[pathProp] = resolve(
        relativeTo,
        compilerOptions[pathProp],
      );
    }
  }
}
/**
 * Mutates the compiler options to normalize some values for Rollup.
 * @param compilerOptions Compiler options to _mutate_.
 * @returns True if the source map compiler option was not initially set.
 */
function normalizeCompilerOptions(ts, compilerOptions) {
  let autoSetSourceMap = false;
  if (compilerOptions.inlineSourceMap) {
    // Force separate source map files for Rollup to work with.
    compilerOptions.sourceMap = true;
    compilerOptions.inlineSourceMap = false;
  } else if (typeof compilerOptions.sourceMap !== 'boolean') {
    // Default to using source maps.
    // If the plugin user sets sourceMap to false we keep that option.
    compilerOptions.sourceMap = true;
    // Using inlineSources to make sure typescript generate source content
    // instead of source path.
    compilerOptions.inlineSources = true;
    autoSetSourceMap = true;
  }
  switch (compilerOptions.module) {
    case ts.ModuleKind.ES2015:
    case ts.ModuleKind.ESNext:
    case ts.ModuleKind.CommonJS:
      // OK module type
      return autoSetSourceMap;
    case ts.ModuleKind.None:
    case ts.ModuleKind.AMD:
    case ts.ModuleKind.UMD:
    case ts.ModuleKind.System: {
      // Invalid module type
      const moduleType = ts.ModuleKind[compilerOptions.module];
      throw new Error(
        `@rollup/plugin-typescript: The module kind should be 'ES2015' or 'ESNext, found: '${moduleType}'`,
      );
    }
    default:
      // Unknown or unspecified module type, force ESNext
      compilerOptions.module = ts.ModuleKind.ESNext;
  }
  return autoSetSourceMap;
}

/**
 * Finds the path to the tsconfig file relative to the current working directory.
 * @param relativePath Relative tsconfig path given by the user.
 * If `false` is passed, then a null path is returned.
 * @returns The absolute path, or null if the file does not exist.
 */
function getTsConfigPath(ts, relativePath) {
  if (relativePath === false) return null;
  // Resolve path to file. `tsConfigOption` defaults to 'tsconfig.json'.
  const tsConfigPath = resolve(process.cwd(), relativePath || 'tsconfig.json');
  if (!ts.sys.fileExists(tsConfigPath)) {
    if (relativePath) {
      // If an explicit path was provided but no file was found, throw
      throw new Error(
        `Could not find specified tsconfig.json at ${tsConfigPath}`,
      );
    } else {
      return null;
    }
  }
  return tsConfigPath;
}
/**
 * Tries to read the tsconfig file at `tsConfigPath`.
 * @param tsConfigPath Absolute path to tsconfig JSON file.
 * @param explicitPath If true, the path was set by the plugin user.
 * If false, the path was computed automatically.
 */
function readTsConfigFile(ts, tsConfigPath) {
  const { config, error } = ts.readConfigFile(tsConfigPath, (path) =>
    readFileSync(path, 'utf8'),
  );
  if (error) {
    throw Object.assign(Error(), diagnosticToWarning(ts, null, error));
  }
  return config || {};
}
/**
 * Returns true if any of the `compilerOptions` contain an enum value (i.e.: ts.ScriptKind) rather than a string.
 * This indicates that the internal CompilerOptions type is used rather than the JsonCompilerOptions.
 */
function containsEnumOptions(compilerOptions) {
  const enums = ['module', 'target', 'jsx', 'moduleResolution', 'newLine'];
  return enums.some(
    (prop) =>
      prop in compilerOptions && typeof compilerOptions[prop] === 'number',
  );
}
const configCache = new Map();
/**
 * Parse the Typescript config to use with the plugin.
 * @param ts Typescript library instance.
 * @param tsconfig Path to the tsconfig file, or `false` to ignore the file.
 * @param compilerOptions Options passed to the plugin directly for Typescript.
 *
 * @returns Parsed tsconfig.json file with some important properties:
 * - `options`: Parsed compiler options.
 * - `fileNames` Type definition files that should be included in the build.
 * - `errors`: Any errors from parsing the config file.
 */
function parseTypescriptConfig(ts, tsconfig, compilerOptions) {
  /* eslint-disable no-undefined */
  const cwd = process.cwd();
  makePathsAbsolute(compilerOptions, cwd);
  let parsedConfig;
  // Resolve path to file. If file is not found, pass undefined path to `parseJsonConfigFileContent`.
  // eslint-disable-next-line no-undefined
  const tsConfigPath = getTsConfigPath(ts, tsconfig) || undefined;
  const tsConfigFile = tsConfigPath ? readTsConfigFile(ts, tsConfigPath) : {};
  const basePath = tsConfigPath ? dirname(tsConfigPath) : cwd;
  // If compilerOptions has enums, it represents an CompilerOptions object instead of parsed JSON.
  // This determines where the data is passed to the parser.
  if (containsEnumOptions(compilerOptions)) {
    parsedConfig = ts.parseJsonConfigFileContent(
      Object.assign(Object.assign({}, tsConfigFile), {
        compilerOptions: Object.assign(
          Object.assign({}, DEFAULT_COMPILER_OPTIONS),
          tsConfigFile.compilerOptions,
        ),
      }),
      ts.sys,
      basePath,
      Object.assign(
        Object.assign({}, compilerOptions),
        FORCED_COMPILER_OPTIONS,
      ),
      tsConfigPath,
      undefined,
      undefined,
      configCache,
    );
  } else {
    parsedConfig = ts.parseJsonConfigFileContent(
      Object.assign(Object.assign({}, tsConfigFile), {
        compilerOptions: Object.assign(
          Object.assign(
            Object.assign({}, DEFAULT_COMPILER_OPTIONS),
            tsConfigFile.compilerOptions,
          ),
          compilerOptions,
        ),
      }),
      ts.sys,
      basePath,
      FORCED_COMPILER_OPTIONS,
      tsConfigPath,
      undefined,
      undefined,
      configCache,
    );
  }
  const autoSetSourceMap = normalizeCompilerOptions(ts, parsedConfig.options);
  return Object.assign(Object.assign({}, parsedConfig), { autoSetSourceMap });
}
/**
 * If errors are detected in the parsed options,
 * display all of them as warnings then emit an error.
 */
function emitParsedOptionsErrors(ts, context, parsedOptions) {
  if (parsedOptions.errors.length > 0) {
    parsedOptions.errors.forEach((error) =>
      context.warn(diagnosticToWarning(ts, null, error)),
    );
    context.error(
      `@rollup/plugin-typescript: Couldn't process compiler options`,
    );
  }
}

/**
 * Validate that the `compilerOptions.sourceMap` option matches `outputOptions.sourcemap`.
 * @param context Rollup plugin context used to emit warnings.
 * @param compilerOptions Typescript compiler options.
 * @param outputOptions Rollup output options.
 * @param autoSetSourceMap True if the `compilerOptions.sourceMap` property was set to `true`
 * by the plugin, not the user.
 */
function validateSourceMap(
  context,
  compilerOptions,
  outputOptions,
  autoSetSourceMap,
) {
  if (
    compilerOptions.sourceMap &&
    !outputOptions.sourcemap &&
    !autoSetSourceMap
  ) {
    context.warn(
      `@rollup/plugin-typescript: Rollup 'sourcemap' option must be set to generate source maps.`,
    );
  } else if (!compilerOptions.sourceMap && outputOptions.sourcemap) {
    context.warn(
      `@rollup/plugin-typescript: Typescript 'sourceMap' compiler option must be set to generate source maps.`,
    );
  }
}
/**
 * Validate that the out directory used by Typescript can be controlled by Rollup.
 * @param context Rollup plugin context used to emit errors.
 * @param compilerOptions Typescript compiler options.
 * @param outputOptions Rollup output options.
 */
function validatePaths(ts, context, compilerOptions, outputOptions) {
  if (compilerOptions.out) {
    context.error(
      `@rollup/plugin-typescript: Deprecated 'out' option is not supported. Use 'outDir' instead.`,
    );
  } else if (compilerOptions.outFile) {
    context.error(
      `@rollup/plugin-typescript: 'outFile' option is not supported. Use 'outDir' instead.`,
    );
  }
  for (const dirProperty of DIRECTORY_PROPS) {
    if (compilerOptions[dirProperty]) {
      if (!outputOptions.dir) {
        context.error(
          `@rollup/plugin-typescript: 'dir' must be used when '${dirProperty}' is specified.`,
        );
      }
      // Checks if the given path lies within Rollup output dir
      const fromRollupDirToTs = relative(
        outputOptions.dir,
        compilerOptions[dirProperty],
      );
      if (fromRollupDirToTs.startsWith('..')) {
        context.error(
          `@rollup/plugin-typescript: '${dirProperty}' must be located inside 'dir'.`,
        );
      }
    }
  }
  const tsBuildInfoPath = ts.getTsBuildInfoEmitOutputFilePath(compilerOptions);
  if (tsBuildInfoPath && compilerOptions.incremental) {
    if (!outputOptions.dir) {
      context.error(
        `@rollup/plugin-typescript: 'dir' must be used when 'tsBuildInfoFile' or 'incremental' are specified.`,
      );
    }
    // Checks if the given path lies within Rollup output dir
    const fromRollupDirToTs = relative(outputOptions.dir, tsBuildInfoPath);
    if (fromRollupDirToTs.startsWith('..')) {
      context.error(
        `@rollup/plugin-typescript: 'tsBuildInfoFile' must be located inside 'dir'.`,
      );
    }
  }
  if (compilerOptions.declaration || compilerOptions.declarationMap) {
    if (DIRECTORY_PROPS.every((dirProperty) => !compilerOptions[dirProperty])) {
      context.error(
        `@rollup/plugin-typescript: 'outDir' or 'declarationDir' must be specified to generate declaration files.`,
      );
    }
  }
}

/**
 * Checks if the given OutputFile represents some code
 */
function isCodeOutputFile(name) {
  return !isMapOutputFile(name) && !name.endsWith('.d.ts');
}
/**
 * Checks if the given OutputFile represents some source map
 */
function isMapOutputFile(name) {
  return name.endsWith('.map');
}
/**
 * Finds the corresponding emitted Javascript files for a given Typescript file.
 * @param id Path to the Typescript file.
 * @param emittedFiles Map of file names to source code,
 * containing files emitted by the Typescript compiler.
 */
function findTypescriptOutput(ts, parsedOptions, id, emittedFiles) {
  const emittedFileNames = ts.getOutputFileNames(
    parsedOptions,
    id,
    !ts.sys.useCaseSensitiveFileNames,
  );
  const codeFile = emittedFileNames.find(isCodeOutputFile);
  const mapFile = emittedFileNames.find(isMapOutputFile);
  return {
    code: emittedFiles.get(codeFile),
    map: emittedFiles.get(mapFile),
    declarations: emittedFileNames.filter(
      (name) => name !== codeFile && name !== mapFile,
    ),
  };
}

// `Cannot compile modules into 'es6' when targeting 'ES5' or lower.`
const CANNOT_COMPILE_ESM = 1204;
/**
 * Emit a Rollup warning or error for a Typescript type error.
 */
function emitDiagnostic(ts, context, host, diagnostic) {
  if (diagnostic.code === CANNOT_COMPILE_ESM) return;
  const { noEmitOnError } = host.getCompilationSettings();
  // Build a Rollup warning object from the diagnostics object.
  const warning = diagnosticToWarning(ts, host, diagnostic);
  // Errors are fatal. Otherwise emit warnings.
  if (noEmitOnError && diagnostic.category === ts.DiagnosticCategory.Error) {
    context.error(warning);
  } else {
    context.warn(warning);
  }
}
function buildDiagnosticReporter(ts, context, host) {
  return function reportDiagnostics(diagnostic) {
    emitDiagnostic(ts, context, host, diagnostic);
  };
}

// @see https://github.com/microsoft/TypeScript/blob/master/src/compiler/diagnosticMessages.json
var DiagnosticCode;
(function (DiagnosticCode) {
  DiagnosticCode[(DiagnosticCode['FILE_CHANGE_DETECTED'] = 6032)] =
    'FILE_CHANGE_DETECTED';
  DiagnosticCode[
    (DiagnosticCode['FOUND_1_ERROR_WATCHING_FOR_FILE_CHANGES'] = 6193)
  ] = 'FOUND_1_ERROR_WATCHING_FOR_FILE_CHANGES';
  DiagnosticCode[
    (DiagnosticCode['FOUND_N_ERRORS_WATCHING_FOR_FILE_CHANGES'] = 6194)
  ] = 'FOUND_N_ERRORS_WATCHING_FOR_FILE_CHANGES';
})(DiagnosticCode || (DiagnosticCode = {}));
function createDeferred(timeout) {
  let promise;
  let resolve = () => {};
  if (timeout) {
    promise = Promise.race([
      new Promise((r) => setTimeout(r, timeout, true)),
      new Promise((r) => (resolve = r)),
    ]);
  } else {
    promise = new Promise((r) => (resolve = r));
  }
  return { promise, resolve };
}
/**
 * Typescript watch program helper to sync Typescript watch status with Rollup hooks.
 */
class WatchProgramHelper {
  constructor() {
    this._startDeferred = null;
    this._finishDeferred = null;
  }
  watch(timeout = 1000) {
    // Race watcher start promise against a timeout in case Typescript and Rollup change detection is not in sync.
    this._startDeferred = createDeferred(timeout);
    this._finishDeferred = createDeferred();
  }
  handleStatus(diagnostic) {
    // Fullfil deferred promises by Typescript diagnostic message codes.
    if (diagnostic.category === DiagnosticCategory.Message) {
      switch (diagnostic.code) {
        case DiagnosticCode.FILE_CHANGE_DETECTED:
          this.resolveStart();
          break;
        case DiagnosticCode.FOUND_1_ERROR_WATCHING_FOR_FILE_CHANGES:
        case DiagnosticCode.FOUND_N_ERRORS_WATCHING_FOR_FILE_CHANGES:
          this.resolveFinish();
          break;
      }
    }
  }
  resolveStart() {
    if (this._startDeferred) {
      this._startDeferred.resolve(false);
      this._startDeferred = null;
    }
  }
  resolveFinish() {
    if (this._finishDeferred) {
      this._finishDeferred.resolve();
      this._finishDeferred = null;
    }
  }
  async wait() {
    var _a;
    if (this._startDeferred) {
      const timeout = await this._startDeferred.promise;
      // If there is no file change detected by Typescript skip deferred promises.
      if (timeout) {
        this._startDeferred = null;
        this._finishDeferred = null;
      }
      await ((_a = this._finishDeferred) === null || _a === void 0
        ? void 0
        : _a.promise);
    }
  }
}
/**
 * Create a language service host to use with the Typescript compiler & type checking APIs.
 * Typescript hosts are used to represent the user's system,
 * with an API for reading files, checking directories and case sensitivity etc.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
function createWatchHost(
  ts,
  context,
  { formatHost, parsedOptions, writeFile, status, resolveModule },
) {
  const createProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram;
  const baseHost = ts.createWatchCompilerHost(
    parsedOptions.fileNames,
    parsedOptions.options,
    ts.sys,
    createProgram,
    buildDiagnosticReporter(ts, context, formatHost),
    status,
    parsedOptions.projectReferences,
  );
  return Object.assign(Object.assign({}, baseHost), {
    /** Override the created program so an in-memory emit is used */
    afterProgramCreate(program) {
      const origEmit = program.emit;
      // eslint-disable-next-line no-param-reassign
      program.emit = (targetSourceFile, _, ...args) =>
        origEmit(targetSourceFile, writeFile, ...args);
      return baseHost.afterProgramCreate(program);
    },
    /** Add helper to deal with module resolution */
    resolveModuleNames(moduleNames, containingFile) {
      return moduleNames.map((moduleName) =>
        resolveModule(moduleName, containingFile),
      );
    },
  });
}
function createWatchProgram(ts, context, options) {
  return ts.createWatchProgram(createWatchHost(ts, context, options));
}

function typescript(options = {}) {
  const {
    filter,
    tsconfig,
    compilerOptions,
    tslib,
    typescript: ts,
  } = getPluginOptions(options);
  const emittedFiles = new Map();
  const watchProgramHelper = new WatchProgramHelper();
  const parsedOptions = parseTypescriptConfig(ts, tsconfig, compilerOptions);
  parsedOptions.fileNames = parsedOptions.fileNames.filter(filter);
  const formatHost = createFormattingHost(ts, parsedOptions.options);
  const resolveModule = createModuleResolver(ts, formatHost);
  let program = null;
  function normalizePath(fileName) {
    return fileName.split(win32.sep).join(posix.sep);
  }
  return {
    name: 'typescript',
    buildStart() {
      emitParsedOptionsErrors(ts, this, parsedOptions);
      // Fixes a memory leak https://github.com/rollup/plugins/issues/322
      if (!program) {
        program = createWatchProgram(ts, this, {
          formatHost,
          resolveModule,
          parsedOptions,
          writeFile(fileName, data) {
            emittedFiles.set(fileName, data);
          },
          status(diagnostic) {
            watchProgramHelper.handleStatus(diagnostic);
          },
        });
      }
    },
    watchChange(id) {
      if (!filter(id)) return;
      watchProgramHelper.watch();
    },
    buildEnd() {
      if (this.meta.watchMode !== true) {
        // ESLint doesn't understand optional chaining
        // eslint-disable-next-line
        program === null || program === void 0 ? void 0 : program.close();
      }
    },
    renderStart(outputOptions) {
      validateSourceMap(
        this,
        parsedOptions.options,
        outputOptions,
        parsedOptions.autoSetSourceMap,
      );
      validatePaths(ts, this, parsedOptions.options, outputOptions);
    },
    resolveId(importee, importer) {
      if (importee === 'tslib') {
        return tslib;
      }
      if (!importer) return null;
      // Convert path from windows separators to posix separators
      const containingFile = normalizePath(importer);
      const resolved = resolveModule(importee, containingFile);
      if (resolved) {
        if (resolved.extension === '.d.ts') return null;
        return resolved.resolvedFileName;
      }
      return null;
    },
    async load(id) {
      if (!filter(id)) return null;
      await watchProgramHelper.wait();
      const output = findTypescriptOutput(ts, parsedOptions, id, emittedFiles);
      return output.code != null ? output : null;
    },
    generateBundle(outputOptions) {
      parsedOptions.fileNames.forEach((fileName) => {
        const output = findTypescriptOutput(
          ts,
          parsedOptions,
          fileName,
          emittedFiles,
        );
        output.declarations.forEach((id) => {
          const code = emittedFiles.get(id);
          if (!code) return;
          this.emitFile({
            type: 'asset',
            fileName: normalizePath(relative(outputOptions.dir, id)),
            source: code,
          });
        });
      });
      const tsBuildInfoPath = ts.getTsBuildInfoEmitOutputFilePath(
        parsedOptions.options,
      );
      if (tsBuildInfoPath) {
        this.emitFile({
          type: 'asset',
          fileName: normalizePath(relative(outputOptions.dir, tsBuildInfoPath)),
          source: emittedFiles.get(tsBuildInfoPath),
        });
      }
    },
  };
}

export default typescript;
