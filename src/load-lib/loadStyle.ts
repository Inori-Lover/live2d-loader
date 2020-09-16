import type { LibLoadError } from './interface';

/** 加载一个样式，Promise返回加载情况 */
export const loadStyle = (url: string) =>
    new Promise((resolve, reject) => {
        const styleEle = document.createElement('link');

        styleEle.href = url;

        styleEle.as = 'style';
        styleEle.rel = 'stylesheet';
        styleEle.type = 'text/css';
        styleEle.referrerPolicy = 'no-referrer';
        styleEle.crossOrigin = 'anonymous';

        styleEle.onload = () => {
            console.log('loaded: ', url);
            resolve();
        };
        styleEle.onerror = (evt: Event | string, source?: string, lineno?: number, colno?: number, err?: Error) => {
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

        document.head.append(styleEle);

        console.log('load: ', url);
    });
