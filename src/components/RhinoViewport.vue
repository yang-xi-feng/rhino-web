<template>
  <div class="rhino-viewport-container">
    <h2>上传图片</h2>
    
    <div class="upload-controls">
      <div class="upload-area" @click="triggerFileInput">
        <span class="upload-icon">📁</span>
        <p class="upload-text">点击上传图片</p>
        <p class="upload-hint">支持JPG、PNG等格式</p>
        <input 
          ref="fileInput" 
          type="file" 
          accept="image/*" 
          class="file-input"
          @change="handleFileUpload"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { uploadReferenceImage } from '../api/upload';

// 定义emit事件，用于向父组件传递图片信息
const emit = defineEmits(['imageUploaded']);

const fileInput = ref(null);
const previewImage = ref('');

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value?.click();
};

// 处理文件上传
const handleFileUpload = async (event) => {
  const file = event.target.files[0] as File;
  if (!file) {
    return;
  }
  
  const res = await uploadReferenceImage(file);
  emit('imageUploaded', {src: res.url, content: res.content});
}
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

.upload-controls {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.upload-area {
  width: 300px;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: white;
}

.upload-area:hover {
  border-color: #42b883;
  background-color: #f5fdf9;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: #999;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin: 0 0 5px 0;
  font-weight: 500;
}

.upload-hint {
  font-size: 12px;
  color: #666;
  margin: 0;
}

.file-input {
  display: none;
}

.upload-preview {
  text-align: center;
}

.upload-preview h3 {
  color: #333;
  margin-bottom: 15px;
}

.preview-image {
  max-width: 100%;
  max-height: 400px;
  border-radius: 4px;
  border: 1px solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>