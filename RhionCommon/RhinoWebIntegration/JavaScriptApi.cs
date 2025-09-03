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
        
        // 创建新的渲染模式
        public string CreateRenderMode(string settingsJson)
        {
            try
            {
                RhinoApp.WriteLine("开始创建RenderMode，设置参数: " + settingsJson);
                
                // 解析JSON参数
                var settings = ParseRenderModeSettings(settingsJson);
                
                // 获取当前文档
                var doc = RhinoDoc.ActiveDoc;
                if (doc == null)
                {
                    return "{\"success\":false,\"error\":\"没有活动的Rhino文档\"}";
                }
                
                // 获取现有的显示模式
                var existingModes = DisplayModeDescription.GetDisplayModes();
                if (existingModes == null || existingModes.Length == 0)
                {
                    return "{\"success\":false,\"error\":\"无法获取现有显示模式\"}";
                }
                
                // 选择合适的基础模式作为模板
                // 默认使用着色模式作为基础模式
                DisplayModeDescription baseMode = null;
                foreach (var mode in existingModes)
                {
                    if (mode.EnglishName.Contains("Shaded"))
                    {
                        baseMode = mode;
                        break;
                    }
                }
                
                // 如果没有找到着色模式，使用第一个可用的模式作为基础
                if (baseMode == null)
                {
                    baseMode = existingModes[0];
                }
                
                RhinoApp.WriteLine($"正在基于 {baseMode.EnglishName} 模式创建新模式: renderTest");
                
                // 创建新的显示模式
                var newModeId = DisplayModeDescription.AddDisplayMode("renderTest");
                if (newModeId == Guid.Empty)
                {
                    return "{\"success\":false,\"error\":\"无法创建新的显示模式\"}";
                }
                
                // 获取新创建的显示模式
                var allModes = DisplayModeDescription.GetDisplayModes();
                DisplayModeDescription newMode = null;
                foreach (var mode in allModes)
                {
                    if (mode.Id == newModeId)
                    {
                        newMode = mode;
                        break;
                    }
                }
                
                if (newMode == null)
                {
                    return "{\"success\":false,\"error\":\"无法获取新创建的显示模式\"}";
                }
                
                // 应用用户设置到新的显示模式
                SetDisplayModeProperties(newMode, settings);
                
                // 更新显示模式
                DisplayModeDescription.UpdateDisplayMode(newMode);
                
                // 刷新视图以显示新的显示模式
                doc.Views.Redraw();
                
                RhinoApp.WriteLine($"成功创建新的RenderMode: renderTest");
                return $"{{\"success\":true,\"message\":\"成功创建新的RenderMode: renderTest\",\"mode\":\"renderTest\"}}";
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("创建RenderMode时出错: " + ex.Message);
                return $"{{\"success\":false,\"error\":\"创建RenderMode时出错: {ex.Message}\"}}";
            }
        }
        
        // 解析渲染模式设置的辅助方法
        private RenderModeSettings ParseRenderModeSettings(string json)
        {
            var settings = new RenderModeSettings();
            
            try
            {
                // 解析顶层name字段
                if (json.Contains("\"name\""))
                {
                    var nameStart = json.IndexOf("\"name\":\"") + 8;
                    var nameEnd = json.IndexOf("\"", nameStart);
                    if (nameEnd > nameStart)
                        settings.Name = json.Substring(nameStart, nameEnd - nameStart);
                }
                
                // 解析background配置
                if (json.Contains("\"background\":"))
                {
                    var bgStart = json.IndexOf("\"background\":");
                    var bgEnd = json.IndexOf("}", bgStart) + 1;
                    if (bgEnd > bgStart)
                    {
                        var bgJson = json.Substring(bgStart, bgEnd - bgStart);
                        
                        if (bgJson.Contains("\"type\""))
                        {
                            var typeStart = bgJson.IndexOf("\"type\":\"") + 8;
                            var typeEnd = bgJson.IndexOf("\"", typeStart);
                            if (typeEnd > typeStart)
                                settings.Background.Type = bgJson.Substring(typeStart, typeEnd - typeStart);
                        }
                        
                        if (bgJson.Contains("\"mode\""))
                        {
                            var modeStart = bgJson.IndexOf("\"mode\":\"") + 8;
                            var modeEnd = bgJson.IndexOf("\"", modeStart);
                            if (modeEnd > modeStart)
                                settings.Background.Mode = bgJson.Substring(modeStart, modeEnd - modeStart);
                        }
                    }
                }
                
                // 解析groundPlane配置
                if (json.Contains("\"groundPlane\":"))
                {
                    settings.GroundPlane.Show = json.Contains("\"show\":true");
                    settings.GroundPlane.ShowShadow = json.Contains("\"showShadow\":true");
                    settings.GroundPlane.AutoHeight = json.Contains("\"autoHeight\":true");
                    
                    if (json.Contains("\"height\":"))
                    {
                        var heightStart = json.IndexOf("\"height\":") + 9;
                        var heightEnd = json.IndexOfAny(new char[] { ',', '}' }, heightStart);
                        if (heightEnd > heightStart)
                        {
                            var heightStr = json.Substring(heightStart, heightEnd - heightStart);
                            if (double.TryParse(heightStr, out double height))
                                settings.GroundPlane.Height = height;
                        }
                    }
                }
                
                // 解析workflow配置
                if (json.Contains("\"workflow\":"))
                {
                    settings.Workflow.AdjustInputColors = json.Contains("\"adjustInputColors\":true");
                    settings.Workflow.AdjustInputTextures = json.Contains("\"adjustInputTextures\":true");
                    settings.Workflow.AdjustOutputColors = json.Contains("\"adjustOutputColors\":true");
                    settings.Workflow.AdjustOutputTextures = json.Contains("\"adjustOutputTextures\":true");
                    
                    // 解析gamma值
                    if (json.Contains("\"inputGamma\":"))
                    {
                        var gammaStart = json.IndexOf("\"inputGamma\":") + 13;
                        var gammaEnd = json.IndexOfAny(new char[] { ',', '}' }, gammaStart);
                        if (gammaEnd > gammaStart)
                        {
                            var gammaStr = json.Substring(gammaStart, gammaEnd - gammaStart);
                            if (double.TryParse(gammaStr, out double gamma))
                                settings.Workflow.InputGamma = gamma;
                        }
                    }
                    
                    if (json.Contains("\"outputGamma\":"))
                    {
                        var gammaStart = json.IndexOf("\"outputGamma\":") + 14;
                        var gammaEnd = json.IndexOfAny(new char[] { ',', '}' }, gammaStart);
                        if (gammaEnd > gammaStart)
                        {
                            var gammaStr = json.Substring(gammaStart, gammaEnd - gammaStart);
                            if (double.TryParse(gammaStr, out double gamma))
                                settings.Workflow.OutputGamma = gamma;
                        }
                    }
                }
                
                // 解析shading配置
                if (json.Contains("\"shading\":"))
                {
                    settings.Shading.ShowObjects = json.Contains("\"showObjects\":true");
                    settings.Shading.ShowWireframe = json.Contains("\"showWireframe\":true");
                    settings.Shading.FlatShading = json.Contains("\"flatShading\":true");
                    settings.Shading.ShowVertexColors = json.Contains("\"showVertexColors\":true");
                    
                    if (json.Contains("\"materialDisplay\""))
                    {
                        var matStart = json.IndexOf("\"materialDisplay\":\"") + 18;
                        var matEnd = json.IndexOf("\"", matStart);
                        if (matEnd > matStart)
                            settings.Shading.MaterialDisplay = json.Substring(matStart, matEnd - matStart);
                    }
                    
                    if (json.Contains("\"singleColor\""))
                    {
                        var colorStart = json.IndexOf("\"singleColor\":\"") + 14;
                        var colorEnd = json.IndexOf("\"", colorStart);
                        if (colorEnd > colorStart)
                            settings.Shading.SingleColor = json.Substring(colorStart, colorEnd - colorStart);
                    }
                    
                    // 解析数值属性
                    if (json.Contains("\"glossiness\":"))
                    {
                        var glossStart = json.IndexOf("\"glossiness\":") + 13;
                        var glossEnd = json.IndexOfAny(new char[] { ',', '}' }, glossStart);
                        if (glossEnd > glossStart)
                        {
                            var glossStr = json.Substring(glossStart, glossEnd - glossStart);
                            if (double.TryParse(glossStr, out double gloss))
                                settings.Shading.Glossiness = gloss;
                        }
                    }
                    
                    if (json.Contains("\"transparency\":"))
                    {
                        var transStart = json.IndexOf("\"transparency\":") + 15;
                        var transEnd = json.IndexOfAny(new char[] { ',', '}' }, transStart);
                        if (transEnd > transStart)
                        {
                            var transStr = json.Substring(transStart, transEnd - transStart);
                            if (double.TryParse(transStr, out double trans))
                                settings.Shading.Transparency = trans;
                        }
                    }
                }
                
                // 解析visibility配置
                if (json.Contains("\"visibility\":"))
                {
                    // 基础元素可见性设置
                    settings.Visibility.ShowCurves = json.Contains("\"showCurves\":true");
                    settings.Visibility.ShowConstructionLines = json.Contains("\"showConstructionLines\":true");
                    settings.Visibility.ShowIsocurves = json.Contains("\"showIsocurves\":true");
                    settings.Visibility.ShowMeshWires = json.Contains("\"showMeshWires\":true");
                    settings.Visibility.ShowMeshVertices = json.Contains("\"showMeshVertices\":true");
                    settings.Visibility.ShowMeshEdges = json.Contains("\"showMeshEdges\":true");
                    settings.Visibility.ShowMeshBoundaries = json.Contains("\"showMeshBoundaries\":true");
                    settings.Visibility.ShowMeshNormals = json.Contains("\"showMeshNormals\":true");
                    settings.Visibility.ShowGridLines = json.Contains("\"showGridLines\":true");
                    settings.Visibility.ShowLights = json.Contains("\"showLights\":true");
                    settings.Visibility.ShowCameras = json.Contains("\"showCameras\":true");
                    settings.Visibility.ShowText = json.Contains("\"showText\":true");
                    settings.Visibility.ShowDimensions = json.Contains("\"showDimensions\":true");
                    settings.Visibility.ShowPoints = json.Contains("\"showPoints\":true");
                    settings.Visibility.ShowClouds = json.Contains("\"showClouds\":true");
                    
                    // 背景渐变设置
                    if (json.Contains("\"gradientTopColor\""))
                    {
                        var colorStart = json.LastIndexOf("\"gradientTopColor\":\"") + 19;
                        var colorEnd = json.IndexOf("\"", colorStart);
                        if (colorEnd > colorStart)
                            settings.Visibility.GradientTopColor = json.Substring(colorStart, colorEnd - colorStart);
                    }
                    
                    if (json.Contains("\"gradientBottomColor\""))
                    {
                        var colorStart = json.LastIndexOf("\"gradientBottomColor\":\"") + 22;
                        var colorEnd = json.IndexOf("\"", colorStart);
                        if (colorEnd > colorStart)
                            settings.Visibility.GradientBottomColor = json.Substring(colorStart, colorEnd - colorStart);
                    }
                    
                    // 颜色渐变效果设置
                    if (json.Contains("\"fadeColor\""))
                    {
                        var colorStart = json.LastIndexOf("\"fadeColor\":\"") + 12;
                        var colorEnd = json.IndexOf("\"", colorStart);
                        if (colorEnd > colorStart)
                            settings.Visibility.FadeColor = json.Substring(colorStart, colorEnd - colorStart);
                    }
                    
                    // 数值型设置的解析
                    settings.Visibility.FadeAmount = ParseFloatValue(json, "fadeAmount", settings.Visibility.FadeAmount);
                    settings.Visibility.HatchStrength = ParseFloatValue(json, "hatchStrength", settings.Visibility.HatchStrength);
                    settings.Visibility.HatchWidth = ParseFloatValue(json, "hatchWidth", settings.Visibility.HatchWidth);
                    settings.Visibility.CurveThickness = ParseFloatValue(json, "curveThickness", settings.Visibility.CurveThickness);
                    settings.Visibility.CurveThicknessScale = ParseFloatValue(json, "curveThicknessScale", settings.Visibility.CurveThicknessScale);
                    settings.Visibility.SurfaceEdgeThickness = ParseFloatValue(json, "surfaceEdgeThickness", settings.Visibility.SurfaceEdgeThickness);
                    
                    // 布尔型设置的解析
                    settings.Visibility.EnableDitherTransparency = json.Contains("\"enableDitherTransparency\":true");
                    settings.Visibility.ShowIsocurvesU = json.Contains("\"showIsocurvesU\":true");
                    settings.Visibility.ShowIsocurvesV = json.Contains("\"showIsocurvesV\":true");
                    settings.Visibility.ShowIsocurvesW = json.Contains("\"showIsocurvesW\":true");
                    
                    // 枚举型设置的解析
                    settings.Visibility.CurveThicknessUsage = ParseEnumValue(json, "curveThicknessUsage", settings.Visibility.CurveThicknessUsage);
                    settings.Visibility.SurfaceEdgeThicknessUsage = ParseEnumValue(json, "surfaceEdgeThicknessUsage", settings.Visibility.SurfaceEdgeThicknessUsage);
                    settings.Visibility.IsoColorUsage = ParseEnumValue(json, "isoColorUsage", settings.Visibility.IsoColorUsage);
                    settings.Visibility.IsoThicknessUsage = ParseEnumValue(json, "isoThicknessUsage", settings.Visibility.IsoThicknessUsage);
                    settings.Visibility.NakedEdgeThicknessUsage = ParseEnumValue(json, "nakedEdgeThicknessUsage", settings.Visibility.NakedEdgeThicknessUsage);
                }
                
                // 解析lighting配置
                if (json.Contains("\"lighting\":"))
                {
                    if (json.Contains("\"mode\""))
                    {
                        var modeStart = json.LastIndexOf("\"mode\":\"") + 8;
                        var modeEnd = json.IndexOf("\"", modeStart);
                        if (modeEnd > modeStart)
                            settings.Lighting.Mode = json.Substring(modeStart, modeEnd - modeStart);
                    }
                    
                    if (json.Contains("\"ambientColor\""))
                    {
                        var colorStart = json.IndexOf("\"ambientColor\":\"") + 16;
                        var colorEnd = json.IndexOf("\"", colorStart);
                        if (colorEnd > colorStart)
                            settings.Lighting.AmbientColor = json.Substring(colorStart, colorEnd - colorStart);
                    }
                    
                    settings.Lighting.UseAdvancedGPU = json.Contains("\"useAdvancedGPU\":true");
                }
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("解析设置参数时出错: " + ex.Message);
            }
            
            return settings;
        }
        
        // 辅助方法：解析浮点数值
    private static float ParseFloatValue(string json, string propertyName, float defaultValue = 0.0f)
    {
        var pattern = $"\"{propertyName}\":";
        if (json.Contains(pattern))
        {
            var start = json.LastIndexOf(pattern) + pattern.Length;
            var end = json.IndexOfAny(new char[] { ',', '}' }, start);
            if (end > start)
            {
                var valueStr = json.Substring(start, end - start).Trim();
                if (float.TryParse(valueStr, out float parsedValue))
                {
                    return parsedValue;
                }
            }
        }
        return defaultValue;
    }
    
    // 辅助方法：解析枚举值
    private static string ParseEnumValue(string json, string propertyName, string defaultValue = "")
    {
        var pattern = $"\"{propertyName}\":\"";
        if (json.Contains(pattern))
        {
            var start = json.LastIndexOf(pattern) + pattern.Length;
            var end = json.IndexOf('"', start);
            if (end > start)
            {
                return json.Substring(start, end - start);
            }
        }
        return defaultValue;
    }
        
        // 设置显示模式属性的辅助方法
        private void SetDisplayModeProperties(DisplayModeDescription displayMode, RenderModeSettings settings)
        {
            try
            {
                RhinoApp.WriteLine($"========== 开始应用RenderMode设置 ==========");
                
                // 1. 设置显示模式名称
                displayMode.EnglishName = settings.Name;
                RhinoApp.WriteLine($"✓ 设置显示模式英文名称: {settings.Name}");
                
                var attrs = displayMode.DisplayAttributes;
                if (attrs != null)
                {
                    // 2. 设置背景填充
                    try
                    {
                        if (!string.IsNullOrEmpty(settings.Background.Color))
                        {
                            var bgColor = ColorTranslator.FromHtml(settings.Background.Color);
                            attrs.SetFill(bgColor);
                            RhinoApp.WriteLine($"✓ 设置单色背景: {settings.Background.Color}");
                        }
                        
                        // 设置渐变背景（如果提供了渐变颜色）
                        if (!string.IsNullOrEmpty(settings.Visibility.GradientTopColor) && 
                            !string.IsNullOrEmpty(settings.Visibility.GradientBottomColor))
                        {
                            var topColor = ColorTranslator.FromHtml(settings.Visibility.GradientTopColor);
                            var bottomColor = ColorTranslator.FromHtml(settings.Visibility.GradientBottomColor);
                            attrs.SetFill(topColor, bottomColor);
                            RhinoApp.WriteLine($"✓ 设置渐变背景: {settings.Visibility.GradientTopColor} -> {settings.Visibility.GradientBottomColor}");
                        }
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 背景设置失败: {ex.Message}");
                    }
                    
                    // 3. 设置透明度效果
                    try
                    {
                        if (settings.Shading.Transparency > 0)
                        {
                            attrs.SetDitherTransparencyEffect((float)settings.Shading.Transparency);
                            RhinoApp.WriteLine($"✓ 设置抖动透明度: {settings.Shading.Transparency}");
                        }
                        else
                        {
                            attrs.SetDitherTransparencyEffect(0.0f);
                            RhinoApp.WriteLine($"✓ 禁用透明度效果");
                        }
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 透明度设置失败: {ex.Message}");
                    }
                    
                    // 4. 设置颜色渐变效果
                    try
                    {
                        if (settings.Visibility.EnableColorFade && !string.IsNullOrEmpty(settings.Visibility.FadeColor))
                        {
                            var fadeColor = ColorTranslator.FromHtml(settings.Visibility.FadeColor);
                            attrs.SetColorFadeEffect(fadeColor, (float)settings.Visibility.FadeAmount);
                            RhinoApp.WriteLine($"✓ 设置颜色渐变效果: {settings.Visibility.FadeColor}, 强度: {settings.Visibility.FadeAmount}");
                        }
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 颜色渐变设置失败: {ex.Message}");
                    }
                    
                    // 5. 设置对角线阴影效果
                    try
                    {
                        if (settings.Visibility.EnableDiagonalHatch)
                        {
                            attrs.SetDiagonalHatchEffect((float)settings.Visibility.HatchStrength, (float)settings.Visibility.HatchWidth);
                            RhinoApp.WriteLine($"✓ 设置对角线阴影: 强度={settings.Visibility.HatchStrength}, 宽度={settings.Visibility.HatchWidth}");
                        }
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 对角线阴影设置失败: {ex.Message}");
                    }
                    
                    // 6. 设置颜色渐变效果
                    try
                    {
                        if (!string.IsNullOrEmpty(settings.Visibility.FadeColor))
                        {
                            var fadeColor = System.Drawing.ColorTranslator.FromHtml(settings.Visibility.FadeColor);
                            attrs.SetColorFadeEffect(fadeColor, settings.Visibility.FadeAmount);
                            RhinoApp.WriteLine($"✓ 设置颜色渐变效果: 颜色={settings.Visibility.FadeColor}, 强度={settings.Visibility.FadeAmount}");
                        }
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 颜色渐变效果设置失败: {ex.Message}");
                    }
                    
                    // 7. 设置对角线阴影效果
                    try
                    {
                        attrs.SetDiagonalHatchEffect(settings.Visibility.HatchStrength, settings.Visibility.HatchWidth);
                        RhinoApp.WriteLine($"✓ 设置对角线阴影效果: 强度={settings.Visibility.HatchStrength}, 宽度={settings.Visibility.HatchWidth}");
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 对角线阴影效果设置失败: {ex.Message}");
                    }
                    
                    // 8. 设置抖动透明度效果
                    try
                    {
                        float ditherValue = settings.Visibility.EnableDitherTransparency ? 1.0f : 0.0f;
                        attrs.SetDitherTransparencyEffect(ditherValue);
                        RhinoApp.WriteLine($"✓ 设置抖动透明度效果: {settings.Visibility.EnableDitherTransparency} (值: {ditherValue})");
                    }
                    catch (Exception ex)
                    {
                        RhinoApp.WriteLine($"○ 抖动透明度效果设置失败: {ex.Message}");
                    }
                    
                    // 9. 记录其他配置项（API暂不支持直接设置）
                     RhinoApp.WriteLine($"○ 曲线厚度使用模式: {settings.Visibility.CurveThicknessUsage}");
                     RhinoApp.WriteLine($"○ 曲线像素厚度: {settings.Visibility.CurveThickness}");
                     RhinoApp.WriteLine($"○ 曲线缩放厚度: {settings.Visibility.CurveThicknessScale}");
                     RhinoApp.WriteLine($"○ 表面边缘厚度使用模式: {settings.Visibility.SurfaceEdgeThicknessUsage}");
                     RhinoApp.WriteLine($"○ 表面边缘厚度: {settings.Visibility.SurfaceEdgeThickness}");
                     RhinoApp.WriteLine($"○ 表面等参线U: {settings.Visibility.ShowIsocurvesU}");
                     RhinoApp.WriteLine($"○ 表面等参线V: {settings.Visibility.ShowIsocurvesV}");
                     RhinoApp.WriteLine($"○ 表面等参线W: {settings.Visibility.ShowIsocurvesW}");
                     RhinoApp.WriteLine($"○ 等参线颜色使用模式: {settings.Visibility.IsoColorUsage}");
                     RhinoApp.WriteLine($"○ 等参线厚度使用模式: {settings.Visibility.IsoThicknessUsage}");
                     RhinoApp.WriteLine($"○ 裸边厚度使用模式: {settings.Visibility.NakedEdgeThicknessUsage}");
                     
                     // 10. 设置网格线厚度
                    if (attrs.MeshSpecificAttributes != null)
                    {
                        try
                        {
                            attrs.MeshSpecificAttributes.MeshWireThickness = settings.Visibility.ShowMeshWires ? 
                                (int)settings.Visibility.MeshWireThickness : 0;
                            RhinoApp.WriteLine($"✓ 设置网格线厚度: {(settings.Visibility.ShowMeshWires ? settings.Visibility.MeshWireThickness : 0)}");
                        }
                        catch (Exception ex)
                        {
                            RhinoApp.WriteLine($"○ 网格线设置失败: {ex.Message}");
                        }
                    }
                    
                    // 记录其他配置（DisplayPipelineAttributes不直接支持的属性）
                    RhinoApp.WriteLine($"○ 显示对象: {settings.Shading.ShowObjects}");
                    RhinoApp.WriteLine($"○ 显示线框: {settings.Shading.ShowWireframe}");
                    RhinoApp.WriteLine($"○ 平面着色: {settings.Shading.FlatShading}");
                    RhinoApp.WriteLine($"○ 显示曲线: {settings.Visibility.ShowCurves}");
                    RhinoApp.WriteLine($"○ 显示构造线: {settings.Visibility.ShowConstructionLines}");
                    RhinoApp.WriteLine($"○ 显示点: {settings.Visibility.ShowPoints}");
                    RhinoApp.WriteLine($"○ 显示点云: {settings.Visibility.ShowClouds}");
                    RhinoApp.WriteLine($"○ 显示文本: {settings.Visibility.ShowText}");
                    RhinoApp.WriteLine($"○ 显示注解: {settings.Visibility.ShowDimensions}");
                    RhinoApp.WriteLine($"○ 显示灯光: {settings.Visibility.ShowLights}");
                    RhinoApp.WriteLine($"○ 显示相机: {settings.Visibility.ShowCameras}");
                    RhinoApp.WriteLine($"○ 显示网格边界: {settings.Visibility.ShowMeshBoundaries}");
                    RhinoApp.WriteLine($"○ 显示网格法线: {settings.Visibility.ShowMeshNormals}");
                    RhinoApp.WriteLine($"○ 显示网格顶点: {settings.Visibility.ShowMeshVertices}");
                    RhinoApp.WriteLine($"○ 显示网格边: {settings.Visibility.ShowMeshEdges}");
                    RhinoApp.WriteLine($"○ 显示网格线: {settings.Visibility.ShowGridLines}");
                    RhinoApp.WriteLine($"○ 地平面显示: {settings.GroundPlane.Show}, 高度: {settings.GroundPlane.Height}");
                    RhinoApp.WriteLine($"○ 显示顶点颜色: {settings.Shading.ShowVertexColors}");
                    RhinoApp.WriteLine($"○ 材质显示: {settings.Shading.MaterialDisplay}");
                    RhinoApp.WriteLine($"○ 光泽度: {settings.Shading.Glossiness}");
                    RhinoApp.WriteLine($"○ 单一颜色: {settings.Shading.SingleColor}");
                    RhinoApp.WriteLine($"○ 工作流设置: 输入Gamma={settings.Workflow.InputGamma}, 输出Gamma={settings.Workflow.OutputGamma}");
                    RhinoApp.WriteLine($"○ 照明模式: {settings.Lighting.Mode}, 环境颜色: {settings.Lighting.AmbientColor}");
                }
                
                RhinoApp.WriteLine($"========== RenderMode设置应用完成 ==========");
            }
            catch (Exception ex)
            {
                RhinoApp.WriteLine("设置显示模式属性时出错: " + ex.Message);
            }
        }
    }
    
    // 渲染模式设置的数据结构
    public class RenderModeSettings
    {
        public string Name { get; set; } = "RenderMode";
        public BackgroundSettings Background { get; set; } = new BackgroundSettings();
        public GroundPlaneSettings GroundPlane { get; set; } = new GroundPlaneSettings();
        public WorkflowSettings Workflow { get; set; } = new WorkflowSettings();
        public ShadingSettings Shading { get; set; } = new ShadingSettings();
        public VisibilitySettings Visibility { get; set; } = new VisibilitySettings();
        public LightingSettings Lighting { get; set; } = new LightingSettings();
    }

    public class BackgroundSettings
    {
        public string Type { get; set; } = "单一颜色";
        public string Mode { get; set; } = "使用正面设置";
        public string Color { get; set; } = "#ffffff";
    }

    public class GroundPlaneSettings
    {
        public bool Show { get; set; } = false;
        public bool ShowShadow { get; set; } = false;
        public double Height { get; set; } = 0;
        public bool AutoHeight { get; set; } = true;
    }

    public class WorkflowSettings
    {
        public bool AdjustInputColors { get; set; } = false;
        public bool AdjustInputTextures { get; set; } = false;
        public double InputGamma { get; set; } = 1;
        public bool AdjustOutputColors { get; set; } = false;
        public bool AdjustOutputTextures { get; set; } = false;
        public double OutputGamma { get; set; } = 1;
    }

    public class ShadingSettings
    {
        public bool ShowObjects { get; set; } = true;
        public bool ShowWireframe { get; set; } = false;
        public bool FlatShading { get; set; } = false;
        public bool ShowVertexColors { get; set; } = false;
        public string MaterialDisplay { get; set; } = "使用物件颜色";
        public double Glossiness { get; set; } = 0;
        public double Transparency { get; set; } = 0;
        public string SingleColor { get; set; } = "#808080";
    }

    public class VisibilitySettings
    {
        // 基础可见性设置（记录用途，DisplayPipelineAttributes不直接支持）
        public bool ShowCurves { get; set; } = true;
        public bool ShowConstructionLines { get; set; } = false;
        public bool ShowIsocurves { get; set; } = false;
        public bool ShowMeshWires { get; set; } = false;
        public bool ShowMeshVertices { get; set; } = false;
        public bool ShowMeshEdges { get; set; } = false;
        public bool ShowMeshBoundaries { get; set; } = false;
        public bool ShowMeshNormals { get; set; } = false;
        public bool ShowGridLines { get; set; } = false;
        public bool ShowLights { get; set; } = false;
        public bool ShowCameras { get; set; } = false;
        public bool ShowText { get; set; } = false;
        public bool ShowDimensions { get; set; } = false;
        public bool ShowPoints { get; set; } = false;
        public bool ShowClouds { get; set; } = false;
        
        // 背景渐变设置（基于DisplayPipelineAttributes.SetFill方法）
        public string GradientTopColor { get; set; } = "";
        public string GradientBottomColor { get; set; } = "";
        public string GradientTopLeftColor { get; set; } = "";
        public string GradientBottomLeftColor { get; set; } = "";
        public string GradientTopRightColor { get; set; } = "";
        public string GradientBottomRightColor { get; set; } = "";
        
        // 颜色渐变效果设置（基于DisplayPipelineAttributes.SetColorFadeEffect方法）
        public bool EnableColorFade { get; set; } = false;
        public string FadeColor { get; set; } = "#ffffff";
        public float FadeAmount { get; set; } = 0.0f;
        
        // 对角线阴影效果设置（基于DisplayPipelineAttributes.SetDiagonalHatchEffect方法）
        public bool EnableDiagonalHatch { get; set; } = false;
        public float HatchStrength { get; set; } = 0.0f;
        public float HatchWidth { get; set; } = 1.0f;
        
        // 抖动透明度效果设置（基于DisplayPipelineAttributes.SetDitherTransparencyEffect方法）
        public bool EnableDitherTransparency { get; set; } = false;
        public float DitherTransparencyAmount { get; set; } = 0.0f;
        
        // 曲线厚度设置（基于DisplayPipelineAttributes.SetCurveThicknessUsage方法）
        public string CurveThicknessUsage { get; set; } = "ByObject";  // "ByObject", "PixelThickness", "ScaleThickness"
        public float CurveThickness { get; set; } = 1.0f;  // 像素厚度
        public float CurveThicknessScale { get; set; } = 1.0f;  // 缩放厚度
        
        // 表面边缘厚度设置（基于DisplayPipelineAttributes.SetSurfaceEdgeThicknessUsage方法）
        public string SurfaceEdgeThicknessUsage { get; set; } = "ByObject";  // "ByObject", "PixelThickness", "ScaleThickness"
        public float SurfaceEdgeThickness { get; set; } = 1.0f;
        
        // 网格线厚度设置（基于MeshSpecificAttributes.MeshWireThickness属性）
        public float MeshWireThickness { get; set; } = 1.0f;
        
        // 表面等参线设置（基于DisplayPipelineAttributes.SetSurfaceIsoApplyPattern方法）
        public bool ShowIsocurvesU { get; set; } = false;
        public bool ShowIsocurvesV { get; set; } = false;
        public bool ShowIsocurvesW { get; set; } = false;
        
        // 等参线颜色模式（基于DisplayPipelineAttributes.SetSurfaceIsoColorUsage方法）
        public string IsoColorUsage { get; set; } = "ObjectColor";  // "ObjectColor", "SingleColor"
        
        // 表面等参线厚度设置（基于DisplayPipelineAttributes.SetSurfaceIsoThicknessUsage方法）
        public string IsoThicknessUsage { get; set; } = "ByObject";  // "ByObject", "PixelThickness", "ScaleThickness"
        
        // 表面裸边厚度设置（基于DisplayPipelineAttributes.SetSurfaceNakedEdgeThicknessUsage方法）
        public string NakedEdgeThicknessUsage { get; set; } = "ByObject";  // "ByObject", "PixelThickness", "ScaleThickness"
    }

    public class LightingSettings
    {
        public string Mode { get; set; } = "场景照明";
        public string AmbientColor { get; set; } = "#ffffff";
        public bool UseAdvancedGPU { get; set; } = false;
    }
}