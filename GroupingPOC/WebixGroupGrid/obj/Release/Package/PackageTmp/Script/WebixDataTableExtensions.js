const VERTICAL_SCROLLBAR_WIDTH = 14;

function ADCOM_GetAttributesByFilter(el, filter)
{
    var hash = {};
    if(!el || !filter || !filter.length) return hash;

    var nFilterCount = filter.length;
    for(var i = 0; i < nFilterCount; i++)
    {
        var strAttributeName = filter[i];

        if(el.getAttribute(strAttributeName)) hash[strAttributeName.replaceAll("-", "")] = el.getAttribute(strAttributeName);
    }

    return hash;
}

function ADCOM_CloneObject(obj)
{
    var clone = {};
    for(var p in obj)
    {
        if(obj.hasOwnProperty(p))
        {
            clone[p] = (typeof (obj[p]) == "object" && obj[p] != null) ? ADCOM_CloneObject(obj[p]) : obj[p];
        }
    }
    return clone;
}

webix.DataDriver.HTMLTableCustomDataDriver = webix.extend({
    columnGroupInfo: [],
    skipFirstRow: true,
    child: "data",
    multilineCell: null,
    dataGrid: null,
    id: "",
    spans: [],
    subrows: [],
    getConfig: function(data)
    {
        this.dataGrid = new DataGrid();

        this.id = data.getAttribute("id");
        var elWebixTable = $$(this.id + "_Webix");
        elWebixTable.config.dataGridParser = this.dataGrid;
        elWebixTable.config.Draggable = false; // Stop the row drag-drop

        return this.dataGrid.getColumns(data);
    },
    toObject: function(data)
    {
        this.spans = [];
        this.spans = [];
        this.subrows = [];

        return typeof data != "string" ? data : document.getElementById(data);
    },
    getInfo: function(table)
    {
        var countAttribute = table.getAttribute("count") != undefined ? parseInt(table.getAttribute("count")) : 0;
        var startAttribute = table.getAttribute("start") != undefined ? parseInt(table.getAttribute("start")) : 0;
        var parentIdAttribute = table.getAttribute("parent") != undefined ? parseInt(table.getAttribute("parent")) : 0;
        this.id = table.getAttribute("id") != undefined ? table.getAttribute("id") : "";

        return {
            size: countAttribute,
            from: startAttribute,
            parent: parentIdAttribute
        };
    },
    getDetails: function(tr)
    {
        var elWebixTable = $$(this.id + "_Webix");
        var columns = elWebixTable.config.dataGridParser.ColumnObj;

        var jsonRow = this._getJSONRow(columns, tr);

        if(jsonRow.colspan && !elWebixTable.config.HasColSpan) elWebixTable.config.HasColSpan = true;

        // For tree set expand & preload state
        var bExpandGroup = tr.data != undefined && jsonRow.rowAttributes.gx !== undefined && jsonRow.rowAttributes.gx === "1";
        if(bExpandGroup)
        {
            jsonRow["open"] = true;
        }
        else
        {
            var bPreLoadState = tr.data === undefined && jsonRow.rowAttributes.gs != undefined;
            if(bPreLoadState) jsonRow["webix_kids"] = true;
        }

        jsonRow[this.child] = this._getChildDetails(tr.data);

        return jsonRow;
    },
    _getJSONRow(columns, tr)
    {
        var jsonRow = {};
        var objAttributes = {};
        var objColumnTextContent = {};
        var objTreeColAttributes = {};
        var cells = tr.children;
        var colSpan = 0;
        var nColValueIndex = 0;
        var nColumnsCount = columns.length;
        var colSpans = [];
        var colSpannedCellStyleClass = "";

        var rowAttributes = this._getAttrs(tr);
        jsonRow["rowAttributes"] = rowAttributes;
        var nRowHeight = parseInt(rowAttributes.rowheight);

        var strContentWrapStyleClass = "";
        if(nRowHeight > (webix.skin.$active.rowHeight + 2))
        {
            if(!this._isConnectTheme()) strContentWrapStyleClass = " content-wrap";
            jsonRow.$height = nRowHeight;    
        }

        jsonRow["id"] = webix.uid();
        jsonRow['$cellCss'] = {};
        
        var bMergeColumn = false;

        for(var nIndex = 0; nIndex < nColumnsCount; nIndex++)
        {
            var columnsConfig = columns[nIndex].Config;
            var strColName = columnsConfig.id;
            var strColType = columnsConfig.sort;
            jsonRow[strColName] = "";

            if(colSpan > 0) jsonRow.$cellCss[strColName] = colSpannedCellStyleClass + " spanned";
            

            if(columnsConfig.columntype === "DGTCB" && rowAttributes.rowtype === "GRR") continue;

            if(nColValueIndex >= cells.length) continue;

            var colAttributes = this._getAttrs(cells[nColValueIndex]);
            
            if(columnsConfig.columntype === "DGTC" && rowAttributes.rowtype === "GRR")
            {
                colAttributes["notree"] = "true";
            }

            colAttributes.class += strContentWrapStyleClass;
            
            objAttributes[strColName] = colAttributes;

            jsonRow["columnAttributes"] = objAttributes;

            if(colSpan > 0)
            {
                colSpan--;
                jsonRow.$cellCss[strColName] = colSpannedCellStyleClass + " spanned";
                continue;
            }

            // reset colSpanned Cell style
            colSpannedCellStyleClass = "";

            var strColValue = objAttributes[strColName].rawdata !== undefined ? objAttributes[strColName].rawdata : columnsConfig.columntype === "DGBGB" ? cells[nColValueIndex].innerHTML : cells[nColValueIndex].innerText.trim();
            
            jsonRow["display" + strColName] = cells[nColValueIndex].innerHTML;
            objColumnTextContent[strColName] = cells[nColValueIndex].textContent;
            strColType = ADWXG_GetSortType(columnsConfig.formattype);
            jsonRow[strColName] = this._getColumnTypedValue(strColType, strColValue);

            if(colAttributes.class.indexOf("last-row") > -1) jsonRow.$cellCss[strColName] = "last-row ";

            if(colAttributes.class.match(/(ADLIT|ADBLT|ADSPC).*(MG[0123]*)/))
            {
                jsonRow.$cellCss[strColName] = colAttributes.class.indexOf('last') > -1 ? '' : 'merged-group-column ';
                bMergeColumn = true;
            }

            if(bMergeColumn)
            {
                var strCSS = jsonRow.$cellCss[strColName];
                jsonRow.$cellCss[strColName] = strCSS ? (strCSS + ' merged-cell') : 'merged-cell ';
            }

            if(rowAttributes.class.match(/(ADBOX.*GF[0123])/)) jsonRow.$cellCss[strColName] = 'group-footer-column ';
            
            jsonRow.$cellCss[strColName] = jsonRow.$cellCss[strColName] ? jsonRow.$cellCss[strColName] + colAttributes.class : colAttributes.class;

            this._resetRawValue(columnsConfig, jsonRow);

            this._setSelectColumnNameAndId(columnsConfig, jsonRow);

            if(columnsConfig.columntype !== "DGTC" && columnsConfig.columntype !== "DGTCB" && objAttributes[strColName].colspan !== undefined && colSpan === 0)
            {
                colSpan = parseInt(objAttributes[strColName].colspan);
                colSpannedCellStyleClass = objAttributes[strColName].class;

                this.spans.push([jsonRow.id, strColName, colSpan, 1, null, colSpannedCellStyleClass]);
                jsonRow.columnAttributes[strColName].rc = rowAttributes.rc;
                if(colSpan > 0) colSpan--;
            }

            if(columnsConfig.columntype === "DGTCB")
            {
                objTreeColAttributes = colAttributes;
            }

            if(columnsConfig.columntype === "DGTC")
            {
                jsonRow[strColName + "_DGTCB"] = objTreeColAttributes;
                objTreeColAttributes = {};
            }

            nColValueIndex++;
        }
        
        if(tr.PreviewRow)
        {
            var previewRow = tr.PreviewRow;
            var previewRowColumns = tr.PreviewRow.children;
            var nColumnCount = previewRowColumns.length;
            var jsonPreviewRow = {};
            var nColumn = 0; 
            for(; nColumn < nColumnCount; nColumn++)
            {
                jsonPreviewRow["colPreviewRow_" + nColumn] = previewRowColumns[nColumn].innerHTML;
                if(previewRowColumns[nColumn].getAttribute("colspan")) jsonPreviewRow["previewCell"] = "colPreviewRow_" + nColumn;
            }

            var nHeight = $(previewRow).attr('rowheight');
            jsonRow.$subHeight = parseInt(nHeight);
            jsonPreviewRow.parentViewId = tr.parentElement.parentElement.getAttribute("id") + WEBIX_ID_POSTFIX;
            jsonPreviewRow.columnCount = nColumn; 
            jsonRow["rowPreview"] = jsonPreviewRow;

            this.subrows.push(jsonRow.id);
        }

        if(tr.errorRow)
        {
            var errorRowcolumns = tr.errorRow.children;
            jsonRow["rowError"] = "<div class=" + errorRowcolumns[0].className + " style= " + errorRowcolumns[0].getAttribute('style') + " >" + errorRowcolumns[0].innerHTML + "</div>";

            var nHeight = $(tr.errorRow).attr('rowheight');
            jsonRow.$subHeight = parseInt(nHeight);

            this.subrows.push(jsonRow.id);
        }

        jsonRow["columnTextContent"] = objColumnTextContent;

        return jsonRow;
    },
    _getColumnTypedValue(coltype, colvalue)
    {
        if(colvalue === "") return colvalue;

        if(coltype === "date")
        {
            var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;

            if(colvalue.search(pattern) !== -1)
            {
                var dtDateTimeParts = colvalue.split(" ");
                colvalue = dtDateTimeParts[0];

                if(dtDateTimeParts[0] !== "") return new Date(dtDateTimeParts[0].replace(pattern, '$3-$2-$1') + ' ' + dtDateTimeParts[1]);
            }
        }

        if(coltype === "int")
        {
            if(/^-?\d+$/.test(colvalue)) return parseInt(colvalue);

            if(/^-?\d+(\.\d{1,4})?$/.test(colvalue)) 
            {
                var decimalValue = colvalue.split('.')[1];
                var nLength = decimalValue && decimalValue.length > 2 ? decimalValue.length : 2;
                return Number(colvalue).toFixed(nLength);
            }
            
        }

        return colvalue;
    },
    _resetRawValue(columnsConfig, jsonRow)
    {
        var strColName = columnsConfig.id;
        var strDisplayColumnName = "display" + strColName;

        if(columnsConfig.controltype && columnsConfig.controltype === 2) // checkbox
        {
            var jsonvalue = jsonRow[strColName];
            if((columnsConfig.formattype === "boolean" && (jsonvalue === "True" || jsonvalue === 1)) ||
                (columnsConfig.formattype !== "boolean" && (jsonvalue !== "" || jsonRow[strDisplayColumnName].includes("checked=\"checked\""))))
            {
                jsonRow[strColName] = 1;
            }
            else
            {
                jsonRow[strColName] = 0;
            }
        }

        if(jsonRow[strColName] !== "" && (jsonRow[strDisplayColumnName] === "" || jsonRow[strDisplayColumnName] === "<div>&nbsp;</div>"))
        {
            jsonRow[strColName] = "";
        }
    },
    _setSelectColumnNameAndId(columnsConfig, jsonRow)
    {
        if(columnsConfig.columntype === "DGSC")
        {
            if(columnsConfig.controltype && columnsConfig.controltype === 5) return;
            var elSelectColumn = $.parseHTML(jsonRow["display" + columnsConfig.id]);

            jsonRow.selectColumnName = columnsConfig.id;
            jsonRow.SelectColumnId = $(elSelectColumn).attr("name");            
        }
    },
    getRecords: function(table)
    {
        // which collects array of row (TR tag) objects
        var new_data = [];

        var tbody = table.tBodies[0];
        if(tbody === undefined || tbody === null || tbody.length === 0 || tbody.children && tbody.children.length === 0)
        {
            table.remove();
            return new_data;
        }

        var trows = tbody.children;

        var elLastRow = trows[trows.length - 1];
        var bSkipLastRow = elLastRow ?  elLastRow.className.match(/ADBOXDG[^\s]+F/g) : false;
        var nDataRowsCount = bSkipLastRow ? trows.length - 1 : trows.length;

        // Have to set count if it is a preview row
        if(trows.length === 1 && trows[0].getAttribute("rc") !== null && trows[0].getAttribute("rc").toLowerCase() === "p")
        {
            nDataRowsCount = trows.length;
        }

        var elWebixTable = $$(this.id + "_Webix");
        var bSetRowHeight = !elWebixTable.config.fixedRowHeight;
        var bTreeTable = trows[0].getAttribute("gl") !== null;
        if(bTreeTable)
        {
            new_data = this._getTreeRecords(trows, nDataRowsCount);
        }
        else
        {
            for(var i = 0; i < nDataRowsCount; i++)
            {
                var row = trows[i];
                
                if(bSetRowHeight) row.setAttribute("rowheight", row.clientHeight);

                if(row.getAttribute("nr")) row.setAttribute("rowIndex", i);

                if(i + 1 < nDataRowsCount)
                {
                    var strSubRowType = null;
                    if(trows[i + 1].getAttribute("rc") === "P")
                    {
                        strSubRowType = "PreviewRow";
                    }
                    else
                    {
                        var td = trows[i + 1].children[0];
                        if(td.className && (td.className.lastIndexOf("Form2ER") > 0 || td.className.lastIndexOf("Form2ZER") > 0)) strSubRowType = "errorRow";
                    }

                    if(strSubRowType != null)
                    {
                        var previewRow = trows[++i];
                        previewRow.setAttribute("rowheight", previewRow.clientHeight);

                        row[strSubRowType] = previewRow;
                    }
                }
                new_data.push(row);
            }
        }

        table.remove();

        return new_data;
    },
    _getTreeRecords: function(trows, nDataRowsCount)
    {
        var treeData = [];
        var i = 0;

        while(i < nDataRowsCount)
        {
            var node = trows[i++];
            $(node).attr("rowheight", node.clientHeight);

            if(i === nDataRowsCount && $(node).attr("rc") === "GF")
            {
                $(node).children("td").addClass("last-row");
            }

            i = this._addDecendants(node, trows, i, nDataRowsCount);
            treeData.push(node);
        }

        return treeData;
    },
    _addDecendants: function(node, trows, nRowIndex, nDataRowsCount)
    {
        var nParentLevel = parseInt(node.getAttribute("gl"));
        while(nRowIndex < nDataRowsCount)
        {
            var childnode = trows[nRowIndex];
            $(childnode).attr("rowheight", childnode.clientHeight);

            if(nRowIndex + 1 < nDataRowsCount)
            {
                var strSubRowType = null;
                if(trows[nRowIndex + 1].getAttribute("rc") === "P")
                {
                    strSubRowType = "PreviewRow";
                }
                else
                {
                    var td = trows[nRowIndex + 1].children[0];
                    if(td.className && (td.className.lastIndexOf("Form2ER") > 0 || td.className.lastIndexOf("Form2ZER") > 0)) strSubRowType = "errorRow";
                }

                if(strSubRowType != null)
                {
                    var previewRow = trows[++nRowIndex];
                    previewRow.setAttribute("rowheight", previewRow.clientHeight);

                    childnode[strSubRowType] = previewRow;
                    if(!node.data) node.data = [];
                    node.data.push(childnode);
                    nRowIndex++;
                    continue;
                }
            }

            var nLevel = (childnode.getAttribute("gl") === null) ? null : parseInt(childnode.getAttribute("gl"));
            var childRowType = this._getRowType(childnode);

            node.setAttribute("rowtype", this._getRowType(node));

            if((nLevel === null) || (nLevel === nParentLevel + 1) || (nLevel > nParentLevel + 1 && childRowType === "TRR"))
            {
                if(!node.data) node.data = [];
                node.data.push(childnode);
                nRowIndex++;
                if(nLevel !== null) //  Last level rows in the group will not have attribute 'gl'
                {
                    nRowIndex = this._addDecendants(childnode, trows, nRowIndex, nDataRowsCount);
                }
            }
            else 
            {
                return nRowIndex;
            }
        }
        return nRowIndex;
    },
    _getChildDetails: function(childRows)
    {
        var childJSONRows = [];

        if(childRows)
        {
            var nChildRowCount = childRows.length;
            for(var i = 0; i < nChildRowCount; i++)
            {
                var childJSONRow = this.getDetails(childRows[i]);

                childJSONRows.push(childJSONRow);
            }
        }

        return childJSONRows;
    },
    _getAttrs: function(el)
    {
        var attr = el.attributes;
        var hash = {};
        var nAttributesCount = attr.length;
        var attribute = null;
        for(var i = 0; i < nAttributesCount; i++)
        {
            attribute = attr[i];
            hash[attribute.nodeName] = attribute.nodeValue;
        }
        return hash;
    },
    _getAttributesByFilter: function(el, filter)
    {
        var hash = {};
        var nFilterCount = filter.length;
        if(!el || !filter || !nFilterCount) return hash;
        
        for(var i = 0; i < nFilterCount; i++)
        {
            var strAttributeName = filter[i];
            if(el.getAttribute(strAttributeName)) hash[strAttributeName] = el.getAttribute(strAttributeName);
        }

        return hash;
    },
    _isConnectTheme: function()
    {
        return (document.styleSheets && document.styleSheets.length > 0 && document.styleSheets[0].href.indexOf("th=Connect") > 0);
    },
    _getRowType: function(row)
    {
        return $(row).attr("rc") !== "GH" || $(row).attr("gs") === undefined ? "ROW" : $(row).attr("gl") >= 100 ? "TRR" : "GRR";
    }
}, webix.DataDriver.htmltable);

function DataGrid()
{
    this.HasHeader = true;
    this.IsMultilineColumn = false;
    this.SkipFirstRow = true;
    this.ColumnObj = [];
    this.DoubleColumnBeginWidth = 0;
    this.TripleColumnBeginWidth = 0;
    this.WebViewId = "";
}

DataGrid.prototype = {

    getColumns: function(table)
    {
        var elColGroup = null;
        if(table.childNodes)
        {
            var nChildCount = table.childNodes.length;
            for(var i = 0; i < nChildCount; i++)
            {
                var element = table.childNodes[i];
                if(element.tagName && element.tagName == "COLGROUP")
                {
                    elColGroup = element;
                    break;
                }
            }
        }
        
        var elColumns = elColGroup.getElementsByTagName("col");
        
        var elThead = table.tHead;
        var bHasheaderRow = elThead ? true : false;

        var tableId = table.getAttribute("id");
        this.WebViewId = tableId;

        var elHeaderTd = null;
        if(bHasheaderRow)
        {
            var elTheadRow = elThead.children;
            elHeaderTd = elTheadRow[0].children;
        }

        if($(elColGroup).find("[height]").length) this.hasMultilineText = true;

        var columns = [];
        var nHeaderCellPosition = 0;
        var nGroupHeaderCellPosition = 0;
        var nTableSize = table.getAttribute("count") != undefined ? parseInt(table.getAttribute("count")) : 0;
        var nColCount = elColumns.length;
        var strViewType = $$(tableId + "_Webix").config.adenetviewtype;
        var bIsEditMode = $$(tableId + "_Webix").config.editable;
        var bWrapHeader = $$(tableId + "_Webix").config.wrapheader;
        var bEnableColumnFilter = $$(tableId + "_Webix").config.enableListOptions || $$(tableId + "_Webix").config.enableColumnFilter;
        var bMultilineHeader = $(table).find("[columntype='DGGCDH']").length > 0;

        var row = this.getFirstDataRow(table);
        
        for(var i = 0; i < nColCount; i++)
        {
            var dataGridColumn = null;
            var columnConfig = null;
            var attribute = ADCOM_GetAttributesByFilter(elColumns[i], ["columntype"]);
            switch(attribute.columntype)
            {
                case "DGCL":
                case "DGCR":
                    dataGridColumn = new DataGridDummyColumn(i, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd, table);                    
                    nHeaderCellPosition++;
                    break;
                case "DGC":
                case "DGVTC":
                case "DGCC":
                case "DGTPC":
                case "DGGC":
                    dataGridColumn = new DataGridColumn(i, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    if(bIsEditMode) dataGridColumn.setEditorType(columnConfig, row);
                    nHeaderCellPosition++;
                    break;
                case "DGTCB":
                    dataGridColumn = new DataGridTreeColumnButton(i, nHeaderCellPosition, strViewType);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, null);
                    break;
                case "DGTC":
                    dataGridColumn = new DataGridTreeColumn(i, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    if(bIsEditMode) dataGridColumn.setEditorType(columnConfig, row);
                    nHeaderCellPosition++;
                    break;
                case "DGGCDH":
                    dataGridColumn = new DataGridGroupColumn(i, nHeaderCellPosition, nGroupHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    if(bIsEditMode) dataGridColumn.setEditorType(columnConfig, row);
                    if(columnConfig.continue)
                    {
                        nGroupHeaderCellPosition++;
                    }
                    else
                    {
                        nHeaderCellPosition++;
                        nGroupHeaderCellPosition = 0;
                    }
                    break;
                case "DGSC":
                    dataGridColumn = new DataGridSelectColumn(i, nHeaderCellPosition, strViewType);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    nHeaderCellPosition++;
                    break;
                case "DGCBC":
                    dataGridColumn = new DataGridCheckboxColumn(i, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    if(bIsEditMode) dataGridColumn.setEditorType(columnConfig, row);
                    nHeaderCellPosition++;
                    break;
                case "DGTLC":
                    dataGridColumn = new DataGridTimelineColumn(i, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);                    
                    nHeaderCellPosition++;
                    break;
                case "DGBGB":
                    dataGridColumn = new DataGridBreakGroupButton(i, nHeaderCellPosition, tableId, strViewType, bIsEditMode);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    if(bIsEditMode) dataGridColumn.setEditorType(columnConfig, row);
                    nHeaderCellPosition++;
                    break;
                case "DGTSC":
                    dataGridColumn = new DataGridTimelineScaleColumn(i, nHeaderCellPosition, strViewType);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                    nHeaderCellPosition++;
                    break;
                case "DGCMC":
                    dataGridColumn = new DataGridContextMenuColumn(i, nHeaderCellPosition, strViewType, bIsEditMode);
                    dataGridColumn.wrapheader = bWrapHeader;
                    dataGridColumn.multilineheader = bMultilineHeader;
                    columnConfig = dataGridColumn.getConfiguration(elColumns, elHeaderTd);
                                        
                    var elBody = table.tBodies[0];
                    if(elBody)
                    {
                        for(var j = 0; j < elBody.children.length; j++)
                        {
                            var elCMC = $(elBody.children[j]).find('td.ADBOXTBDGIndex1, td.ADBOXTBDGForm2Z, td.ADBOXTBDGForm2');
                            var nActualWidth = 1;
                            if(elCMC.length) nActualWidth = elCMC[0].scrollWidth;
                            if(nActualWidth > 1 && elCMC[0].getAttribute("rc") !== "GH")
                            {
                                columnConfig.width = nActualWidth;
                                columnConfig.minCellWidth = nActualWidth;
                                columnConfig.maxCellWidth = nActualWidth;
                                break;
                            }
                        }
                    }

                    nHeaderCellPosition++;
                    break;
            }

            // Client side filter - need empty object
            columnConfig.header.filterConfig = {};

            dataGridColumn.Config = columnConfig;
            this.ColumnObj.push(dataGridColumn);
            columns.push(columnConfig);

            columnConfig.cellInfos = [ADCOM_CloneObject(columnConfig)];
        }

        var webixTable = $$(tableId + "_Webix");
        if(webixTable && webixTable.config.Draggable)
        {
            columns.splice(1, 0, {
                    id: "drag",
                    header: "",
                    template: "<div class='webix_drag_handle'></div>",
                    width: 24,
                    minWidth: 24,
                    maxWidth: 24,
                    minCellWidth: 24,
                    maxCellWidth: 24
            });
        }

        if(webixTable && webixTable.config.enableMulticell)
        {
            this.DoubleColumnBeginWidth = this._calculateDoubleColumnBeginWidth(columns);
            this.TripleColumnBeginWidth = this._calculateTripleColumnBeginWidth(columns);
        }

        var grid = $$(tableId + "_Webix");        
        if(grid.reCalcColumnsWidth) grid.reCalcColumnsWidth(grid.$width - VERTICAL_SCROLLBAR_WIDTH, columns);

        return columns;
    },
    getCellHeaderInfo: function(obj)
    {
        var header = {};
        for(var p in obj)
        {
            if(obj.hasOwnProperty(p))
            {
                header[p] = obj[p];
            }
        }

        return header;
    },
    buildAsSingleColumn: function(wDataTable)
    {
        var sortedColumns = this._getSortedColumns(wDataTable);
        wDataTable.config.columns = this._getSingleColumnConfig(wDataTable.config.columns);
        var markSort = this._getMarkSorting(wDataTable, sortedColumns);
        ADWEBIX_MarkSorting(markSort, wDataTable);

        wDataTable.config.resizeColumn = true;
        wDataTable.define({ "rowHeight": 23, "rowLineHeight": 16 });
        wDataTable.refreshColumns();

        $(".grid-multicell-2").removeClass("grid-multicell-2");
        $(".grid-multicell-3").removeClass("grid-multicell-3");
        $(".singleColumn").removeClass("singleColumn");
    },
    buildAsTwoColumn: function(wDataTable)
    {
        var sortedColumns = this._getSortedColumns(wDataTable);
        wDataTable.config.columns = this._getMergedColumns(wDataTable.config.columns, 2, sortedColumns);
        var markSort = this._getMarkSorting(wDataTable, sortedColumns);
        ADWEBIX_MarkSorting(markSort, wDataTable);

        wDataTable.config.resizeColumn = false;
        wDataTable.define({ "rowHeight": 60, "rowLineHeight": 16, "css": "grid-multicell-2" });
        wDataTable.refreshColumns();

        $(".grid-multicell-3").removeClass("grid-multicell-3");
        $(".singleColumn").removeClass("singleColumn");
    },
    buildAsThreeColumn: function(wDataTable)
    {
        var sortedColumns = this._getSortedColumns(wDataTable);
        wDataTable.config.columns = this._getMergedColumns(wDataTable.config.columns, 3, sortedColumns);
        var markSort = this._getMarkSorting(wDataTable, sortedColumns);
        ADWEBIX_MarkSorting(markSort, wDataTable);

        wDataTable.config.resizeColumn = false;
        wDataTable.define({ "rowHeight": 84, "rowLineHeight": 16, "css": "grid-multicell-3" });
        wDataTable.refreshColumns();

        $(".grid-multicell-2").removeClass("grid-multicell-2");
        $(".singleColumn").removeClass("singleColumn");
    },
    hasMultiColumn: function(cols) 
    {
        return this.getMaxNoOfColumnsInACell(cols) > 1;
    },
    getMaxNoOfColumnsInACell: function(cols)
    {
        var nLength = cols.length;
        var nNoOfColumns = 0;
        for(var i = 0; i < nLength; i++)
        {
            if(cols[i].cellInfos.length > nNoOfColumns) nNoOfColumns = cols[i].cellInfos.length;
        }

        return nNoOfColumns;
    },
    _getMergedColumns: function(cols, nNoOfColumns, sortedColumns)
    {
        var columns = [];
        cols = this._getSingleColumnConfig(cols);

        var nStartIndex = this._getMergeStartIndex(cols);
        for(var j = 0; j < nStartIndex; j++)
        {
            cols[j].css += " multicelllevel" + nNoOfColumns + " singleColumn";
            cols[j].header.css += " multicelllevel" + nNoOfColumns + "_Header";
            cols[j].header.height = nNoOfColumns * 16 + 18;
            cols[j].header.content = "";

            if(cols[j].sort && cols[j].sort === "server") cols[j].sort = null;
            columns.push(cols[j]);
        }

        var nLength = cols.length;
        nStartIndex = nStartIndex === -1 ? 0 : nStartIndex;

        for(var i = nStartIndex; i < nLength; i++)
        {
            if(!this._canMergeColumns(cols, nNoOfColumns, i))
            {
                cols[i].css += " multicelllevel" + nNoOfColumns + " singleColumn";
                cols[i].header.css += " multicelllevel" + nNoOfColumns + "_Header";
                cols[i].header.height = nNoOfColumns * 16 + 18;
                cols[i].header.content = "";
                cols[i].template = function (obj, common, value, config, atr)
                {
                    var strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);

                    if(config.cellInfos[0].columntype === "DGBGB")
                    {
                        if(strHTML === '' || strHTML === undefined) strHTML = "&nbsp;";

                        return config.cellInfos[0].columntype === "DGBGB" && obj.$level === config.grouplevel && obj.rowAttributes.rc !== undefined && obj.rowAttributes.rc !== "GF" ? common.icon(obj, common, value, config) : strHTML;
                    }

                    if(config.cellInfos[0].columntype === "DGTC")
                    {
                        return common.space(obj) + common.icon(obj, common, value, config) + strHTML;
                    }

                    if(config.cellInfos[0].columntype === "DGTSC")
                    {
                        return common.icon(obj, common, value, config) + strHTML;
                    }

                    return strHTML;
                };

                if(cols[i].sort && cols[i].sort === "server") cols[i].sort = null;

                columns.push(cols[i]);
                continue;
            }
            columns.push(
            {
                id: cols[i].id,
                cellInfos: this._getCellInfos(cols, nNoOfColumns, i),
                header: { text: this._getHeaderText(cols, nNoOfColumns, i, this.WebViewId, sortedColumns), css: " multicelllevel" + nNoOfColumns+"_Header", height: nNoOfColumns * 16 + 18 },
                template: function (obj, common, value, config, atr)
                {
                    var strHtml = "";
                    for(var i = 0; i < config.cellInfos.length; i++)
                    {
                        strHtml += DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config.cellInfos[i]);
                    }
                    return strHtml;
                },
                width: this._getMaxWidth(cols, nNoOfColumns, i),
                minWidth: 0,
                maxWidth:2000,
                minCellWidth: this._getGreatestMinCellWidth(cols, nNoOfColumns, i),
                maxCellWidth: this._getGreatestMaxCellWidth(cols, nNoOfColumns, i),
                css: "multicelllevel" + nNoOfColumns,
                columntype: cols[i].columntype,
                formattype: cols[i].formattype,
                grouplevel: cols[i].grouplevel,
                span: cols[i].span,
                sortnumber: cols[i].sortnumber,
                sortdirection: cols[i].sortdirection,
                sort: cols[i].sort && cols[i].sort === "server" ? null : cols[i].sort,
                canMerge: true,
                sortIndex: this._getSortIndex(cols, nNoOfColumns, i, sortedColumns)
            });
            i = i + nNoOfColumns - 1;
        }

        return columns;
    },
    _getMergeStartIndex: function(cols)
    {
        for(var i = 0; i < cols.length; i++)
        {
            if(cols[i].canMerge) return i;
        }

        return -1;
    },
    _canMergeColumns: function(cols, nNoOfColumns, nIndex)
    {
        for(var i = nIndex; i < nIndex + nNoOfColumns; i++)
        {
            if (i >= cols.length || !cols[i].canMerge) return false;
        }

        return true;
    },
    _getHeaderText: function(cols, nNoOfColumns, nIndex, strWebViewId, sortedColumns)
    {
        var strHeader = "";
        var nSortIndex = this._getSortIndex(cols, nNoOfColumns, nIndex, sortedColumns);

        for(var i = 0; i < nNoOfColumns; i++)
        {
            strHeader = strHeader + "<div data-columnname=\"" + cols[nIndex + i].id + "\"";

            var sort = null;
            for(var j = 0; j < sortedColumns.length; j++)
            {
                if(cols[nIndex + i].id === sortedColumns[j].id)
                {
                    sort = sortedColumns[j];
                    break;
                }
            }
            if(sort != null) strHeader = strHeader + " data-sortdirection=\"" + sort.dir +"\"";

            if(cols[nIndex + i].sort && cols[nIndex + i].sort !== "server") strHeader = strHeader + " onclick=\"ADWXG_Header_Click(this, '" + strWebViewId + "')\">";
            strHeader = strHeader + cols[nIndex + i].header.text + "</div>";
        }
        strHeader = "<div class='MultiCell_Header'" + (nSortIndex !== -1 ? " data-sortcolumn-Index=" + nSortIndex : "") + ">" + strHeader + "</div>";

        return strHeader;
    },
    _getSortIndex: function(cols, nNoOfColumns, nIndex, sortedColumns)
    {
        for(var i = 0; i < nNoOfColumns; i++)
        {
            for(var j = 0; j < sortedColumns.length; j++)
            {
                if(cols[nIndex + i].id === sortedColumns[j].id) return i;
            }
        }

        return -1;
    },
    _getCellInfos: function(cols, nNoOfColumns, nIndex)
    {
        return nNoOfColumns === 3 ? [cols[nIndex].cellInfos[0], cols[nIndex + 1].cellInfos[0], cols[nIndex + 2].cellInfos[0]] : [cols[nIndex].cellInfos[0], cols[nIndex + 1].cellInfos[0]];
    },
    _getGreatestMinCellWidth: function(cols, nNoOfColumns, nIndex)
    {
        return nNoOfColumns === 3
            ? Math.max(cols[nIndex].minCellWidth, cols[nIndex + 1].minCellWidth, cols[nIndex + 2].minCellWidth)
            : Math.max(cols[nIndex].minCellWidth, cols[nIndex + 1].minCellWidth);
    },
    _getGreatestMaxCellWidth: function(cols, nNoOfColumns, nIndex)
    {
        return nNoOfColumns === 3
            ? Math.max(cols[nIndex].maxCellWidth, cols[nIndex + 1].maxCellWidth, cols[nIndex + 2].maxCellWidth)
            : Math.max(cols[nIndex].maxCellWidth, cols[nIndex + 1].maxCellWidth);
    },
    _getMaxWidth: function(cols, nNoOfColumns, nIndex)
    {
        return nNoOfColumns === 3
            ? Math.max(cols[nIndex].width, cols[nIndex + 1].width, cols[nIndex + 2].width)
            : Math.max(cols[nIndex].width, cols[nIndex + 1].width);
    },
    _calculateDoubleColumnBeginWidth: function(cols)
    {
        var nLength = cols.length;
        var nTotalMinWidth = 0;
        for(var i = 0; i < nLength; i++)
        {
            nTotalMinWidth += cols[i].minCellWidth;
        }

        return nTotalMinWidth;
    },
    _calculateTripleColumnBeginWidth: function(cols)
    {
        var nLength = cols.length;
        var nTotalMinWidth = 0;
        for(var i = 0; i < nLength; i++)
        {
            if(!this._canMergeColumns(cols, 2, i))
            {
                nTotalMinWidth += cols[i].minCellWidth;
                continue;
            }

            nTotalMinWidth += this._getGreatestMinCellWidth(cols, 2, i);
            i = i + 1;
        }

        return nTotalMinWidth;
    },
    _getSingleColumnConfig: function(cols)
    {
        var nLength = cols.length;
        var columns = [];
        for(var i = 0; i < nLength; i++)
        {
            for(var j = 0; j < cols[i].cellInfos.length; j++)
            {
                var col = cols[i].cellInfos[j];
                col.cellInfos = [ADCOM_CloneObject(col)];
                columns.push(col);
            }
        }

        return columns;
    },
    _getSortedColumns: function(wDataTable)
    {
        var sortedColumns = [];
        var nSortedColumnCount = wDataTable._sort_signs_order.length;
        var columns = wDataTable.config.columns;
        var nColumnCount = wDataTable.config.columns.length;
        for(var i = 0; i < nSortedColumnCount; i++)
        {
            for(var j = 0; j < nColumnCount; j++)
            {
                if(wDataTable._sort_signs_order[i] === columns[j].id)
                {
                    var nSortIndex = columns[j].sortIndex && columns[j].sortIndex !== -1 ? columns[j].sortIndex : 0;
                    var sort = { id: columns[j].cellInfos[nSortIndex].id, dir: wDataTable._sort_signs[columns[j].id].className.indexOf('asc') !== -1 ? "asc" : "desc" };
                    sortedColumns.push(sort);
                }
            }
        }

        return sortedColumns;
    },
    _getMarkSorting: function(wDataTable, sortedColumns)
    {
        var markSort = [];
        var cols = wDataTable.config.columns;
        var nSortCount = sortedColumns.length;
        var nColumnCount = cols.length;
        if(nSortCount > 0)
        {
            for(var nIndex = 0; nIndex < nSortCount; nIndex++)
            {
                for(var nColPos = 0; nColPos < nColumnCount; nColPos++)
                {
                    var nCellCount = cols[nColPos].cellInfos.length;
                    for(var nCellPos = 0; nCellPos < nCellCount; nCellPos++)
                    {
                        if(sortedColumns[nIndex].id === cols[nColPos].cellInfos[nCellPos].id)
                        {
                            cols[nColPos].sortIndex = nCellPos;
                            markSort.push({ id: cols[nColPos].id, dir: sortedColumns[nIndex].dir });
                        }
                    }
                }
            }
        }

        return markSort;
    },
    getData: function()
    {
        
    },
    getFirstDataRow(table)
    {
        var tbody = table.tBodies[0];
        if(!tbody) return null;

        var trows = tbody.children;
        var nDataRowsCount = trows.length;

        for(var i = 0; i < nDataRowsCount; i++)
        {
            var row = trows[i];
            if(!row.getAttribute("rc"))
            {
                return row;
            }

        }

        return null;
    }
};

function DataGridDummyColumn(nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
}

DataGridDummyColumn.prototype = {

    getConfiguration: function(cols, headCells, table)
    {
        var colAttribute = ADCOM_GetAttributesByFilter(cols[this.position], ["type", "class", "style", "columnid", "columntype", "controltype", "grouplevel", "height", "sortnumber", "sortdirection"]);
        var column = {
            id: colAttribute.columnid !== undefined ? colAttribute.columnid : "column" + this.position,
            name: "",
            header: { text: "", css:" " + colAttribute.columntype},
            canMerge: false,
            css: colAttribute.class + " " + colAttribute.columntype,
            columntype: colAttribute.columntype,
            grouplevel: (colAttribute.grouplevel) ? parseInt(colAttribute.grouplevel) : -1,
            span: 1,
            sort: null,
            sortnumber: -1,
            sortdirection: null
        };

        var nClientWidth = 20;
        if(headCells)
        {
            nClientWidth = $(headCells[0]).outerWidth();              

            if(column.columntype === "DGCR")
            {                
                for(var i = 0; i < headCells.length; i++)
                {
                    if(headCells[i].className && headCells[i].className.indexOf("timelinevertical") > - 1)
                    {
                        nClientWidth = 1;
                        break;
                    }
                }
            }
        }
        else
        {
            var tbody = table.tBodies[0];
            if(tbody && tbody.children.length > 0)
            {
                var i = 0;
                var trows = tbody.children;
                var nChildrenCount = trows.length;
                var trow = trows[i];                
                while(nChildrenCount > i)
                {                    
                    if(trows[i].children.length >= this.position)
                    {
                        trow = trows[i];
                        break;
                    }

                    i++;
                }
               
                if(trow.children.length > 0) nClientWidth = $(trow.children[this.position]).outerWidth();

                if(column.columntype === "DGCR")
                {
                    if($(trow).children("td").hasClass("timelinevertical")) nClientWidth = 1;
                }
            }
        }
              
        nClientWidth = nClientWidth === 0 ? 1 : nClientWidth;

        column.width = nClientWidth;
        column.maxWidth = nClientWidth;
        column.minWidth = nClientWidth;
        column.maxCellWidth = nClientWidth;
        column.minCellWidth = nClientWidth;

        return column;
    }
};

function DataGridColumn(nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter)
{
    this.position = nIndex;
    this.HeaderCellPosition = nHeaderCellPosition;
    this.Config = null;
    this.viewType = strViewType;
    this.bIsEditMode = bIsEditMode;
    this.EnableColumnFilter = bEnableColumnFilter;
}

DataGridColumn.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var colAttribute = ADCOM_GetAttributesByFilter(cols[this.position], ["type", "class", "style", ,"initialWidth", "minCellWidth", "maxCellWidth", "columnid", "columntype", "controltype", "grouplevel", "height", "sortnumber", "sortdirection", "stylevarient", "defaultFilterValue"]);

        colAttribute.id = colAttribute.columnid !== undefined ? colAttribute.columnid : "column" + this.position;
        colAttribute.width = (colAttribute.type === undefined && colAttribute.columntype === "DGC" || colAttribute.class.indexOf("ColX") > -1) ? 1 : 0;
        colAttribute.stylevarient = colAttribute.stylevarient === undefined ? "" : colAttribute.stylevarient;
        
        if(colAttribute.style)
        {
            var parts = colAttribute.style.split(':');
            var width = parts[1].replace('px', '');
            colAttribute.width = this.viewType === "timeline" ? parseInt(width) : parseInt(width) + 10;
        }

        if(colAttribute.initialWidth)
        {
            colAttribute.width = this.viewType === "timeline" ? parseInt(colAttribute.initialWidth) : parseInt(colAttribute.initialWidth) + 10;
        }

        var mergeColumnMinWidth = document.styleSheets && document.styleSheets.length > 0 && document.styleSheets[0].href.indexOf("th=Connect") > 0 ? 74 : 38;

        var column = {
            id: colAttribute.id,
            name: "",
            header: "",
            template: "",
            width: colAttribute.width,
            minCellWidth: this.viewType === "timeline" ? parseInt(colAttribute.minCellWidth) : parseInt(colAttribute.minCellWidth) + 10,
            maxCellWidth: this.viewType === "timeline" ? parseInt(colAttribute.maxCellWidth) : parseInt(colAttribute.maxCellWidth) + 10,
            maxWidth: 2000,
            minWidth: 0,
            canMerge: ((colAttribute.width === 0 || colAttribute.width > mergeColumnMinWidth) && ($.inArray(colAttribute.columntype, ADWXG_GetSingleColumnTypes()) === -1)),
            css: colAttribute.class + " " + colAttribute.stylevarient + " " + colAttribute.columntype,
            columntype: colAttribute.columntype,
            formattype: colAttribute.type,
            grouplevel: (colAttribute.grouplevel) ? parseInt(colAttribute.grouplevel) : -1,
            span: (colAttribute.span) ? parseInt(colAttribute.span) : 1,
            sortnumber: (headCells && colAttribute.sortnumber) ? parseInt(colAttribute.sortnumber) : -1,
            sortdirection: headCells ? colAttribute.sortdirection : headCells,
            controltype: (colAttribute.controltype) ? parseInt(colAttribute.controltype) : -1,  
            defaultFilterValue: (colAttribute.defaultFilterValue && colAttribute.defaultFilterValue !== undefined) ? colAttribute.defaultFilterValue : "",
            height: (colAttribute.height) ? colAttribute.height : 1
        };        

        if(column.controltype !== 2 && (colAttribute.type !== undefined && (colAttribute.type === "date" || colAttribute.type === "datetime"))) column.map = "(date)#" + colAttribute.id + "#";

        if(headCells !== null)
        {
            var headerCellAttributes = ADCOM_GetAttributesByFilter(headCells[this.HeaderCellPosition], ["tip", "class", "style"]);
            var strAttributes = DataGridColumn.prototype.objectToString.call(this, headerCellAttributes, ["style"]);
            var strText = headCells[this.HeaderCellPosition].innerHTML;

            column.name = strText;
            var nPosition = strAttributes.indexOf("class=\"") + 7;
            var strHeaderAttr = [strAttributes.slice(0, nPosition), "cell-htext ", strAttributes.slice(nPosition)].join('');

            column.header = {
                text: "<span" + strHeaderAttr + ">" + strText + "</span>",
                css: colAttribute.class + " " + ADWXG_GetAlignment(headerCellAttributes.style) + " " + colAttribute.columntype,                
            };

            var bMergedColumn = headCells[this.HeaderCellPosition].children.length && headCells[this.HeaderCellPosition].getAttribute("colspan");
            if((this.multilineheader && bMergedColumn) || (!this.multilineheader && this.wrapheader)) column.header["height"] = headCells[this.HeaderCellPosition].clientHeight;

        }

        column.template = function(obj, common, value, config)
        {
            return DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);
        };

        // sort type
        var coltype = ADWXG_GetSortType(colAttribute.type);
        var colName = colAttribute.id;
        column["sort"] = function(a, b) { return ADWXG_IgnoreHeaderAndFooter(a, b, colName, coltype); };
       
        if(colAttribute.class && colAttribute.class.lastIndexOf("ColMG") > 0)
        {
            column.cssFormat = ADWXG_ApplyMergeGroupRowIndentStyle;
        }

        return column;
    },

    setEditorType: function(config, row)
    {
        if(!row) return;

        var editortype = ADWXG_GetColumnEditor(config.controltype, config.height);
        if(editortype)
        {
            config.editor = editortype;
            config.liveEdit = true;
            if(editortype == "inlinefkeyeditor") config.formattype = "string";
        }        
    },

    getData: function()
    {

    },

    getCellTemplate: function(obj, common, value, config)
    {        
        var strHTML = obj["display" + config.id];
        if(strHTML === undefined && !obj.rowAttributes.blankrow) return "<div></div>";

        var strCellAttributes = "";
        if(obj.$count === 0)
        {
            strCellAttributes = " group-leaf='true'";
        }

        if(obj.columnAttributes !== undefined)
        {
            var colInfo = obj.columnAttributes[config.id];
            if(colInfo)
            {
                strCellAttributes += DataGridColumn.prototype.objectToString.call(this, colInfo, ["style"]);
                if(colInfo.style) strCellAttributes += ' Style="' + colInfo.style + '"';
            }
        }

        if(obj.rowAttributes)
        {
            if(obj.rowAttributes.id)
            {
                strCellAttributes += ' id="' + obj.rowAttributes.id + '"';
            }

            if(obj.rowAttributes.lclick !== undefined && strCellAttributes.indexOf('lclick') === -1)
            {
                strCellAttributes += ' lclick="' + obj.rowAttributes.lclick + '"';
                strCellAttributes += ' rck="true"';
            }

            if(obj.rowAttributes.rclick !== undefined && strCellAttributes.indexOf('rclick') === -1)
            {
                strCellAttributes += ' rclick="' + obj.rowAttributes.rclick + '"';
                strCellAttributes += ' rck="true"';
            }
            else if(strCellAttributes.indexOf('rclick') > 0)
            {
                strCellAttributes += ' crck="true"';
            }
            else if(obj.rowAttributes.blankrow)
            {
                strCellAttributes += ' class="add-blank-row"';
                strHTML = "";
            }
        }
        
        return "<div wrapper='true' " + strCellAttributes + ">" + strHTML + "</div>";        
    },

    objectToString: function (obj, skip)
    {
        var str = '';
        for(var p in obj)
        {
            if(skip.includes(p)) continue;

            if(obj.hasOwnProperty(p))
            {
                var strValue = obj[p];
                str += ' ' + p + '="' + strValue + '"';
            }
        }
        return str;
    }    
};

function DataGridTreeColumnButton(nIndex, nHeaderCellPosition, strViewType)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType);
}

DataGridTreeColumnButton.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);

        column.header = "";
        column.width = 1;
        column.maxWidth = 1;
        column.minWidth = 0;
        column.maxCellWidth = 1;
        column.minCellWidth = 1;

        column.template = function(obj, common, value, config)
        {
            return DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);
        };

        return column;
    }
};

function DataGridTreeColumn(nIndex, nHeaderCellPosition, strViewType, bIsEditMode)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode);
}

DataGridTreeColumn.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);

        var colAttribute = ADCOM_GetAttributesByFilter(cols[this.position - 1], ["span", "columntype", "notree"]);
        var nWidth = headCells ? headCells[0].clientWidth : 24;
        if(colAttribute.columntype === "DGTCB")
        {
            column.width = colAttribute.span * nWidth + 10;
            column.minCellWidth = 150;
        }

        column.template = function(obj, common, value, config)
        {
            var strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);

            return obj.columnAttributes[config.id] && obj.columnAttributes[config.id].notree ? strHTML : common.space(obj) + common.icon(obj, common, value, config) + strHTML;
        };

        return column;
    },

    getData: function()
    {

    },

    setEditorType(config, row)
    {
        return DataGridColumn.prototype.setEditorType.call(this, config, row);
    }
};

function DataGridGroupColumn(nIndex, nHeaderCellPosition, nGroupHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter)
{
    this.GroupHeaderCellPosition = nGroupHeaderCellPosition;
    this.EnableColumnFilter = bEnableColumnFilter;
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
}

DataGridGroupColumn.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);

        if(headCells !== null)
        {
            var elGroupColumn = headCells[this.HeaderCellPosition];

            var elGroupColumnColGroup = elGroupColumn.getElementsByTagName("colgroup");
            if(elGroupColumnColGroup.length)
            {
                var elGroupColumnColumns = elGroupColumnColGroup[0].getElementsByTagName("col");

                var tbody = elGroupColumn.getElementsByTagName("tbody");
                var rows = tbody[0].getElementsByTagName("tr");

                var header = [];
                var headercontent = {};
                var nRowsCount = rows.length;
                for(var rowIndex = 0; rowIndex < nRowsCount; rowIndex++)
                {
                    var cells = rows[rowIndex].getElementsByTagName("td");

                    var cell = cells[this.GroupHeaderCellPosition];
                    if(cell)
                    {
                        headercontent = { "text": `<span class="cell-htext">${cell.innerHTML}</span>` };
                        if(cell.getAttribute("colspan"))
                        {
                            headercontent.colspan = parseInt(cell.getAttribute("colspan"));
                            headercontent.css = "datatable-cell-center_align";
                        }
                        else
                        {
                            if(cell.getAttribute("style") && cell.getAttribute("style").includes("text-align"))
                            {
                                headercontent.css = ADWXG_GetAlignment(cell.getAttribute("style"));
                            }
                        }
                        headercontent.height = cell.clientHeight;
                    }

                    header.push(headercontent);
                }

                var colAttribute = ADCOM_GetAttributesByFilter(cols[this.position], ["stylevarient"]);
                if(!colAttribute.stylevarient || (colAttribute.stylevarient && colAttribute.stylevarient.indexOf("readonly") === -1))
                {
                    //column.editor = ADWXG_GetColumnEditor(column.controltype, colAttribute.height);
                }

                column.name = header;
                column.header = header;
                column.continue = false;

                if(this.GroupHeaderCellPosition !== elGroupColumnColumns.length - 1) column.continue = true;
            }
        }

        return column;
    },

    getData: function() { },

    setEditorType(config, row)
    {
        return DataGridColumn.prototype.setEditorType.call(this, config, row);
    }
};

function DataGridSelectColumn(nIndex, nHeaderCellPosition, strViewType)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType);
}

DataGridSelectColumn.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);
        
        if(document.styleSheets && document.styleSheets.length > 0 && document.styleSheets[0].href.indexOf("th=Connect") > 0)
        {
            column.width = 1;
            column.minCellWidth = 1;
            column.maxCellWidth = 1;
        }
        var strName = "";
        var strLClick = "";
        var strTipText = "";

        if(headCells !== null && column.name.includes("type=\"checkbox\""))
        {
            var elMasterCheckBox = headCells[this.HeaderCellPosition];
            if(elMasterCheckBox.hasChildNodes() && $(elMasterCheckBox.childNodes).attr("type") === "checkbox")
            {
                var strTip = elMasterCheckBox.getAttribute("tip");
                strTipText = "tip='" + strTip + "'";
                var colAttr = ADCOM_GetAttributesByFilter(elMasterCheckBox, ["lclick"]);
                strLClick = colAttr.lclick;
                strName = $(elMasterCheckBox.childNodes).attr("name");
            }

            column.name = strName;
            column.header = {
                text: `<span class='cell-htext' lclick="${strLClick}" ${strTipText}>${elMasterCheckBox.innerHTML}</span>`
            };
        }

        column.template = function(obj, common, value, config)
        {
            var strHTML = "";

            if(obj.SelectColumnId && !(config.controltype && config.controltype === 5))
            {
                var strCellAttributes = "";
                if(obj.columnAttributes !== undefined)
                {
                    var colInfo = obj.columnAttributes[config.id];                    
                    strCellAttributes = DataGridColumn.prototype.objectToString.call(this, colInfo, ["style"]);
                }

                var cbxRawValue = obj[config.id];
                var cbxDisplayValue = obj["display" + config.id];

                if(obj.rowAttributes)
                {
                    if(obj.rowAttributes.lclick !== undefined && strCellAttributes.indexOf('lclick') === -1 && obj.rowAttributes.lclick.indexOf("ADCOM_PB(") !== -1)
                    {
                        strCellAttributes += ' lclick="' + obj.rowAttributes.lclick + '"';
                    }

                    if(obj.rowAttributes.rclick !== undefined && strCellAttributes.indexOf('rclick') === -1)
                    {
                        strCellAttributes += ' rclick="' + obj.rowAttributes.rclick + '"';
                        strCellAttributes += ' rck="true"';
                    }
                }

                if(typeof cbxDisplayValue == "string" && cbxDisplayValue.includes("checkbox"))
                {
                    var elHTML = $.parseHTML(cbxDisplayValue);
                    var elCheckBox = elHTML.filter(element => element.type === "checkbox");
                    var elLabel = elHTML.filter(element => element.tagName === "LABEL");
                    var strAttrFor = $(elLabel).attr("for");
                    var strAttrOnclick = $(elLabel).attr("onclick");
                    var bChecked = cbxRawValue === 1 || cbxRawValue === "True" || obj[obj.selectColumnName] === 1 || $(elCheckBox).attr("checked") === "checked" ? " checked='checked'" : "";

                    var strId = $(elCheckBox).attr("id");

                    var strCheckBox = `<input type='checkbox' webixignore='true' class='webix_table_checkbox' ${strCellAttributes} id='${strId}' name='${obj.SelectColumnId}'  ${bChecked}`;

                    strHTML = strCheckBox + `><label onclick="${strAttrOnclick}" for="${strAttrFor}"></label>`;
                }
            }
            else
            {
                strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);
            }

            return strHTML;
        };
                
        if(column.columntype !== "DGCBC") column.sort = null;
        column.css += " datatable_cell_align_center";
        column.header.css = (column.header.css ? column.header.css : "" ) + "datatable_cell_align_center";

        return column;
    },

    getData: function() { }
};

function DataGridCheckboxColumn(nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode, bEnableColumnFilter);
}

DataGridCheckboxColumn.prototype = {

    getConfiguration: function (cols, headCells)
    {
        var column = DataGridSelectColumn.prototype.getConfiguration.call(this, cols, headCells);

        column.template = function (obj, common, value, config)
        {
            var strHTML = "<div></div>";
            if(config.controltype && config.controltype === 5)
            {
                strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);
            }
            else
            {
                var strCellAttributes = "";
                if(obj.columnAttributes !== undefined)
                {
                    var colInfo = obj.columnAttributes[config.id];  
                    
                    strCellAttributes = DataGridColumn.prototype.objectToString.call(this, colInfo, ["style"]);
                }   

                var cbxRawValue = obj[config.id];
                var cbxDisplayValue = obj["display" + config.id];
                if(cbxDisplayValue == undefined) return strHTML;

                if(typeof cbxDisplayValue == "string" && cbxDisplayValue.includes("checkbox") && !cbxDisplayValue.includes("disabled"))
                {
                    var elHTML = $.parseHTML(cbxDisplayValue);
                    var elCheckBox = elHTML.filter(element => element.type === "checkbox");
                    var elLabel = elHTML.filter(element => element.tagName === "LABEL");
                    var strAttrFor = $(elLabel).attr("for");
                    var bChecked = cbxRawValue === 1 || cbxRawValue === "True" || obj[obj.selectColumnName] === 1 || $(elCheckBox).attr("checked") === "checked" ? " checked='checked'" : "";

                    var strId = $(elCheckBox).attr("id");
                    var strName = $(elCheckBox).attr("name");

                    var strCheckBox = `<input type='checkbox' id='${strId}' name='${strName}'  ${bChecked}`;                    

                    cbxDisplayValue = strCheckBox + `><label class='js_checkbox_click' for="${strAttrFor}"></label>`;
                }                

                strHTML = "<div " + strCellAttributes + " wrapper='true'>" + cbxDisplayValue + "</div>";                                             
            }
            return strHTML;
        };

        return column;
    },

    setEditorType(config, row)
    {
        return DataGridColumn.prototype.setEditorType.call(this, config, row);
    }
};

function DataGridTimelineColumn(nIndex, nHeaderCellPosition, strViewType)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType);
}

DataGridTimelineColumn.prototype = {

    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);

        if(headCells !== null)
        {
            var headerCellAttributes = ADCOM_GetAttributesByFilter(headCells[this.HeaderCellPosition], ["tip", "class"]);
            var strTipText = headerCellAttributes.tip && headerCellAttributes.tip !== "" ? "tip='" + headerCellAttributes.tip + "'" : "";
            var strText = headCells[this.HeaderCellPosition].innerHTML;

            column.name = strText;
            column.header = {
                text: "<span class='cellh-text " + headerCellAttributes.class + "' " + strTipText + ">" + strText + "</span>",
                css: "htimeline",
                height: headCells[this.HeaderCellPosition].clientHeight
            };
        }

        return column;
    },

    getData: function() { },

    setEditorType(config, row)
    {
        return DataGridColumn.prototype.setEditorType.call(this, config, row);
    }
};

function DataGridBreakGroupButton(nIndex, nHeaderCellPosition, strTableId, strViewType, bIsEditMode)
{
    this.tableId = strTableId;
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode);
}

DataGridBreakGroupButton.prototype =
{
    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);
        column.cssFormat = function(value, row, rowId, colId)
        {
            return row.rowAttributes.gl == undefined || parseInt(row.rowAttributes.gl) > this.grouplevel ? "datatable_cell-indent" : "";
        }
        column.width = 18;
        column.minWidth = 18;
        column.maxWidth = 18;
        column.minCellWidth = 18;
        column.maxCellWidth = 18;
        column.css = column.css + " no-lpadding";
        column.sort = null;
        if(headCells !== null)
        {
            var headerCellAttributes = ADCOM_GetAttributesByFilter(headCells[this.HeaderCellPosition], ["tip", "class", "style", "lclick"]);
            var bGroupToggleInServer = headerCellAttributes.lclick !== undefined && headerCellAttributes.lclick.indexOf('ADCOM_PB') !== -1;
            var arrSkipAttributes = bGroupToggleInServer ? ["style"] : ["style", "lclick"];

            var strAttributes = DataGridColumn.prototype.objectToString.call(this, headerCellAttributes, arrSkipAttributes);
            if(!bGroupToggleInServer)
            {
                strAttributes = strAttributes + " onclick=\"ADWXG_toggleGroups(" + column.grouplevel + ", \'" + this.tableId + "\')\"";
            }

            var strText = headCells[this.HeaderCellPosition].innerHTML;

            var nPosition = strAttributes.indexOf("class=\"") + 7;
            var strHeaderAttr = [strAttributes.slice(0, nPosition), "cell-htext ", strAttributes.slice(nPosition)].join('');
            column.header = {
                text: "<span " + strHeaderAttr + ">" + strText + "</span>", css: " no-lpadding no-rpadding"
            };
        }

        column.template = function(obj, common, value, config)
        {
            var strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);

            if(strHTML === '' || strHTML === undefined) strHTML = "&nbsp;";

            return parseInt(obj.rowAttributes.gl) === config.grouplevel && obj.rowAttributes.rc !== undefined && obj.rowAttributes.rc !== "GF" ? common.icon(obj, common, value, config) : strHTML;
        };

        return column;
    },

    setEditorType(config, row)
    {
        return DataGridColumn.prototype.setEditorType.call(this, config, row);
    }
};

function DataGridTimelineScaleColumn(nIndex, nHeaderCellPosition, strViewType)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType);
}

DataGridTimelineScaleColumn.prototype =
{
    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);

        column.template = function(obj, common, value, config)
        {
            var strHTML = DataGridColumn.prototype.getCellTemplate.call(this, obj, common, value, config);

            return common.icon(obj, common, value, config) + strHTML;
        };

        return column;
    }
};

function DataGridContextMenuColumn(nIndex, nHeaderCellPosition, strViewType, bIsEditMode)
{
    DataGridColumn.call(this, nIndex, nHeaderCellPosition, strViewType, bIsEditMode);
}

DataGridContextMenuColumn.prototype =
{
    getConfiguration: function(cols, headCells)
    {
        var column = DataGridColumn.prototype.getConfiguration.call(this, cols, headCells);
        column.sort = null;

        if(this.viewType ==="timeline")
        {
            column.width = 34;
            column.minCellWidth = 34;
            column.maxCellWidth = 34;
        }

        if(column.css && column.css.indexOf("ColX") > 0)
        {
            column.width = 1;
            column.minCellWidth = 1;
            column.maxCellWidth = 1;
        }

        column.header.css += " reset-filter-hide";
        column.header.text = "<span class='reset-filter no-filter-enabled'>&nbsp;</span>";

        column.header.showClearFilter = function(strDatatableId)
        {
            var colContextMenu = $$(strDatatableId).config.columns.filter(column => column.columntype === "DGCMC")[0];
            var headerNode = $$(strDatatableId).getHeaderNode(colContextMenu.id);
            $(headerNode).children(".reset-filter").addClass("filter-enabled");
            $(headerNode).children(".reset-filter").removeClass("no-filter-enabled");
            $(headerNode).children(".reset-filter").attr("onclick", `ADWEBIX_ResetFilter('${strDatatableId}')`);
        }

        column.header.hideClearFilter = function(strDatatableId)
        {
            var colContextMenu = $$(strDatatableId).config.columns.filter(column => column.columntype === "DGCMC")[0];
            var headerNode = $$(strDatatableId).getHeaderNode(colContextMenu.id);
            $(headerNode).children(".reset-filter").addClass("no-filter-enabled");
            $(headerNode).children(".reset-filter").removeClass("filter-enabled");
            $(headerNode).children(".reset-filter").removeAttr("onclick");
        }

        return column;
    }
};

function ADWXG_ApplyMergeGroupRowIndentStyle(value, row, rowId, colId)
{
    return this.css && this.css.lastIndexOf("ColMG") > 0 && row[colId] === "&nbsp;" ? "datatable_cell-indent" : "";
}

function ADWXG_GetSortType(columnType)
{
    var strSortType = "string";

    if(columnType === undefined || columnType === null) return strSortType;

    switch(columnType.toLowerCase())
    {
        case "date":
        case "datetime":
            strSortType = "date";
            break;
        case "int16":
        case "int32":
        case "int64":
        case "decimal":
        case "double":
            strSortType = "int";
            break;
        case "single":
            strSortType = "single";
            break;
    }

    return strSortType;
}

function ADWXG_GetAlignment(styles)
{
    if(styles !== undefined && styles !== null && styles !== "")
    {
        if(styles.indexOf("text-align:right") > -1) return "datatable_header_align_right";

        if(styles.indexOf("text-align:center") > -1) return "datatable_header_align_center";
    }

    return "datatable_header_align_left";
}

function ADWXG_GetColumnConfiguration(dataGridId, colName)
{
    var elWebixTable = $$(dataGridId + "_Webix");
    var nColumnsCount = elWebixTable.config.columns.length;
    for(var nIndex = 0; nIndex < nColumnsCount; nIndex++)
    {
        var col = elWebixTable.config.columns[nIndex];

        if(col.id === colName) return col;
    }

    return null;
}

function ADWXG_toggleGroups(grouplevel, id)
{
    var groupOpenState = null;
    
    var grid = $$(id + "_Webix");
    var gridData = grid.data;
    gridData.each(function(obj)
        {
            if(parseInt(obj.rowAttributes.gl) === grouplevel)
            {
                if(groupOpenState === null)
                {
                    groupOpenState = obj.open;
                }

                obj.open = !groupOpenState;
            }
        }, grid, true);

    grid.refresh();
}

function ADWXG_GetSingleColumnTypes()
{
    return ["DGTC", "DGTCB", "DGTSC", "DGBGB", "DGCL", "DGCR", "DGCMC", "DGTPC"];
}

function ADWXG_GetAsDate(strValue)
{
    var pattern = /(\d{2})\.(\d{2})\.(\d{4})/;

    if(strValue.search(pattern) !== -1)
    {
        var dtDateTimeParts = strValue.split(" ");

        if(dtDateTimeParts[0] !== "") return new Date(dtDateTimeParts[0].replace(pattern, '$3-$2-$1') + ' ' + dtDateTimeParts[1]);
    }

    return new Date(-8640000000000000);
}

function ADWXG_Header_Click(el, strWebViewId)
{
    var strColumnName = el.getAttribute("data-columnname");
    var strSortDirection = el.getAttribute("data-sort-direction");
    var strMarkColumnName = el.parentNode.firstChild.getAttribute("data-columnname");

    strSortDirection = (strSortDirection !== "undefined") && (strSortDirection === "asc") ? "desc" : "asc";
    el.setAttribute("data-sort-direction", strSortDirection);

    var nodes = Array.prototype.slice.call(el.parentNode.children);
    var nColIndex = nodes.indexOf(el);
    el.parentNode.setAttribute("data-sortcolumn-Index", nColIndex);

    var webixTable = $$(strWebViewId + "_Webix");
    webixTable.sort(strColumnName, strSortDirection);

    var colLength = webixTable.config.columns.length;
    for(var i = 0; i < colLength; i++)
    {
        if(webixTable.config.columns[i].id === strMarkColumnName)
        {
            webixTable.config.columns[i].sortIndex = nColIndex;
        }
    }

    webixTable.markSorting(strMarkColumnName, strSortDirection);
    webixTable.config.multicellsort = { id: strMarkColumnName, dir: strSortDirection, index: nColIndex };
}

function ADWXG_IgnoreHeaderAndFooter(a, b, colName, colType)
{
    if(parseInt(a.rowAttributes.gl) >= 100 || a.rowAttributes.rc === undefined || (a.rowAttributes.rc !== "GF" && a.rowAttributes.rc !== "GH"))
    {
        var valueA = a[colName];
        var valueB = b[colName];
        var regxInt = /^[+-]?(\d+(\.\d+)?|\.\d+)([eE][+-]?\d+)?$/;


        if((colType === "byte" || colType === "date") && regxInt.test(valueA) && regxInt.test(valueB))
        {
            colType = "int";
        }

        if(colType === "single")
        {
            colType =  regxInt.test(valueA) && regxInt.test(valueB) ? "int" : "string";
        }

        if(colType === "int" && valueA === "" && valueB === "")
        {
            valueA = 0;
            valueB = 0;
        }

        if(colType === "int" && !regxInt.test(valueA) && !regxInt.test(valueB))
        {
            colType = "string";
        }

        switch(colType)
        {
            case "date":
            case "datetime":
                valueA = valueA - 0;
                valueB = valueB - 0;
                if(isNaN(valueB)) return 1;
                if(isNaN(valueA)) return -1;
                break;

            case "int":
            case "int16":
            case "int32":
            case "int64":
            case "decimal":
            case "double":
                valueA = valueA * 1;
                valueB = valueB * 1;
                if(isNaN(valueB)) return 1;
                if(isNaN(valueA)) return -1;
                break;

            default:
                if(!valueB) return 1;
                if(!valueA) return -1;
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
                break;
        }

        return valueA > valueB ? 1 : (valueA < valueB ? -1 : 0);
    }

    return 0;
}

function throttle(fn, timeout)
{
    var timer = null;
    return function()
    {
        if(!timer)
        {
            timer = setTimeout(function()
            {
                fn();
                timer = null;
            }, timeout);
        }
    };
}