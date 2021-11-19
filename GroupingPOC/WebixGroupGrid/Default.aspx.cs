using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Web.UI;
using Newtonsoft.Json;

namespace WebixGroupGrid
{
	public partial class WebForm1 : Page
	{
		#region Protecteds
		protected void Page_Load(object sender, EventArgs e)
		{
			IEnumerable<WebixTableGroup> webixTableGroups = DeserializeJSON();

			StringBuilder sbHtmlTable = CreateTable(webixTableGroups);

			container.InnerHtml = sbHtmlTable.ToString();
		}
		#endregion

		#region Privates
		private IEnumerable<WebixTableGroup> DeserializeJSON()
		{
			using StreamReader jsonFile = File.OpenText(this.Server.MapPath("~/Json/Sample.json"));

			JsonSerializer serializer = new JsonSerializer();

			return serializer.Deserialize(jsonFile, typeof(List<WebixTableGroup>)) as List<WebixTableGroup>;
		}

		private StringBuilder CreateTable(IEnumerable<WebixTableGroup> webixTableGroups)
		{
			StringBuilder htmlTable = new StringBuilder();
			int i = 0;

			htmlTable.Append("<table>");
			htmlTable.Append("<colgroup>");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZColL\" columntype=\"DGCL\">");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZColL\" columntype=\"DGBGB\">");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZCol\" style=\"width:131px\" initialwidth=\"131\" mincellwidth=\"21\" maxcellwidth=\"21\" type=\"boolean\" columnid=\"colSelektiert\" columntype=\"DGSC\" controltype=\"2\">");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZCol\" style=\"width:324px\" initialwidth=\"324\" mincellwidth=\"35\" maxcellwidth=\"2792\" type=\"string\" columnid=\"colCaption\" columntype=\"DGC\" controltype=\"0\">");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZCol\" style=\"width:211px\" initialwidth=\"211\" mincellwidth=\"35\" maxcellwidth=\"2592\" type=\"string\" columnid=\"colDesc\" columntype=\"DGC\" controltype=\"0\">>");
			htmlTable.Append("<col class=\"ADBOXDGForm2ZCol\" style=\"width:381px\" initialwidth=\"381\" mincellwidth=\"45\" maxcellwidth=\"2792\" type=\"string\" columnid=\"colTechName\" columntype=\"DGC\" controltype=\"0\">");
			htmlTable.Append("</colgroup>");
			htmlTable.Append("<thead>");
			htmlTable.Append("<tr rc=\"H\">");
			htmlTable.Append("<td>&nbsp;</td>");
			htmlTable.Append("<td>1</td>");
			htmlTable.Append("<td class=\"ADCHKDGForm2ZH\" style=\"width:42px;\" lclick=\"ADCOM_PB('V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$ctl00$colSelektiert','LClick')\" " +
			                 "tip=\"Alle (de)selektieren\">");
			htmlTable.Append("<input type=\"checkbox\" name=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$ctl00$colSelektiert\" " +
			                 "id=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$ctl00$colSelektiertL\">\r\n");
			htmlTable.Append("<label onclick=\"ADCOM_EventStopPropagation(event);\" for=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$ctl00$colSelektiertL\">");
			htmlTable.Append("</label>");
			htmlTable.Append("</td>");
			htmlTable.Append("<td>Caption</td>");
			htmlTable.Append("<td>Description</td>");
			htmlTable.Append("<td>Tech Name</td>");
			htmlTable.Append("</tr>");
			htmlTable.Append("</thead>");
			htmlTable.Append("<tbody>");
			htmlTable.Append("<tr class=\"ADBOXDGForm2ZGH0\" rc=\"GH\" gl=\"0\" gk=\"<NULL>\" gx=\"1\">");
			htmlTable.Append("<td class=\"ADSPCDGForm2ZL\">&nbsp;</td>");
			htmlTable.Append("<td class=\"ADBLTDGForm2Z\"><div>&nbsp;</div></td>");
			htmlTable.Append("</tr>");

			// Takes 50 records only while initializing the grid, then the data will be fetched from GenerateGroupTableHandler based on the webix configuration.
			foreach(WebixTableGroup webixTableGroup in webixTableGroups.Take(50))
			{
				string strHeaderCaption = webixTableGroup.HeaderCaption + "_" + i++;
				if(webixTableGroup.GroupSpan)
				{
					htmlTable.Append($"<tr class=\"ADBOXDGForm2ZGH1\" rc=\"GH\" gl=\"1\" gk=\"<NULL>_{strHeaderCaption}\" gx=\"1\" gs=\"1\">");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZL\">&nbsp;</td>");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZC\">&nbsp;</td>");
					htmlTable.Append($"<td class=\"ADBLTDGForm2Z join\" colspan=\"3\"><div>{strHeaderCaption}</div></td>");
					htmlTable.Append("</tr>");
				}

				foreach(WebixGroupRow listGroupRow in webixTableGroup.ListGroupRows)
				{
					htmlTable.Append("<tr class=\"ADBOXDGForm2ZC\">");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZL\">&nbsp;</td>");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZC\">&nbsp;</td>");
					htmlTable.Append("<td class=\"ADCHKDGForm2Z select\">");
					htmlTable.Append("<input type=\"checkbox\" name=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$row5cd18fb40ef6eb11811900155d08252d$colSelektiert\" " +
					                 "id=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$row5cd18fb40ef6eb11811900155d08252d$colSelektiertL\">");
					htmlTable.Append("<label onclick=\"ADCOM_EventStopPropagation(event);\" " +
					                 "for=\"V1$V2$V5$V11$gbxMain$plhQueryResult$GKProzessQueryDocument$dgrPRCReport$row5cd18fb40ef6eb11811900155d08252d$colSelektiertL\">");
					htmlTable.Append("</label>");
					htmlTable.Append("</td>");
					htmlTable.Append($"<td class=\"ADBLTDGForm2Z\"><div>{listGroupRow.Caption + '_' + strHeaderCaption}</div></td>");
					htmlTable.Append($"<td class=\"ADBLTDGForm2Z\"><div>{listGroupRow.Description}</div></td>");
					htmlTable.Append($"<td class=\"ADBLTDGForm2Z\"><div>{listGroupRow.TechName}</div></td>");
					htmlTable.Append("</tr>");
				}
			}

			htmlTable.Append("</tbody>");
			htmlTable.Append("</table>");

			return htmlTable;
		}
		#endregion
	}
}