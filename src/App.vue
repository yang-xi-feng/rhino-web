<script setup>
import RhinoViewport from './components/RhinoViewport.vue'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { queue, ws } from './api'
import { uploadReferenceImage } from './api/upload.js'
import api from './api/api.js';

// ArcIns ImageToolkit API客户端类
class ArcInsImageToolkitAPI {
  constructor(baseUrl = 'http://192.10.222.123:8001/api/v1/external') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async makeRequest(method, endpoint, params = null) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params && method === 'GET') {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          url.searchParams.append(key, params[key]);
        }
      });
    }

    const options = {
      method,
      headers: this.defaultHeaders
    };

    try {
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.detail || `HTTP ${response.status}: ${response.statusText}`;
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`请求失败: ${error.message}`);
      throw error;
    }
  }

  async getImage(imageId) {
    return await this.makeRequest('GET', `/images/${imageId}`);
  }
}


// 项目数据
const projects = ref([
  { id: 1, name: '建筑项目1', thumbnail: 'https://picsum.photos/120/80?random=1' },
  { id: 2, name: '建筑项目2', thumbnail: 'https://picsum.photos/120/80?random=2' },
  { id: 3, name: '建筑项目3', thumbnail: 'https://picsum.photos/120/80?random=3' },
  { id: 4, name: '建筑项目4', thumbnail: 'https://picsum.photos/120/80?random=4' }
])

const selectedProject = ref(null)
const renderSettings = ref({
  quality: 0.5,
  renderMode: '室内设计',
  lighting: '自然光',
  resolution: '1920x1080'
})

// 截图相关数据
const viewportScreenshot = ref('')
const isLoading = ref(false)
const showScreenshot = ref(false)

// 生成的图片相关数据
const generatedImage = ref('')
const showGeneratedImageWindow = ref(false)

// 图片对比相关数据
const sliderPosition = ref(50) // 分割线位置，百分比
const isDragging = ref(false)
const comparisonContainer = ref(null)

// 添加创意描述相关数据
const showCreativeDescription = ref(false)
const selectedCategoryName = ref('')

// 图片选择器弹框相关数据
const showImageSelector = ref(false)

// 各个区域的展开状态
const expandedSections = ref({
  positiveDescription: false,
  negativeDescription: false,
  referenceImages: false,
  designStyle: false,
  aspectRatio: false,
  atmosphere: false,
  environment: false
})

// 创意描述内容
const creativeDescriptions = ref({
  '室内设计': {
    positiveDescription: '',
    negativeDescription: '',
    referenceImages: [],
    designStyle: '现代简约',
    aspectRatio: '16:9',
    atmosphere: '温馨舒适',
    environment: '客厅'
  }
})

// 创建ArcIns ImageToolkit API实例
const imageToolkitAPI = new ArcInsImageToolkitAPI()

// 上传的图片信息
const uploadedImage = ref(null)

// 处理图片上传事件
const handleImageUpload = (imageInfo) => {
  uploadedImage.value = imageInfo
  console.log('收到上传的图片信息:', imageInfo)
  
  // 将上传的图片设置到模型原图区域并显示
  viewportScreenshot.value = imageInfo.src
  showScreenshot.value = true
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 设计类别相关数据
const showDesignCategories = ref(false) // 默认隐藏，点击室内设计时才显示下拉菜单
const designCategories = ref([
  // 第一行
  { id: 1, name: '建筑设计', image: 'https://picsum.photos/120/80?random=101' },
  { id: 2, name: '室内设计', image: 'https://picsum.photos/120/80?random=102' },
  { id: 3, name: '景观设计', image: 'https://picsum.photos/120/80?random=103' },
  { id: 4, name: '城市导航', image: 'https://picsum.photos/120/80?random=104' },
  // 第二行
  { id: 5, name: '商业建筑', image: 'https://picsum.photos/120/80?random=105' },
  { id: 6, name: '中式古建', image: 'https://picsum.photos/120/80?random=106' },
  { id: 7, name: '大师风格', image: 'https://picsum.photos/120/80?random=107' },
  { id: 8, name: '科幻创意', image: 'https://picsum.photos/120/80?random=108' },
  // 第三行
  { id: 9, name: '彩色总平', image: 'https://picsum.photos/120/80?random=109' },
  { id: 10, name: '建筑平面', image: 'https://picsum.photos/120/80?random=110' },
  { id: 11, name: '手工模型', image: 'https://picsum.photos/120/80?random=111' },
  { id: 12, name: '手绘插画', image: 'https://picsum.photos/120/80?random=112' },
  // 第四行
  { id: 13, name: '高铁车站', image: 'https://picsum.photos/120/80?random=113' },
  { id: 14, name: '城轨车站', image: 'https://picsum.photos/120/80?random=114' },
  { id: 15, name: '', image: 'https://picsum.photos/120/80?random=115' },
  { id: 16, name: '', image: 'https://picsum.photos/120/80?random=116' }
])

// 任务相关状态
const isTaskRunning = ref(false)
const isCancelingTask = ref(false)
const taskProgress = ref(0)
const taskMessages = ref([])
const showTaskLogs = ref(false)
const currentTaskId = ref('')
const currentClientId = ref('')
const taskCancelMessage = ref('')
const progressCallbackRef = ref(null)
// 渲染结果图片
const renderedImage = ref('')

const selectProject = (project) => {
  selectedProject.value = project
}

// 获取视口截图功能
const captureViewport = async () => {
  isLoading.value = true
  
  try {
    // 检查Rhino插件是否已加载
    console.log('检查Rhino API状态:', {
      hasWindow: !!window.rhino,
      hasFunction: window.rhino && typeof window.rhino.CaptureCurrentViewport === 'function',
      rhinoKeys: window.rhino ? Object.getOwnPropertyNames(window.rhino) : 'undefined'
    })
    
    if (!window.rhino || typeof window.rhino.CaptureCurrentViewport !== 'function') {
      // 开发环境模拟截图
      console.log('Rhino API未找到，使用模拟截图')
      await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟延迟
      viewportScreenshot.value = 'https://picsum.photos/800/600?random=screenshot'
    } else {
      // 实际调用Rhino API
      const screenshotData = await window.rhino.CaptureCurrentViewport()
      
      if (screenshotData && screenshotData.length > 0) {
        viewportScreenshot.value = screenshotData
        console.log('Rhino视口截图已获取')
      } else {
        throw new Error('未能获取Rhino视口截图')
      }
    }
    
    showScreenshot.value = true
  } catch (error) {
    console.error('获取Rhino视口截图失败:', error)
    alert('获取Rhino视口截图失败，请检查Rhino插件是否正确安装')
  } finally {
    isLoading.value = false
  }
}

// 关闭截图显示
const closeScreenshot = () => {
  showScreenshot.value = false
}

// 关闭图片对比显示
const closeImageComparison = () => {
  showScreenshot.value = false
  showGeneratedImageWindow.value = false
  sliderPosition.value = 50 // 重置分割线位置
}

// 保存渲染图片
const saveRenderedImage = () => {
  if (generatedImage.value) {
    const link = document.createElement('a')
    link.href = generatedImage.value
    link.download = `rendered_image_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

// 开始拖动分割线
const startDragging = (event) => {
  event.preventDefault()
  isDragging.value = true
  
  const updateSliderPosition = (percentage) => {
    sliderPosition.value = percentage
    // 更新CSS变量以实现图片裁剪效果
    if (comparisonContainer.value) {
      comparisonContainer.value.style.setProperty('--slider-position', percentage + '%')
    }
  }
  
  const handleMouseMove = (e) => {
    if (!isDragging.value || !comparisonContainer.value) return
    
    const rect = comparisonContainer.value.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    updateSliderPosition(percentage)
  }
  
  const handleTouchMove = (e) => {
    if (!isDragging.value || !comparisonContainer.value) return
    
    const rect = comparisonContainer.value.getBoundingClientRect()
    const x = e.touches[0].clientX - rect.left
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100))
    updateSliderPosition(percentage)
  }
  
  const stopDragging = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopDragging)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', stopDragging)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopDragging)
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', stopDragging)
}

// 处理渲染模式点击
const handleRenderModeChange = () => {
  showDesignCategories.value = !showDesignCategories.value
}

// 选择设计类别
const selectDesignCategory = (category) => {
  selectedCategoryName.value = category.name
  showDesignCategories.value = false
  showCreativeDescription.value = true
  
  // 确保选中类别的数据存在
  if (!creativeDescriptions.value[category.name]) {
    creativeDescriptions.value[category.name] = {
      positiveDescription: '',
      negativeDescription: '',
      referenceImages: [],
      designStyle: '现代简约',
      aspectRatio: '16:9',
      atmosphere: '温馨舒适',
      environment: '客厅'
    }
  }
  
  // 重置所有展开状态
  expandedSections.value.positiveDescription = false
  expandedSections.value.negativeDescription = false
  expandedSections.value.referenceImages = false
  expandedSections.value.designStyle = false
  expandedSections.value.aspectRatio = false
  expandedSections.value.atmosphere = false
  expandedSections.value.environment = false
}

// 切换区域展开状态
const toggleSection = (sectionName) => {
  expandedSections.value[sectionName] = !expandedSections.value[sectionName]
}

// 关闭创意描述
const closeCreativeDescription = () => {
  showCreativeDescription.value = false
  selectedCategoryName.value = ''
  // 重置所有展开状态
  expandedSections.value.positiveDescription = false
  expandedSections.value.negativeDescription = false
  expandedSections.value.referenceImages = false
  expandedSections.value.designStyle = false
  expandedSections.value.aspectRatio = false
  expandedSections.value.atmosphere = false
  expandedSections.value.environment = false
}

// 关闭设计类别页面
const closeDesignCategories = () => {
  showDesignCategories.value = false
}

// 关闭任务日志
const closeTaskLogs = () => {
  showTaskLogs.value = false
}

// 打开图片选择器
const openImageSelector = () => {
  showImageSelector.value = true
}

// 关闭图片选择器
const closeImageSelector = () => {
  showImageSelector.value = false
}

// 删除参考图片
const removeReferenceImage = (index) => {
  if (selectedCategoryName.value && creativeDescriptions.value[selectedCategoryName.value]) {
    creativeDescriptions.value[selectedCategoryName.value].referenceImages.splice(index, 1)
  }
}

// 上传状态跟踪
const isWaitingForImageUpload = ref(false)
const imgUrl = ref('')
let uploadTimeoutId = null

// 全局消息处理函数
const handleGlobalMessage = async (event) => {
  // 只处理图片上传相关的消息
  if (!event.data || !event.data.imageId) {
    return
  }
  const imageId = '101'
  // const imageId = event.data.imageId
  console.log('获取到图片ID:', imageId)
  
  // 清除超时定时器
  if (uploadTimeoutId) {
    clearTimeout(uploadTimeoutId)
    uploadTimeoutId = null
  }
  
  // 重置等待状态
  isWaitingForImageUpload.value = false
  
  try {
    // 使用API获取图片数据
    const imageData = await imageToolkitAPI.getImage(imageId)
    console.log('获取到图片数据:', imageData)
    if (imageData && imageData.minio_url) {
      // 将图片URL转换为File对象并上传
      const response = await fetch(imageData.minio_url)
      const blob = await response.blob()
      const file = new File([blob], imageData.filename || 'reference-image.jpg', { type: blob.type })
      
      // 上传图片
      const uploadResult = await uploadReferenceImage(file)
      console.log('图片上传成功:', uploadResult)
      
      // 将上传的图片添加到参考图片列表
      if (selectedCategoryName.value && creativeDescriptions.value[selectedCategoryName.value]) {
        creativeDescriptions.value[selectedCategoryName.value].referenceImages.push({
          id: Date.now(),
          url: uploadResult.url,
          name: file.name
        })
      }
      
      if (uploadResult.content) {
        imgUrl.value = uploadResult.url
      }
      // 关闭图片选择器
      closeImageSelector()
      alert('图片上传成功！')
    } else {
      throw new Error('无法获取图片数据')
    }
  } catch (error) {
    console.error('处理图片失败:', error)
    alert(`处理图片失败: ${error.message}`)
  }
}

// 处理上传
const handleUpload = async () => {
  try {
    // 检查是否已经在等待上传
    if (isWaitingForImageUpload.value) {
      console.log('已有上传操作在进行中')
      return
    }
    
    // 从iframe获取选中的图片ID
    const iframe = document.querySelector('.embedded-webpage')
    if (!iframe || !iframe.contentWindow) {
      throw new Error('无法访问iframe内容')
    }
    
    // 设置等待状态
    isWaitingForImageUpload.value = true
    
    // 通过postMessage与iframe通信获取选中的图片ID
    iframe.contentWindow.postMessage({ action: 'getSelectedImageId' }, '*')
    
    // 设置超时，如果5秒内没有收到响应则取消
    uploadTimeoutId = setTimeout(() => {
      isWaitingForImageUpload.value = false
      uploadTimeoutId = null
      console.log('上传操作超时')
      alert('上传操作超时，请重试')
    }, 5000)
    
  } catch (error) {
    isWaitingForImageUpload.value = false
    if (uploadTimeoutId) {
      clearTimeout(uploadTimeoutId)
      uploadTimeoutId = null
    }
    console.error('上传操作失败:', error)
    alert(`上传操作失败: ${error.message}`)
  }
}

// 点击外部区域关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.design-categories-dropdown')
  const container = document.querySelector('.render-mode-container')
  if (dropdown && container && !container.contains(event.target)) {
    showDesignCategories.value = false
  }
}

// 处理任务进度更新
const handleTaskProgress = (progressOrData) => {
  let progress = 0
  let resultImage = ''
  
  // 处理不同格式的进度数据
  if (typeof progressOrData === 'object') {
    // 如果是对象，从中提取进度和图片结果
    progress = progressOrData.progress || progressOrData.value || 0
    
    // 检查是否有渲染结果图片
    if (progressOrData.resultImage || progressOrData.imageUrl) {
      resultImage = progressOrData.resultImage || progressOrData.imageUrl
    }
  } else {
    // 如果是数字，直接使用
    progress = progressOrData
  }
  
  taskProgress.value = progress
  taskMessages.value.push(`任务进度: ${progress}%`)
  
  // 有新消息时自动显示任务日志
  // showTaskLogs.value = true
  
  // 任务完成时的处理
  if (progress >= 100) {
    setTimeout(() => {
      isTaskRunning.value = false
      taskMessages.value.push('任务已完成！')
      
      // 保存渲染结果图片
      if (resultImage) {
        renderedImage.value = api.config.imgUrl +  resultImage
        // 同时设置生成图片变量
        generatedImage.value = api.config.imgUrl +  resultImage
        // 自动显示生成图片窗口
        showGeneratedImageWindow.value = true
        
        // 保持模型原图显示，实现对比功能
        // showScreenshot.value = false // 注释掉这行，保持原图显示
        
        taskMessages.value.push('渲染结果图片已获取')
        console.log('渲染结果图片:', api.config.imgUrl +  resultImage)
      }
    }, 1000)
  }
}

// 开始任务进度监听
const startTaskProgressMonitoring = (clientId) => {
  try {
    currentClientId.value = clientId
    ws.connectWithTaskId(clientId)
    
    // 创建并保存回调函数引用
    progressCallbackRef.value = (progress) => {
      handleTaskProgress(progress)
    }
    
    ws.onTaskProgress(progressCallbackRef.value)
    taskMessages.value.push('开始监听任务进度...')
    // showTaskLogs.value = true
  } catch (error) {
    console.error('启动任务进度监听失败:', error)
    taskMessages.value.push(`进度监听失败: ${error.message}`)
    // showTaskLogs.value = true
  }
}

// 轮询队列状态
let queuePollingInterval = null

const startQueuePolling = (clientId) => {
  // 清除之前可能存在的轮询
  if (queuePollingInterval) {
    clearInterval(queuePollingInterval)
  }
  
  // 立即执行一次查询
  checkQueueStatus(clientId)
  
  // 设置轮询，每2秒查询一次
  queuePollingInterval = setInterval(() => {
    checkQueueStatus(clientId)
  }, 2000)
}

// 检查队列状态
const checkQueueStatus = async (clientId) => {
  try {
    const queueResult = await getRabbitmqQueueList(clientId)
    
    if (queueResult && queueResult.success && queueResult.data) {
      const content = queueResult.data.content || 0
      
      console.log('队列查询结果:', queueResult.data)
      
      // 判断是否有排队任务
      if (content > 0) {
        // 有排队任务，继续轮询
        taskMessages.value.push(`队列中还有 ${content} 个任务等待处理...`)
      } else {
        // 没有排队任务，停止轮询并开始监听任务进度
        if (queuePollingInterval) {
          clearInterval(queuePollingInterval)
          queuePollingInterval = null
          taskMessages.value.push('当前无排队任务，开始监听任务进度')
          startTaskProgressMonitoring(clientId)
        }
      }
    } else {
      // 查询失败，记录错误但继续尝试
      console.error('队列查询失败:', queueResult?.error?.message || '未知错误')
      taskMessages.value.push(`队列查询失败: ${queueResult?.error?.message || '未知错误'}`)
    }
  } catch (error) {
    // 处理异常，继续轮询
    console.error('队列查询异常:', error)
    taskMessages.value.push(`队列查询异常: ${error.message}`)
  }
}

// 停止任务进度监听
const stopTaskProgressMonitoring = () => {
  try {
    // 确保回调函数存在才调用offTaskProgress
    if (progressCallbackRef.value && typeof progressCallbackRef.value === 'function') {
      ws.offTaskProgress(progressCallbackRef.value)
      progressCallbackRef.value = null
    }
    ws.close()
    currentClientId.value = ''
    taskMessages.value.push('已停止任务进度监听')
  } catch (error) {
    console.error('停止任务进度监听失败:', error)
  }
}

// 导入敏感词校验接口
import { checkSensitiveWords } from './api/moderation.js';
// 导入队列查询接口
import { getRabbitmqQueueList } from './api/queue.js';

// 提交渲染任务
const submitRenderTask = async () => {
  if (!viewportScreenshot.value) {
    alert('请先获取模型原图')
    return
  }
  
  // 检查是否选择了设计类别
  if (!selectedCategoryName.value || selectedCategoryName.value === '') {
    // 如果没有选择类别，使用默认的"室内设计"
    selectedCategoryName.value = '室内设计'
    // 确保该类别有对应的描述数据
    if (!creativeDescriptions.value[selectedCategoryName.value]) {
      creativeDescriptions.value[selectedCategoryName.value] = {
        positiveDescription: '',
        negativeDescription: '',
        referenceImages: [],
        designStyle: '现代简约',
        aspectRatio: '16:9',
        atmosphere: '温馨舒适',
        environment: '客厅'
      }
    }
    
    // 显示创意描述面板
    showCreativeDescription.value = true
    taskMessages.value.push('已使用默认的"室内设计"类别')
  }
  
  isTaskRunning.value = true
  isCancelingTask.value = false
  taskProgress.value = 0
  taskMessages.value = []
  
  try {
    // 准备任务参数
    const categoryData = creativeDescriptions.value[selectedCategoryName.value]
    
    // 确保categoryData存在
    if (!categoryData) {
      throw new Error('无法获取设计类别数据')
    }
    
    // 1. 将模型原图（链接或base64）转换为文件对象
    taskMessages.value.push('正在准备模型原图...')
    
    // 辅助函数：将图片链接或base64转换为File对象
    const convertImageToFile = async (imageData) => {
      try {
        if (!imageData) {
          throw new Error('没有图片数据')
        }
        
        // 检查是否为base64格式
        if (imageData.startsWith('data:image')) {
          taskMessages.value.push('检测到base64格式图片，正在转换...')
          // base64转Blob
          const parts = imageData.split(',');
          if (parts.length < 2) {
            throw new Error('无效的base64格式');
          }
          
          const byteString = atob(parts[1]);
          if (byteString.length === 0) {
            throw new Error('base64数据为空');
          }
          
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          // 从base64头部提取原始MIME类型
          const mimeString = parts[0].split(':')[1].split(';')[0];
          const blob = new Blob([ab], { type: mimeString });
          return new File([blob], 'model_original.png', { type: mimeString });
        }
        // 检查是否为URL格式
        else if (imageData.startsWith('http') || imageData.startsWith('blob')) {
          taskMessages.value.push('检测到图片URL，正在转换...')
          // 使用fetch下载图片
          const imgUrl = imageData.replace('https://fastly.picsum.photos', api.config.baseUrl + '/img')
          const response = await fetch(imgUrl);
          
          // 检查HTTP响应状态
          if (!response.ok) {
            throw new Error(`下载图片失败: HTTP ${response.status}`);
          }
          
          const blob = await response.blob();
          // 使用原始blob的MIME类型
          return new File([blob], 'model_original.png', { type: blob.type });
        } else {
          throw new Error('未知的图片格式');
        }
      } catch (error) {
        console.error('转换图片失败:', error);
        throw error;
      }
    }
    
    let uploadedImageUrl = ''
    let imageContent = ''
    try {
      // 检查图片URL是否已经是来自imgUrl域名的URL
      console.log('viewportScreenshot', viewportScreenshot.value)
      const imgUrl = api.config.imgUrl
      
      // 如果是imgUrl域名下的URL，直接使用，不需要上传
      if (viewportScreenshot.value && typeof viewportScreenshot.value === 'string') {
        if (viewportScreenshot.value.startsWith(imgUrl)) {
          taskMessages.value.push('检测到imgUrl域名下的图片，直接使用')
          uploadedImageUrl = viewportScreenshot.value
          // 提取content部分（去掉域名）
          imageContent = uploadedImageUrl.replace(imgUrl, '')
        } else if (viewportScreenshot.value.startsWith('http') && !viewportScreenshot.value.startsWith(imgUrl)) {
          // 如果是其他域名的URL，需要上传
          taskMessages.value.push('检测到其他域名的图片，准备上传...')
          const imageFile = await convertImageToFile(viewportScreenshot.value)
          console.log('imageFile', imageFile)
          
          taskMessages.value.push('正在上传图片...')
          const uploadResult = await uploadReferenceImage(imageFile)
          console.log('uploadResult', uploadResult)
          
          // 使用上传后的URL和content
          uploadedImageUrl = uploadResult.url
          imageContent = uploadResult.content
        } else {
          // 如果是base64或其他格式，需要上传
          taskMessages.value.push('检测到非URL图片，准备上传...')
          const imageFile = await convertImageToFile(viewportScreenshot.value)
          console.log('imageFile', imageFile)
          
          taskMessages.value.push('正在上传图片...')
          const uploadResult = await uploadReferenceImage(imageFile)
          console.log('uploadResult', uploadResult)
          
          // 使用上传后的URL和content
          uploadedImageUrl = uploadResult.url
          imageContent = uploadResult.content
        }
      } else {
        throw new Error('无效的图片数据')
      }
    } catch (uploadError) {
      console.error('图片处理失败:', uploadError)
      taskMessages.value.push(`图片处理失败，使用模拟地址: ${uploadError.message}`)
      // 使用模拟地址继续流程
      uploadedImageUrl = viewportScreenshot.value
      imageContent = ''
    }
    
    // 构建任务参数
    const taskParams = {
      // 必需参数
      userid: 'default_user',
      InI_LoadLineImage: imageContent || uploadedImageUrl, // 优先使用content部分
      InI_LoadStyleRefImage: imgUrl.value, // 优先使用content部分
      InI_CustomPositivePrompt: categoryData.positiveDescription || 'modern interior design, high quality, detailed',
      ModelId: '1904435462794121216',
      ModelTypeId: '1904435045347627008',
      
      // 额外参数
      InI_ImageRatio: categoryData.aspectRatio === '16:9' ? 0.5625 : 1,
      makeLabel: JSON.stringify({
        name: categoryData.environment || 'living room',
        parentId: '0',
        createTime: new Date().toISOString(),
        id: Math.random().toString(36).substr(2, 9)
      })
    }
    
    // 执行敏感词校验
    taskMessages.value.push('正在进行敏感词校验...')
    
    try {
      // 使用正向描述内容作为prompt3参数进行敏感词校验
      const moderationResult = await checkSensitiveWords({
        prompt3: categoryData.positiveDescription
      });
      
      // 检查校验结果
      if (moderationResult && moderationResult.data && 
          moderationResult.data.choices && 
          moderationResult.data.choices[0] && 
          moderationResult.data.choices[0].message && 
          moderationResult.data.choices[0].message.content === '0') {
        // 存在敏感词，终止任务并提示
        taskMessages.value.push('检测到敏感词，任务提交失败')
        alert('检测到敏感词，请修改正向描述内容后重试')
        isTaskRunning.value = false
        return
      } else {
        taskMessages.value.push('敏感词校验通过')
      }
    } catch (moderationError) {
      console.error('敏感词校验出错:', moderationError)
      taskMessages.value.push(`敏感词校验失败: ${moderationError.message}`)
      alert('敏感词校验失败，请稍后重试')
      isTaskRunning.value = false
      return
    }
    
    // 真实任务下发流程
    taskMessages.value.push('正在提交渲染任务...')
    
    // 调用真实的任务下发接口
    try {
      const queueResult = await queue.sendTaskToComfyuiQueue(taskParams)
      
      console.log('任务下发返回结果:', queueResult)
      
      if (queueResult && queueResult.success && queueResult.data) {
        // 记录返回的client_id和prompt_id
        const taskId = queueResult.data.taskId || queueResult.data.client_id
        const promptId = queueResult.data.prompt_id
        const clientId = queueResult.data.client_id
        
        console.log('任务信息:', { taskId, promptId, clientId })
        
        currentTaskId.value = taskId
        taskMessages.value.push(`任务已提交，任务ID: ${taskId}`)
        taskMessages.value.push(`prompt_id: ${promptId}`)
        taskMessages.value.push(`client_id: ${clientId}`)
        
        // 启动队列查询轮询
        if (clientId) {
          taskMessages.value.push('开始查询任务队列状态...')
          startQueuePolling(clientId)
        } else {
          taskMessages.value.push('无法获取client_id，无法查询队列状态')
        }
      } else {
        // 详细记录失败原因
        const errorMessage = queueResult?.error?.message || queueResult?.message || '任务下发失败'
        const errorCode = queueResult?.error?.code || 'UNKNOWN_ERROR'
        console.error('任务下发失败:', { code: errorCode, message: errorMessage })
        throw new Error(`任务下发失败: ${errorMessage} (代码: ${errorCode})`)
      }
    } catch (queueError) {
      console.error('任务下发失败:', queueError)
      taskMessages.value.push(`任务下发失败: ${queueError.message}`)
      isTaskRunning.value = false
    }
  } catch (error) {
    console.error('提交渲染任务失败:', error)
    taskMessages.value.push(`任务提交失败: ${error.message}`)
    isTaskRunning.value = false
  }
}



// 取消运行中的任务
const cancelRunningTask = async () => {
  if (!currentTaskId.value) {
    alert('没有正在运行的任务')
    return
  }
  
  isCancelingTask.value = true
  taskCancelMessage.value = '正在取消任务...'
  
  try {
    // 判断任务当前状态：如果queuePollingInterval存在，说明在轮询阶段；否则在WS生成阶段
    const isInPollingPhase = !!queuePollingInterval
    const cancelType = isInPollingPhase ? 'delete' : 'interrupt'
    
    // 构造取消任务的参数对象
    const cancelParams = {
      type: cancelType,
      prompt_id: [currentTaskId.value], // prompt_id需要是数组形式
      client_id: currentClientId.value || currentTaskId.value // 优先使用client_id
    }
    
    // 调用取消任务接口
    const result = await queue.cancelTaskInComfyuiQueue(cancelParams)
    taskCancelMessage.value = '任务已取消'
    taskMessages.value.push(`任务已${isInPollingPhase ? '从队列中删除' : '中断'}`)
    
    // 如果在轮询阶段，清除轮询定时器
    if (isInPollingPhase && queuePollingInterval) {
      clearInterval(queuePollingInterval)
      queuePollingInterval = null
      taskMessages.value.push('已停止队列查询轮询')
    } else {
      // 停止进度监听
      stopTaskProgressMonitoring()
    }
    
    // 重置任务状态
    setTimeout(() => {
      isTaskRunning.value = false
      isCancelingTask.value = false
      currentTaskId.value = ''
      currentClientId.value = ''
      taskProgress.value = 0
    }, 1000)
  } catch (error) {
    console.error('取消任务失败:', error)
    taskCancelMessage.value = `取消失败: ${error.message}`
    isCancelingTask.value = false
  }
}

// 添加和移除事件监听器
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  
  // 添加全局消息监听器
  window.addEventListener('message', handleGlobalMessage)
  
  // 监听生成图片事件
  ws.on('generatedImages', (data) => {
    if (data && data.mainImage) {
      generatedImage.value = data.mainImage
      showGeneratedImageWindow.value = true
      console.log('收到生成的图片:', data.mainImage)
    }
  })
  
  // 初始化CSS变量
  nextTick(() => {
    if (comparisonContainer.value) {
      comparisonContainer.value.style.setProperty('--slider-position', '50%')
    }
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  
  // 移除全局消息监听器
  window.removeEventListener('message', handleGlobalMessage)
  
  // 清理上传相关的定时器
  if (uploadTimeoutId) {
    clearTimeout(uploadTimeoutId)
    uploadTimeoutId = null
  }
  
  // 组件卸载时停止所有监听
  stopTaskProgressMonitoring()
})
</script>

<template>
  <div class="render-vista">
    <!-- 顶部标题栏 -->
    <header class="top-bar">
      <div class="logo">
        <span class="logo-icon">🔷</span>
        <span class="logo-text">Render Vista</span>
      </div>
      <div class="top-controls">
        <span class="quality-label">设计质量</span>
        <input type="range" v-model="renderSettings.quality" min="0" max="1" step="0.1" class="quality-slider">
        <span class="quality-value">{{ renderSettings.quality }}</span>
        <div class="render-mode-container">
          <button class="render-mode" @click="handleRenderModeChange">设计领域
          </button>
          <!-- 设计类别下拉菜单 -->
          <div v-if="showDesignCategories" class="design-categories-dropdown">
            <div class="categories-grid-dropdown">
              <div 
                v-for="category in designCategories" 
                :key="category.id"
                class="category-item-dropdown"
                @click="selectDesignCategory(category)"
              >
                <div class="category-image-dropdown">
                  <img :src="category.image" :alt="category.name" />
                </div>
                <div class="category-name-dropdown">{{ category.name }}</div>
              </div>
            </div>
          </div>
        </div>
        <button class="render-btn" @click="submitRenderTask" :disabled="isTaskRunning || isCancelingTask">
          {{ isTaskRunning ? '渲染中...' : (isCancelingTask ? '取消中...' : '渲染') }}
        </button>
      </div>
    </header>

    <div class="main-layout">
      <!-- 左侧项目列表 -->
      <aside class="sidebar">

        
        <div class="project-list">
          <!-- 截图按钮 -->
          <div class="project-item screenshot-item">
            <div class="screenshot-btn">
              <span class="camera-icon">📷</span>
            </div>
            <button class="model-original-btn" @click="captureViewport" :disabled="isLoading || isTaskRunning">
              {{ isLoading ? '获取中...' : '模型原图' }}
            </button>
          </div>
          
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="project-item"
            :class="{ active: selectedProject?.id === project.id }"
            @click="selectProject(project)"
          >
            <img :src="project.thumbnail" :alt="project.name" class="project-thumbnail">
          </div>
        </div>
        
        <div class="sidebar-footer">
        </div>
      </aside>

      <!-- 中间主视口 -->
      <main class="viewport-area">
        <!-- 图片对比显示区域 -->
        <div v-if="(showScreenshot && viewportScreenshot) || (showGeneratedImageWindow && generatedImage)" class="image-comparison-area">
          <div class="comparison-header">
            <h3>{{ showScreenshot && showGeneratedImageWindow ? '图片对比' : (showScreenshot ? '模型原图' : '生成图片') }}</h3>
            <button class="close-btn" @click="closeImageComparison">×</button>
          </div>
          
          <!-- 任务进度条和控制按钮 -->
          <div v-if="isTaskRunning" class="task-controls">
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: taskProgress + '%' }"></div>
              </div>
              <span class="progress-text">{{ taskProgress }}%</span>
            </div>
            
            <div class="task-buttons">
              <button class="cancel-btn" @click="cancelRunningTask" :disabled="isCancelingTask">
                {{ isCancelingTask ? '取消中...' : '取消任务' }}
              </button>
              <div v-if="taskCancelMessage" class="cancel-message">{{ taskCancelMessage }}</div>
            </div>
          </div>
          
          <!-- 图片对比内容区域 -->
          <div v-if="!isTaskRunning" class="comparison-content">
            <!-- 当只有一张图片时的显示 -->
            <div v-if="!showScreenshot || !showGeneratedImageWindow" class="single-image-display">
              <img v-if="showScreenshot" :src="viewportScreenshot" alt="模型原图" class="single-image" />
              <img v-else-if="showGeneratedImageWindow" :src="generatedImage" alt="生成图片" class="single-image" />
            </div>
            
            <!-- 当有两张图片时的对比显示 -->
            <div v-else class="image-comparison-container" ref="comparisonContainer">
              <!-- 原图（左侧） -->
              <div class="original-image-container">
                <img :src="viewportScreenshot" alt="模型原图" class="comparison-image original-image" />
                <div class="image-label original-label">模型原图</div>
              </div>
              
              <!-- 生成图（右侧，带遮罩） -->
              <div class="generated-image-container">
                <img :src="generatedImage" alt="生成图片" class="comparison-image generated-image" />
                <div class="image-label generated-label">生成图片</div>
              </div>
              
              <!-- 可拖动的分割线 -->
              <div 
                class="comparison-slider" 
                :style="{ left: sliderPosition + '%' }"
                @mousedown="startDragging"
                @touchstart="startDragging"
              >
                <div class="slider-handle">
                  <div class="slider-line"></div>
                  <div class="slider-circle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M8 6L12 10L16 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <path d="M8 18L12 14L16 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div v-if="!isTaskRunning" class="comparison-actions">
          </div>
        </div>
        
        <!-- 原有视口内容 - 只有当没有模型原图且没有生成图片窗口时才显示 -->
        <div v-if="!showScreenshot && !showGeneratedImageWindow" class="viewport-content">
          <RhinoViewport @imageUploaded="handleImageUpload" />
          
          <!-- 底部预览图片 -->
          <div class="preview-gallery">
            <div class="gallery-item" v-for="i in 4" :key="i">
              <img :src="`https://picsum.photos/80/60?random=${i+10}`" alt="预览图">
            </div>
            <button class="refresh-btn">🔄</button>
          </div>
        </div>
        
        <!-- 任务消息日志 -->
        <div v-if="taskMessages.length > 0 && showTaskLogs" class="task-logs">
          <div class="logs-header">
            <span>任务日志</span>
            <button class="close-btn" @click="closeTaskLogs">×</button>
          </div>
          <div class="logs-content">
            <div v-for="(message, index) in taskMessages.slice(-20)" :key="index" class="log-message">
              {{ message }}
            </div>
          </div>
        </div>
      </main>

      <!-- 右侧参数面板 -->
      <aside class="control-panel">
        <!-- 创意描述面板 -->
        <div v-if="showCreativeDescription" class="creative-description-panel">
          <!-- 标题栏 -->
          <div class="creative-header">
            <div class="creative-title">
              <span class="star-icon">⭐</span>
              <span>创意描述</span>
            </div>
            <button class="close-btn" @click="closeCreativeDescription">×</button>
          </div>



          <!-- 正向描述 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('positiveDescription')">
              <span class="section-title">正向描述</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.positiveDescription }">▼</span>
            </div>
            <div v-if="expandedSections.positiveDescription" class="section-content">
              <textarea 
                v-model="creativeDescriptions[selectedCategoryName].positiveDescription"
                class="description-textarea"
                placeholder="请输入正向描述"
                rows="4"
              ></textarea>
              <div class="action-buttons">
                <button class="action-btn generate-btn">我的收藏</button>
                <button class="action-btn correct-btn">正向模板</button>
              </div>
            </div>
          </div>

          <!-- 反向描述 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('negativeDescription')">
              <span class="section-title">反向描述</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.negativeDescription }">▼</span>
            </div>
            <div v-if="expandedSections.negativeDescription" class="section-content">
              <textarea 
                v-model="creativeDescriptions[selectedCategoryName].negativeDescription"
                class="description-textarea"
                placeholder="请输入反向描述"
                rows="4"
              ></textarea>
              <div class="action-buttons">
                <button class="action-btn" style="background: #f44336; color: white;">反向模板</button>
              </div>
            </div>
          </div>

          <!-- 参考图片 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('referenceImages')">
              <span class="section-title">参考图片</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.referenceImages }">▼</span>
            </div>
            <div v-if="expandedSections.referenceImages" class="section-content">
              <div class="reference-images-area">
                <!-- 已上传的参考图片 -->
                <div v-if="creativeDescriptions[selectedCategoryName] && creativeDescriptions[selectedCategoryName].referenceImages.length > 0" class="uploaded-images">
                  <div v-for="(image, index) in creativeDescriptions[selectedCategoryName].referenceImages" :key="image.id" class="reference-image-item">
                    <img :src="image.url" :alt="image.name" class="reference-thumbnail" />
                    <div class="image-info">
                      <span class="image-name">{{ image.name }}</span>
                      <button class="remove-btn" @click="removeReferenceImage(index)">×</button>
                    </div>
                  </div>
                </div>
                
                <!-- 上传按钮 -->
                <div class="upload-area" @click="openImageSelector">
                  <span class="upload-icon">📁</span>
                  <span>点击上传参考图片</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 设计风格 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('designStyle')">
              <span class="section-title">设计风格</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.designStyle }">▼</span>
            </div>
            <div v-if="expandedSections.designStyle" class="section-content">
              <select v-model="creativeDescriptions[selectedCategoryName].designStyle" class="style-select">
                <option value="现代简约">现代简约</option>
                <option value="北欧风格">北欧风格</option>
                <option value="中式传统">中式传统</option>
                <option value="工业风格">工业风格</option>
              </select>
            </div>
          </div>

          <!-- 尺寸比例 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('aspectRatio')">
              <span class="section-title">尺寸比例</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.aspectRatio }">▼</span>
            </div>
            <div v-if="expandedSections.aspectRatio" class="section-content">
              <select v-model="creativeDescriptions[selectedCategoryName].aspectRatio" class="style-select">
                <option value="16:9">16:9</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="3:4">3:4</option>
              </select>
            </div>
          </div>

          <!-- 画面氛围 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('atmosphere')">
              <span class="section-title">画面氛围</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.atmosphere }">▼</span>
            </div>
            <div v-if="expandedSections.atmosphere" class="section-content">
              <select v-model="creativeDescriptions[selectedCategoryName].atmosphere" class="style-select">
                <option value="温馨舒适">温馨舒适</option>
                <option value="现代时尚">现代时尚</option>
                <option value="优雅高贵">优雅高贵</option>
                <option value="简约清新">简约清新</option>
              </select>
            </div>
          </div>

          <!-- 环境位置 -->
          <div class="description-section">
            <div class="section-header" @click="toggleSection('environment')">
              <span class="section-title">环境位置</span>
              <span class="expand-icon" :class="{ expanded: expandedSections.environment }">▼</span>
            </div>
            <div v-if="expandedSections.environment" class="section-content">
              <select v-model="creativeDescriptions[selectedCategoryName].environment" class="style-select">
                <option value="客厅">客厅</option>
                <option value="卧室">卧室</option>
                <option value="厨房">厨房</option>
                <option value="书房">书房</option>
                <option value="卫生间">卫生间</option>
              </select>
            </div>
          </div>
        </div>
      </aside>
    </div>

  </div>

  <!-- 图片选择器弹框 -->
  <div v-if="showImageSelector" class="modal-overlay" @click="closeImageSelector">
    <div class="image-selector-modal" @click.stop>
      <div class="modal-header">
        <h3>选择参考图片</h3>
        <button class="close-btn" @click="closeImageSelector">×</button>
      </div>
      <div class="modal-content">
        <iframe 
          src="http://192.10.222.106:3000/" 
          class="embedded-webpage"
          frameborder="0"
          allowfullscreen>
        </iframe>
      </div>
      <div class="modal-footer">
        <button class="upload-btn" @click="handleUpload">
          <span class="upload-icon">📤</span>
          上传
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './style/app-styles.css';
</style>
