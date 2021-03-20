import type { LibLoadError } from './interface';

/** 加载一个脚本，Promise返回加载情况 */
export const loadScript = (url: string) =>
  new Promise((resolve, reject) => {
    const scriptEle = document.createElement('script');

    scriptEle.src = url;

    scriptEle.async = true;
    scriptEle.referrerPolicy = 'no-referrer';
    scriptEle.type = 'text/javascript';
    scriptEle.crossOrigin = 'anonymous';

    scriptEle.onload = () => {
      console.log('loaded: ', url);
      resolve('');
    };
    scriptEle.onerror = (
      evt: Event | string,
      source?: string,
      lineno?: number,
      colno?: number,
      err?: Error,
    ) => {
      let scriptLoadError: LibLoadError;

      if (err) {
        scriptLoadError = err as LibLoadError;
      } else {
        let msg = '';
        if (typeof evt === 'string') {
          msg = evt;
        } else {
          msg = evt.type;
        }
        scriptLoadError = new Error(msg) as LibLoadError;
      }

      scriptLoadError.event = evt;
      source && (scriptLoadError.source = source);
      lineno && (scriptLoadError.lineno = lineno);
      colno && (scriptLoadError.colno = colno);

      reject(scriptLoadError);
    };

    document.body.append(scriptEle);

    console.log('load: ', url);
  });
