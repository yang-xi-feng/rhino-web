using Rhino;
using Rhino.Commands;
using System;

namespace RhinoWebIntegration
{
    [System.Runtime.InteropServices.Guid("3F2504E0-4F89-11D3-9A0C-0305E82C3301")] // 使用临时GUID
    public class RhinoWebIntegrationCommand : Command
    {
        public RhinoWebIntegrationCommand()
        {
            // Rhino only creates one instance of each command class defined in a
            // plug-in, so it is safe to store a refence in a static property.
            Instance = this;
        }

        ///<summary>The only instance of this command.</summary>
        public static RhinoWebIntegrationCommand Instance { get; private set; }

        ///<returns>The command name as it appears on the Rhino command line.</returns>
        public override string EnglishName => "ShowRhinoWebView"; // 更友好的命令名称

        protected override Result RunCommand(RhinoDoc doc, RunMode mode)
        {
            try
            {
                // 创建并显示WebView窗口
                RhinoApp.WriteLine("正在启动Rhino Web Integration...");
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
