const TABLE_ID_POSTFIX = "_table";
const WEBIX_ID_POSTFIX = "_Webix";

var g_ControlObjects = [];
function ADCOM_InitControls()
{
    var controls = $("[data-control]");

    for(var nIndex = 0; nIndex < controls.length; nIndex++)
    {
        var controlType = controls[nIndex].getAttribute("data-control");
        var controlId = controls[nIndex].getAttribute("id");
        switch(controlType)
        {
            case "datagrid":
                // Skip current grid if it has datagrid inside as a child (nested table)
                if($(controls[nIndex]).find("[data-control='datagrid']").length) continue;

                var dataGrid = new AdeNetDataGrid($(`#${controlId}`)[0]);

                if(webix.ui.views.hasOwnProperty(dataGrid.WebixId)) delete webix.ui.views[dataGrid.WebixId];

                dataGrid.init();
                g_ControlObjects.push(dataGrid);
                break;
        }
    }
    controls = null;
}

function ADCTL_FindTag(element, strTag)
{
    if(!element) return null;

    if(element.tagName && element.tagName == strTag)
    {
        return element;
    }

    if(element.childNodes)
    {
        for(var i = 0; i < element.childNodes.length; i++)
        {
            var ret = ADCTL_FindTag(element.childNodes[i], strTag);
            if(ret)
            {
                return ret;
            }
        }
    }

    return null;
}

function AdeNetDataGrid(dataGrid)
{
    var attributes = ADCOM_GetAttributesByFilter(dataGrid,
        ["id", "data-tablesize", "data-rowcount", "enable-list-options", "pagesize", "data-tablesize", "content-height" ]);

    this.Id = attributes.id;

    var elContainer = ADCTL_FindTag(dataGrid, "DIV");
    $(elContainer).attr("containerfor", this.Id);

    var elTable = ADCTL_FindTag(elContainer, "TABLE");
    $(elTable).attr("id", this.Id + TABLE_ID_POSTFIX);
    $(elTable).attr("count", parseInt(attributes.datatablesize));

    this.WebixDataTable = null;
    this.WebixId = this.Id + TABLE_ID_POSTFIX + WEBIX_ID_POSTFIX;
    
    this.RowCount = parseInt(attributes.datarowcount);
    this.PageSize = attributes.pagesize && this.RowCount > parseInt(attributes.pagesize) ? parseInt(attributes.pagesize) : 0;
    this.EnableDynamicLoading = parseInt(attributes.datatablesize) !== 0;
    this.EnableListOptions = attributes.enablelistoptions === "True";
    this.ContentHeight = attributes.contentheight;

    this.WebViewArea = null;
}

AdeNetDataGrid.prototype =
{
    init: function()
    {
        if(!$('#' + this.Id).is(':visible')) return;

        var config = this._getGridConfig();
        //this.WebixDataTable = webix.ui(config);

        this.WebixDataTable = webix.ui(config);
        var grid = this.WebixDataTable;

        grid.data.attachEvent("onStoreLoad", function(driver, data)
        {
            if(driver.spans)
            {
                if(!grid.config.spans)
                {
                    grid.define("spans", true);
                    grid.define("colsspan", 1);
                }

                var spans = driver.spans;
                grid.addSpan(spans);
            }
            
            if(driver.subrows)
            {                
                var subrows = driver.subrows;
                var nCount = subrows.length;
                for(var i = 0; i < nCount; i++)
                {
                    if(subrows[i]) grid.openSub(subrows[i]);
                }
            }
        });

        grid.parse(this.Id + TABLE_ID_POSTFIX, "HTMLTableCustomDataDriver");

    },
    _hasGridAsChild: function(element)
    {
        return $(element).find("[data-control='datagrid']").length > 0;
    },
    _getGridConfig: function()
    {
        var dataGrid = document.getElementById(this.Id);
        var attributes = ADCOM_GetAttributesByFilter(dataGrid,
            [
                "data-tabletype", "wrap-header", "show-header", "wrap-header", "data-tablesize", "max-record-count-pertrip", "has-group", "edit-mode", "select-column",
                "has-row-autoheight", "class", "newrow-attop", "can-add-new", "add-new-command-name", "can-delete", "delete-command-name", "showemptymessage",
                "gch", "enable-multicell", "enable-column-filter", "enable-column-resize", "enable-column-reorder", "show-current", "fc"
            ]);

        var isConnectTheme = (document.styleSheets && document.styleSheets.length > 0 && document.styleSheets[0].href.indexOf("th=Connect") > 0);

        var strTableStyle = "datatable" +
            (attributes.hasgroup === "True" ? " grouptable" : "") +
            (attributes.editmode === "Editable" && isConnectTheme ? " datatable-connect-editable" : "") +
            (attributes.editmode === "Editable" && !isConnectTheme ? " datatable-roweditable-bgcolor" : "") +
            (this.WebViewArea === "Index" ? " Index" : "");

        var r = document.querySelector(':root');
        var rs = getComputedStyle(r);
                        
        var nRowHeight = webix.skin.$active.rowHeight;
        if(this.WebViewArea) nRowHeight = parseInt(rs.getPropertyValue('--indexRowHeight'));

        var gridConfig =
        {
            view: attributes.datatabletype ,
            container: $('[containerfor=' + this.Id + ']')[0],
            id: this.WebixId,
            gridId: this.Id,
            header: attributes.showheader === "True",
            scrollY: true,
            scrollX: false,
            height: 900,
            autowidth: true,
            fixedRowHeight: !(attributes.hasrowautoheight === "True" || attributes.class.indexOf("timeline") > -1),
            rowHeight: nRowHeight,
            headerRowHeight: parseInt(rs.getPropertyValue('--headerRowHeight')),
            rowLineHeight: parseInt(rs.getPropertyValue('--rowLineHeight')),
            css: strTableStyle,
            spans: true,
            colsspan: 1,            
            datafetch: parseInt(attributes.maxrecordcountpertrip),
            datathrottle: 500,
            hasGroup: attributes.hasgroup === "True",
            WebViewArea: this.WebViewArea,
            RowCount: this.RowCount,
            totalSize: parseInt(attributes.datatablesize),
            yCount: this.PageSize,
            isInitialization: true,
            dataStoreUpdated: false,
            enableListOptions: this.EnableListOptions,
            ContentHeight: this.ContentHeight,
            on:
            {
                onStructureLoad()
                {
                    var columns = this.config.columns;
                    var nColumnCount = columns.length;
                    var colOrder = new Array(nColumnCount);
                    for(var j = 0; j < nColumnCount; j++)
                    {
                        colOrder[j] = columns[j].id;
                    }

                    this.config.htmlColumnOrder = colOrder;
                },
                onDataRequest: function(start, count)
                {
                    if(start < 0) start = 0;

                    var grid = this;

                    var path = "http://localhost/WebixGroupIssue/LoadGroupTableHandler.aspx";

                    var bLoadChildren = count === undefined;
                    if(bLoadChildren) grid.config.applySort = false;

                    var strGroupInfo = "";
                    var strRequestFor = grid.config.applySort ? "S" : "D";
                    if(bLoadChildren)
                    {
                        var rowAttributes = grid.getItem(start)["rowAttributes"];
                        strRequestFor = rowAttributes.ri && grid.config.hasGroup ? "G" : "P";
                        strGroupInfo = rowAttributes.gk + "~" + (parseInt(rowAttributes.gl) + 1) + "~" + rowAttributes.ri;
                    }
                    var formData = `count=${count}&start=${start}`;

                    webix.ajax().get(path, formData).then(function(data)
                    {
                        var strResponseTextRemaining = data.text();

                        var strDeferredLoading = strResponseTextRemaining.substring(1, 2);
                        if(strDeferredLoading !== "d")
                        {
                            AdeNetDataGrid.prototype._showError(strResponseTextRemaining);

                            return false;
                        }                                                

                        // skip 3 chars: state, deferred loaded response and '|' char. (sd|)
                        strResponseTextRemaining = strResponseTextRemaining.substring(3, strResponseTextRemaining.length);

                        var table = document.createElement("table");
                        table.innerHTML = strResponseTextRemaining;
                        table.setAttribute("start", bLoadChildren ? 0 : start);
                        table.setAttribute("count", bLoadChildren ? 0 : parseInt(count));
                        table.setAttribute("parent", bLoadChildren ? start : 0);
                        table.setAttribute("id", grid.config.gridId + TABLE_ID_POSTFIX);

                        var colGroup = document.createElement("colgroup");

                        var columns = grid.config.htmlColumnOrder;
                        var nColumnCount = columns.length;

                        for(var i = 0; i < nColumnCount; i++)
                        {
                            var col = document.createElement("col");
                            col.width = grid.getColumnConfig(columns[i]).width + "px";
                            colGroup.appendChild(col);
                        }
                        table.appendChild(colGroup);
                        var tbody = document.createElement("tbody");
                        tbody.innerHTML = strResponseTextRemaining;
                        table.appendChild(tbody);

                        var strSelector = "[containerfor='" + grid.config.gridId + "']";
                        var container = $(strSelector);

                        var divContainer = document.createElement("div");
                        divContainer.style.position = "absolute";
                        divContainer.style.opacity = 0;
                        divContainer.style.top = "1px";                        
                        divContainer.style.zIndex = -100;
                        divContainer.style.width = container.width() + "px";
                        divContainer.style.height = container.height() + "px";
                        divContainer.append(table);

                        document.body.append(divContainer);

                        if(start === 0 && (grid.config.hasServerFilterChanged || (bLoadChildren && grid.config.view === "treetable") || grid.config.hasServerSortChanged)) grid.clearAll();

                        grid.parse(table, "HTMLTableCustomDataDriver");
                        grid.config.updateRowCount(grid.config.totalSize, grid, parseInt(count));                        

                        divContainer.remove();

                        // server side filter with return false does not invoke onAfterFilter by the lifecycle of webix.
                        if(grid.config.hasServerFilterChanged) grid.callEvent("onAfterFilter", []);

                        return false;
                    });
                },
                onDestruct: function()
                {
                    this.config.dataGridParser.ColumnObj = null;
                    this.config.dataGridParser.dataGrid = null;
                }
            }
        };
        
        if(!gridConfig.editable)
        {
            gridConfig["loadahead"] = 50;
        }

        return gridConfig;
    }
};