using Microsoft.Owin;
using Owin;

[assembly: OwinStartupAttribute(typeof(ImageViewer.Startup))]
namespace ImageViewer
{
	public partial class Startup
	{
		public void Configuration(IAppBuilder app)
		{
			//ConfigureAuth(app);
		}
	}
}
