import { setup } from './setup';
import { getPlugins } from './plugins';
import kebabCase from './kebab-case';

const { NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';
const BASE = process.cwd();

setup(BASE, isProduction);

const plugins = getPlugins(BASE, NODE_ENV, isProduction);

const external = [];

const globals = {};

const suffix = isProduction ? '.min' : '';

export const config = ['live2d-es'].map((name) => {
  return {
    input: `src/${name}.ts`,
    output: [
      {
        name: kebabCase.reverse(name),
        file: `dist/${name}${suffix}.js`,
        format: 'umd',
        globals,
      },
    ],
    external,
    plugins,
  };
});
