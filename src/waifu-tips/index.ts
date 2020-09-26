// く__,.ヘヽ.　　　　/　,ー､ 〉
// 　　　　　＼ ', !-─‐-i　/　/´
// 　　　 　 ／｀ｰ'　　　 L/／｀ヽ､           Live2D 看板娘
// 　　 　 /　 ／,　 /|　 ,　 ,　　　 ',
// 　　　ｲ 　/ /-‐/　ｉ　L_ ﾊ ヽ!　 i
// 　　　 ﾚ ﾍ 7ｲ｀ﾄ　 ﾚ'ｧ-ﾄ､!ハ|　 |
// 　　　　 !,/7 '0'　　 ´0iソ| 　 |
// 　　　　 |.从"　　_　　 ,,,, / |./ 　 |
// 　　　　 ﾚ'| i＞.､,,__　_,.イ / 　.i 　|   base on https://www.fghrsh.net/post/123.html
// 　　　　　 ﾚ'| | / k_７_/ﾚ'ヽ,　ﾊ.　|
// 　　　　　　 | |/i 〈|/　 i　,.ﾍ |　i　|    Thanks
// 　　　　　　.|/ /　ｉ： 　 ﾍ!　　＼　|       journey-ad / https://github.com/journey-ad/live2d_src
// 　　　 　 　 kヽ>､ﾊ 　 _,.ﾍ､ 　 /､!         xiazeyu / https://github.com/xiazeyu/live2d-widget.js
// 　　　　　　 !'〈//｀Ｔ´', ＼ ｀'7'ｰr'      Live2d Cubism SDK WebGL 2.1 Projrct & All model authors.
// 　　　　　　 ﾚ'ヽL__|___i,___,ンﾚ|ノ
// 　　　　　 　　　ﾄ-,/　|___./
// 　　　　　 　　　'ｰ'　　!_,.

import type jQuery from 'jquery';

interface Setting {
  /** 模型api url */
  modelAPI: string;

  /** 默认模型ID */
  modelID: number;
  /** 默认材质ID */
  modelTexturesID: number;

  /** 模型切换 */
  modelSwitchMode: 'rand' | 'order';
  /** 材质切换 */
  modelTexturesSwitchMode: 'rand' | 'order';

  /** 是否 显示工具栏 */
  showToolMenu: boolean;
  /** 是否 关闭看板娘 */
  canCloseLive2d: boolean;
  /** 是否 模型切换 */
  canSwitchModel: boolean;
  /** 是否 材质切换 */
  canSwitchTextures: boolean;
  /** 是否 一言切换 */
  canSwitchHitokoto: boolean;
  /** 是否 看板娘截图 */
  canTakeScreenshot: boolean;
  /** 是否 返回首页 */
  canTurnToHomePage: boolean;
  /** 是否 跳转关于页 */
  canTurnToAboutPage: boolean;

  /** 是否 支持拖拽 */
  waifuDraggable: false | 'axis-x' | 'unlimited';
}

interface SubMsgItem {
  [key: string]: string[] | SubMsgItem;
}

interface Msg {
  waifu: SubMsgItem;
  mouseover: SubMsgItem[];
  click: SubMsgItem[];
  seasons: SubMsgItem[];
}

const textRender = (tepl: string, context: any) => {
  const tokenReg = /(\\)?\{([^\{\}\\]+)(\\)?\}/g;

  return tepl.replace(tokenReg, function (word, slash1, token, slash2) {
    if (slash1 || slash2) {
      return word.replace('\\', '');
    }

    var variables = token.replace(/\s/g, '').split('.');
    var currentObject = context;
    var i, length, variable;

    for (i = 0, length = variables.length; i < length; ++i) {
      variable = variables[i];
      currentObject = currentObject[variable];
      if (currentObject === undefined || currentObject === null) return '';
    }
    return currentObject;
  });
};

/** ascii 艺术字 */
const moeMsg = `
く__,.ヘヽ.　　　　/　,ー､ 〉
　　　　　＼ ', !-─‐-i　/　/´
　　　 　 ／｀ｰ'　　　 L/／｀ヽ､
　　 　 /　 ／,　 /|　 ,　 ,　　　 ',
　　　ｲ 　/ /-‐/　ｉ　L_ ﾊ ヽ!　 i
　　　 ﾚ ﾍ 7ｲ｀ﾄ　 ﾚ'ｧ-ﾄ､!ハ|　 |
　　　　 !,/7 '0'　　 ´0iソ| 　 |
　　　　 |.从"　　_　　 ,,,, / |./ 　 |
　　　　 ﾚ'| i＞.､,,__　_,.イ / 　.i 　|
　　　　　 ﾚ'| | / k_７_/ﾚ'ヽ,　ﾊ.　|
　　　　　　 | |/i 〈|/　 i　,.ﾍ |　i　|
　　　　　　.|/ /　ｉ： 　 ﾍ!　　＼　|
　　　 　 　 kヽ>､ﾊ 　 _,.ﾍ､ 　 /､!
　　　　　　 !'〈//｀Ｔ´', ＼ ｀'7'ｰr'
　　　　　　 ﾚ'ヽL__|___i,___,ンﾚ|ノ
　　　　　 　　　ﾄ-,/　|___./
　　　　　 　　　'ｰ'　　!_,.
`;

/** 缺省配置 */
const defaultSetting: Setting = {
  modelAPI: '//live2d.fghrsh.net/api/',

  modelID: 1,
  modelTexturesID: 53,
  modelSwitchMode: 'order',
  modelTexturesSwitchMode: 'rand',

  showToolMenu: true,
  canCloseLive2d: true,
  canSwitchModel: true,
  canSwitchTextures: true,
  canSwitchHitokoto: true,
  canTakeScreenshot: true,
  canTurnToHomePage: true,
  canTurnToAboutPage: true,

  waifuDraggable: false,
};

export const initLive2d = (
  /** 交互消息配置 */
  msg: Msg,
  /** 挂载节点选择器，直接传给jq */
  mountEleSelector: string,
  /** 自定义配置 */
  userSetting?: Partial<Setting>,
) => {
  const $: typeof jQuery = (window as any).jQuery;
  const setting: Setting = Object.assign(
    {},
    defaultSetting,
    // 移除掉 undefined 的 value
    JSON.parse(JSON.stringify(userSetting || {})),
  );

  const elementStr =
    '<div class="waifu"><div class="waifu-tips"></div><canvas id="live2d" class="live2d"></canvas><div class="waifu-tool"><span class="fui-home"></span> <span class="fui-chat"></span> <span class="fui-eye"></span> <span class="fui-user"></span> <span class="fui-photo"></span> <span class="fui-info-circle"></span> <span class="fui-cross"></span></div></div>';

  let mountEles = $(mountEleSelector);
  if (!mountEles || !mountEles.length) {
    throw new Error('没有找到挂载元素');
  } else if (mountEles.length > 1) {
    console.warn('检测到多个同名元素，默认使用第一个');
  }

  const mountEle = $(mountEles[0]);
  mountEle.append(elementStr);

  /** 添加拖拽支持 */
  if (setting.waifuDraggable) {
    try {
      switch (setting.waifuDraggable) {
        case 'axis-x': {
          // @ts-expect-error
          mountEle.find('.waifu').draggable({ axis: 'x' });
          break;
        }

        case 'unlimited':
        default: {
          // 未知选项当作无限制选项

          // @ts-expect-error
          mountEle.find('.waifu').draggable({});
          break;
        }
      }
    } catch (e) {
      console.log('[Error] JQuery UI is not defined.');
    }
  }
  /** 隐藏配置指定不显示的按钮 */
  {
    if (!setting.showToolMenu) {
      mountEle.find('.waifu-tool').hide();
    }
    if (!setting.canCloseLive2d) {
      mountEle.find('.waifu-tool .fui-cross').hide();
    }
    if (!setting.canSwitchModel) {
      mountEle.find('.waifu-tool .fui-eye').hide();
    }
    if (!setting.canSwitchTextures) {
      mountEle.find('.waifu-tool .fui-user').hide();
    }
    if (!setting.canSwitchHitokoto) {
      mountEle.find('.waifu-tool .fui-chat').hide();
    }
    if (!setting.canTakeScreenshot) {
      mountEle.find('.waifu-tool .fui-photo').hide();
    }
    if (!setting.canTurnToHomePage) {
      mountEle.find('.waifu-tool .fui-home').hide();
    }
    if (!setting.canTurnToAboutPage) {
      mountEle.find('.waifu-tool .fui-info-circle').hide();
    }
  }

  /** 启动时 ModelID */
  const initModelID = localStorage.getItem('moduleID') || setting.modelID;
  /** 启动时 ModelID */
  const initModelTexturesID =
    localStorage.getItem('modelTexturesID') || setting.modelTexturesID;
};
