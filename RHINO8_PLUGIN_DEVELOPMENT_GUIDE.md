# Rhino 8 插件开发指南（VS2022环境）

本指南将详细介绍如何在Rhino 8环境下，使用Visual Studio 2022开发C#插件，实现Rhino与Vue网页应用的集成。

## 开发环境准备

1. 安装**Rhino 8**（确保已安装开发工具包）
2. 安装**Visual Studio 2022**（推荐社区版或更高版本）
3. 安装**RhinoCommon** SDK（Rhino 8自带）
4. 确保已完成本Vue项目的构建（`npm run build`）

## 在VS2022中创建Rhino插件项目

### 步骤1：创建新项目

1. 打开Visual Studio 2022
2. 点击「创建新项目」
3. 在搜索框中输入「Rhino」
4. 选择「RhinoCommon Plug-in」模板
5. 点击「下一步」
6. 输入项目名称（例如：`RhinoWebIntegration`）
7. 选择项目保存位置
8. 点击「创建」

### 步骤2：配置项目引用

1. 在解决方案资源管理器中右键点击项目名称
2. 选择「管理NuGet程序包」
3. 确保已安装以下包：
   - `RhinoCommon`（Rhino 8版本）
   - `Eto.Forms`（用于UI组件）
   - `Microsoft.Web.WebView2`（用于WebView功能）

## 完整的C#插件代码实现

### 1. 主插件类（RhinoWebIntegrationPlugin.cs）

```csharp
using Rhino;
using System;

namespace RhinoWebIntegration
{
    public class RhinoWebIntegrationPlugin : Rhino.PlugIns.PlugIn
    {
        public RhinoWebIntegrationPlugin()
        {
            Instance = this;
        }

        public static RhinoWebIntegrationPlugin Instance { get; private set; }

        // 插件ID（请勿修改，VS2022会自动生成）
        public override Guid PlugInID
        {
            get { return new Guid("YOUR-GUID-HERE"); } // 替换为实际的GUID
        }

        // 插件名称
        public override string EnglishName
        {
            get { return "Rhino Web Integration"; }
        }
    }
}
```

### 2. JavaScript API接口类（JavaScriptApi.cs）

```csharp
using Rhino;
using Rhino.Display;
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;

namespace RhinoWebIntegration
{
    [ComVisible(true)]
    public class JavaScriptApi
    {
        // 获取当前视口截图的方法
        public string CaptureCurrentViewport()
        {
            try
            {
                // 获取当前活动视图
                var view = RhinoDoc.ActiveDoc.Views.ActiveView;
                if (view == null)
                    return "";
                
                // 创建视口捕获对象
                var viewCapture = new ViewCapture(view.MainViewport);
                
                // 设置捕获选项
                viewCapture.Width = 1920;  // 截图宽度
                viewCapture.Height = 1080; // 截图高度
                viewCapture.ScaleScreenItems = true;
                viewCapture.DrawAxes = false;
                viewCapture.DrawGrid = false;
                viewCapture.TransparentBackground = false;
                
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
            catch (Exception ex)
            {
                RhinoApp.WriteLine("捕获视口截图时出错: " + ex.Message);
                return "";
            }
        }
        
        // 示例：获取当前模型信息
        public string GetModelInfo()
        {
            try
            {
                var doc = RhinoDoc.ActiveDoc;
                if (doc == null)
                    return "{\"error\":\"没有活动文档\"}";
                
                return $"{{\"modelName\":\"{doc.Name}\",\"objectCount\":{doc.Objects.Count}}}";
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("获取模型信息时出错: " + ex.Message);
                return "{\"error\":\"获取信息失败\"}";
            }
        }
    }
}
```

### 3. WebView窗口类（RhinoWebView.cs）

```csharp
using Eto.Forms;
using Eto.Drawing;
using Rhino;
using System;
using System.IO;
using System.Reflection;
using Microsoft.Web.WebView2.WinForms;
using System.Windows.Forms.Integration;

namespace RhinoWebIntegration
{
    public class RhinoWebView : Form
    {
        private WebView2 webView;
        private ElementHost elementHost;
        private JavaScriptApi jsApi;

        public RhinoWebView()
        {
            Title = "Rhino Web Integration";
            ClientSize = new Size(1024, 768);
            MinimumSize = new Size(800, 600);
            
            // 初始化WinForms的ElementHost来容纳WebView2
            elementHost = new ElementHost();
            elementHost.Dock = System.Windows.Forms.DockStyle.Fill;
            
            // 初始化WebView2控件
            webView = new WebView2();
            webView.Dock = System.Windows.Forms.DockStyle.Fill;
            
            // 将WebView2添加到ElementHost
            elementHost.Child = webView;
            
            // 创建Eto控件来包装WinForms控件
            var etoControl = new Eto.WinForms.Forms.Controls.WinFormsControl<ElementHost>(elementHost);
            
            // 将控件添加到窗口
            Content = etoControl;
            
            // 创建JavaScript API实例
            jsApi = new JavaScriptApi();
            
            // 注册加载完成事件，用于初始化JavaScript接口
            webView.CoreWebView2InitializationCompleted += WebView_CoreWebView2InitializationCompleted;
            
            // 确保WebView2环境已初始化
            InitializeWebView();
        }
        
        private async void InitializeWebView()
        {
            try
            {
                // 初始化WebView2环境
                await webView.EnsureCoreWebView2Async();
                
                // 加载本地Vue应用（构建后的文件）
                string distFolderPath = Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location), "dist");
                string indexHtmlPath = Path.Combine(distFolderPath, "index.html");
                
                if (File.Exists(indexHtmlPath))
                {
                    // 使用本地文件路径
                    webView.Source = new Uri(indexHtmlPath);
                }
                else
                {
                    // 开发环境下，连接到Vite开发服务器
                    webView.Source = new Uri("http://localhost:5173");
                    RhinoApp.WriteLine("加载开发服务器: http://localhost:5173");
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("初始化WebView失败: " + ex.Message);
            }
        }
        
        private void WebView_CoreWebView2InitializationCompleted(object sender, Microsoft.Web.WebView2.Core.CoreWebView2InitializationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                // 向WebView注册JavaScript对象
                webView.CoreWebView2.AddHostObjectToScript("rhino", jsApi);
                
                // 注入初始化脚本，确保网页可以访问rhino对象
                webView.CoreWebView2.ExecuteScriptAsync(@"
                    window.rhino = chrome.webview.hostObjects.rhino;
                    console.log('Rhino API已注册');
                ");
            }
            else
            {
                RhinoApp.WriteLine("WebView初始化失败: " + e.InitializationException.Message);
            }
        }
    }
}
```

### 4. 命令类（ShowWebViewCommand.cs）

```csharp
using Rhino.Commands;
using System;

namespace RhinoWebIntegration
{
    [System.Runtime.InteropServices.Guid("YOUR-GUID-HERE")] // 替换为新的GUID
    public class ShowWebViewCommand : Command
    {
        static ShowWebViewCommand _instance;

        public ShowWebViewCommand()
        {
            _instance = this;
        }

        public static ShowWebViewCommand Instance
        {
            get { return _instance; }
        }

        public override string EnglishName
        {
            get { return "ShowRhinoWebView"; }
        }

        protected override Result RunCommand(Rhino.RhinoDoc doc, RunMode mode)
        {
            try
            {
                // 创建并显示WebView窗口
                var webView = new RhinoWebView();
                webView.Show();
                return Result.Success;
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("启动WebView时出错: " + ex.Message);
                return Result.Failure;
            }
        }
    }
}
```

## 项目构建与部署流程

### 步骤1：构建Vue应用

1. 确保您已在Vue项目目录下运行：
   ```bash
   npm run build
   ```
2. 构建完成后，会在`dist`目录下生成静态文件

### 步骤2：构建Rhino插件

1. 在Visual Studio中，点击「生成」→「生成解决方案」
2. 确保构建成功，没有错误
3. 构建后的DLL文件位于项目的`bin\Debug`或`bin\Release`目录下

### 步骤3：部署插件

1. 将Vue项目构建后的`dist`文件夹复制到Rhino插件DLL所在目录
2. 将插件DLL和`dist`文件夹一起复制到Rhino插件目录：
   - Windows: `C:\Users\[用户名]\AppData\Roaming\McNeel\Rhinoceros\8.0\Plug-ins`
3. 启动Rhino 8
4. 在Rhino命令行中输入 `ShowRhinoWebView` 命令启动集成界面

## 网页端代码修改

为了让Vue应用能够与Rhino插件通信，需要修改`RhinoViewport.vue`组件中的`captureViewport`方法：

```javascript
// 实际集成时的代码示例
const captureViewport = async () => {
  isLoading.value = true;
  
  try {
    // 调用Rhino插件提供的JavaScript API
    const screenshotData = await window.rhino?.CaptureCurrentViewport?.();
    
    if (screenshotData && screenshotData.length > 0) {
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

## 常见问题解决

### 1. WebView2初始化失败

- 确保已安装最新版本的WebView2运行时
- 检查项目引用中的WebView2包版本是否与Rhino 8兼容

### 2. JavaScript API调用失败

- 确认`JavaScriptApi`类已添加`[ComVisible(true)]`属性
- 检查WebView2是否正确注册了JavaScript对象
- 在Rhino命令行中查看错误信息以进行调试

### 3. 截图获取失败

- 确保Rhino中至少有一个活动视图
- 检查视口捕获代码中的权限和参数设置

## 扩展功能建议

1. 添加多个视口的截图获取支持
2. 实现双向通信，让Rhino响应网页中的操作
3. 添加模型操作API，如选择、移动、旋转等
4. 实现文件导入导出功能

---

通过以上步骤，您将能够在Rhino 8环境下使用VS2022开发C#插件，成功实现Rhino与Vue网页应用的集成。如果有任何问题，请参考Rhino官方文档或在Rhino开发者社区寻求帮助。