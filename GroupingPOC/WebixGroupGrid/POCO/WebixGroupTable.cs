using System.Collections.Generic;
using Newtonsoft.Json;

namespace WebixGroupGrid
{
	public class WebixTableGroup
	{
		#region Properties
		[JsonProperty("HeaderCaption")]
		public string HeaderCaption { get; set; }

		[JsonProperty("GroupSpan")]
		public bool GroupSpan { get; set; }

		[JsonProperty("data")]
		public List<WebixGroupRow> ListGroupRows { get; set; }
		#endregion
	}

	public class WebixGroupRow
	{
		#region Properties
		[JsonProperty("Caption")]
		public string Caption { get; set; }

		[JsonProperty("Description")]
		public string Description { get; set; }

		[JsonProperty("TechName")]
		public string TechName { get; set; }
		#endregion
	}
}