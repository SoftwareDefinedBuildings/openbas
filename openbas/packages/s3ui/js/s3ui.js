

//=============================================================================
//==================== S3UI.JS   ==============================================
//=============================================================================

if (typeof smap3 == 'undefined') { smap3 = {}; }

// Stores state of graph and contains functions to manipulate it

smap3._ui.initialized = false;

// Width and height of the chart area (constants)
smap3._ui.WIDTH = 600;
smap3._ui.HEIGHT = 300;

// Margin size (not constant)
smap3._ui.margin = {left: 100, right: 50, top: 50, bottom: 50};

smap3._ui.streamList = [];
smap3._ui.dateFormat = "%a %b %d, %Y %T";
smap3._ui.dateConverter = new AnyTime.Converter({format: smap3._ui.dateFormat});
smap3._ui.makeColorMenu = smap3._utils.makeMenuMaker();
smap3._ui.streamSettings = {}; // Stores the stream settings chosen in the legend (maps uuid to a setting object)
smap3._ui.selectedStreams = []; // Streams that have been selected and are displayed in the legend
smap3._ui.automaticAxisUpdate = false; // True if axes will be updated without the need for an "Update Axes" button

// Behavior for zooming and scrolling
smap3._ui.repaintZoom()
{
    d3.select("g#x-axis").call(smap3._ui.oldXAxis);
    smap3._ui.drawStreams(smap3._ui.oldData, smap3._ui.selectedStreams, smap3._ui.streamSettings, smap3._ui.oldXScale, smap3._ui.oldYScales, smap3._ui.oldYAxisArray, smap3._ui.oldAxisData, smap3._ui.oldOffsets, smap3._ui.loadingElem, true);
}

smap3._ui.cacheData(stream, resolution, startTime, endTime)
{
    var sideCache = endTime - startTime;
    var newResolution;
    smap3._ui.ensureData(stream, resolution, startTime - sideCache, startTime,
        function ()
        {
            smap3._ui.ensureData(stream, resolution, endTime, endTime + sideCache,
            function ()
            {
                newResolution = getResolutionStep(stream, resolution);
                newResolution = newResolution[2];
                smap3._ui.ensureData(stream, newResolution, startTime - sideCache, endTime + sideCache,
                function ()
                {
                    newResolution = getResolutionStep(stream, newResolution);
                    newResolution = newResolution[2];
                    smap3._ui.ensureData(stream, newResolution, startTime - sideCache, endTime + sideCache, updatePlotMessage);
                });
            });
        });
}

smap3._ui.repaintZoomNewData()
{
    var domain = smap3._ui.oldXScale.domain();
    var numResponses = 0;
    function makeDataCallback(stream, startTime, endTime)
    {
        return function (data)
        {
            smap3._ui.oldData[stream.uuid] = [smap3._ui.oldData[stream.uuid][0], data];
            numResponses++;
            if (numResponses == smap3._ui.selectedStreams.length)
            {
                repaintZoom();
            }
            smap3._ui.loadingElem.html("Caching data...");
            smap3._data.cacheData(stream, resolution, startTime, endTime);
        };
    }
    var resolution = smap3._ui.WIDTH / (domain[1] - domain[0]);
    smap3._ui.loadingElem.html("Fetching data...");
    for (var i = 0; i < smap3._ui.selectedStreams.length; i++)
    {
        smap3._data.ensureData(smap3._ui.selectedStreams[i], resolution, domain[0] - smap3._ui.oldOffsets[i], domain[1] - smap3._ui.oldOffsets[i], makeDataCallback(smap3._ui.selectedStreams[i], domain[0] - smap3._ui.oldOffsets[i], domain[1] - smap3._ui.oldOffsets[i]));
    }
}

var zoom = d3.behavior.zoom = function()
    .on("zoom", repaintZoom)
    .on("zoomend", repaintZoomNewData)
    .size([smap3._ui.WIDTH, smap3._ui.HEIGHT])
    .scaleExtent([0, Infinity]);

smap3._ui.initPlot = function()
{
    var chart = d3.select("svg#chart");
    $(chart.node()).empty(); // Remove directions from inside the chart
    chart.attr("width", smap3._ui.margin.left + smap3._ui.WIDTH + smap3._ui.margin.right)
        .attr("height", smap3._ui.margin.top + smap3._ui.HEIGHT + smap3._ui.margin.bottom)
      .append("rect")
        .attr("id", "background-rect")
        .attr("fill", "white")
        .attr("width", smap3._ui.margin.left + smap3._ui.WIDTH + smap3._ui.margin.right)
        .attr("height", smap3._ui.margin.top + smap3._ui.HEIGHT + smap3._ui.margin.bottom)
    var chartarea = chart.append("g")
        .attr("id", "chartarea")
        .attr("width", smap3._ui.WIDTH)
        .attr("height", smap3._ui.HEIGHT)
        .attr("transform", "translate(" + smap3._ui.margin.left + ", " + smap3._ui.margin.top + ")");
    var yaxiscover = chart.append("g")
        .attr("id", "y-axis-cover")
        .attr("class", "axiscover")
        .attr("transform", "translate(0, " + smap3._ui.margin.top + ")");
    yaxiscover.append("rect")
        .attr("width", smap3._ui.margin.left)
        .attr("height", smap3._ui.HEIGHT + smap3._ui.margin.bottom)
        .attr("id", "y-axis-background-left")
        .attr("fill", "white");
    yaxiscover.append("rect")
        .attr("width", smap3._ui.margin.right)
        .attr("height", smap3._ui.HEIGHT + smap3._ui.margin.bottom)
        .attr("transform", "translate(" + (smap3._ui.margin.left + smap3._ui.WIDTH) + ", 0)")
        .attr("id", "y-axis-background-right")
        .attr("fill", "white");
    var xaxiscover = chart.append("g")
        .attr("id", "x-axis-cover")
        .attr("transform", "translate(" + smap3._ui.margin.left + ", " + (smap3._ui.margin.top + smap3._ui.HEIGHT) + ")");
    xaxiscover.append("rect")
        .attr("width", smap3._ui.WIDTH + 2) // Move 1 to the left and increase width by 2 to cover boundaries when zooming
        .attr("height", smap3._ui.margin.bottom)
        .attr("transform", "translate(-1, 0)")
        .attr("id", "x-axis-background")
        .attr("fill", "white");
    xaxiscover.append("text")
        .attr("id", "xtitle")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", smap3._ui.WIDTH / 2)
        .attr("y", 45)
        .html("Time");
    xaxiscover.append("g")
        .attr("id", "x-axis")
        .attr("class", "axis");
    chart.append("g")
        .attr("transform", "translate(0, " + smap3._ui.margin.top + ")")
        .attr("id", "y-axes");
    chart.append("rect") // To sense mouse click/drag
        .attr("width", smap3._ui.WIDTH)
        .attr("height", smap3._ui.HEIGHT)
        .attr("transform", "translate(" + smap3._ui.margin.left + ", " + smap3._ui.margin.top + ")")
        .call(zoom)
        .attr("onmousedown", "$(this).attr('class', 'clickedchart');")
        .attr("onmouseup", "$(this).attr('class', 'unclickedchart');")
        .attr("fill", "none")
        .attr("id", "clickscreen")
        .attr("class", "unclickedchart");
    smap3._ui.loadingElem = $('#plotLoading');
    smap3._ui.initialized = true;
}

/* Updates the size of the chart based on changes to the margins. */
smap3._ui.updateSize = function ()
{
    $("svg#chart, svg#chart rect#background-rect").attr({
        width: smap3._ui.margin.left + smap3._ui.WIDTH + smap3._ui.margin.right,
        height: smap3._ui.margin.top + smap3._ui.HEIGHT + smap3._ui.margin.bottom
        });
    $("svg#chart g#chartarea, svg#chart rect#clickscreen").attr("transform", "translate(" + smap3._ui.margin.left + ", " + smap3._ui.margin.top + ")");
    $("svg#chart g#x-axis-cover").attr("transform", "translate(" + smap3._ui.margin.left + ", " + (smap3._ui.margin.top + smap3._ui.HEIGHT) + ")");
    $("svg#chart g#y-axis-cover").attr("transform", "translate(0, " + smap3._ui.margin.top + ")");
    $("rect#x-axis-background").attr("height", smap3._ui.margin.bottom);
    $("rect#y-axis-background-left").attr({
        width: smap3._ui.margin.left,
        height: smap3._ui.HEIGHT + smap3._ui.margin.bottom
        });
    $("rect#y-axis-background-right").attr({
        width: smap3._ui.margin.right,
        height: smap3._ui.HEIGHT + smap3._ui.margin.bottom,
        transform: "translate(" + (smap3._ui.margin.left + smap3._ui.WIDTH) + ", 0)"
        });
    $("g#y-axes").attr("transform", "translate(0, " + smap3._ui.margin.top + ")");
}

smap3._ui.disableInputs = function()
{
    smap3._ui.inputs = [$("input, button, select"), document.getElementById("streamTree")];
    smap3._ui.inputs[0].prop("disabled", true);
    smap3._ui.inputs[1].style["pointer-events"] = "none";
}

smap3._ui.enableInputs = function()
{
    smap3._ui.inputs[0].prop("disabled", false);
    smap3._ui.inputs[1].style["pointer-events"] = "";
}

smap3._ui.updatePlot = function()
{
    if (!smap3._ui.initialized)
    {
        initPlot();
    }
    disableInputs();
    drawPlot();
}

smap3._ui.applySettings  = function(axischanged)
{
    if (smap3._ui.initialized)
    {
        if (!smap3._ui.automaticAxisUpdate)
        {
            smap3._ui.otherChange = true;
            updatePlotMessage();
        }
        else
        {
            disableInputs();
            setTimeout(function ()
            {
                drawYAxes(smap3._ui.oldData, smap3._ui.selectedStreams, smap3._ui.streamSettings, smap3._ui.oldStartDate, smap3._ui.oldEndDate, smap3._ui.oldXScale, smap3._ui.oldOffsets, smap3._ui.loadingElem);
            }, 50);
        }
    }
}

smap3._ui.drawPlot = function()
{
    // Get the time range we are going to plot
    // dateConverter is defined in plotter.html
    smap3._ui.loadingElem.html("Verifying date range...");
    var startText = document.getElementById("startdate").value;
    var endText = document.getElementById("enddate").value;
    if (startText == "")
    {
        smap3._ui.loadingElem.html("Error: Start date is not selected.");
        smap3._ui.enableInputs();
        return;
    } else if (endText == "")
    {
        smap3._ui.loadingElem.html("Error: End date is not selected.");
        smap3._ui.enableInputs();
        return;
    }
    var selectedTimezone = smap3._ui.getSelectedTimezone();
    var naiveStartDateObj = dateConverter.parse(startText);
    var naiveEndDateObj = dateConverter.parse(endText);
    try
    {
        var startDateObj = new timezoneJS.Date(naiveStartDateObj.getFullYear(), naiveStartDateObj.getMonth(), naiveStartDateObj.getDate(), naiveStartDateObj.getHours(), naiveStartDateObj.getMinutes(), naiveStartDateObj.getSeconds(), selectedTimezone);
        var endDateObj = new timezoneJS.Date(naiveEndDateObj.getFullYear(), naiveEndDateObj.getMonth(), naiveEndDateObj.getDate(), naiveEndDateObj.getHours(), naiveEndDateObj.getMinutes(), naiveEndDateObj.getSeconds(), selectedTimezone);
        var startDate = startDateObj.getTime();
        var endDate = endDateObj.getTime();
    }
    catch (err)
    {
        smap3._ui.loadingElem.html(err);
        smap3._ui.enableInputs();
        return;
    }
    if (startDate >= endDate)
    {
        smap3._ui.loadingElem.html("Error: Selected date range is invalid.");
        smap3._ui.enableInputs();
        return;
    }

    /* Used for optimization; GET request is not sent if same time range and streams are used. */
    var sameTimeRange = ((startDate == smap3._ui.oldStartDate) && (endDate == smap3._ui.oldEndDate));

    // Verify that streams have been selected
    smap3._ui.loadingElem.html("Verifying stream selection...");
    var numstreams = smap3._ui.selectedStreams.length;
    if (numstreams == 0)
    {
        smap3._ui.loadingElem.html("Error: No streams are selected.");
        enableInputs();
        return;
    }

    var offsetDate; // Used to hold temporary dates so we can get timezone offsets

    var offset = startDateObj.getTimezoneOffset();
    var offsets = [];
    for (var i = 0; i < smap3._ui.selectedStreams.length; i++)
    {
        try
        {
            offsetDate = new timezoneJS.Date(smap3._ui.selectedStreams[i].Properties.Timezone);
        }
        catch (e)
        {
            smap3._ui.loadingElem.html(err);
            enableInputs();
            return;
        }
        offsets.push((offsetDate.getTimezoneOffset() - offset) * 60000); // what to add to stream time zone to get selected time zone (ms)
    }
    smap3._ui.oldOffsets = offsets;
    offset *= -60000; // what to add to UTC to get to selected time zone

    smap3._ui.oldIntervalSize = (endDate - startDate) / smap3._ui.WIDTH;

    // Create the xScale and axis if we need to
    var xScale, xAxis;
    if (!sameTimeRange)
    {
        xScale = d3.time.scale.utc() // I'm telling d3 it's in UTC time, but in reality I'm going to add an offset to everything so it actually displays the selected time zone
            .domain([startDate + offset, endDateObj + offset])
            .range([0, smap3._ui.WIDTH]);
        xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(5);
        smap3._ui.oldStartDate = startDate;
        smap3._ui.oldEndDate = endDate;
        smap3._ui.oldXScale = xScale;
        smap3._ui.oldXAxis = xAxis;
    }
    else
    {
        xScale = smap3._ui.oldXScale;
        xAxis = smap3._ui.oldXAxis;
    }

    // Get the data for the streams
    initData(smap3._ui.selectedStreams, offsets, startDate + offset, endDate + offset, smap3._ui.loadingElem, function (data)
    {
            if (!sameTimeRange)
            {
                d3.select("g#x-axis")
                    .call(xAxis);
                zoom.x(xScale);
            }
            smap3._ui.loadingElem.html("Computing axes...");
            // Set a timeout so the new message (Computing axes...) actually shows
            setTimeout(function ()
            {
                drawYAxes(data, smap3._ui.selectedStreams, smap3._ui.streamSettings, startDate, endDate, xScale, offsets, smap3._ui.loadingElem);
            }, 50);
    });
}

smap3._ui.drawYAxes = function(data, streams, streamSettings, startDate, endDate, xScale, offsets, loadingElem)
{
    smap3._ui.otherChange = false;
    smap3._ui.oldData = data;
    // Find the minimum and maximum value in each stream to properly scale the axes
    var axisData = {}; // Maps axis ID to a 2-element array containing the minimum and maximum; later on a third element is added containing the y-Axis scale
    var noData = []; // An array of streams that have no data;
    var numstreams;
    var i, j, k;
    var streamdata;
    var totalmin;
    var totalmax;
    var datapointmin, datapointmax;
    var axis;
    for (i = 0; i < yAxes.length; i++)
    {
        axis = yAxes[i];
        if (!axis.autoscale && (axis.manualscale[1] > axis.manualscale[0]))
        {
            axisData[axis.axisid] = [NaN, NaN]; // so we know that we're using a manual scale for this axis
            continue;
        }
        numstreams = axis.streams.length;
        totalmin = undefined;
        totalmax = undefined;
        for (j = 0; j < numstreams; j++)
        {
            if (!data.hasOwnProperty(axis.streams[j].uuid))
            {
                continue;
            }
            streamdata = data[axis.streams[j].uuid][1];
            for (k = 0; k < streamdata.length; k++)
            {
                datapointmin = streamdata[k].min;
                datapointmax = streamdata[k].max;
                if (!(totalmin <= datapointmin))
                {
                    totalmin = datapointmin;
                }
                if (!(totalmax >= datapointmax))
                {
                    totalmax = datapointmax;
                }
            }
            if (streamdata.length == 0)
            {
                noData.push(streamdata);
            }
        }
        if (totalmin != undefined)
        {
            if (totalmin == totalmax)
            { // Choose a range so the axis can show something meaningful
                totalmin -= 1;
                totalmax += 1;
            }
            axisData[axis.axisid] = [totalmin, totalmax];
        }
    }

    smap3._ui.oldAxisData = axisData;

    numstreams = streams.length;

    var dataAxes = $.grep(yAxes, function (axisObj) { return axisData.hasOwnProperty(axisObj.axisid); });

    var yScales = $.map(dataAxes, function (elem)
    {
            var scale;
            if (isNaN(axisData[elem.axisid][0]))
            { // manual scale
                scale = d3.scale.linear()
                    .domain([elem.manualscale[0], elem.manualscale[1]])
                    .range([smap3._ui.HEIGHT, 0]);
            }
            else
            { // auto scale
                scale = d3.scale.linear()
                    .domain([axisData[elem.axisid][0], axisData[elem.axisid][1]])
                    .range([smap3._ui.HEIGHT, 0])
                    .nice();
                var domain = scale.domain();
                elem.manualscale[0] = domain[0];
                elem.manualscale[1] = domain[1];
            }
            axisData[elem.axisid].push(scale);
            return scale;
        });

    smap3._ui.oldYScales = yScales;

    var yAxisArray = $.map(yScales, function (yScale) { return d3.svg.axis().scale(yScale).orient("left").ticks(5); });

    smap3._ui.oldYAxisArray = yAxisArray;

    smap3._ui.margin.left = yAxisArray.length * 100;
    updateSize();

    // Draw the y-axes
    var update;
    update = d3.select("svg#chart g#y-axes")
      .selectAll("g.y-axis")
      .data(yAxisArray);
    update.enter()
      .append("g")
        .attr("class", "y-axis axis");
    update
        .attr("transform", function (d, i) { return "translate(" + (smap3._ui.margin.left - (100 * i)) + ", 0)"; })
        .each(function (yAxis) { d3.select(this).call(yAxis); });
    update.exit().remove();

    // Draw the y-axis titles
    update = d3.select("svg#chart")
      .selectAll("text.ytitle")
      .data(dataAxes);
    update.enter()
      .append("text")
        .attr("class", "ytitle title");
    update
        .attr("id", function (d) { return "axistitle-" + d.axisid; })
        .attr("text-anchor", "middle")
        .attr("transform", function (d, i) { return "translate(" + (smap3._ui.margin.left - (100 * i) - 60) + ", " + (smap3._ui.margin.top + (smap3._ui.HEIGHT / 2)) + ")rotate(-90)"; })
        .html(function (d) { return d.axisname; });
    update.exit().remove();

    loadingElem.html("Drawing graph...");
    setTimeout(function () { drawStreams(data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, offsets, loadingElem, false); }, 50);
}

/* Render the graph on the screen. If DRAWFAST is set to true, the entire plot is not drawn (for the sake of speed); in
   paticular new streams are not added and old ones not removed (DRAWFAST tells it to optimize for scrolling).
*/

smap3._ui.drawStreams = function(data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, offsets, loadingElem, drawFast)
{
    if (!drawFast && (streams.length == 0 || yAxisArray.length == 0))
    {
        if (streams.length == 0)
        {
            loadingElem.html("Error: No streams are selected.");
        }
        else
        {
            loadingElem.html("Error: All selected streams have no data.");
        }
        $("g#chartarea > g").remove();
        enableInputs();
        return;
    }
    // Render the graph
    var update;
    var uuid;
    var dataArray = [];
    var yScale;
    var mean, stdabove, stdbelow, minval, maxval;
    var subsetdata;
    var scaledX;
    var startIndex;
    var domain = xScale.domain();
    var startTime;
    var xPixel;
    var lastIteration;
    var color;

    for (i = 0; i < streams.length; i++)
    {
        currXPixel = -Infinity;
        currPointList = [];
        if (!data.hasOwnProperty(streams[i].uuid))
        {
            continue;
        }
        streamdata = data[streams[i].uuid][1];
        mean = [];
        stdabove = [];
        stdbelow = [];
        minval = [];
        maxval = [];
        yScale = axisData[streamSettings[streams[i].uuid].axisid][2];
        startTime = domain[0].getTime() - offsets[i];
        startIndex = binSearch(streamdata, startTime, function (point) { return point.median_time; });
        if (startIndex > 0 && streamdata[startIndex].median_time > startTime)
        {
            startIndex--; // plot the previous datapoint so the graph looks continuous
        }
        lastIteration = false;
        for (j = startIndex; j < streamdata.length; j++)
        {
            xPixel = Math.floor(xScale(streamdata[j].median_time + offsets[i]));
            mean.push(xPixel + "," + yScale(streamdata[j].mean));
            stdabove.push(xPixel + "," + yScale(streamdata[j].mean + streamdata[j].stdev));
            stdbelow.push(xPixel + "," + yScale(streamdata[j].mean - streamdata[j].stdev));
            minval.push(xPixel + "," + yScale(streamdata[j].min));
            maxval.push(xPixel + "," + yScale(streamdata[j].max));
            if (lastIteration)
                break;
            if (xPixel >= smap3._ui.WIDTH)
                lastIteration = true; // Include one point past the end so the graph looks continuous
        }
        stdbelow.reverse();
        minval.reverse();
        mean = mean.join(" ");
        stdabove = stdabove.join(" ") + " " + stdbelow.join(" ");
        maxval = maxval.join(" ") + " " + minval.join(" ");
        color = streamSettings[streams[i].uuid].color;
        dataArray.push({color: color, data: [[color, maxval], [color, stdabove], [color, mean]], uuid: streams[i].uuid});
    }

    update = d3.select("g#chartarea")
      .selectAll("g")
      .data(dataArray);

    update.enter()
      .append("g");

    if (!drawFast)
    {
        update
            .attr("id", function (dataObj) { return "series-" + dataObj.uuid; })
            .attr("stroke", function (d) { return d.color; })
            .attr("stroke-width", 1)
            .attr("fill", function (d) { return d.color; })
            .attr("fill-opacity", 0.3);
    }

    update.exit()
        .remove();

    update = d3.select("g#chartarea")
      .selectAll("g")
      .selectAll("polyline")
      .data(function (d, i) { return dataArray[i].data; });

    update.enter()
      .append("polyline");

    update
        .attr("class", function (d, i) { return i == 2 ? "streamMean" : "streamRange"; })
        .attr("points", function (d) { return d[1]; });

    update.exit()
      .remove(); // I suspect I may not actually need this

    if (!drawFast)
    {
        updatePlotMessage();
        enableInputs();
    }

    updateIntervalSize();
}

smap3._ui.resetZoom = function()
{
    zoom.scale(1)
        .translate([0, 0])
        .event(d3.select("svg#chart"));
}

smap3._ui.updateIntervalSize = function()
{
    var unit = 'ms';
    var intervalSize = smap3._ui.oldIntervalSize;
    if (intervalSize >= 86400000)
    {
        intervalSize /= 86400000;
        unit = 'd';
    }
    else if (intervalSize >= 3600000)
    {
        intervalSize /= 3600000;
        unit = 'h';
    }
    else if (intervalSize >= 60000)
    {
        intervalSize /= 60000;
        unit = 'm';
    }
    else if (intervalSize >= 1000)
    {
        intervalSize /= 1000;
        unit = 's';
    }
    document.getElementById('interval-size').innerHTML = intervalSize + " " + unit;
}

smap3._ui.updateStreamList = function()
{
    $("span#streamLoading").html("Loading Streams...");
    getURL('http://archiver.upmu.cal-sdb.org/backend/api/tags', function (data)
    {
        smap3._ui.streamList = eval(data); //XXX WTF?

        $("span#streamLoading").html("");

        if (typeof smap3._ui.streamTree != 'undefined')
        {
            // Remove everything from legend before destroying tree
            var roots = smap3._ui.streamTree.get_node("#").children;
            for (var i = 0; i < roots.length; i++)
            {
                selectNode(smap3._ui.streamTree, false, smap3._ui.streamTree.get_node(roots[i]));
            }
            smap3._ui.streamTree.destroy(true);
            applySettings();
        }

        var streamTreeDiv = $("div#streamTree");
        streamTreeDiv.jstree(
        {
                core: {
                    data: listToTree(smap3._ui.streamList)
                },
                contextmenu: {
                    select_node: false,
                    items: getContextMenu
                },
                plugins: ["checkbox", "contextmenu"]
        });
        smap3._ui.streamTree = $.jstree.reference(streamTreeDiv);
        streamTreeDiv.on("select_node.jstree", function (event, data)
        {
                selectNode(smap3._ui.streamTree, true, data.node);
                applySettings();
        });
        streamTreeDiv.on("deselect_node.jstree", function (event, data)
        {
                selectNode(smap3._ui.streamTree, false, data.node);
                applySettings();
        });
        }, "text");
}

smap3._ui.showInfo = function (datum, button, parent)
{
    var description = document.createElement("tr");
    description.appendChild(document.createElement("td"));
    description.appendChild(document.createElement("td"));
    description.lastChild.innerHTML = getInfo(datum);
    parent.parentNode.insertBefore(description, parent.nextSibling);
    button.innerHTML = 'Hide Details';
    button.onclick = function () { hideInfo(this, this.parentNode.parentNode); };
}

smap3._ui.hideInfo  = function(button, parent)
{
    parent.parentNode.removeChild(parent.nextSibling);
    button.innerHTML = 'Show Details';
    button.onclick = function () { showInfo(this.__data__, this, this.parentNode.parentNode); };
}

/* Adds or removes (depending on whether it is already present) a
stream to or from the legend. */
smap3._ui.toggleLegend  = function(show, streamdata, update)
{
    if (update == undefined)
    {
        update = true;
    }
    if (show)
    {
        smap3._ui.selectedStreams.push(streamdata);
        var row = d3.select("tbody#legend")
          .append("tr")
            .datum(streamdata)
            .attr("id", function (d) { return "legend-" + d.uuid; });
        var colorMenu = row.append("td")
            .append(makeColorMenu)
            .attr("id", function (d) { return "color-" + d.uuid; })
          .node();
        colorMenu.onchange = function ()
        {
            var newColor = this[this.selectedIndex].value;
            var streamGroup= $("g#series-" + streamdata.uuid);
            streamGroup.attr("stroke", newColor);
            streamGroup.attr("fill", newColor);
            smap3._ui.streamSettings[streamdata.uuid].color = newColor;
        };
        smap3._ui.streamSettings[streamdata.uuid] = { color: colorMenu[colorMenu.selectedIndex].value, axisid: "y1" }; // axisid is changed
        var nameElem = row.append("td")
            .html(function (d) { return getFilepath(d); })
          .node();
        nameElem.onmouseover = function () { $("g#series-" + streamdata.uuid).attr({"stroke-width": 3, "fill-opacity": 0.5}); };
        nameElem.onmouseout = function () { $("g#series-" + streamdata.uuid).attr({"stroke-width": 1, "fill-opacity": 0.3}); };
        var selectElem = row.append("td")
          .append("select")
            .attr("class", "axis-select")
            .attr("id", "axis-select-" + streamdata.uuid);
        selectElem.selectAll("option")
          .data(yAxes)
          .enter()
          .append("option")
            .attr("class", function (d) { return "option-" + d.axisid; })
            .attr("value", function (d) { return d.axisid; })
            .html(function (d) { return d.axisname; });
        var selectNode = selectElem.node();
        var initIndex = guessYAxis(streamdata); // use a heuristic to get the initial selection
        if (initIndex == undefined)
        {
            initIndex = yAxes.length;
            addYAxis();
        }
        selectNode.selectedIndex = initIndex;
        selectNode.setAttribute("data-prevselect", selectNode[selectNode.selectedIndex].value);
        selectNode.onchange = function (event, suppressUpdate)
        {
            var newID = this[this.selectedIndex].value;
            changeAxis(streamdata, this.getAttribute("data-prevselect"), newID);
            this.setAttribute("data-prevselect", newID);
            if (suppressUpdate == undefined)
            {
                applySettings();
            }
        };
        changeAxis(streamdata, null, selectNode[selectNode.selectedIndex].value);
        $("select#color-" + streamdata.uuid).simplecolorpicker({picker: true});
        if (update && smap3._ui.oldData.hasOwnProperty(streamdata.uuid))
        { // If data has already been loaded, go ahead and display it
            applySettings();
        } else
        {
            smap3._ui.addedStreams = true;
            updatePlotMessage();
        }
    }
    else
    {
        var toRemove = document.getElementById("legend-" + streamdata.uuid);
        var selectElem = toRemove.lastChild.firstChild;
        var oldAxis = selectElem[selectElem.selectedIndex].value;
        changeAxis(streamdata, oldAxis, null);
        toRemove.parentNode.removeChild(toRemove);
        delete smap3._ui.streamSettings[streamdata.uuid];
        for (var i = 0; i < smap3._ui.selectedStreams.length; i++)
        {
            if (smap3._ui.selectedStreams[i] == streamdata) {
                smap3._ui.selectedStreams.splice(i, 1);
                break;
            }
        }
        if (update && smap3._ui.oldData.hasOwnProperty(streamdata.uuid))
        { // If the data hasn't been loaded, we don't have to do this
            applySettings(); // Make stream removal visible on the graph
        }
    }
}

smap3._ui.updatePlotMessage = function()
{
    var message = "";
    if (smap3._ui.automaticAxisUpdate)
    {
        if (smap3._ui.addedStreams || smap3._ui.changedTimes)
        {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    }
    else
    {
        if (smap3._ui.addedStreams || smap3._ui.changedTimes || smap3._ui.otherChange)
        {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    }
    document.getElementById("plotLoading").innerHTML = message;
}

smap3._ui.getSelectedTimezone = function()
{
    var timezoneSelect = document.getElementById("timezoneSelect");
    var selection = timezoneSelect[timezoneSelect.selectedIndex].value;
    if (selection == "OTHER")
    {
        return document.getElementById("otherTimezone").value.trim();
    }
    else
    {
        return selection;
    }
}

smap3._ui.createPlotDownload = function()
{
    var chartElem = document.getElementById("chart");
    var graphStyle = document.getElementById("plotStyles").innerHTML;
    var xmlData = '<svg width="' + chartElem.getAttribute("width") + '" height="' + chartElem.getAttribute("height") + '" background="white">'
        + '<defs><style type="text/css"><![CDATA[' + graphStyle + ']]></style></defs>' + chartElem.innerHTML + '</svg>';
    var downloadAnchor = document.createElement("a");
    downloadAnchor.innerHTML = "Download Image (created " + (new Date()).toLocaleString() + ", local time)";
    downloadAnchor.setAttribute("href", 'data:text/svg;charset="utf-8",' + encodeURIComponent(xmlData));
    downloadAnchor.setAttribute("download", "graph.svg");
    var linkLocation = document.getElementById("download-graph");
    linkLocation.innerHTML = ""; // Clear what was there before...
    linkLocation.insertBefore(downloadAnchor, null); // ... and replace it with this download link
}

// Set up timezone-js
Template.s3plot.on_use = function() {
    timezoneJS.timezone.zoneFileBasePath = 'tz';
    timezoneJS.timezone.init();
}

Template.s3plot.rendered = function()
{
    // Selection of the element to display progress
    smap3._ui.loadingElem = $('#plotLoading');
    $(".datefield").AnyTime_picker({format: smap3._ui.dateFormat});
    updateStreamList();
    smap3._ui.automaticAxisUpdate = document.getElementById("automaticAxisSetting").checked; // Some browsers may fill in this value automatically after refresh
    addYAxis();
    $(".removebutton").remove(); // Get rid of the remove button for the first axis
    //axisMap.y1.axisname = document.getElementById("name-y1").value; // Some browsers may fill in this value automatically after refresh
    document.getElementById("timezoneSelect").onchange(); // In case the browser selects "Other:" after refresh
    smap3._ui.addedStreams = false;
    smap3._ui.changedTimes = false;
    smap3._ui.otherChange = false;
    updatePlotMessage();
};




