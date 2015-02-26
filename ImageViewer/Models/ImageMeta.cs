using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Web;

namespace ImageViewer.Models
{
	public class ImageMeta
	{
		[Key, ForeignKey("ImageInfo")]
		public int ImageInfoId { get; set; }

		public ImageInfo ImageInfo { get; set; }

		public string Name { get; set; }

		public int Width { get; set; }

		public int Height { get; set; }
	}
}