import { loadLib } from './load-lib';

/**
 * @example
 * ```typescript
 * live2d('https://vcb-s.com')
 * ```
 */
export function live2d(cacheDomain = '', jqVer = '1.12.4') {
  return loadLib([
    // jq
    `https://cdn.staticfile.org/jquery/${jqVer}/jquery.min.js`,
    // live2d
    {
      css: [
        `${cacheDomain}/live2d/assets/waifu.min.css`,
        'https://cdn.staticfile.org/animate.css/3.7.2/animate.min.css',
      ],
    },
    // 主逻辑
    `${cacheDomain}/live2d/assets/live2d.min.js`,
    // tips
    `${cacheDomain}/live2d/assets/waifu-tips.min.js`,
  ]);
}
