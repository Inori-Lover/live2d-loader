import 'jquery';

export interface RequestContext<T> {
  url: string;
  options: Options;
  ajaxOptions: JQuery.AjaxSettings;
  /** 预设响应, 如果设置了这个key，将不会执行接口请求而直接使用这个数据作为响应 */
  data?: T;
}

type Promised<T> = T extends Promise<infer R> ? Promised<R> : T;

export interface ResponseContext<T extends unknown = unknown> {
  response: Promised<JQuery.jqXHR<T>>;
}

/** 选项 */
export interface Options {
  /** 容器，可以传入选择器或者html元素 */
  id: string | HTMLDivElement;
  /** canvas相关配置 */
  canvas?: {
    /** 大小 @default 280 */
    size?: number | [wdith: number, height: number];
  };
  /** 模型相关配置 */
  model?: {
    /** 初始ID @default 1 */
    defaultID?: number;
    /** 记住最后选择的模型 @default true */
    remember?: boolean;
    /** 切换顺序 @default 0 @description -1为倒序；0为乱序；1为顺序 */
    order?: -1 | 0 | 1;
  };
  /** 材质（衣服）相关配置 */
  textures?: {
    /** 初始ID @default 53 */
    defaultID?: number;
    /** 记住最后选择的模型 @default true */
    remember?: boolean;
    /** 切换顺序 @default 0 @description -1为倒序；0为乱序；1为顺序 */
    order?: -1 | 0 | 1;
  };
  /** 工具开关 */
  tools?: {
    /** 模型切换 @default true */
    switchModels?: boolean;
    /** 材质切换 @default true */
    switchTextures?: boolean;
    /** 关闭老婆 @default true */
    closeModel?: boolean;
  };
  /** 链接 */
  urls?: {
    api?: {
      /** 模型列表 */
      modelList?: string;
      /** 消息列表 */
      messageList?: string;
    };
    link?: {
      /** 首页 @default location.pathname mount时的地址 */
      home?: string;
    };
  };
  /** 流程拦截 */
  hooks?: {
    /** 获取模型 */
    beforeFetchList?: <T extends unknown = unknown>(
      context: RequestContext<T>,
    ) => RequestContext<T>;
    /** 得到模型 */
    afterFetchList?: <T extends unknown = unknown>(
      context: ResponseContext<any>,
    ) => ResponseContext<T>;
    /** 获取消息 */
    beforeFetchMessage?: <T extends unknown = unknown>(
      context: RequestContext<T>,
    ) => RequestContext<T>;
    /** 得到消息 */
    afterFetchMessage?: <T extends unknown = unknown>(
      context: ResponseContext<any>,
    ) => ResponseContext<T>;
  };
}

/** 预设配置 */
const defaultOptions: Options = {
  id: '',
  canvas: {
    size: 280,
  },
  model: {
    defaultID: 1,
    remember: true,
    order: 0,
  },
  textures: {
    defaultID: 53,
    remember: true,
    order: 0,
  },
  tools: {
    switchModels: true,
    switchTextures: true,
    closeModel: true,
  },
  urls: {
    api: {
      modelList: '',
      messageList: '',
    },
    link: {
      home: '',
    },
  },
};

class Core {
  /** mount时的配置 */
  private configWhenMount = defaultOptions;
  /** mount时的地址 */
  private urlWhenMount = '';

  private currentConfig = this.configWhenMount;

  /** 模型储存KEY */
  private MODEL_STORE_KEY = 'MODEL_STORE_KEY';
  /** 材质储存KEY */
  private TEXTURE_STORE_KEY = 'MODEL_STORE_KEY';
  /** 库版本 */
  private readonly VERSION = '0.0.1';

  /** 挂载 */
  public mount = (opt: Options) => {
    this.urlWhenMount = location.href;
    this.configWhenMount = opt;

    this._mount({
      ...defaultOptions,
      ...opt,
    });
  };

  /** 内部方法，具体的挂载逻辑 */
  private _mount = (opt: Options) => {
    //
  };

  /** 卸载 */
  public unmount = () => {};

  /** 重设所有配置 */
  public reset = () => {
    localStorage.removeItem(this.MODEL_STORE_KEY);
    localStorage.removeItem(this.TEXTURE_STORE_KEY);
    this.restore();
  };

  /** 回到mount时的配置 */
  public restore = () => {
    this.unmount();
    this._mount(this.configWhenMount);
  };

  /** 更新设置 */
  public config = (produce: (opt: Options) => Options | false) => {
    const nextConfig = produce(this.currentConfig);
    if (nextConfig === false) {
      return;
    }
    this.unmount();
    this._mount(nextConfig);
  };
}

export const main = new Core();
