// 任务下发API
import api from './api.js';

/**
 * 生成16位随机数字
 * @returns {number} - 16位随机数字
 */
export const generate16DigitNumber = () => {
  // 生成一个16位的随机数，范围在10^15到10^16-1之间
  const min = Math.pow(10, 15);
  const max = Math.pow(10, 16) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * 生成随机UUID
 * @returns {string} - 随机UUID
 */
export const generateUUID = () => {
  // 使用内置的crypto API生成随机UUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // 兼容旧浏览器的UUID生成方法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 任务下发到ComfyUI队列
 * @param {Object} taskParams - 任务参数
 * @param {string} taskParams.userid - 用户ID
 * @param {string} taskParams.InI_LoadLineImage - 原图路径
 * @param {string} taskParams.InI_LoadStyleRefImage - 参考图路径
 * @param {string} taskParams.InI_CustomPositivePrompt - 正向提示词
 * @param {string} taskParams.ModelId - 模型ID
 * @param {string} taskParams.ModelTypeId - 模型类型ID
 * @param {Object} additionalParams - 额外参数（可选）
 * @returns {Promise} - 返回任务下发结果
 */
export const sendTaskToComfyuiQueue = async (taskParams, additionalParams = {}) => {
  try {
    // 生成client_id和prompt_id
    const clientId = generateUUID();
    const promptId = generateUUID();
    
    // 构建完整的请求参数
    const requestData = {
      // 必需参数
      userid: taskParams.userid,
      InI_FirstKsamplerSeed: generate16DigitNumber(),
      InI_AdScaleSeed: generate16DigitNumber(),
      InI_Atmosphere: 0,
      InI_CustomLocation: 0,
      InI_CustomSize: 0.25,
      InI_ImageRatio: 0.5625,
      InI_Switch_LineartAndDepth: 1,
      InI_LineArtStrength: 0.6,
      InI_Switch_Text2Img_Img2Img: 0,
      InI_LockMaterialStrength: 1,
      InI_LineStyle: 1,
      InI_StyleTransferIntensity: 0.5,
      InI_RefStartTime: 0,
      InI_RefEndTime: 1,
      InI_BatchCount: 1,
      toggleCreate: "1",
      toggleStyle: false,
      toggleMateril: 1,
      makeLabel: taskParams.makeLabel || '{"name":"铁路站房","parentId":"0","createTime":"2024-10-20 00:00:00","id":"1859863588034842624"}',
      makeCol: "",
      makeInum: 0,
      makeColChild: "",
      InI_HasRefImage: 1,
      InI_LoadStyleRefImage: taskParams.InI_LoadStyleRefImage,
      InI_LoadLineImage: taskParams.InI_LoadLineImage,
      imageUploadCk: taskParams.InI_LoadStyleRefImage,
      imageUploadDt: taskParams.InI_LoadLineImage,
      InI_CustomPositivePrompt_old: "",
      InI_CustomPositivePrompt: taskParams.InI_CustomPositivePrompt,
      InI_CustomNegativePrompt: "",
      ModelId: taskParams.ModelId,
      ModelTypeId: taskParams.ModelTypeId,
      loraTypeName: "",
      loraFileName: "",
      strength_model: 0.6,
      triggers: "",
      verificationWord: "",
      messageType: "postMakeImage",
      toggleSD: false,
      toggleFlux: false,
      client_id: clientId,
      prompt_id: promptId,
      
      // 合并额外参数，覆盖默认值
      ...additionalParams
    };
    
    // 调用任务下发接口
    console.log('正在下发任务到ComfyUI队列:', requestData);
    const response = await api.post('/AI/AIModel/ComfyuiQueue', requestData);
    
    // 处理接口返回的结果
    console.log('任务下发结果:', response);
    
    // 根据状态码405处理Method Not Allowed的情况
    // 注意：在api.js中已经处理了HTTP错误，这里可以根据业务逻辑进一步处理
    // 由于API返回不包含client_id和prompt_id，我们手动添加这些字段到返回数据中
    const resultData = {
      ...response,
      client_id: clientId,
      prompt_id: promptId,
      taskId: clientId // 用client_id作为taskId
    };
    
    return {
      success: true,
      data: resultData,
      message: '任务下发成功'
    };
  } catch (error) {
    // 处理请求过程中的错误
    console.error('任务下发失败:', error);
    
    // 特殊处理405错误
    if (error.message.includes('405')) {
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: '请求方法不被允许，请检查API配置'
        }
      };
    }
    
    // 返回标准化的错误信息
    return {
      success: false,
      error: {
        code: error.code || 'QUEUE_SUBMIT_FAILED',
        message: error.message || '任务下发过程中发生错误'
      }
    };
  }
};

/**
 * 准备并提交渲染任务
 * @param {Object} renderOptions - 渲染选项
 * @returns {Promise} - 返回渲染任务提交结果
 */
export const prepareAndSubmitRenderTask = async (renderOptions) => {
  try {
    // 验证必要参数
    const requiredParams = ['userid', 'InI_LoadLineImage', 'InI_LoadStyleRefImage', 'InI_CustomPositivePrompt', 'ModelId', 'ModelTypeId'];
    
    for (const param of requiredParams) {
      if (!renderOptions[param]) {
        throw new Error(`缺少必需参数: ${param}`);
      }
    }
    
    // 调用任务下发函数
    return await sendTaskToComfyuiQueue(renderOptions);
  } catch (error) {
    console.error('准备渲染任务失败:', error);
    return {
      success: false,
      error: {
        code: 'PREPARE_TASK_FAILED',
        message: error.message
      }
    };
  }
};

/**
 * 取消任务在ComfyUI队列中
 * @param {Object} cancelParams - 取消任务参数
 * @param {string} cancelParams.type - 取消类型: 'interrupt'(取消执行中任务)或'delete'(取消等待中任务)
 * @param {Array<string>} cancelParams.prompt_id - 任务下发时的prompt_id列表
 * @param {string} cancelParams.client_id - 任务下发时的client_id
 * @returns {Promise} - 返回任务取消结果
 */
export const cancelTaskInComfyuiQueue = async (cancelParams) => {
  try {
    // 验证必要参数
    const requiredParams = ['type', 'prompt_id', 'client_id'];
    
    for (const param of requiredParams) {
      if (!cancelParams[param]) {
        throw new Error(`缺少必需参数: ${param}`);
      }
    }
    
    // 验证取消类型
    if (!['interrupt', 'delete'].includes(cancelParams.type)) {
      throw new Error('取消类型必须是"interrupt"或"delete"');
    }
    
    // 调用任务取消接口
    console.log('正在取消ComfyUI队列中的任务:', cancelParams);
    const response = await api.post('/AI/AIModel/ComfyuiExchange', cancelParams);
    
    // 处理接口返回的结果
    console.log('任务取消结果:', response);
    
    return {
      success: true,
      data: response,
      message: '任务取消成功'
    };
  } catch (error) {
    // 处理请求过程中的错误
    console.error('任务取消失败:', error);
    
    // 特殊处理405错误
    if (error.message.includes('405')) {
      return {
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: '请求方法不被允许，请检查API配置'
        }
      };
    }
    
    // 返回标准化的错误信息
    return {
      success: false,
      error: {
        code: error.code || 'QUEUE_CANCEL_FAILED',
        message: error.message || '任务取消过程中发生错误'
      }
    };
  }
};

/**
 * 查询RabbitMQ队列列表
 * @param {string} clientId - 客户端ID
 * @returns {Promise} - 返回队列查询结果
 */
export const getRabbitmqQueueList = async (clientId) => {
  try {
    // 调用队列查询接口
    console.log('正在查询RabbitMQ队列状态:', clientId);
    const response = await api.get('/AI/AIModel/GetRabbitmqQueueList', {
      client_id: clientId
    });
    
    // 处理接口返回的结果
    console.log('队列查询结果:', response);
    
    return {
      success: true,
      data: response,
      message: '队列查询成功'
    };
  } catch (error) {
    // 处理请求过程中的错误
    console.error('队列查询失败:', error);
    
    // 返回标准化的错误信息
    return {
      success: false,
      error: {
        code: error.code || 'QUEUE_LIST_FAILED',
        message: error.message || '队列查询过程中发生错误'
      }
    };
  }
};

export default {
  sendTaskToComfyuiQueue,
  prepareAndSubmitRenderTask,
  cancelTaskInComfyuiQueue,
  getRabbitmqQueueList,
  generate16DigitNumber,
  generateUUID
};