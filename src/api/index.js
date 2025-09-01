// API模块统一导出
import api from './api.js';
import upload from './upload.js';
import ws from './ws.js';
import moderation from './moderation.js';
import queue from './queue.js';
import { WebSocketManager } from './ws.js';

// 导出所有模块
export { 
  api,
  upload,
  ws,
  moderation,
  queue,
  WebSocketManager
};

// 默认导出主要API
export default {
  ...api,
  upload,
  ws,
  moderation,
  queue,
  WebSocketManager
};