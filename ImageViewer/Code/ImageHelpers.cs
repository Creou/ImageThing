using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Web;

using ImageViewer.Models;

namespace ImageViewer.Code
{
	public static class ImageHelpers
	{
		private static List<PixelFormat> IndexedPixelFormats = new List<PixelFormat>
		{
			PixelFormat.Format1bppIndexed,
			PixelFormat.Format4bppIndexed,
			PixelFormat.Format8bppIndexed,
			PixelFormat.Undefined,
			PixelFormat.DontCare,
			PixelFormat.Format16bppArgb1555,
			PixelFormat.Format16bppGrayScale
		};

		//private static Dictionary<int,int> = new Dictionary<int, int>
		//{
		//	{0, RotateFlipType.}
		//}
		private static ImageCodecInfo codecInfo;
		private static ImageCodecInfo CodecInfo
		{
			get
			{
				if (codecInfo != null)
				{
					return codecInfo;
				}
				ImageCodecInfo[] info = ImageCodecInfo.GetImageEncoders();
				codecInfo = info.FirstOrDefault(ici => ici.FormatID.Equals(ImageFormat.Jpeg.Guid));
				if (codecInfo == null)
				{
					throw new InvalidProgramException("Encoder was null");
				}
				return codecInfo;
			}
		}

		private static readonly EncoderParameters EncoderParams = new EncoderParameters { Param = new[] { new EncoderParameter(Encoder.Quality, 90L) } };

		public static int GetXPix(this Image image, int height)
		{
			var xfactor = image.Height / (float)height;
			var xPix = image.Width / xfactor;
			return (int)xPix;
		}

		public static Image GetResizedImage(this Image image, int size)
		{
			if (size < 1)
			{
				size = 1;
			}

			int width, height;
			double scale;
			if (image.Width > image.Height)
			{
				width = size;
				scale = (double)image.Width / size;
				height = (int)Math.Round(image.Height / scale);
			}
			else
			{
				height = size;
				scale = (double)image.Height / size;
				width = (int)Math.Round(image.Width / scale);
			}

			if (width >= image.Width || height >= image.Height)
			{
				return image;
			}
			var bitmap = new Bitmap(size, size);
			using (var graphics = Graphics.FromImage(bitmap))
			{
				graphics.CompositingQuality = System.Drawing.Drawing2D.CompositingQuality.HighQuality;
				graphics.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
				graphics.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;

				graphics.DrawImage(image, (size - width) / 2, (size - height) / 2, width, height);
				return bitmap;
			}
		}

		public static Image Rotate(this Image image, RotateFlipType? flipType)
		{
			if (flipType != null)
			{
				image.RotateFlip(flipType.Value);
			}

			return image;
		}

		public static byte[] ImageToBytes(this Image bitmap)
		{
			using (var ms = new MemoryStream())
			{
				bitmap.Save(ms, CodecInfo, EncoderParams);
				return ms.ToArray();
			}
		}

		public static Image AddIdWatermark(this Image image, int id)
		{
			var rect = new Rectangle(0, 0, image.Width, image.Height);
			if (IndexedPixelFormats.Contains(image.PixelFormat))
			{
				image = DeIndexImagePixelFormat(image);
			}

			using (var graph = Graphics.FromImage(image))
			{
				graph.DrawString(id.ToString(), new Font("Tahoma", 9), Brushes.Black, rect);
				graph.DrawString(id.ToString(), new Font("Tahoma", 8), Brushes.White, rect);
			}
			return image;
		}

		public static Image DeIndexImagePixelFormat(this Image image)
		{
			Image newImage;
			using (var memstrm = new MemoryStream())
			{
				image.Save(memstrm, ImageFormat.Jpeg);
				newImage = Image.FromStream(memstrm);
			}
			return newImage;
		}

		public static void GenerateImages(string path, int number)
		{
			for (int i = 1; i <= number; i++)
			{
				using (var bmp = new Bitmap(300, 300, PixelFormat.Format32bppArgb))
				{
					var rect = new RectangleF(10, 10, 250, 250);
					using (var graph = Graphics.FromImage(bmp))
					{
						graph.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
						graph.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic;
						graph.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality;
						graph.DrawString(i.ToString(), new Font("Tahoma", 32), Brushes.White, rect);

					}
					var fullpath = path + @"\" + i + ".jpg";
					try
					{
						bmp.Save(fullpath, ImageFormat.Jpeg);
					}
					catch (Exception) { }
				}
			}
		}
	}
}