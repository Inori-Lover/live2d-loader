import { RollupWatchOptions, OutputOptions } from 'rollup';
import { setup } from './setup';
import { getPlugins } from './plugins';
import kebabCase from './kebab-case';

const { NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';
const BASE = process.cwd();

setup(BASE, isProduction);

const plugins = getPlugins(BASE, NODE_ENV, isProduction);

const external = ['jquery'];

const globals = { jquery: '$' };

const suffix = isProduction ? '.min' : '';

/** @type {RollupWatchOptions[]} */
const config = [];

['live2d-es'].map((name) => {
  /** @type { RollupWatchOptions } */
  const umdConfig = {
    input: `index.ts`,
    output: [
      {
        name: kebabCase.reverse(name),
        file: `dist/${name}.umd${suffix}.js`,
        format: 'umd',
        globals,
        sourcemap: true,
      },
    ],
    external,
    plugins,
  };
  config.push(umdConfig);

  const esConfig = { ...umdConfig };
  esConfig.input = `index.es.ts`;
  esConfig.output = [
    {
      file: `dist/${name}.cjs${suffix}.js`,
      format: 'cjs',
      globals,
      sourcemap: true,
    },
    {
      file: `dist/${name}.es${suffix}.js`,
      format: 'es',
      globals,
      sourcemap: true,
    },
  ];
  config.push(umdConfig);
});

export { config };
