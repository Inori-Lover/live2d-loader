/** 库加载错误 */
export interface LibLoadError extends Error {
    event: Event | string;
    source?: string;
    lineno?: number;
    colno?: number;
    error?: Error;
}

export type Dep = string | { [key: string]: Dep | Deps };
export type Deps = Dep[];
