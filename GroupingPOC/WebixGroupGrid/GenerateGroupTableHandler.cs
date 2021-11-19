using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using Newtonsoft.Json;

namespace WebixGroupGrid
{
	public class GenerateGroupTableHandler : IHttpHandler
	{
		#region Properties
		public bool IsReusable => false;
		#endregion

		#region Publics
		public void ProcessRequest(HttpContext context)
		{
			int nCount = !string.IsNullOrEmpty(context.Request.QueryString["count"]) ? Convert.ToInt32(context.Request.QueryString["count"]) : 0;
			int nStart = !string.IsNullOrEmpty(context.Request.QueryString["start"]) ? Convert.ToInt32(context.Request.QueryString["start"]) : 0;

			IEnumerable<WebixTableGroup> webixTableGroups = DeserializeJSON(nCount, nStart);

			StringBuilder sbHtmlTable = CreateTable(webixTableGroups, nStart);

			context.Response.Write(sbHtmlTable.ToString());
		}
		#endregion

		#region Privates
		private static IEnumerable<WebixTableGroup> DeserializeJSON(int nCount, int nStart)
		{
			using StreamReader jsonFile = File.OpenText(HttpContext.Current.Server.MapPath("~/Json/Sample.json"));

			JsonSerializer serializer = new JsonSerializer();
			List<WebixTableGroup> lstTableGroups = serializer.Deserialize(jsonFile, typeof(List<WebixTableGroup>)) as List<WebixTableGroup>;

			if(nCount == 0 || nStart == 0) return lstTableGroups;

			return lstTableGroups?.Skip(nStart).Take(nCount);
		}

		private static StringBuilder CreateTable(IEnumerable<WebixTableGroup> webixTableGroups, int nStart)
		{
			StringBuilder htmlTable = new StringBuilder();

			int i = 0;
			if(nStart > 0) i = nStart;

			foreach(WebixTableGroup webixTableGroup in webixTableGroups)
			{
				string strHeaderCaption = webixTableGroup.HeaderCaption + "_" + i++;
				if(webixTableGroup.GroupSpan)
				{
					htmlTable.Append($"sd|<tr class=\"ADBOXDGForm2ZGH1\" rc=\"GH\" gl=\"1\" gk=\"<NULL>_{strHeaderCaption}\" gx=\"1\" gs=\"1\">");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZL\">&nbsp;</td>");
					htmlTable.Append("<td class=\"ADSPCDGForm2ZC\">&nbsp;</td>");
					htmlTable.Append($"<td class=\"ADBLTDGForm2Z join\" colspan=\"7\"><div>{strHeaderCaption}</div></td>");
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

			return htmlTable;
		}
		#endregion
	}
}