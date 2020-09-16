import { resolve } from 'path';

import { terser } from 'rollup-plugin-terser';
import resolvePlugin from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';

import pkg from './package.json';

export default [
  {
    input: 'src/main.ts',
    output: [
      {
        name: pkg.name,
        file: pkg.browser,
        format: 'umd',
        globals: {
          tslib: 'windows.tslib',
        },
      },
    ],
    external: [/tslib/],
    plugins: [
      resolvePlugin(), // so Rollup can find `ms`
      commonjs(), // so Rollup can convert `ms` to an ES module
      typescript({ tsconfig: resolve(__dirname, './tsconfig.json') }), // so Rollup can convert TypeScript to JavaScript
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js', '.ts'],
        babelrc: false,
        presets: [['@babel/preset-env', { useBuiltIns: false }]],
        plugins: [],
      }),
      terser(),
    ],
  },
];
