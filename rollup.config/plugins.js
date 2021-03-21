import { resolve } from 'path';

import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from './custom-plugin/plugin-typescript/dist/index.es';
import babel from '@rollup/plugin-babel';

import { commitID } from './commit-id';
import { buildDate } from './build-date';

export const getPlugins = (BASE, NODE_ENV, isProduction) => {
  const plugins = [
    resolvePlugin(), // so Rollup can find `ms`
    commonjs(), // so Rollup can convert `ms` to an ES module
    replace({
      values: {
        __buildEnv__: NODE_ENV,
        __buildID__: commitID,
        __buildDate__: buildDate,
      },
      preventAssignment: true,
    }),
    typescript({ tsconfig: resolve(BASE, './tsconfig.json') }), // so Rollup can convert TypeScript to JavaScript
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.ts'],
      babelrc: false,
      presets: [['@babel/preset-env', { useBuiltIns: false }]],
      plugins: [],
    }),
  ];

  if (isProduction) {
    plugins.push(terser());
  }

  return plugins;
};
