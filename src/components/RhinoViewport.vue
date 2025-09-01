<template>
  <div class="rhino-viewport-container">
    <h2>Rhino 视口截图</h2>
    
    <div class="screenshot-controls">
      <button @click="captureViewport" class="capture-btn">获取视口截图</button>
      <div class="loading-indicator" v-if="isLoading">获取中...</div>
    </div>
    
    <div class="screenshot-display" v-if="viewportScreenshot">
      <h3>当前视口截图：</h3>
      <img :src="viewportScreenshot" alt="Rhino视口截图" class="screenshot-image" />
    </div>
    
    <div v-else class="no-screenshot">
      <p>尚未获取视口截图，请点击上方按钮</p>
      <p class="note">注意：在实际集成中，此功能需要通过Rhino插件实现与Rhino软件的通信</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const viewportScreenshot = ref('');
const isLoading = ref(false);

// 实际集成时，调用Rhino插件提供的API获取视口截图
const captureViewport = async () => {
  isLoading.value = true;
  
  try {
    // 检查Rhino插件是否已加载
    console.log('检查Rhino API状态:', {
      hasWindow: !!window.rhino,
      hasFunction: window.rhino && typeof window.rhino.CaptureCurrentViewport === 'function',
      rhinoKeys: window.rhino ? Object.getOwnPropertyNames(window.rhino) : 'undefined'
    });
    
    if (!window.rhino || typeof window.rhino.CaptureCurrentViewport !== 'function') {
      // 如果不在Rhino环境中运行，则使用模拟数据
      console.log('未检测到Rhino插件，使用模拟数据');
      
      // 模拟网络请求延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 使用示例图片作为模拟数据
      const mockScreenshot = 'https://picsum.photos/800/600?random=' + Math.random();
      viewportScreenshot.value = mockScreenshot;
    } else {
      // 在Rhino环境中运行，调用实际的Rhino API
      console.log('调用Rhino API获取视口截图');
      
      try {
        const screenshotData = await window.rhino.CaptureCurrentViewport();
        console.log('Rhino API返回数据类型:', typeof screenshotData, '长度:', screenshotData?.length);
        
        if (screenshotData && screenshotData.length > 0) {
          // 确保返回的是正确的Base64格式
          const imageData = screenshotData.startsWith('data:image/') ? screenshotData : `data:image/png;base64,${screenshotData}`;
          viewportScreenshot.value = imageData;
          console.log('Rhino视口截图已获取，数据长度:', screenshotData.length);
        } else {
          throw new Error('未能获取Rhino视口截图 - 返回数据为空');
        }
      } catch (rhinoError) {
        console.error('调用Rhino API时出错:', rhinoError);
        throw new Error(`Rhino API调用失败: ${rhinoError.message}`);
      }
    }
  } catch (error) {
    console.error('获取Rhino视口截图失败:', error);
    // 在出错时也显示模拟数据，避免完全失败
    const fallbackScreenshot = 'https://picsum.photos/800/600?random=' + Math.random();
    viewportScreenshot.value = fallbackScreenshot;
    console.log('使用备用模拟数据');
  } finally {
    isLoading.value = false;
  }
};

// 检查当前是否在Rhino环境中运行
const isRunningInRhino = () => {
  return !!window.rhino && typeof window.rhino.CaptureCurrentViewport === 'function';
};

// 组件挂载时检查Rhino环境
onMounted(() => {
  if (isRunningInRhino()) {
    console.log('Rhino Web Integration已连接');
  } else {
    console.log('在开发环境中运行，使用模拟数据');
  }
});
</script>

<style scoped>
.rhino-viewport-container {
  max-width: 900px;
  margin: 20px auto;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.rhino-viewport-container h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

.screenshot-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
}

.capture-btn {
  padding: 10px 20px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.capture-btn:hover {
  background-color: #35495e;
}

.capture-btn:active {
  transform: scale(0.98);
}

.loading-indicator {
  color: #42b883;
  font-size: 14px;
}

.screenshot-display {
  text-align: center;
}

.screenshot-display h3 {
  color: #333;
  margin-bottom: 15px;
}

.screenshot-image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.no-screenshot {
  text-align: center;
  color: #666;
}

.note {
  font-style: italic;
  font-size: 14px;
  margin-top: 10px;
  color: #888;
}
</style>