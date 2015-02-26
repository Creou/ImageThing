using System;
using System.Collections.Generic;
using System.Drawing.Imaging;
using System.Linq;
using System.Web;

namespace ImageViewer.Models
{
	public class ImageTag
	{
		public int Id { get; set; }

		public int ImageInfoId { get; set; }

		public virtual ImageInfo Info { get; set; }

		public string Name { get; set; }

		public string Value { get; set; }

		public PropertyItem PropertyItem { get; set; }
	}
}