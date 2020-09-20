import { resolve } from 'path';

import { config } from 'dotenv';

export function setup(BASE, isProduction) {
  const env = isProduction ? 'prod' : 'dev';
  config(resolve(BASE, `./env.${env}.local`));
  config(resolve(BASE, `./env.${env}`));
  config(resolve(BASE, './env.local'));
  config(resolve(BASE, './env'));
}
