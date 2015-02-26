using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.Drawing.Imaging;
using System.Linq;
using System.Web;

using ImageViewer.Models;

namespace ImageViewer.Code
{
	public class ImageContext : DbContext
	{
		public DbSet<ImageInfo> Infos { get; set; }

		public DbSet<TagType> TagTypes { get; set; }

		public DbSet<ImageMeta> Metas { get; set; }

		public DbSet<PropertyItem> PropertyItems { get; set; }

		public ImageContext() : base()
		{
			Database.SetInitializer(new DbInitialiser());
		}
	}

	public class DbInitialiser : DropCreateDatabaseIfModelChanges<ImageContext>
	{
		
	}
}