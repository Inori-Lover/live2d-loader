import { setup } from './setup';
import { getPlugins } from './plugins';

const { NODE_ENV = 'development' } = process.env;
const isProduction = NODE_ENV === 'production';
const BASE = process.cwd();

setup(BASE, isProduction);

const plugins = getPlugins(BASE, NODE_ENV, isProduction);

const external = [/tslib/];

const globals = {
  tslib: 'window.tslib',
};

const suffix = isProduction ? '.min' : '';

export const config = ['loader', 'waifu-tips'].map((name) => {
  return {
    input: `src/${name}.ts`,
    output: [
      {
        name,
        file: `dist/${name}${suffix}.js`,
        format: 'umd',
        globals,
      },
    ],
    external,
    plugins,
  };
});
