using System;
using System.Collections.Generic;
using System.Drawing;
using System.Linq;
using System.Web;

namespace ImageViewer.Models
{
	public class ImageInfo
	{
		public int Id { get; set; }

		public string Name { get; set; }

		public string Ext { get; set; }

		public string FullPath { get; set; }

		public string Path { get; set; }

		public virtual ICollection<ImageTag> Tags { get; set; }

		public DateTime DateTaken { get; set; }

		public virtual ImageMeta Meta { get; set; }

		public RotateFlipType? RotateFlipType { get; set; }
	}
}