// API使用示例
import { upload, ws, moderation, queue } from './index.js';

/**
 * 图片上传示例
 * 可以在组件中这样使用
 */
export const imageUploadExample = {
  methods: {
    // 处理文件选择
    async handleFileSelected(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        // 显示加载状态
        this.isUploading = true;
        this.uploadMessage = '正在上传图片...';

        // 调用上传API
        const imageUrl = await upload.uploadReferenceImage(file);
        
        // 上传成功，处理返回的图片链接
        this.uploadedImageUrl = imageUrl;
        this.uploadMessage = '图片上传成功';
        
        // 可以在这里更新UI或执行其他操作
        console.log('上传的图片链接:', imageUrl);

      } catch (error) {
        // 处理上传错误
        console.error('上传失败:', error);
        this.uploadMessage = `上传失败: ${error.message}`;
      } finally {
        // 隐藏加载状态
        this.isUploading = false;
      }
    },

    // 批量上传示例
    async handleMultipleFilesSelected(event) {
      const files = event.target.files;
      if (files.length === 0) return;

      try {
        this.isUploading = true;
        this.uploadMessage = `正在上传${files.length}张图片...`;

        // 调用批量上传API
        const imageUrls = await upload.uploadMultipleImages(files);
        
        // 处理返回的图片链接数组
        this.uploadedImageUrls = imageUrls;
        this.uploadMessage = `成功上传${imageUrls.length}张图片`;
        
        console.log('上传的图片链接列表:', imageUrls);

      } catch (error) {
        console.error('批量上传失败:', error);
        this.uploadMessage = `上传失败: ${error.message}`;
      } finally {
        this.isUploading = false;
      }
    },

    // 读取图片为DataURL示例（用于预览）
    async previewImage(file) {
      try {
        const dataUrl = await upload.readImageAsDataURL(file);
        this.previewImageUrl = dataUrl;
      } catch (error) {
        console.error('预览图片失败:', error);
      }
    }
  }
};

/**
 * WebSocket使用示例
 */
export const webSocketExample = {
  data() {
    return {
      wsConnected: false,
      wsMessages: []
    };
  },

  methods: {
    // 初始化WebSocket连接
    initWebSocket() {
      // 配置事件监听器
      ws.on('open', this.handleWsOpen);
      ws.on('message', this.handleWsMessage);
      ws.on('error', this.handleWsError);
      ws.on('close', this.handleWsClose);
      ws.on('reconnectFailed', this.handleWsReconnectFailed);

      // 连接到WebSocket服务器
      // 注意：这里的URL需要替换为实际的WebSocket服务器地址
      ws.connect('ws://your-websocket-server-url', {
        maxReconnectAttempts: 5,
        reconnectDelay: 1000
      });
    },

    // 发送WebSocket消息
    sendWsMessage(message) {
      if (ws.isConnected()) {
        const success = ws.send({
          type: 'message',
          content: message,
          timestamp: new Date().toISOString()
        });
        
        if (!success) {
          console.error('发送消息失败');
        }
      } else {
        console.error('WebSocket未连接，无法发送消息');
      }
    },

    // 关闭WebSocket连接
    closeWebSocket() {
      ws.close();
      
      // 移除事件监听器
      ws.off('open', this.handleWsOpen);
      ws.off('message', this.handleWsMessage);
      ws.off('error', this.handleWsError);
      ws.off('close', this.handleWsClose);
      ws.off('reconnectFailed', this.handleWsReconnectFailed);
    },

    // WebSocket事件处理函数
    handleWsOpen(event) {
      console.log('WebSocket连接已打开');
      this.wsConnected = true;
      // 连接成功后可以发送认证信息等
    },

    handleWsMessage(data) {
      console.log('收到WebSocket消息:', data);
      this.wsMessages.push(data);
      // 处理不同类型的消息
      if (data.type === 'update') {
        this.handleWsUpdate(data);
      } else if (data.type === 'notification') {
        this.handleWsNotification(data);
      }
    },

    handleWsError(error) {
      console.error('WebSocket错误:', error);
      this.wsConnected = false;
    },

    handleWsClose(event) {
      console.log('WebSocket连接已关闭:', event.code, event.reason);
      this.wsConnected = false;
    },

    handleWsReconnectFailed() {
      console.error('WebSocket重连失败');
      this.wsConnected = false;
    },

    // 处理特定类型的消息
    handleWsUpdate(data) {
      console.log('处理更新消息:', data);
      // 根据更新内容更新UI或数据
    },

    handleWsNotification(data) {
      console.log('处理通知消息:', data);
      // 显示通知给用户
    }
  },

  // Vue组件生命周期钩子
  mounted() {
    this.initWebSocket();
  },

  beforeUnmount() {
    this.closeWebSocket();
  }
};

/**
 * 敏感词校验API使用示例
 * 在渲染点击后先校验有无敏感词
 */
export const moderationExample = {
  data() {
    return {
      renderPrompt: '',
      isCheckingSensitiveWords: false,
      isRendering: false,
      hasSensitiveWords: false,
      sensitiveWordsMessage: '',
      renderResult: null
    };
  },

  methods: {
    /**
     * 处理渲染按钮点击事件
     * 在渲染前先进行敏感词校验
     */
    async handleRenderClick() {
      // 检查输入内容是否为空
      if (!this.renderPrompt.trim()) {
        this.sensitiveWordsMessage = '请输入渲染内容';
        return;
      }

      try {
        // 开始敏感词校验
        this.isCheckingSensitiveWords = true;
        this.sensitiveWordsMessage = '正在进行敏感词校验...';
        this.hasSensitiveWords = false;

        // 调用敏感词校验API
        const result = await moderation.checkSensitiveWords({
          prompt1: this.renderPrompt
        });

        // 检查校验结果
        if (!result.success) {
          // 校验失败，可能包含敏感词
          this.hasSensitiveWords = true;
          this.sensitiveWordsMessage = result.error?.message || '内容包含敏感词，请修改';
          return;
        }

        // 校验通过，执行渲染操作
        this.sensitiveWordsMessage = '内容正常，开始渲染...';
        await this.performRender();

      } catch (error) {
        console.error('敏感词校验或渲染过程中发生错误:', error);
        this.sensitiveWordsMessage = `操作失败: ${error.message}`;
      } finally {
        this.isCheckingSensitiveWords = false;
      }
    },

    /**
     * 执行渲染操作
     * 注意：这里是示例代码，实际渲染逻辑需要根据项目需求实现
     */
    async performRender() {
      try {
        this.isRendering = true;
        
        // 模拟渲染过程
        // 实际项目中应该调用真实的渲染API
        console.log('开始渲染，渲染内容:', this.renderPrompt);
        
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模拟渲染结果
        this.renderResult = {
          success: true,
          message: '渲染成功',
          // 实际项目中应该返回真实的渲染结果数据
          data: {
            imageUrl: 'https://example.com/render-result.jpg',
            timestamp: new Date().toISOString()
          }
        };
        
        this.sensitiveWordsMessage = '渲染完成';
        
      } catch (error) {
        console.error('渲染失败:', error);
        this.sensitiveWordsMessage = `渲染失败: ${error.message}`;
      } finally {
        this.isRendering = false;
      }
    },

    /**
     * 单文本校验示例
     * @param {string} text - 待校验的文本
     */
    async checkSingleText(text) {
      try {
        const result = await moderation.moderateText(text);
        
        if (result.success) {
          console.log('单文本校验通过:', text);
          return true;
        } else {
          console.warn('单文本校验失败:', result.error.message);
          return false;
        }
      } catch (error) {
        console.error('单文本校验发生错误:', error);
        return false;
      }
    },

    /**
     * 多文本批量校验示例
     * @param {string[]} texts - 待校验的文本数组
     */
    async checkMultipleTexts(texts) {
      try {
        const results = await moderation.moderateMultipleTexts(texts);
        
        // 处理校验结果
        const allPass = results.every(result => result.success);
        
        if (allPass) {
          console.log('所有文本校验通过');
        } else {
          console.warn('部分文本校验失败');
          // 找出失败的文本
          const failedTexts = [];
          results.forEach((result, index) => {
            if (!result.success) {
              failedTexts.push({
                index,
                text: texts[index],
                error: result.error
              });
            }
          });
          console.log('失败的文本:', failedTexts);
        }
        
        return allPass;
      } catch (error) {
        console.error('多文本校验发生错误:', error);
        return false;
      }
    },

    /**
     * 重置所有状态
     */
    resetState() {
      this.renderPrompt = '';
      this.isCheckingSensitiveWords = false;
      this.isRendering = false;
      this.hasSensitiveWords = false;
      this.sensitiveWordsMessage = '';
      this.renderResult = null;
    }
  }
};

/**
 * 任务下发API使用示例
 * 用于将渲染任务下发到ComfyUI队列
 */
export const queueExample = {
  data() {
    return {
      // 任务参数
      taskParams: {
        userid: '1861679794693869568',
        InI_LoadLineImage: '',
        InI_LoadStyleRefImage: '',
        InI_CustomPositivePrompt: '办公楼,黄昏氛围,功能主义,简洁的设计,综合艺术,工艺和技术,铝合金板,玻璃,滨水景观,樱花树,最佳质量,杰作,高细节,两点透视',
        ModelId: '1904435462794121216',
        ModelTypeId: '1904435045347627008',
        makeLabel: '{"name":"铁路站房","parentId":"0","createTime":"2024-10-20 00:00:00","id":"1859863588034842624"}'
      },
      // 额外参数
      additionalParams: {
        InI_Atmosphere: 0,
        InI_LineArtStrength: 0.6,
        InI_StyleTransferIntensity: 0.5
      },
      // 状态变量
      isSubmittingTask: false,
      isCancelingTask: false,
      taskSubmitMessage: '',
      taskCancelMessage: '',
      taskResult: null,
      generatedSeed: null,
      generatedUUID: null,
      // 存储最近一次任务的ID信息（用于取消任务）
      recentTaskIds: {
        prompt_id: [],
        client_id: ''
      },
      // 任务进度相关
      isWatchingProgress: false,
      taskProgress: 0,
      progressMessages: []
    };
  },

  methods: {
    /**
     * 基础任务下发示例
     * 直接使用sendTaskToComfyuiQueue方法
     */
    async submitBasicTask() {
      try {
        // 检查必要参数
        if (!this.taskParams.InI_LoadLineImage || !this.taskParams.InI_LoadStyleRefImage) {
          this.taskSubmitMessage = '请先设置原图和参考图路径';
          return;
        }

        // 显示加载状态
        this.isSubmittingTask = true;
        this.taskSubmitMessage = '正在下发任务...';
        this.taskResult = null;

        // 调用任务下发API
        const result = await queue.sendTaskToComfyuiQueue(
          this.taskParams,
          this.additionalParams
        );

        // 保存任务ID信息（用于取消任务）
        if (result.success && result.data && result.data.client_id && result.data.prompt_id) {
          this.recentTaskIds.client_id = result.data.client_id;
          this.recentTaskIds.prompt_id = [result.data.prompt_id];
        }

        // 处理下发结果
        if (result.success) {
          this.taskSubmitMessage = '任务下发成功';
          this.taskResult = result.data;
          console.log('任务下发成功:', result.data);
        } else {
          this.taskSubmitMessage = `任务下发失败: ${result.error.message}`;
          console.error('任务下发失败:', result.error);
        }
      } catch (error) {
        console.error('提交任务过程中发生错误:', error);
        this.taskSubmitMessage = `提交任务失败: ${error.message}`;
      } finally {
        this.isSubmittingTask = false;
      }
    },

    /**
     * 完整渲染任务提交示例
     * 使用prepareAndSubmitRenderTask方法，包含参数验证
     */
    async submitFullRenderTask() {
      try {
        // 显示加载状态
        this.isSubmittingTask = true;
        this.taskSubmitMessage = '正在准备并提交渲染任务...';
        this.taskResult = null;

        // 调用完整的渲染任务提交API
        const result = await queue.prepareAndSubmitRenderTask({
          ...this.taskParams,
          ...this.additionalParams
        });

        // 保存任务ID信息（用于取消任务）
        if (result.success && result.data && result.data.client_id && result.data.prompt_id) {
          this.recentTaskIds.client_id = result.data.client_id;
          this.recentTaskIds.prompt_id = [result.data.prompt_id];
        }

        // 处理提交结果
        if (result.success) {
          this.taskSubmitMessage = '渲染任务提交成功';
          this.taskResult = result.data;
          console.log('渲染任务提交成功:', result.data);
        } else {
          this.taskSubmitMessage = `渲染任务提交失败: ${result.error.message}`;
          console.error('渲染任务提交失败:', result.error);
        }
      } catch (error) {
        console.error('渲染任务提交过程中发生错误:', error);
        this.taskSubmitMessage = `渲染任务提交失败: ${error.message}`;
      } finally {
        this.isSubmittingTask = false;
      }
    },

    /**
     * 生成随机16位数字示例
     */
    generateSeed() {
      this.generatedSeed = queue.generate16DigitNumber();
      console.log('生成的16位随机数:', this.generatedSeed);
    },

    /**
     * 生成随机UUID示例
     */
    generateId() {
      this.generatedUUID = queue.generateUUID();
      console.log('生成的随机UUID:', this.generatedUUID);
    },

    /**
     * 上传原图并设置路径
     */
    async handleLineImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        this.taskSubmitMessage = '正在上传原图...';
        // 这里应该调用实际的图片上传API
        // 示例中使用模拟路径
        // const imagePath = await upload.uploadReferenceImage(file);
        
        // 模拟上传后的路径
        this.taskParams.InI_LoadLineImage = '/jzstorage/2025-09-01_upload/' + file.name;
        this.taskSubmitMessage = '原图上传成功';
      } catch (error) {
        console.error('上传原图失败:', error);
        this.taskSubmitMessage = `上传原图失败: ${error.message}`;
      }
    },

    /**
     * 上传参考图并设置路径
     */
    async handleReferenceImageUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        this.taskSubmitMessage = '正在上传参考图...';
        // 这里应该调用实际的图片上传API
        // 示例中使用模拟路径
        // const imagePath = await upload.uploadReferenceImage(file);
        
        // 模拟上传后的路径
        this.taskParams.InI_LoadStyleRefImage = '/jzstorage/2025-09-01_upload/' + file.name;
        this.taskSubmitMessage = '参考图上传成功';
      } catch (error) {
        console.error('上传参考图失败:', error);
        this.taskSubmitMessage = `上传参考图失败: ${error.message}`;
      }
    },

    /**
     * 取消执行中的任务
     * @param {Array<string>} promptIds - 要取消的任务prompt_id列表，如果未提供则使用最近一次任务的ID
     * @param {string} clientId - 任务client_id，如果未提供则使用最近一次任务的ID
     */
    async cancelRunningTask(promptIds = null, clientId = null) {
      try {
        // 验证参数
        const targetPromptIds = promptIds || this.recentTaskIds.prompt_id;
        const targetClientId = clientId || this.recentTaskIds.client_id;
        
        if (!targetPromptIds || !targetPromptIds.length || !targetClientId) {
          this.taskCancelMessage = '缺少任务ID信息，请提供prompt_id和client_id';
          return;
        }

        // 显示加载状态
        this.isCancelingTask = true;
        this.taskCancelMessage = '正在取消执行中的任务...';

        // 调用任务取消API（类型为interrupt）
        const result = await queue.cancelTaskInComfyuiQueue({
          type: 'interrupt',
          prompt_id: targetPromptIds,
          client_id: targetClientId
        });

        // 处理取消结果
        if (result.success) {
          this.taskCancelMessage = '执行中的任务取消成功';
          console.log('执行中的任务取消成功:', result.data);
        } else {
          this.taskCancelMessage = `取消执行中任务失败: ${result.error.message}`;
          console.error('取消执行中任务失败:', result.error);
        }
      } catch (error) {
        console.error('取消任务过程中发生错误:', error);
        this.taskCancelMessage = `取消任务失败: ${error.message}`;
      } finally {
        this.isCancelingTask = false;
      }
    },

    /**
     * 取消等待中的任务
     * @param {Array<string>} promptIds - 要取消的任务prompt_id列表，如果未提供则使用最近一次任务的ID
     * @param {string} clientId - 任务client_id，如果未提供则使用最近一次任务的ID
     */
    async cancelWaitingTask(promptIds = null, clientId = null) {
      try {
        // 验证参数
        const targetPromptIds = promptIds || this.recentTaskIds.prompt_id;
        const targetClientId = clientId || this.recentTaskIds.client_id;
        
        if (!targetPromptIds || !targetPromptIds.length || !targetClientId) {
          this.taskCancelMessage = '缺少任务ID信息，请提供prompt_id和client_id';
          return;
        }

        // 显示加载状态
        this.isCancelingTask = true;
        this.taskCancelMessage = '正在取消等待中的任务...';

        // 调用任务取消API（类型为delete）
        const result = await queue.cancelTaskInComfyuiQueue({
          type: 'delete',
          prompt_id: targetPromptIds,
          client_id: targetClientId
        });

        // 处理取消结果
        if (result.success) {
          this.taskCancelMessage = '等待中的任务取消成功';
          console.log('等待中的任务取消成功:', result.data);
        } else {
          this.taskCancelMessage = `取消等待中任务失败: ${result.error.message}`;
          console.error('取消等待中任务失败:', result.error);
        }
      } catch (error) {
        console.error('取消任务过程中发生错误:', error);
        this.taskCancelMessage = `取消任务失败: ${error.message}`;
      } finally {
        this.isCancelingTask = false;
      }
    },

    /**
     * 重置所有任务相关状态
     */
    /**
     * 监听任务进度
     * @param {string} clientId - 任务的client_id，如果未提供则使用最近一次任务的ID
     */
    startWatchingTaskProgress(clientId = null) {
      const targetClientId = clientId || this.recentTaskIds.client_id;
      
      if (!targetClientId) {
        this.taskCancelMessage = '缺少client_id信息，无法监听任务进度';
        return;
      }

      // 重置进度状态
      this.taskProgress = 0;
      this.progressMessages = [];
      this.isWatchingProgress = true;

      try {
        // 使用client_id连接WebSocket
        ws.connectWithTaskId(targetClientId, {
          maxReconnectAttempts: 3,
          reconnectDelay: 1000
        });

        // 添加任务进度监听器
        this.taskProgressHandler = (progress) => {
          this.taskProgress = progress;
          this.progressMessages.push(`任务进度更新: ${progress}%`);
          console.log(`任务进度: ${progress}%`);
          
          // 进度达到100%或超过100%时，可以执行后续操作
          if (progress >= 100) {
            this.progressMessages.push('任务已完成');
            // 可以在这里关闭WebSocket连接或执行其他操作
          }
        };

        ws.onTaskProgress(this.taskProgressHandler);

        // 添加WebSocket事件监听器
        this.wsOpenHandler = () => {
          console.log('任务进度WebSocket连接已打开');
        };

        this.wsCloseHandler = (event) => {
          console.log('任务进度WebSocket连接已关闭:', event.code, event.reason);
          this.isWatchingProgress = false;
        };

        this.wsErrorHandler = (error) => {
          console.error('任务进度WebSocket错误:', error);
          this.progressMessages.push(`WebSocket错误: ${error.message}`);
        };

        ws.on('open', this.wsOpenHandler);
        ws.on('close', this.wsCloseHandler);
        ws.on('error', this.wsErrorHandler);

      } catch (error) {
        console.error('开始监听任务进度失败:', error);
        this.progressMessages.push(`监听任务进度失败: ${error.message}`);
        this.isWatchingProgress = false;
      }
    },

    /**
     * 停止监听任务进度
     */
    stopWatchingTaskProgress() {
      try {
        // 移除任务进度监听器
        if (this.taskProgressHandler) {
          ws.offTaskProgress(this.taskProgressHandler);
          this.taskProgressHandler = null;
        }

        // 移除WebSocket事件监听器
        if (this.wsOpenHandler) {
          ws.off('open', this.wsOpenHandler);
          this.wsOpenHandler = null;
        }

        if (this.wsCloseHandler) {
          ws.off('close', this.wsCloseHandler);
          this.wsCloseHandler = null;
        }

        if (this.wsErrorHandler) {
          ws.off('error', this.wsErrorHandler);
          this.wsErrorHandler = null;
        }

        // 关闭WebSocket连接
        ws.close(1000, '主动关闭任务进度监听');

        this.isWatchingProgress = false;
        this.progressMessages.push('已停止监听任务进度');

      } catch (error) {
        console.error('停止监听任务进度失败:', error);
        this.progressMessages.push(`停止监听任务进度失败: ${error.message}`);
      }
    },

    /**
     * 重置所有任务相关状态
     */
    resetTaskState() {
      this.taskResult = null;
      this.taskSubmitMessage = '';
      this.taskCancelMessage = '';
      this.taskProgress = 0;
      this.progressMessages = [];
      this.isSubmittingTask = false;
      this.isCancelingTask = false;
      this.isWatchingProgress = false;
    }
  }
};