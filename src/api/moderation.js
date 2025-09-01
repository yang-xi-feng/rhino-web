// 敏感词校验API
import api from './api.js';

/**
 * 敏感词校验接口
 * @param {Object} params - 校验参数
 * @param {string} params.prompt1 - 第一个待校验的文本内容
 * @param {string} params.prompt2 - 第二个待校验的文本内容
 * @param {string} params.prompt3 - 第三个待校验的文本内容
 * @returns {Promise} - 返回校验结果
 */
export const checkSensitiveWords = async (params = {}) => {
  try {
    const { prompt1 = '', prompt2 = '', prompt3 = '' } = params;
    
    // 调用敏感词校验接口
    const response = await api.get('/AI/AIModel/BigModelCheckPrompt', {
      prompt1,
      prompt2,
      prompt3
    });
    
    // 处理接口返回的结果
    if (response && response.error) {
      // 接口返回错误信息
      throw new Error(response.error.message || '敏感词校验失败，请检查输入内容');
    }
    
    // 返回成功结果
    return {
      success: true,
      data: response,
      message: '敏感词校验通过'
    };
  } catch (error) {
    // 处理请求过程中的错误
    console.error('敏感词校验失败:', error);
    
    // 返回标准化的错误信息
    return {
      success: false,
      error: {
        code: error.code || 'MODERATION_FAILED',
        message: error.message || '敏感词校验过程中发生错误'
      }
    };
  }
};

/**
 * 文本内容安全校验
 * @param {string} text - 待校验的文本
 * @returns {Promise} - 返回校验结果
 */
export const moderateText = async (text) => {
  // 复用checkSensitiveWords函数，只使用prompt1参数
  return checkSensitiveWords({
    prompt1: text
  });
};

/**
 * 批量文本校验
 * @param {string[]} texts - 待校验的文本数组
 * @returns {Promise} - 返回校验结果数组
 */
export const moderateMultipleTexts = async (texts) => {
  if (!Array.isArray(texts)) {
    throw new Error('参数必须是文本数组');
  }
  
  // 批量校验，最多支持3个文本同时校验
  // 如果文本数量超过3个，分批处理
  const batchSize = 3;
  const results = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchParams = {};
    
    // 填充参数
    batch.forEach((text, index) => {
      batchParams[`prompt${index + 1}`] = text;
    });
    
    const batchResult = await checkSensitiveWords(batchParams);
    results.push(batchResult);
  }
  
  return results;
};

export default {
  checkSensitiveWords,
  moderateText,
  moderateMultipleTexts
};