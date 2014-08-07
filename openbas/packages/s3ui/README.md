s3ui package
============
This package defines the "s3plot" template, which contains a graphing utility
that can be included in a Meteor application. Multiple graphs can be inserted
into the same web page and will act independently of one another.

To insert a graph with full control available to the user, simply use the
inclusion operator:
<pre><code>{{> s3plot}}</code></pre>

One can also instantiate the graph with paremeters, by wrapping the inclusion
operator in a data context:
<pre><code>{{#with somecontext}}
    {{> s3plot}}
{{/with}}</code></pre>

If "somecontext" is an array (or array-like object) with an object at index 0
and functions at indices 2 and 3, the object at index 0 is interpreted as
specifying parameters and the function at indices 1 and 2 are interpreted as
callback functions.

The object of parameters may have the following properties (all optional):

* hide\_main\_title - TRUE if the main title is to be hidden. Defaults to FALSE.
* hide\_graph\_title - TRUE if the header above the graph (the text "Graph") is to be hidden. Defaults to FALSE.
* hide\_graph\_export - TRUE if the menu to export the graph to an SVG file is to be hidden. Defaults to FALSE.
* hide\_stream\_legend - TRUE if the legend displaying streams is to be hidden. Defaults to FALSE.
* hide\_axis\_legend - TRUE if the legend displaying axes is to be hidden. Defaults to FALSE.
* hide\_settings\_title - TRUE if the header above the time and stream selection (the text "Settings") is to be hidden. Defaults to FALSE.
* hide\_automatic\_update - TRUE if the checkbox specifying whether stream removals and axis changes should be applied automatically is to be hidden. Defaults to FALSE.
* hide\_apply\_button - TRUE if the "Apply all Settings and Plot Now" button is to be hidden. Defaults to FALSE.
* hide\_reset\_button - TRUE if the "Reset Zoom" button is to be hidden. Defaults to FALSE.
* hide\_info\_bar - TRUE if the area where general messages are displayed is to be hidden. Defaults to FALSE.
* hide\_time\_selection - TRUE if the menu to select the start and end times is to be hidden. Defaults to FALSE.
* hide\_stream\_tree - TRUE if the tree used to select streams is to be hidden. Defaults to FALSE.
* hide\_plot\_directions - TRUE if the directions for how to use the interface are to be hidden. Defaults to FALSE
* hide\_refresh\button - TRUE if the "Refresh Stream Tree" button is to be hidden. Defaults to FALSE.
* hide\_axis\_selection - TRUE if the axis selection menu within the legend is to be hidden. Defaults to FALSE.
* disable\_color\_selection - TRUE if the color selection menu within the legend is to be disabled. Defaults to FALSE.
* width - Specifies the width of the chart area (_not_ the whole graph). Defaults to 600.
* height - Specifies the height of the chart area (_not_ the whole graph). Defaults to 300.

When the graph has been displayed, but before any interactivity is added, the
first callback function is invoked with a single argument, namely the template
instance. The callback function is the mechanism through which the template
instance is made available. The function can be used to programmatically change
the settings (useful when settings have been hidden from the user but still
need to be manipulated) and even change some of the parameters the graph was
instantiated with.

The second callback function is called when the tree of streams is fully
loaded for the first time. This is useful for programmatically initializing the
graph, as streams cannot be selected until the tree of streams is loaded.

The "idata" property of the template instance is an object that stores the
instance fields  of the object (i.e., the variables used by the graph to
keep track of its internal state). The "imethods" property of the template
instance contains bound methods that can be used to programmatically manipulate
the state of the graph.

The bound methods provided are:

* selectStreams(uuids) - Given a list of UUIDS, selects the corresponding streams in the tree.
* deselectStreams(uuids) - Given a list of UUIDS, deselects the corresponding streams in the tree.
* setStartTime(date) - Given a DATE object, sets the start time to the date it represents in local time.
* setEndTime(date) - Given a DATE object, sets the end time to the date it represents in local time.
* setTimezone(iana\_str) - Sets the timezone to IANA\_STR.
* addAxis() - Creates a new y-axis and returns the id associated with it.
* removeAxis(id) - Removes the axis with the specified ID, reassigning streams as necessary. The axis with the id "y1" cannot be removed.
* renameAxis(id, newName) - Assigns the name NEWNAME to the axis with the specified ID.
* setAxisSide(id, leftOrRight) - Sets the side of the chart area where the axis with the specified ID will be displayed. If LEFTORRIGHT is true, it is set to the left side; otherwise it is set to the right side.
* setAxisScale(id, low, high) - Sets the scale of the axis with the specifed ID to the interval [LOW, HIGH]. If one of LOW and HIGH is undefined, only the other endpoint of the interval is set; if both are undefined, the "Autoscale" feature is turned on for that axis.
* setStreamAxis(uuid, id) - Assigns the stream with the specifed UUID to the axis with the specified ID.
* setStreamColor(uuid, color) - Sets the color for the stream with the specified UUID to COLOR.
* applyAllSettings() - Programmatically clicks the "Apply All Settings and Update Plot" button.
* resetZoom() - Programmatically clicks the "Reset Zoom" button.
* toggleAutomaticUpdate() - Programmatically checks or unchecks the "Automatically apply stream removals and changes to axis settings" checkbox.
* changeVisuals(options) - Reinitializes the visuals with the specified OPTIONS, according to the parameters specified (from the list above). The only differences between this function and the instantiation of the graph is that the "width" and "height" properties are ignored, and the new default values are those currently applied.
* selectMissingStreams(data\_lst) - Given DATA\_LST, an array of stream objects not present in the stream tree, selects the provided stream objects for plotting (makes it as if they were checked if they were in the stream tree).
