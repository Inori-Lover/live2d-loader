import { resolve } from 'path';

import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';

import { commitID } from './commit-id';
import { buildDate } from './build-date';

export const getPlugins = (BASE, NODE_ENV, isProduction) => {
  const plugins = [
    resolvePlugin(), // so Rollup can find `ms`
    commonjs(), // so Rollup can convert `ms` to an ES module
    replace({
      __buildEnv__: NODE_ENV,
      __buildID__: commitID,
      __buildDate__: buildDate,
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
