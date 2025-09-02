import api from './api.js';

/**
 * 上传参考图片
 * @param {File} file - 要上传的图片文件
 * @returns {Promise<string>} - 返回上传后的图片链接
 */
export const uploadReferenceImage = async (file) => {
  try {
    // 检查文件是否存在
    if (!file) {
      throw new Error('请选择要上传的图片文件');
    }
    
    // 检查文件类型是否为图片
    if (!file.type.startsWith('image/')) {
      throw new Error('请上传有效的图片文件');
    }
    
    // 检查文件大小（可选，这里限制为10MB）
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      throw new Error('图片文件过大，请上传小于10MB的图片');
    }
    
    // 创建FormData对象
    const formData = new FormData();
    // 将文件转换为Blob对象
    formData.append('file', file);
    // 发送上传请求
    const responseData = await api.post('/AI/AIModel/uploadReferenceImage', formData);
    
    // 检查响应数据
    if (responseData && responseData.content) {
      // 确保返回的URL格式正确，避免重复的baseUrl
      const content = responseData.content;
      if (content.startsWith('http')) {
        return {
          url: String(content),
          content: content
        }
      } else {
        // 避免在URL中出现重复的斜杠
        const baseUrl = api.config.imgUrl.endsWith('/') ? api.config.imgUrl.slice(0, -1) : api.config.imgUrl;
        const path = content.startsWith('/') ? content : '/' + content;
        return {
          url: baseUrl + path,
          content: content
        }
      }
    } else {
      throw new Error('上传成功但未返回有效的图片URL')
    }
  } catch (error) {
    console.error('上传图片失败:', error);
    // 提供更友好的错误信息
    if (error.message.includes('405')) {
      throw new Error('上传图片失败：方法不允许，请检查API接口配置');
    } else if (error.message.includes('NetworkError')) {
      throw new Error('网络连接失败，请检查网络设置');
    } else if (error.message.includes('请求超时')) {
      throw new Error('上传超时，请稍后重试');
    }
    throw error;
  }
};

/**
 * 批量上传图片
 * @param {FileList|Array<File>} files - 要上传的图片文件列表
 * @returns {Promise<Array<string>>} - 返回上传后的图片链接数组
 */
export const uploadMultipleImages = async (files) => {
  try {
    // 转换为数组格式
    const fileArray = Array.from(files);
    
    // 验证文件数量
    if (fileArray.length === 0) {
      throw new Error('请选择要上传的图片文件');
    }
    
    // 并行上传所有图片
    const uploadPromises = fileArray.map(file => uploadReferenceImage(file));
    const results = await Promise.all(uploadPromises);
    
    return results;
  } catch (error) {
    console.error('批量上传图片失败:', error);
    throw error;
  }
};

/**
 * 检查文件是否为有效图片
 * @param {File} file - 要检查的文件
 * @returns {boolean} - 是否为有效图片
 */
export const isValidImageFile = (file) => {
  if (!file || !file.type) {
    return false;
  }
  return file.type.startsWith('image/');
};

/**
 * 读取图片文件并返回DataURL
 * @param {File} file - 要读取的图片文件
 * @returns {Promise<string>} - 返回DataURL
 */
export const readImageAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    if (!isValidImageFile(file)) {
      reject(new Error('无效的图片文件'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      resolve(event.target.result);
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsDataURL(file);
  });
};

export default {
  uploadReferenceImage,
  uploadMultipleImages,
  isValidImageFile,
  readImageAsDataURL,
};