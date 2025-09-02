/**
 * WebSocket连接管理器
 */
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 初始重连延迟1秒
    this.callbacks = {};
    this.isConnecting = false;
  }

  /**
   * 连接WebSocket服务器
   * @param {string} url - WebSocket服务器地址
   * @param {Object} options - 配置选项
   */
  connect(url, options = {}) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket已经处于连接状态');
      return;
    }

    if (this.isConnecting) {
      console.warn('正在连接中，请等待...');
      return;
    }

    this.url = url;
    this.isConnecting = true;
    
    // 设置选项
    this.maxReconnectAttempts = options.maxReconnectAttempts || this.maxReconnectAttempts;
    this.reconnectDelay = options.reconnectDelay || this.reconnectDelay;

    try {
      this.socket = new WebSocket(url);
      
      // 设置事件处理器
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onerror = this.handleError.bind(this);
      this.socket.onclose = this.handleClose.bind(this);

    } catch (error) {
      console.error('WebSocket连接失败:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  /**
   * 使用任务的client_id连接WebSocket
   * @param {string} clientId - 任务下发时的client_id
   * @param {Object} options - 配置选项
   */
  connectWithTaskId(clientId, options = {}) {
    if (!clientId) {
      console.error('client_id不能为空');
      this.emit('error', new Error('client_id不能为空'));
      return;
    }
    
    const baseUrl = 'ws://jz-arch-ai-render-vue.test.crfsdi-gw.com/wsRedis';
    const url = `${baseUrl}?key=${clientId}`;
    
    console.log(`使用client_id ${clientId} 连接WebSocket服务器: ${url}`);
    this.connect(url, options);
  }

  /**
   * 发送消息
   * @param {*} data - 要发送的数据
   */
  send(data) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接，无法发送消息');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error('发送WebSocket消息失败:', error);
      return false;
    }
  }

  /**
   * 关闭连接
   * @param {number} code - 关闭代码
   * @param {string} reason - 关闭原因
   */
  close(code = 1000, reason = '正常关闭') {
    if (this.socket) {
      this.socket.close(code, reason);
      this.socket = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * 重连机制
   */
  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('达到最大重连次数，停止重连');
      this.emit('reconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const currentDelay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`尝试第 ${this.reconnectAttempts} 次重连，延迟 ${currentDelay}ms`);
    
    setTimeout(() => {
      this.connect(this.url);
    }, currentDelay);
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 要移除的回调函数
   */
  off(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件处理错误 [${event}]:`, error);
        }
      });
    }
  }

  /**
   * 处理连接打开事件
   * @param {Event} event - 事件对象
   */
  handleOpen(event) {
    console.log('WebSocket连接已打开');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.emit('open', event);
  }

  /**
   * 处理消息接收事件
   * @param {MessageEvent} event - 消息事件
   */
  handleMessage(event) {
    try {
      // 尝试解析JSON格式的消息
      let data = JSON.parse(event.data);
      this.emit('message', data);
      
      // 如果消息包含type字段，也触发对应的事件
      if (data.type) {
        this.emit(data.type, data);
      }
      console.log('收到消息:', data);
      // 处理任务进度消息 - 更灵活的处理方式
      // 1. 处理标准格式: { type: 'taskProgress', progress: 数字 }
      if (data.type === 'taskProgress' && typeof data.progress === 'number') {
        this.emit('taskProgress', data.progress);
        // 如果包含图片结果，也传递给回调
        if (data.resultImage || data.imageUrl) {
          this.emit('taskProgress', { 
            progress: data.progress, 
            resultImage: data.resultImage, 
            imageUrl: data.imageUrl 
          });
        }
      }
      // 2. 处理原有的字符串格式: { type: 'str', value: 数字 }
      else if (data.type === 'str' && typeof data.value === 'number') {
        this.emit('taskProgress', data.value);
      }
      // 3. 处理可能的其他格式，直接检查是否有progress字段
      else if (typeof data.progress === 'number') {
        this.emit('taskProgress', data.progress);
        // 如果包含图片结果，也传递给回调
        if (data.resultImage || data.imageUrl) {
          this.emit('taskProgress', { 
            progress: data.progress, 
            resultImage: data.resultImage, 
            imageUrl: data.imageUrl 
          });
        }
      }
      // 4. 检查是否包含渲染结果图片
      else if (data.resultImage || data.imageUrl) {
        // 即使没有明确的进度，也触发完成事件
        const progressData = {
          progress: 100, // 默认为完成状态
          resultImage: data.resultImage,
          imageUrl: data.imageUrl
        };
        this.emit('taskProgress', progressData);
      }
      // 5. 处理数组格式的消息，例如: [{type: 'output', value: '图片路径'}]
      else if (Array.isArray(data) && data.length > 0) {
        // 检查数组中是否包含output类型的消息
        const outputMessages = data.filter(item => item.type === 'output' && item.value);
        if (outputMessages.length > 0) {
          // 提取图片路径
          const imagePaths = outputMessages.map(item => item.value);
          // 假设第一个图片是主要输出结果
          const firstImagePath = imagePaths[0];
          
          // 构建完整的图片URL（根据用户描述，需要拼接ImgUrl）
          // 注意：这里可能需要根据实际情况调整URL的拼接逻辑
          const completeImageUrl = firstImagePath; // 暂时直接使用返回的路径，后续可能需要拼接
          
          // 触发任务完成事件，并包含图片结果
          const progressData = {
            progress: 100, // 默认为完成状态
            resultImage: completeImageUrl,
            imageUrl: completeImageUrl,
            allImages: imagePaths // 保存所有图片路径
          };
          this.emit('taskProgress', progressData);
          // 同时触发一个专门的生成图片事件，便于App.vue处理
          this.emit('generatedImages', { images: imagePaths, mainImage: completeImageUrl });
        }
      }
    } catch (error) {
      // 如果不是JSON格式，尝试其他可能的格式解析
      console.warn('无法解析JSON消息:', error.message);
      
      // 检查是否是纯数字字符串
      const numericValue = parseFloat(event.data);
      if (!isNaN(numericValue)) {
        // 如果是纯数字，视为进度值
        this.emit('taskProgress', numericValue);
      } else {
        // 否则直接传递原始数据
        this.emit('message', event.data);
      }
    }
  }

  /**
   * 监听任务进度
   * @param {Function} callback - 进度回调函数，接收一个0-100的进度值
   */
  onTaskProgress(callback) {
    if (typeof callback !== 'function') {
      console.error('回调必须是一个函数');
      return;
    }
    
    this.on('taskProgress', callback);
  }

  /**
   * 移除任务进度监听器
   * @param {Function} callback - 要移除的回调函数
   */
  offTaskProgress(callback) {
    if (typeof callback !== 'function') {
      console.error('回调必须是一个函数');
      return;
    }
    
    this.off('taskProgress', callback);
  }

  /**
   * 处理错误事件
   * @param {Event} error - 错误事件
   */
  handleError(error) {
    console.error('WebSocket错误:', error);
    this.emit('error', error);
  }

  /**
   * 处理连接关闭事件
   * @param {CloseEvent} event - 关闭事件
   */
  handleClose(event) {
    console.log('WebSocket连接已关闭:', event.code, event.reason);
    this.isConnecting = false;
    this.emit('close', event);

    // 如果不是正常关闭（代码不是1000），则尝试重连
    if (event.code !== 1000) {
      this.reconnect();
    }
  }

  /**
   * 获取连接状态
   * @returns {number} - WebSocket连接状态
   */
  get readyState() {
    return this.socket ? this.socket.readyState : WebSocket.CLOSED;
  }

  /**
   * 检查连接是否打开
   * @returns {boolean} - 连接是否打开
   */
  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// 创建WebSocket管理器的单例实例
const wsManager = new WebSocketManager();

export default wsManager;

export { WebSocketManager };