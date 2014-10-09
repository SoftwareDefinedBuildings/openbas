!function() {
$(document).ready(function() {
    // Set the dimensions of the canvas / graph
    var margin = {top: 30, right: 40, bottom: 30, left: 50},
        width = 1300 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    // Parse the date / time
    var parseDate = d3.time.format("%d-%b-%y").parse;

    // Set the ranges
    var x = d3.time.scale().range([0, width]);
    var y0 = d3.scale.linear().range([height, 0]);
    var y1 = d3.scale.linear().range([height, 0]);

    // Define the axes
    var xAxis = d3.svg.axis().scale(x)
        .orient("bottom").ticks(5);

    var yAxisLeft = d3.svg.axis().scale(y0)
        .orient("left").ticks(5);
    var yAxisRight = d3.svg.axis().scale(y1)
        .orient("right").ticks(5);

    // Define the line
    var valueline = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y0(d.value); });
    var valueline2 = d3.svg.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y1(d.value); });


    // Adds the svg canvas
    var svg = d3.select("body")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", 
                  "translate(" + margin.left + "," + margin.top + ")");

    // Get the data
    d3.json("/zonedata/Min Inst Demand/Server", function(error, data) {
        console.log("Retreived data");
        console.log(data);

        function processTimeseries(name) {
            out = data[name].sort(function(a,b) { return b.date - a.date; });
            out.forEach(function(d) {
                d.date = moment(new Date(d['date']*1)).add(7,'hours').toDate();
                d.value = d['value'];
            });
            return out
        }
        data_temp = processTimeseries('temp');
        data_temp_heat = processTimeseries('temp_heat');
        data_temp_cool = processTimeseries('temp_cool');
        data_hvac = processTimeseries('hvac_state');
        console.log(data_hvac);

        // Scale the range of the data
        x.domain(d3.extent(data_temp, function(d) { return d.date; }));
        y0.domain([58,75]);
        y1.domain([-2,2]);
        // y.domain([d3.min(data_temp, function(d) { return d.value; }),
        //          d3.max(data_temp, function(d) { return d.value; })]);

        svg.append("path")
            .attr("class", "line")
            .style("stroke", function() {return d3.rgb(210,219,210)})
            .attr("d", valueline2(data_hvac));
        svg.append("path")
            .attr("class", "line")
            .style("stroke", function() {return d3.rgb(50,50,50)})
            .attr("d", valueline(data_temp));
        svg.append("path")
            .attr("class", "line")
            .style("stroke", "red")
            .attr("d", valueline(data_temp_cool));
        svg.append("path")
            .attr("class", "line")
            .style("stroke", "steelblue")
            .attr("d", valueline(data_temp_heat));


        // Add the X Axis
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxisLeft);

        svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + width + " ,0)")
            .call(yAxisRight);

        svg.append("text")
            .attr("class", "y label")
            .attr("text-anchor", "end")
            .attr("y", 6)
            .attr("dy", "2em")
            .attr("transform", "rotate(-90)")
            .text("F");
    });
});
}()

