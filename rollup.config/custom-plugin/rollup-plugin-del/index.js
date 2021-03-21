import _del from 'del';

/**
 * @param {{ path: string[] }} opt 选项
 *
 * @see https://www.npmjs.com/package/del
 */
export function del({ path }) {
  return {
    name: 'del', // this name will show up in warnings and errors
    buildStart() {
      _del.sync(path);
    },
  };
}
