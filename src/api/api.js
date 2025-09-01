// 基础API配置
const API_CONFIG = {
  baseUrl: 'http://jz-arch-ai-render-vue.test.crfsdi-gw.com',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
};

/**
 * 基础fetch请求封装
 * @param {string} url - 请求地址
 * @param {Object} options - fetch选项
 * @returns {Promise} - 返回请求结果
 */
const request = async (url, options = {}) => {
  // 构建完整的请求URL
  const fullUrl = url.startsWith('http') ? url : `${API_CONFIG.baseUrl}${url}`;
  
  // 合并默认选项和用户选项
  const fetchOptions = {
    ...options,
    headers: {
      ...API_CONFIG.headers,
      ...options.headers,
    },
    credentials: 'include', // 包含cookie
  };
  
  // 创建AbortController来处理超时
  const controller = new AbortController();
  const { signal } = controller;
  fetchOptions.signal = signal;
  
  // 设置超时
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
  
  try {
    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP错误! 状态码: ${response.status}`);
    }
    
    // 尝试解析JSON响应
    try {
      const data = await response.json();
      return data;
    } catch (error) {
      // 如果不是JSON格式，返回响应文本
      const text = await response.text();
      return text;
    }
  } catch (error) {
    // 处理请求错误
    if (error.name === 'AbortError') {
      throw new Error('请求超时，请稍后重试');
    }
    throw error;
  }
};

/**
 * GET请求
 * @param {string} url - 请求地址
 * @param {Object} params - URL参数
 * @param {Object} options - 其他选项
 * @returns {Promise} - 返回请求结果
 */
const get = (url, params = {}, options = {}) => {
  // 构建带参数的URL
  const queryParams = new URLSearchParams(params);
  const fullUrl = `${url}?${queryParams.toString()}`;
  
  return request(fullUrl, {
    method: 'GET',
    ...options,
  });
};

/**
 * POST请求
 * @param {string} url - 请求地址
 * @param {Object|FormData} data - 请求数据
 * @param {Object} options - 其他选项
 * @returns {Promise} - 返回请求结果
 */
const post = (url, data = {}, options = {}) => {
  // 根据数据类型设置不同的处理方式
  let body = null;
  let headers = { ...options.headers };
  
  if (data instanceof FormData) {
    // 如果是FormData，不需要设置Content-Type
    body = data;
  } else {
    // 默认是JSON格式
    body = JSON.stringify(data);
  }
  
  return request(url, {
    method: 'POST',
    body,
    headers,
    ...options,
  });
};

/**
 * PUT请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他选项
 * @returns {Promise} - 返回请求结果
 */
const put = (url, data = {}, options = {}) => {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });
};

/**
 * DELETE请求
 * @param {string} url - 请求地址
 * @param {Object} options - 其他选项
 * @returns {Promise} - 返回请求结果
 */
const del = (url, options = {}) => {
  return request(url, {
    method: 'DELETE',
    ...options,
  });
};

export default {
  request,
  get,
  post,
  put,
  delete: del,
  config: API_CONFIG,
};