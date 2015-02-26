using System;
using System.Collections.Generic;
using System.Drawing.Imaging;
using System.Linq;
using System.Web;

namespace ImageViewer.Models
{
	public class TagType
	{
		public string Name { get; set; }

		public PropertyItem PropertyItem { get; set; }

		public int Id { get; set; }

		public IEnumerable<string> Values { get; set; }
	}
}