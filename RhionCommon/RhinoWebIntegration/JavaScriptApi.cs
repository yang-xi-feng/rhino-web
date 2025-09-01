using Rhino;
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
                // 检查是否有活动文档和视图
                var doc = RhinoDoc.ActiveDoc;
                if (doc == null)
                {
                    RhinoApp.WriteLine("没有活动的Rhino文档");
                    return "";
                }

                var view = doc.Views.ActiveView;
                if (view == null)
                {
                    RhinoApp.WriteLine("没有活动的视图");
                    return "";
                }

                // 获取视口的尺寸
                var viewport = view.ActiveViewport;
                var size = viewport.Size;
                
                // 如果尺寸无效，使用默认尺寸
                if (size.Width <= 0 || size.Height <= 0)
                {
                    size = new Size(800, 600);
                }

                // 捕获视口到位图
                var bitmap = view.CaptureToBitmap(size);
                if (bitmap == null)
                {
                    RhinoApp.WriteLine("无法捕获视口图像");
                    return "";
                }

                // 将位图转换为Base64字符串
                using (var ms = new MemoryStream())
                {
                    bitmap.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                    byte[] imageBytes = ms.ToArray();
                    bitmap.Dispose(); // 释放位图资源
                    return "data:image/png;base64," + Convert.ToBase64String(imageBytes);
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("捕获视口截图时出错: " + ex.Message);
                return "";
            }
        }
        
        // 获取当前模型信息
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