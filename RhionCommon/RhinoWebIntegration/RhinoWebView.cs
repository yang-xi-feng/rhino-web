using Rhino;
using System;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;
using System.Windows.Forms;
using System.Drawing;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace RhinoWebIntegration
{
    public class RhinoWebView : Form
    {
        private WebView2 webView;
        private JavaScriptApi jsApi;

        public RhinoWebView()
        {
            Text = "Rhino Web Integration";
            ClientSize = new System.Drawing.Size(1024, 768);
            MinimumSize = new System.Drawing.Size(800, 600);
            StartPosition = FormStartPosition.CenterScreen;
            
            // 创建JavaScript API实例
            jsApi = new JavaScriptApi();
            
            // 确保WebView2环境已初始化
            InitializeWebViewAsync();
        }
        
        private async void InitializeWebViewAsync()
        {
            try
            {
                // Create user data folder in temp directory to avoid permission issues
                string tempPath = Path.GetTempPath();
                string userDataFolder = Path.Combine(tempPath, "RhinoWebView", Guid.NewGuid().ToString());
                Directory.CreateDirectory(userDataFolder);

                // Create WebView2 environment with custom user data folder
                var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);

                // 初始化WebView2控件
                webView = new WebView2();
                webView.Dock = DockStyle.Fill;
                
                // 将WebView2添加到窗口
                Controls.Add(webView);
                
                // 注册加载完成事件，用于初始化JavaScript接口
                webView.CoreWebView2InitializationCompleted += WebView_CoreWebView2InitializationCompleted;

                // 初始化WebView2环境
                await webView.EnsureCoreWebView2Async(environment);
                
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
                MessageBox.Show("WebView初始化失败: " + ex.Message, "错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
        
        private async void WebView_CoreWebView2InitializationCompleted(object sender, Microsoft.Web.WebView2.Core.CoreWebView2InitializationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                try
                {
                    // 向WebView注册JavaScript对象
                    webView.CoreWebView2.AddHostObjectToScript("rhino", jsApi);
                    
                    // 等待一小段时间确保对象注册完成
                    await Task.Delay(100);
                    
                    // 注入初始化脚本，确保网页可以访问rhino对象
                    await webView.CoreWebView2.ExecuteScriptAsync(@"
                        (async function() {
                            try {
                                window.rhino = chrome.webview.hostObjects.rhino;
                                
                                // 创建异步包装函数
                                window.rhino.CaptureCurrentViewport = async function() {
                                    try {
                                        const result = await chrome.webview.hostObjects.rhino.CaptureCurrentViewport();
                                        return result;
                                    } catch (error) {
                                        console.error('调用CaptureCurrentViewport失败:', error);
                                        throw error;
                                    }
                                };
                                
                                window.rhino.GetModelInfo = async function() {
                                    try {
                                        const result = await chrome.webview.hostObjects.rhino.GetModelInfo();
                                        return result;
                                    } catch (error) {
                                        console.error('调用GetModelInfo失败:', error);
                                        throw error;
                                    }
                                };
                                
                                window.rhino.CreateRenderMode = async function(settingsJson) {
                                    try {
                                        const result = await chrome.webview.hostObjects.rhino.CreateRenderMode(settingsJson);
                                        return result;
                                    } catch (error) {
                                        console.error('调用CreateRenderMode失败:', error);
                                        throw error;
                                    }
                                };
                                
                                console.log('Rhino API已注册并包装完成');
                                console.log('可用方法:', Object.getOwnPropertyNames(window.rhino));
                            } catch (error) {
                                console.error('Rhino API注册失败:', error);
                            }
                        })();
                    ");
                    
                    RhinoApp.WriteLine("Rhino JavaScript API已成功注册");
                }
                catch (Exception ex)
                {
                    RhinoApp.WriteLine("注册JavaScript API时出错: " + ex.Message);
                }
            }
            else
            {
                RhinoApp.WriteLine("WebView初始化失败: " + e.InitializationException.Message);
            }
        }
    }
}