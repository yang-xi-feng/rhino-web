<script setup>
import RhinoViewport from './components/RhinoViewport.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { queue, ws } from './api'

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

// 添加创意描述相关数据
const showCreativeDescription = ref(false)
const selectedCategoryName = ref('')

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
const currentTaskId = ref('')
const currentClientId = ref('')
const taskCancelMessage = ref('')

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

// 点击外部区域关闭下拉菜单
const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.design-categories-dropdown')
  const container = document.querySelector('.render-mode-container')
  if (dropdown && container && !container.contains(event.target)) {
    showDesignCategories.value = false
  }
}

// 处理任务进度更新
const handleTaskProgress = (progress) => {
  taskProgress.value = progress
  taskMessages.value.push(`任务进度: ${progress}%`)
  
  // 任务完成时的处理
  if (progress >= 100) {
    setTimeout(() => {
      isTaskRunning.value = false
      taskMessages.value.push('任务已完成！')
    }, 1000)
  }
}

// 开始任务进度监听
const startTaskProgressMonitoring = (clientId) => {
  try {
    currentClientId.value = clientId
    ws.connectWithTaskId(clientId)
    ws.onTaskProgress((progress) => {
      handleTaskProgress(progress)
    })
    taskMessages.value.push('开始监听任务进度...')
  } catch (error) {
    console.error('启动任务进度监听失败:', error)
    taskMessages.value.push(`进度监听失败: ${error.message}`)
  }
}

// 停止任务进度监听
const stopTaskProgressMonitoring = () => {
  try {
    ws.offTaskProgress()
    ws.close()
    currentClientId.value = ''
    taskMessages.value.push('已停止任务进度监听')
  } catch (error) {
    console.error('停止任务进度监听失败:', error)
  }
}

// 提交渲染任务
const submitRenderTask = async () => {
  if (!viewportScreenshot.value) {
    alert('请先获取模型原图')
    return
  }
  
  isTaskRunning.value = true
  isCancelingTask.value = false
  taskProgress.value = 0
  taskMessages.value = []
  
  try {
    // 准备任务参数
    const categoryData = creativeDescriptions.value[selectedCategoryName.value]
    const taskParams = {
      modelOriginalUrl: viewportScreenshot.value,
      positiveDescription: categoryData.positiveDescription,
      negativeDescription: categoryData.negativeDescription,
      designStyle: categoryData.designStyle,
      aspectRatio: categoryData.aspectRatio,
      atmosphere: categoryData.atmosphere,
      environment: categoryData.environment,
      quality: renderSettings.value.quality,
      lighting: renderSettings.value.lighting,
      resolution: renderSettings.value.resolution
    }
    
    // 调用任务下发API
    taskMessages.value.push('正在提交渲染任务...')
    const result = await queue.sendTaskToComfyuiQueue(taskParams)
    
    if (result && result.client_id) {
      currentTaskId.value = result.task_id || 'unknown'
      taskMessages.value.push(`任务已提交，任务ID: ${currentTaskId.value}`)
      
      // 启动任务进度监听
      startTaskProgressMonitoring(result.client_id)
    } else {
      throw new Error('任务提交失败，未获取到client_id')
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
    const result = await queue.cancelTaskInComfyuiQueue(currentTaskId.value, 'interrupt')
    taskCancelMessage.value = '任务已取消'
    taskMessages.value.push('任务已中断')
    
    // 停止进度监听
    stopTaskProgressMonitoring()
    
    // 重置任务状态
    setTimeout(() => {
      isTaskRunning.value = false
      isCancelingTask.value = false
      currentTaskId.value = ''
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
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
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
          <button class="more-projects">查看更多项目 ></button>
        </div>
      </aside>

      <!-- 中间主视口 -->
      <main class="viewport-area">
        <!-- 截图显示区域 -->
        <div v-if="showScreenshot" class="screenshot-display-area">
          <div class="screenshot-header">
            <h3>模型原图</h3>
            <button class="close-btn" @click="closeScreenshot">×</button>
          </div>
          <div class="screenshot-content-area">
            <img :src="viewportScreenshot" alt="Rhino视口截图" class="viewport-screenshot" />
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
        </div>
        
        <!-- 原有视口内容 -->
        <div v-else class="viewport-content">
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
        <div v-if="taskMessages.length > 0" class="task-logs">
          <div class="logs-header">
            <span>任务日志</span>
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
                <div class="upload-area">
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
</template>

<style scoped>
.render-vista {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 顶部标题栏 */
.top-bar {
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.logo-icon {
  font-size: 20px;
}

.top-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.quality-slider {
  width: 100px;
}

.render-mode {
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255,255,255,0.2);
  color: white;
}

.render-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

/* 主布局 */
.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧边栏 */
.sidebar {
  width: 250px;
  background: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}



.project-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.project-item {
  display: block;
  padding: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.project-item:hover {
  background-color: #f5f5f5;
}

.project-item.active {
  background-color: #e3f2fd;
  border-left: 3px solid #2196F3;
}

.project-thumbnail {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
}

.screenshot-btn {
  width: 100%;
  height: 80px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.screenshot-btn:hover {
  background: #e0e0e0;
}

.camera-icon {
  font-size: 18px;
}

.screenshot-item:hover {
  background-color: #f5f5f5;
}

.project-info h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
}

.model-original-btn {
  width: 100%;
  height: 30px;
  margin-top: -3px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.model-original-btn:hover {
  background: #1976D2;
}

.sidebar-footer {
  padding: 15px;
  border-top: 1px solid #e0e0e0;
}

.more-projects {
  width: 100%;
  padding: 8px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  font-size: 12px;
}

/* 中间视口区域 */
.viewport-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fafafa;
}



.viewport-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  align-items: center;
  justify-content: center;
}

.preview-gallery {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  background: rgba(255,255,255,0.9);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.gallery-item img {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.refresh-btn {
  width: 30px;
  height: 30px;
  border: none;
  background: #f0f0f0;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 右侧控制面板 */
.control-panel {
  width: 280px;
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow-y: auto;
}

/* 创意描述面板样式 */
.creative-description-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.creative-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.creative-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.star-icon {
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.description-section {
  border-bottom: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  background: white;
}

.section-header:hover {
  background: #f8f9fa;
}

.section-title {
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.expand-icon {
  font-size: 12px;
  color: #666;
  transition: transform 0.3s ease;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.section-content {
  padding: 0 20px 15px 20px;
  background: #fafafa;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 200px;
  }
}

.description-textarea {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  resize: vertical;
  font-family: inherit;
}

.description-textarea:focus {
  outline: none;
  border-color: #4CAF50;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.action-btn {
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-btn {
  background: #4CAF50;
  color: white;
}

.generate-btn:hover {
  background: #45a049;
}

.correct-btn {
  background: #2196F3;
  color: white;
}

.correct-btn:hover {
  background: #1976D2;
}

.reference-images-area {
  padding: 10px 0;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 4px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
  color: #666;
  font-size: 12px;
}

.upload-area:hover {
  border-color: #4CAF50;
  color: #4CAF50;
}

.upload-icon {
  display: block;
  font-size: 24px;
  margin-bottom: 8px;
}

.style-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
  background: white;
}

.style-select:focus {
  outline: none;
  border-color: #4CAF50;
}

.panel-section {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}



.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
  color: #666;
}

.setting-group select {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 12px;
}

.env-btn {
  width: 100%;
  padding: 8px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.panel-actions {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-btn {
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.action-btn.primary {
  background: #4CAF50;
  color: white;
}

.action-btn.secondary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

/* 上传的图片容器样式 */
.uploaded-image-container {
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.uploaded-image-container h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 16px;
}

.uploaded-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-info {
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.image-info p {
  margin: 5px 0;
}

/* 截图显示区域样式 */
.screenshot-display-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.screenshot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.screenshot-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.screenshot-content-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #fafafa;
}

.viewport-screenshot {
  max-width: 100%;
  max-height: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  object-fit: contain;
}

/* 任务控制相关样式 */
.task-controls {
  padding: 20px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
}

.progress-container {
  margin-bottom: 15px;
  position: relative;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 12px;
  color: #666;
  float: right;
}

.task-buttons {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cancel-btn {
  padding: 8px 16px;
  background: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.cancel-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-message {
  font-size: 12px;
  color: #666;
}

/* 任务日志样式 */
.task-logs {
  position: absolute;
  bottom: 80px;
  left: 20px;
  right: 20px;
  max-height: 200px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.logs-header {
  padding: 10px 15px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.logs-content {
  max-height: 160px;
  overflow-y: auto;
  padding: 10px 15px;
}

.log-message {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.4;
}

/* 按钮禁用状态 */
.model-original-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.model-original-btn:disabled:hover {
  background: #ccc;
}

/* 渲染按钮禁用状态 */
.render-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.render-btn:disabled:hover {
  background: #ccc;
}

/* 设计类别选择页面样式 */
.design-categories-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.categories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.categories-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.categories-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 1fr);
  gap: 12px;
  max-width: 500px;
  margin: 0 auto;
  padding: 10px;
}

.category-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  border: 1px solid #e0e0e0;
}

.category-item:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 下拉菜单样式 */
.render-mode-container {
  position: relative;
  display: inline-block;
}

.design-categories-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 10px;
  /* width: 280px; */
  /* max-width: 90vw; */
}

.categories-grid-dropdown {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  /* max-height: 250px; */
  /* overflow-y: auto; */
}

.category-item-dropdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  border: 1px solid #e0e0e0;
}

.category-item-dropdown:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.category-image-dropdown {
  width: 45px;
  height: 35px;
  margin-bottom: 3px;
  overflow: hidden;
  border-radius: 3px;
}

.category-image-dropdown img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-name-dropdown {
  font-size: 9px;
  font-weight: normal;
  color: #333;
  text-align: center;
  line-height: 1.1;
  word-break: break-all;
}

.category-image {
  width: 90px;
  height: 70px;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}

.category-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.category-name {
  font-size: 11px;
  font-weight: 400;
  color: #333;
  text-align: center;
  line-height: 1.1;
  min-height: 12px;
}
</style>
