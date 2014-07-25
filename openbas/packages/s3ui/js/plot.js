// Stores state of graph and contains functions to manipulate it

var initialized = false;

// Width and height of the chart area (constants)
var WIDTH = 600;
var HEIGHT = 300;

// Margin size (not constant)
var margin = {left: 100, right: 50, top: 50, bottom: 50};

// Selection of the element to display progress
var loadingElem = $('#plotLoading');

// Parameters of the last update
var oldStartDate;
var oldEndDate;
var oldData = {};
var oldXScale;
var oldXAxis;
var oldYScales;
var oldYAxisArray;
var oldAxisData;
var oldOffsets;
var oldIntervalSize;

// Elements disabled while loading data and enabled afterwards
var inputs;

// Behavior for zooming and scrolling
function repaintZoom() {
    d3.select("g#x-axis").call(oldXAxis);
    drawStreams(oldData, selectedStreams, streamSettings, oldXScale, oldYScales, oldYAxisArray, oldAxisData, oldOffsets, loadingElem, true);
}

function cacheData(stream, resolution, startTime, endTime) {
    var sideCache = endTime - startTime;
    var newResolution;
    ensureData(stream, resolution, startTime - sideCache, startTime,
        function () {
            ensureData(stream, resolution, endTime, endTime + sideCache,
            function () {
                newResolution = getResolutionStep(stream, resolution);
                newResolution = newResolution[2];
                ensureData(stream, newResolution, startTime - sideCache, endTime + sideCache,
                function () {
                    newResolution = getResolutionStep(stream, newResolution);
                    newResolution = newResolution[2];
                    ensureData(stream, newResolution, startTime - sideCache, endTime + sideCache, updatePlotMessage);
                });
            });
        });
}

function repaintZoomNewData() {
    var domain = oldXScale.domain();
    var numResponses = 0;
    function makeDataCallback(stream, startTime, endTime) {
        return function (data) {
            oldData[stream.uuid] = [oldData[stream.uuid][0], data];
            numResponses++;
            if (numResponses == selectedStreams.length) {
                repaintZoom();
            }
            loadingElem.html("Caching data...");
            cacheData(stream, resolution, startTime, endTime);
        };
    }
    var resolution = WIDTH / (domain[1] - domain[0]);
    loadingElem.html("Fetching data...");
    for (var i = 0; i < selectedStreams.length; i++) {
        ensureData(selectedStreams[i], resolution, domain[0] - oldOffsets[i], domain[1] - oldOffsets[i], makeDataCallback(selectedStreams[i], domain[0] - oldOffsets[i], domain[1] - oldOffsets[i]));
    }
}

var zoom = d3.behavior.zoom()
    .on("zoom", repaintZoom)
    .on("zoomend", repaintZoomNewData)
    .size([WIDTH, HEIGHT])
    .scaleExtent([0, Infinity]);

function initPlot() {
    var chart = d3.select("svg#chart");
    $(chart.node()).empty(); // Remove directions from inside the chart
    chart.attr("width", margin.left + WIDTH + margin.right)
        .attr("height", margin.top + HEIGHT + margin.bottom)
      .append("rect")
        .attr("id", "background-rect")
        .attr("fill", "white")
        .attr("width", margin.left + WIDTH + margin.right)
        .attr("height", margin.top + HEIGHT + margin.bottom)
    var chartarea = chart.append("g")
        .attr("id", "chartarea")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
    var yaxiscover = chart.append("g")
        .attr("id", "y-axis-cover")
        .attr("class", "axiscover")
        .attr("transform", "translate(0, " + margin.top + ")");
    yaxiscover.append("rect")
        .attr("width", margin.left)
        .attr("height", HEIGHT + margin.bottom)
        .attr("id", "y-axis-background-left")
        .attr("fill", "white");
    yaxiscover.append("rect")
        .attr("width", margin.right)
        .attr("height", HEIGHT + margin.bottom)
        .attr("transform", "translate(" + (margin.left + WIDTH) + ", 0)")
        .attr("id", "y-axis-background-right")
        .attr("fill", "white");
    var xaxiscover = chart.append("g")
        .attr("id", "x-axis-cover")
        .attr("transform", "translate(" + margin.left + ", " + (margin.top + HEIGHT) + ")");
    xaxiscover.append("rect")
        .attr("width", WIDTH + 2) // Move 1 to the left and increase width by 2 to cover boundaries when zooming
        .attr("height", margin.bottom)
        .attr("transform", "translate(-1, 0)")
        .attr("id", "x-axis-background")
        .attr("fill", "white");
    xaxiscover.append("text")
        .attr("id", "xtitle")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", WIDTH / 2)
        .attr("y", 45)
        .html("Time");
    xaxiscover.append("g")
        .attr("id", "x-axis")
        .attr("class", "axis");
    chart.append("g")
        .attr("transform", "translate(0, " + margin.top + ")")
        .attr("id", "y-axes");
    chart.append("rect") // To sense mouse click/drag
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .attr("transform", "translate(" + margin.left + ", " + margin.top + ")")
        .call(zoom)
        .attr("onmousedown", "$(this).attr('class', 'clickedchart');")
        .attr("onmouseup", "$(this).attr('class', 'unclickedchart');")
        .attr("fill", "none")
        .attr("id", "clickscreen")
        .attr("class", "unclickedchart");
    loadingElem = $('#plotLoading');
    initialized = true;
}

/* Updates the size of the chart based on changes to the margins. */
function updateSize() {
    $("svg#chart, svg#chart rect#background-rect").attr({
        width: margin.left + WIDTH + margin.right,
        height: margin.top + HEIGHT + margin.bottom
        });
    $("svg#chart g#chartarea, svg#chart rect#clickscreen").attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
    $("svg#chart g#x-axis-cover").attr("transform", "translate(" + margin.left + ", " + (margin.top + HEIGHT) + ")");
    $("svg#chart g#y-axis-cover").attr("transform", "translate(0, " + margin.top + ")");
    $("rect#x-axis-background").attr("height", margin.bottom);
    $("rect#y-axis-background-left").attr({
        width: margin.left,
        height: HEIGHT + margin.bottom
        });
    $("rect#y-axis-background-right").attr({
        width: margin.right,
        height: HEIGHT + margin.bottom,
        transform: "translate(" + (margin.left + WIDTH) + ", 0)"
        });
    $("g#y-axes").attr("transform", "translate(0, " + margin.top + ")");
}

function disableInputs() {
    inputs = [$("input, button, select"), document.getElementById("streamTree")];
    inputs[0].prop("disabled", true);
    inputs[1].style["pointer-events"] = "none";
}

function enableInputs() {
    inputs[0].prop("disabled", false);
    inputs[1].style["pointer-events"] = "";
}

function updatePlot() {
    if (!initialized) {
        initPlot();
    }
    disableInputs();
    drawPlot();
}

function applySettings (axischanged) {
    if (initialized) {
        if (!automaticAxisUpdate) {
            otherChange = true;
            updatePlotMessage();
        } else {
            disableInputs();
            setTimeout(function () {
                    drawYAxes(oldData, selectedStreams, streamSettings, oldStartDate, oldEndDate, oldXScale, oldOffsets, loadingElem);
                }, 50);
        }
    }
}

function drawPlot() {
    // Get the time range we are going to plot
    // dateConverter is defined in plotter.html
    loadingElem.html("Verifying date range...");
    var startText = document.getElementById("startdate").value;
    var endText = document.getElementById("enddate").value;
    if (startText == "") {
        loadingElem.html("Error: Start date is not selected.");
        enableInputs();
        return;
    } else if (endText == "") {
        loadingElem.html("Error: End date is not selected.");
        enableInputs();
        return;
    }
    var selectedTimezone = getSelectedTimezone();
    var naiveStartDateObj = dateConverter.parse(startText);
    var naiveEndDateObj = dateConverter.parse(endText);
    try {
        var startDateObj = new timezoneJS.Date(naiveStartDateObj.getFullYear(), naiveStartDateObj.getMonth(), naiveStartDateObj.getDate(), naiveStartDateObj.getHours(), naiveStartDateObj.getMinutes(), naiveStartDateObj.getSeconds(), selectedTimezone);
        var endDateObj = new timezoneJS.Date(naiveEndDateObj.getFullYear(), naiveEndDateObj.getMonth(), naiveEndDateObj.getDate(), naiveEndDateObj.getHours(), naiveEndDateObj.getMinutes(), naiveEndDateObj.getSeconds(), selectedTimezone);
        var startDate = startDateObj.getTime();
        var endDate = endDateObj.getTime();
    } catch (err) {
        loadingElem.html(err);
        enableInputs();
        return;
    }
    if (startDate >= endDate) {
        loadingElem.html("Error: Selected date range is invalid.");
        enableInputs();
        return;
    }
    
    /* Used for optimization; GET request is not sent if same time range and streams are used. */
    var sameTimeRange = ((startDate == oldStartDate) && (endDate == oldEndDate));
    
    // Verify that streams have been selected
    loadingElem.html("Verifying stream selection...");
    var numstreams = selectedStreams.length;
    if (numstreams == 0) {
        loadingElem.html("Error: No streams are selected.");
        enableInputs();
        return;
    }
    
    var offsetDate; // Used to hold temporary dates so we can get timezone offsets
    
    var offset = startDateObj.getTimezoneOffset();
    var offsets = [];
    for (var i = 0; i < selectedStreams.length; i++) {
        try {
            offsetDate = new timezoneJS.Date(selectedStreams[i].Properties.Timezone);
        } catch (e) {
            loadingElem.html(err);
            enableInputs();
            return;
        }
        offsets.push((offsetDate.getTimezoneOffset() - offset) * 60000); // what to add to stream time zone to get selected time zone (ms)
    }
    oldOffsets = offsets;
    offset *= -60000; // what to add to UTC to get to selected time zone
    
    oldIntervalSize = (endDate - startDate) / WIDTH;
    
    // Create the xScale and axis if we need to
    var xScale, xAxis;
    if (!sameTimeRange) {
        xScale = d3.time.scale.utc() // I'm telling d3 it's in UTC time, but in reality I'm going to add an offset to everything so it actually displays the selected time zone
            .domain([startDate + offset, endDateObj + offset])
            .range([0, WIDTH]);
        xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(5);
        oldStartDate = startDate;
        oldEndDate = endDate;
        oldXScale = xScale;
        oldXAxis = xAxis;
    } else {
        xScale = oldXScale;
        xAxis = oldXAxis;
    }
    
    // Get the data for the streams
    initData(selectedStreams, offsets, startDate + offset, endDate + offset, loadingElem, function (data) {
            if (!sameTimeRange) {
                d3.select("g#x-axis")
                    .call(xAxis);
                zoom.x(xScale);
            }
            loadingElem.html("Computing axes...");
            // Set a timeout so the new message (Computing axes...) actually shows
            setTimeout(function () { drawYAxes(data, selectedStreams, streamSettings, startDate, endDate, xScale, offsets, loadingElem); }, 50);
        });
}

function drawYAxes(data, streams, streamSettings, startDate, endDate, xScale, offsets, loadingElem) {
    otherChange = false;
    oldData = data;
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
    for (i = 0; i < yAxes.length; i++) {
        axis = yAxes[i];
        if (!axis.autoscale && (axis.manualscale[1] > axis.manualscale[0])) {
            axisData[axis.axisid] = [NaN, NaN]; // so we know that we're using a manual scale for this axis
            continue;
        }
        numstreams = axis.streams.length;
        totalmin = undefined;
        totalmax = undefined;
        for (j = 0; j < numstreams; j++) {
            if (!data.hasOwnProperty(axis.streams[j].uuid)) {
                continue;
            }
            streamdata = data[axis.streams[j].uuid][1];
            for (k = 0; k < streamdata.length; k++) {
                datapointmin = streamdata[k].min;
                datapointmax = streamdata[k].max;
                if (!(totalmin <= datapointmin)) {
                    totalmin = datapointmin;
                }
                if (!(totalmax >= datapointmax)) {
                    totalmax = datapointmax;
                }
            }
            if (streamdata.length == 0) {
                noData.push(streamdata);
            }
        }
        if (totalmin != undefined) {
            if (totalmin == totalmax) { // Choose a range so the axis can show something meaningful
                totalmin -= 1;
                totalmax += 1;
            }
            axisData[axis.axisid] = [totalmin, totalmax];
        }
    }
    
    oldAxisData = axisData;    
    
    numstreams = streams.length;
    
    var dataAxes = $.grep(yAxes, function (axisObj) { return axisData.hasOwnProperty(axisObj.axisid); });
    
    var yScales = $.map(dataAxes, function (elem) {
            var scale;
            if (isNaN(axisData[elem.axisid][0])) { // manual scale
                scale = d3.scale.linear()
                    .domain([elem.manualscale[0], elem.manualscale[1]])
                    .range([HEIGHT, 0]);
            } else { // auto scale
                scale = d3.scale.linear()
                    .domain([axisData[elem.axisid][0], axisData[elem.axisid][1]])
                    .range([HEIGHT, 0])
                    .nice();
                var domain = scale.domain();
                elem.manualscale[0] = domain[0];
                elem.manualscale[1] = domain[1];
            }
            axisData[elem.axisid].push(scale);
            return scale;
        });
        
    oldYScales = yScales;
    
    var yAxisArray = $.map(yScales, function (yScale) { return d3.svg.axis().scale(yScale).orient("left").ticks(5); });
    
    oldYAxisArray = yAxisArray;
    
    margin.left = yAxisArray.length * 100;
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
        .attr("transform", function (d, i) { return "translate(" + (margin.left - (100 * i)) + ", 0)"; })
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
        .attr("transform", function (d, i) { return "translate(" + (margin.left - (100 * i) - 60) + ", " + (margin.top + (HEIGHT / 2)) + ")rotate(-90)"; })
        .html(function (d) { return d.axisname; });
    update.exit().remove();
    
    loadingElem.html("Drawing graph...");
    setTimeout(function () { drawStreams(data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, offsets, loadingElem, false); }, 50);
}

/* Render the graph on the screen. If DRAWFAST is set to true, the entire plot is not drawn (for the sake of speed); in
   paticular new streams are not added and old ones not removed (DRAWFAST tells it to optimize for scrolling).
*/

function drawStreams (data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, offsets, loadingElem, drawFast) {
    if (!drawFast && (streams.length == 0 || yAxisArray.length == 0)) {
        if (streams.length == 0) {
            loadingElem.html("Error: No streams are selected.");
        } else {
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

    for (i = 0; i < streams.length; i++) {
        currXPixel = -Infinity;
        currPointList = [];
        if (!data.hasOwnProperty(streams[i].uuid)) {
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
        if (startIndex > 0 && streamdata[startIndex].median_time > startTime) {
            startIndex--; // plot the previous datapoint so the graph looks continuous
        }
        lastIteration = false;
        for (j = startIndex; j < streamdata.length; j++) {
            xPixel = Math.floor(xScale(streamdata[j].median_time + offsets[i]));
            mean.push(xPixel + "," + yScale(streamdata[j].mean));
            stdabove.push(xPixel + "," + yScale(streamdata[j].mean + streamdata[j].stdev));
            stdbelow.push(xPixel + "," + yScale(streamdata[j].mean - streamdata[j].stdev));
            minval.push(xPixel + "," + yScale(streamdata[j].min));
            maxval.push(xPixel + "," + yScale(streamdata[j].max));
            if (lastIteration) {
                break;
            }
            if (xPixel >= WIDTH) {
                lastIteration = true; // Include one point past the end so the graph looks continuous
            }
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
        
    if (!drawFast) {
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
    
    if (!drawFast) {
        updatePlotMessage();
        enableInputs();
    }
    
    updateIntervalSize();
}

function resetZoom() {
    zoom.scale(1)
        .translate([0, 0])
        .event(d3.select("svg#chart"));
}

function updateIntervalSize() {
    var unit = 'ms';
    var intervalSize = oldIntervalSize;
    if (intervalSize >= 86400000) {
        intervalSize /= 86400000;
        unit = 'd';
    } else if (intervalSize >= 3600000) {
        intervalSize /= 3600000;
        unit = 'h';
    } else if (intervalSize >= 60000) {
        intervalSize /= 60000;
        unit = 'm';
    } else if (intervalSize >= 1000) {
        intervalSize /= 1000;
        unit = 's';
    }
    document.getElementById('interval-size').innerHTML = intervalSize + " " + unit;
}

