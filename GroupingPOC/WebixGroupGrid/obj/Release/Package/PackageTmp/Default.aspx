<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="Default.aspx.cs" Inherits="WebixGroupGrid.WebForm1" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Webix Dynamic Loading Group Span Issue</title>
    <link rel="stylesheet" href="~/CSS/webix.css"/>
    <link rel="stylesheet" href="~/CSS/Default-theme-PassThrough.css"/>
    <link rel="stylesheet" href="~/CSS/DataGrid-Enhanced-PassThrough.css"/>
    <script src="Script/webix.js"></script>
    <script src="Script/jquery.min.js"></script>
    <script src="Script/AdeNetDataGrid-NG.js"></script>
    <script src="Script/WebixDataTableExtensions.js"></script>
</head>
<body>
    <div id="webixContainer"></div>
    <table runat="server">
        <tbody>
            <tr runat="server" id="GroupGrid" start="0" class="ADBOXDGForm2Z fixed-header right-border" data-control="datagrid" wrap-header="False" data-tabletype="treetable" has-group="True" data-tablesize="8000" data-rowcount="8000" show-header="True" max-record-count-pertrip="50"
                edit-mode="ReadOnly" select-column="True" show-current="True" content-height="Max" show-toolbar="False" enable-list-options="True" enable-column-filter="False"
                enable-column-resize="False" enable-column-reorder="False" vsidvs="CDucGKProzessQueryResult_ViewSettings_GzqbRA==_00541092-0000-0000-0000-000000000000" 
                vsidsrid="AA11_ANQuery_gbxMain_plhQueryResult_GKProzessQueryDocument_dgrPRCReport_SelectedRowId" has-row-autoheight="False" show-filter-area="False">
                <td>
                    <div id="container" ch="max" cw="825" containerfor="GroupGrid" tabindex="-1" runat="server">
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
<script>
    ADCOM_InitControls();
</script>
</body>
</html>
