import type { Deps } from './interface';

import { loadScript } from './loadScript';
import { loadStyle } from './loadStyle';

function loadSignalFile(url: string) {
    const fullURL = new URL(url, location.origin);

    if (/\.css$/.test(fullURL.pathname)) {
        return loadStyle(url);
    } else {
        return loadScript(url);
    }
}

/**
 * 加载库文件
 *
 * 数组：串行加载（前后依赖）
 * 对象：并行加载（相互无依赖）
 */
export async function loadLib(deps: Deps) {
    for (const depOrString of deps) {
        if (typeof depOrString === 'string') {
            await loadSignalFile(depOrString);
        } else {
            await Promise.all(
                Object.keys(depOrString).map((depName) => {
                    const dep = depOrString[depName];
                    if (typeof dep === 'string') {
                        return loadSignalFile(dep);
                    } else if (Array.isArray(dep)) {
                        return loadLib(dep);
                    } else {
                        return loadLib([dep]);
                    }
                })
            );
        }
    }
}
