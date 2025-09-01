# Rhino Web 集成应用

这是一个专为Rhino犀牛软件设计的Vue网页应用，可以嵌入到Rhino中并获取Rhino当前视口的模型截图。

## 技术栈

- Vue 3
- Vite
- JavaScript

## 功能特性

- 在Rhino软件中嵌入网页界面
- 获取Rhino当前视口的模型截图
- 实时显示获取到的截图
- 响应式设计，适配不同尺寸的窗口

## 安装和运行

### 开发环境

1. 克隆或下载此项目

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm run dev
```

4. 在浏览器中访问 `http://localhost:5173`

### 生产构建

```bash
npm run build
```

构建后的文件将位于 `dist` 目录中，可以部署到任何静态文件服务器。

## Rhino 集成说明

### 前端部分

这个Vue应用已经实现了截图显示和用户界面，但在实际集成到Rhino中时，需要Rhino插件的配合才能获取真实的视口截图。

### Rhino插件开发指南

为了实现完整功能，需要开发一个Rhino插件，主要包括以下功能：

1. 在Rhino中创建一个WebView控件来加载这个Vue应用
2. 实现Rhino与网页之间的通信机制
3. 提供获取Rhino视口截图的API

#### 关键Rhino API参考

- 使用 `RhinoCommon` API中的 `RhinoViewport` 类来获取当前视口
- 使用 `ViewCapture` 类来捕获视口图像
- 将捕获的图像转换为Base64编码，然后传递给网页

#### WebView与JavaScript通信

Rhino插件需要实现JavaScript接口，允许网页调用Rhino的功能：

```csharp
// 示例C#代码，展示如何实现Rhino与网页的通信
public class RhinoJavaScriptApi
{
    // 获取当前视口截图的方法
    public string CaptureCurrentViewport()
    {
        // 获取当前活动视图
        var view = Rhino.RhinoDoc.ActiveDoc.Views.ActiveView;
        if (view == null) return null;
        
        // 创建视口捕获对象
        var viewCapture = new Rhino.Display.ViewCapture(view.MainViewport);
        
        // 设置捕获选项
        viewCapture.Width = 1920;  // 截图宽度
        viewCapture.Height = 1080; // 截图高度
        viewCapture.ScaleScreenItems = true;
        viewCapture.DrawAxes = false;
        viewCapture.DrawGrid = false;
        
        // 捕获视口图像
        var bitmap = viewCapture.CaptureToBitmap();
        
        // 将位图转换为Base64字符串
        using (var ms = new MemoryStream())
        {
            bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
            byte[] imageBytes = ms.ToArray();
            return "data:image/png;base64," + Convert.ToBase64String(imageBytes);
        }
    }
}
```

### 网页端Rhino API调用

在实际集成中，Vue应用需要修改 `RhinoViewport.vue` 组件中的 `captureViewport` 方法，使用实际的Rhino API调用代替模拟数据：

```javascript
// 实际集成时的代码示例
const captureViewport = async () => {
  isLoading.value = true;
  
  try {
    // 调用Rhino插件提供的JavaScript API
    const screenshotData = await window.rhino?.captureViewport();
    
    if (screenshotData) {
      viewportScreenshot.value = screenshotData;
      console.log('Rhino视口截图已获取');
    } else {
      throw new Error('未能获取Rhino视口截图');
    }
  } catch (error) {
    console.error('获取Rhino视口截图失败:', error);
    alert('获取Rhino视口截图失败，请检查Rhino插件是否正确安装');
  } finally {
    isLoading.value = false;
  }
};
```

## 开发说明

- 项目使用Vue 3的Composition API
- 样式使用CSS变量，方便主题定制
- 代码结构清晰，易于扩展其他功能

## 注意事项

- 本项目仅包含前端部分，需要配合Rhino插件才能实现完整功能
- 在开发环境中，截图功能使用模拟数据展示
- 实际使用时，请确保Rhino插件已正确安装并启用

## License

MIT
