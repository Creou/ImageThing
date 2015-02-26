using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace ImageViewer.Models
{
	public class ImageData
	{
		public int ImageId { get; set; }
		
		public byte[] Data { get; set; }
	}
}