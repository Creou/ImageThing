using System;
using System.Collections.Generic;
using System.Configuration;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Web.Http;
using System.Net.Http.Headers;

using ImageViewer.Code;
using ImageViewer.Models;

using Encoder = System.Drawing.Imaging.Encoder;

namespace ImageViewer.Controllers
{
	public class TagController : ApiController
	{
		private ImageContext _context;
		private static string Path = "";

		private const int ThumbHeight = 100;

		private static object lockobj = new object();

		public TagController()
		{
			Path = ConfigurationManager.AppSettings["path"];
			this._context = new ImageContext();
			lock (lockobj)
			{
				GenerateImageInfo();
			}
			//ImageHelpers.GenerateImages(@"c:\newImages", 20000);
		}

		// GET api/tagTypes
		[Route("api/TagTypes")]
		public IEnumerable<TagType> Get()
		{
			using (var context = new ImageContext())
			{
				return context.TagTypes.ToArray();
			}
		}

		[Route("api/Images/Meta"), HttpGet]
		public IEnumerable<ImageMeta> GetImageMeta()
		{
			using (var context = new ImageContext())
			{
				return context.Infos.OrderBy(i => i.DateTaken).Select(i => i.Meta).ToArray();
			}
		}

		[Route("api/Images/{id}/{requestedHeight}/{minHeight}"), HttpGet]
		public HttpResponseMessage GetSingleImage(int id, int requestedHeight, int minHeight)
		{
			ImageInfo path;
			using (var context = new ImageContext())
			{
				path = context.Infos.Find(id);
			}
			if (path == null)
			{
				return Request.CreateErrorResponse(HttpStatusCode.NotFound, new KeyNotFoundException());
			}

			using (var img = Image.FromFile(path.Name))
			{
				var newImage = img.GetResizedImage(requestedHeight).Rotate(path.RotateFlipType).AddIdWatermark(id);
				if (newImage != img)
				{
					return Request.CreateResponse(HttpStatusCode.OK, new ImageData { ImageId = id, Data = newImage.ImageToBytes() });
				}
			}

			return Request.CreateErrorResponse(HttpStatusCode.NotFound, new NoHigherResImageFoundException());
		}

		[Route("api/Images/{requestedHeight}/{minHeight}"), HttpPost]
		public ICollection<ImageData> GetMultipleImages(int requestedHeight, int minHeight, [FromBody]IEnumerable<int> imageIds)
		{
			//var imageIds = imageIdss.Select(i => int.Parse(i));
			List<ImageData> images = new List<ImageData>();
			using (var context = new ImageContext())
			{
				var imagePaths = context.Infos.Where(i => imageIds.Contains(i.Id)).Select(i =>new { i.Name, i.Id, i.RotateFlipType});
				foreach (var path in imagePaths)
				{
					using (var img = Image.FromFile(path.Name))
					{
						var newImage = img.GetResizedImage(requestedHeight).Rotate(path.RotateFlipType).AddIdWatermark(path.Id);
						if (newImage.Height >= minHeight)
						{
							images.Add(new ImageData { ImageId = path.Id, Data = newImage.ImageToBytes() });
						}
					}
				}
			}

			return images;
		}


		// POST api/tag
		[Route("api/Images/{id}/Tags/{tagId}/{value}")]
		public void Post(int id, int tagId, string value)
		{
			using (var context = new ImageContext())
			{
				var tag = context.Infos.Find(id).Tags.FirstOrDefault(t => t.Id == tagId);
				if (tag != null)
				{
					tag.Value = value;
				}
				else
				{
					context.Infos.Find(id).Tags.Add(new ImageTag { Id = tagId, Value = value });
				}

				context.SaveChanges();
			}

			// To update the actual metadata (not lossless):
			/*
				// The next line is a hack, recommended by Microsoft, to get a new propertyitem because the class itself is sealed with no constructor. Nice.
				var propItem = Images.SelectMany(i => i.Value.Image.PropertyItems).First(p => p!=null);
				propItem.Id = tagId;
				propItem.Type = (short)PropertyItemType.String;
				propItem.Value = Encoding.ASCII.GetBytes(value);
				var imageFile = Images[id].Image;
				imageFile.SetPropertyItem(propItem);
				imageFile.Save(Images[id].FullPath);
			 */
		}

		// PUT api/tag/5
		public void Put(int id, [FromBody]string value)
		{
		}

		// DELETE api/tag/5
		public void Delete(int id)
		{
		}

		static internal IEnumerable<TagType> GetTags(IEnumerable<ImageInfo> images)
		{
			var types = new Dictionary<int, HashSet<string>>();
			foreach (var tag in images.SelectMany(image => image.Tags))
			{
				if (!types.ContainsKey(tag.Id))
				{
					types.Add(tag.Id, new HashSet<string>());
				}
				types[tag.Id].Add(tag.Value);
			}

			return types.Select(t => new TagType { Id = t.Key, Name = FriendlyNameFromId(t.Key), Values = t.Value });
		}

		static internal void GenerateImageInfo()
		{
			using (var context = new ImageContext())
			{
				if (context.Infos.Any())
				{
					return;
				}

				var files = Directory.EnumerateFiles(Path, "*"/*, SearchOption.AllDirectories*/).ToArray();

				for (var i = 0; i < files.Length; i++)
				{
					var file = files[i];

					ImageInfo info = null;
					try
					{
						info = GetValue(file, i);
						var y = 1;
					}
					catch (OutOfMemoryException)
					{
						var x = 1;
					}

					if(info != null)
					{
						context.Infos.Add(info);
					}
				}
				context.SaveChanges();
			}
		}

		private static ImageInfo GetValue(string file, int id)
		{
			using (var image = Image.FromFile(file))
			{
				if (image.Height == 0 || image.Width == 0)
				{
					return null;
				}

				var props = image.PropertyItems;
				var dateTakenProp = props.FirstOrDefault(p => p.Id == PropertyTag.Ids["ExifDTOrig"]);
				var dateTakenString = dateTakenProp != null ? Encoding.ASCII.GetString(dateTakenProp.Value).Replace("\0", "") : null;
				DateTime dateTaken;
				if (dateTakenString == null
				    || !DateTime.TryParseExact(
					    dateTakenString,
					    "yyyy:MM:dd HH:mm:ss",
					    CultureInfo.InvariantCulture,
					    DateTimeStyles.None,
					    out dateTaken))
				{
					dateTaken = File.GetCreationTime(file);
				}

				return new ImageInfo
					{
						Id = id,
						DateTaken = dateTaken,
						Meta = new ImageMeta { ImageInfoId = id, Height = image.Height, Width = image.Width },
						Name = file,
						Tags =
							props.Where(p => p.Type == (short)PropertyItemType.String)
							     .Select(
								     p =>
								     new ImageTag
								     {
									     Id = p.Id,
									     Name = FriendlyNameFromId(p.Id),
									     PropertyItem = p,
									     Value = Encoding.ASCII.GetString(p.Value).Replace("\0", "")
								     })
							     .ToList()
					};
			}
		}

		static internal string FriendlyNameFromId(int id)
		{
			string outv = null;
			PropertyTag.Definitions.TryGetValue(id, out outv);

			return outv ?? "Unknown";
		}

		public enum PropertyItemType
		{
			Byte = 1,
			String = 2,
			Short = 3,
			Word = 4,
			Rational = 5,
			Nu1 = 6,
			Undefined = 7,
			Nu2 = 8,
			Slong = 9,
			Srational = 10
		}
	}
}
