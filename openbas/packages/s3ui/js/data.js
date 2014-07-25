
/* The dataCache maps UUID to an object that maps the resolution to an array of
   cached data. The array contains cached entries, objects that store a start
   time, end time, and data; the cached entries never overlap, are consolidated
   when possible, and are stored sequentially. */
smap3._data.dataCache = {};

/* Maps UUID to a sorted array of resolution ranges. Each resolution range is
   a 2-element array, storing the highest resolution corresponding to a step
   size at index 0 and the highest resolution corresponding to the immediately
   larger step size at index 1. In reality, the resolution interval is open on
   the lower end. For example, if a resolution range is stored as [a, b], it
   really corresponds to the interval (a, b]. */
smap3._data.resCutoffs = {};

// The total number of data points that have been cached.
smap3._data.loadedData = 0;
smap3._data.loadedStreams = {}; // maps a stream's uuid to the total number of points that have been cached for that stream

smap3._data.baseResolution;

smap3._data.CacheEntry = function(startTime, endTime, data) {
    this.start_time = startTime;
    this.end_time = endTime;
    this.cached_data = data;
}

/* Gets data for the STREAMS in the specified time interval. The endpoints of
   the interval, STARTTIME and ENDTIME are in the selected time zone (the time
   zone difference provided in OFFSETS will be used to look for data in the
   correct time zone). Once the data is procured, CALLBACK will be called with
   a single argument, namely the data in the form of an object that maps a
   stream's UUID to an array containing the stream object and datapoints. */
smap3._data.initData = function(streams, offsets, startTime, endTime, loadingElem, callback) {
    loadingElem.html("Fetching data (finished 0 out of " + streams.length + " streams)...");
    var data = {}; // Maps uuid to a length-2 array containing the stream object (properties and metadata) and the data over the requested interval
    var numLoaded = 0;
    
    var currstream;
    for (var index = 0; index < streams.length; index++) {
        currstream = streams[index];
        ensureData(currstream, WIDTH / (endTime - startTime), startTime - offsets[index], endTime - offsets[index],
            (function (stream) {
                return function (loadedData) {
                    numLoaded++;
                    loadingElem.html("Fetching data (finished " + numLoaded + " out of " + streams.length + " streams)...");
                    data[stream.uuid] = [stream, loadedData];
                    if (numLoaded == streams.length) {
                        callback(data);
                    }
                };
            })(currstream));
    }
}

/* Given a RESOLUTION, finds the range of resolutions that correspond to the
   same step size, which will be of the form (a, b]. Returns the array [a, b].
   It works correctly for a given step size assuming that data has been
   procured with that step size; if not, NaN is returned. */
smap3._data.getResolutionStep = function(stream, resolution) {
    if (resCutoffs.hasOwnProperty(stream.uuid)) {
        var cutoffs = resCutoffs[stream.uuid];
        if (cutoffs.length > 0) {
            // To be careful, I'm using floatEq instead of ==, <= or >= to compare floats
            if ((cutoffs[0][0] > resolution || floatEq(cutoffs[0][0], resolution)) || (cutoffs[cutoffs.length - 1][1] < resolution && !floatEq(cutoffs[cutoffs.length - 1][1], resolution))) {
                return NaN;
            }
            var i = binSearchFloat(cutoffs, resolution, function (d) { return d[0]; });
            if (cutoffs[i][0] > resolution || floatEq(cutoffs[i][0], resolution)) {
                i--;
            }
            if ((cutoffs[i][0] < resolution && !floatEq(cutoffs[i][0], resolution)) && (cutoffs[i][1] > resolution || floatEq(cutoffs[i][1], resolution))) {
                return cutoffs[i];
            }
        }
    } else {
        resCutoffs[stream.uuid] = [];
    }
    return NaN;
}

/* Ensures that CACHE, an array of cache entries, is not corrupted. Included
   for debugging. */
smap3._data.validateCache = function(cache) {
    var currEntry;
    var invalid = false;
    var condition = 0;
    for (var i = 0; i < cache.length; i++) {
        currEntry = cache[i];
        if (currEntry == undefined) {
            invalid = true;
            condition = 1;
        } else if (currEntry.end_time <= currEntry.start_time) {
            invalid = true;
            condition = 2;
        } else if (i > 0 && currEntry.start_time - cache[i - 1].end_time <= 1) {
            invalid = true;
            condition = 3;
        }
        if (invalid) {
            alert("CORRUPTED CACHE!!! " + condition);
            console.log(cache);
            console.log(dataCache);
            return true;
        }
    }
    return false;
}

/* Ensures that STREAM has data cached from STARTTIME to ENDTIME at a specified
   RESOLUTION. If it does not, a request is sent to the server and the data are
   added to the cache so the extent of its data is at least from STARTTIME to
   ENDTIME. STARTTIME and ENDTIME are specified in the stream's time zone.
   Once the data is found or procured, CALLBACK is called with an array of data
   as its single argument, where the requested data is a subset of the
   requested data. If another call to this function is pending (it has
   requested data from the server) for a certain stream, any more calls for
   that stream will not result in a GET request (so this function doesn't fall
   behind user input). */
smap3._data.savedCalls = {}; // An object that maps a stream's UUID to a pending call for that stream
smap3._data.pendingCalls = {}; // An object that maps a stream's UUID to a boolean that indicates if a call is pending
smap3._data.ensureData = function(stream, resolution, startTime, endTime, callback) {
    var resolutionStep = getResolutionStep(stream, resolution);
    var unknownRes = ((typeof resolutionStep) == "number");
    if (!unknownRes) {
        resolution = resolutionStep[0];
    }
    
    // Find the relevant cache, creating it if necessary
    var cache;
    if (dataCache.hasOwnProperty(stream.uuid)) {
        if (dataCache[stream.uuid].hasOwnProperty(resolution)) {
            cache = dataCache[stream.uuid][resolution];
        } else {
            cache = [];
            dataCache[stream.uuid][resolution] = cache;
        }
    } else {
        var streamCaches = {};
        cache = [];
        streamCaches[resolution] = cache;
        dataCache[stream.uuid] = streamCaches;
        loadedStreams[stream.uuid] = 0;
    }
    
    var startsBefore; // false if startTime starts during the cacheEntry at index i, false if it starts before
    var endsAfter; // false if endTime ends during the cacheEntry at index j, true if it ends after
    
    var queryStart;
    var dataBefore; // The cached data in the entry before the gap we're filling
    var queryEnd;
    var dataAfter; // The cached data in the entry after the gap we're filling
    
    // Figure out whether the necessary data is in the cache
    var i, j;
    if (cache.length > 0) {
        // Try to find the cache entry with data, or determine if there is no such entry
        i = binSearch(cache, startTime, function (entry) { return entry.start_time; });
        if (startTime < cache[i].start_time) {
            i--;
        } // Now, startTime is either in entry at index i, or between index i and i + 1, or at the very beginning
        if (i == -1) {
            // new data starts before all existing records
            i = 0;
            queryStart = startTime;
            dataBefore = [];
            startsBefore = true;
        } else if (startTime <= cache[i].end_time) {
            // new data starts in cache entry at index i
            queryStart = cache[i].end_time;
            dataBefore = cache[i].cached_data;
            startsBefore = false;
        } else {
            // new data starts between cache entries at index i and i + 1
            queryStart = startTime;
            dataBefore = [];
            startsBefore = true;
            i++; // so we don't delete the entry at index i
        }
        
        j = binSearch(cache, endTime, function (entry) { return entry.end_time; }); // endTime is either in entry at index j, or between j - 1 and j
        if (endTime > cache[j].end_time) {
            j++;
        } // Now, endTime is either in entry at index j, or between index j - 1 and j, or at the very end
        if (j == cache.length) {
            // new data ends after all existing records
            j -= 1;
            queryEnd = endTime;
            dataAfter = [];
            endsAfter = true;
        } else if (endTime >= cache[j].start_time) {
            // new data ends in cache entry at index j
            queryEnd = cache[j].start_time;
            dataAfter = cache[j].cached_data;
            endsAfter = false;
        } else {
            // new data ends between cache entries at index j - 1 and j
            queryEnd = endTime;
            dataAfter = [];
            endsAfter = true;
            j--; // So we don't delete the entry at index j
        }
    } else {
        // Set variables so the first entry is created
        queryStart = startTime;
        startsBefore = true;
        dataBefore = [];
        i = 0;
        
        queryEnd = endTime;
        endsAfter = true;
        dataAfter = [];
        j = -1;
    }
    if (i == j && !startsBefore && !endsAfter) {
        callback(cache[i].cached_data);
    } else {
        // Fetch the data between the two cache entries, and consolidate into one entry
        // If j - i > 1, the existing entries between i and j are discarded.
        var urlCallback = function (streamdata) {
                var k;
                pendingCalls[stream.uuid] = false; // once the callback starts executing, we don't want to stop it
                var receivedValues = eval(streamdata);
                if (unknownRes) {
                    // Correct the entry in dataCache that we created
                    delete dataCache[stream.uuid][resolution];
                    resolution = receivedValues[1]; // the "a" in (a, b]
                    dataCache[stream.uuid][resolution] = cache;
                    
                    // If this resolution is new, insert it into resCutoffs
                    var cutoffs = resCutoffs[stream.uuid];
                    var newResElem = [resolution, receivedValues[2], receivedValues[3]];
                    if (cutoffs.length == 0) {
                        cutoffs.push(newResElem);
                    } else {
                        k = binSearchFloat(cutoffs, resolution,  function (d) { return d[0]; });
                        if (cutoffs[k][0] < resolution) {
                            k++;
                        }
                        cutoffs.splice(k, 0, newResElem);
                    }
                }
                var receiveddata = receivedValues[0];
                var cacheEntry = new CacheEntry(startsBefore ? startTime : cache[i].start_time, endsAfter ? endTime : cache[j].end_time, dataBefore.concat(receiveddata, dataAfter));
                cache.splice(i, j - i + 1, cacheEntry);
                for (k = i; k <= j; k++) {
                    loadedData -= cache[k].cached_data.length;
                    loadedStreams[stream.uuid] -= cache[k].cached_data.length;
                }
                loadedData += cacheEntry.cached_data.length;
                loadedStreams[stream.uuid] += cacheEntry.cached_data.length;
                callback(cacheEntry.cached_data);
            };
        var url = stream.uuid + '?starttime=' + queryStart + '&endtime=' + queryEnd + '&unitoftime=ms&resolution=' + resolution;
        if (pendingCalls[stream.uuid]) {
            savedCalls[stream.uuid].abort();
        } else {
            pendingCalls[stream.uuid] = true;
        }
        savedCalls[stream.uuid] = getURL(url, urlCallback, 'text');
    }
}

/* Reduce memory consumption by removing some cached data. STARTTIME and
   ENDTIME are in the selected time zone, and the number of cached data
   points will be decreased to TARGET. */
smap3._data.boundMemory = function(streams, offsets, startTime, endTime, target) {
    if (loadedData <= target) {
        return;
    }
    var currResolution = WIDTH / (endTime - startTime);
    var res = [];
    var i, j, k;
    for (i = 0; i < streams.length; i++) {
        res.push(getResolutionStep(streams[i], currResolution)[0]);
    }
    alert(res[0]);
    
    // Delete extra streams
    alert("Deleting streams");
    var uuid;
    var used;
    for (uuid in dataCache) {
        if (dataCache.hasOwnProperty(uuid)) {
            used = false;
            for (i = 0; i < streams.length; i++) {
                if (streams[i].uuid == uuid) {
                    used = true;
                    break;
                }
            }
            if (!used) {
                loadedData -= loadedStreams[uuid];
                delete dataCache[uuid];
                delete loadedStreams[uuid];
                delete resCutoffs[uuid];
            }
        }
    }
    if (loadedData <= target) {
        return;
    }
    
    // Delete extra resolutions, if deleting streams wasn't enough
    alert("Deleting resolutions");
    var cache;
    var resolution, resolutions;
    var resMap = {}; // Maps uuid to 2-element array containing array of resolutions, and index current resolution (if it were in the array)
    for (i = 0; i < streams.length; i++) {
        cache = dataCache[streams[i].uuid];
        resolutions = [];
        for (resolution in cache) {
            if (cache.hasOwnProperty(resolution) && !floatEq(resolution, res[i])) {
                resolutions.push(resolution);
            }
        }
        resolutions.sort(function (a, b) { return a - b; });
        alert(resolutions);
        j = binSearchFloat(resolutions, res[i], function (x) { return x; });
        resMap[streams[i].uuid] = [resolutions, j];
    }
    var remaining = true; // There are still resolutions to remove
    var resdata, resdatacount;
    while (remaining) {
        remaining = false;
        for (i = 0; i < streams.length; i++) {
            uuid = streams[i].uuid;
            resolutions = resMap[streams[i].uuid][0];
            j = resMap[streams[i].uuid][1];
            if (resolutions.length != 0) {
                remaining = true;
                if (j > resolutions.length / 2) {
                    resolution = resolutions.shift();
                    j--;
                } else {
                    resolution = resolutions.pop();
                }
                resdata = dataCache[uuid][resolution];
                rescount = 0;
                for (k = resdata.length - 1; k >= 0; k--) {
                    rescount += resdata[k].cached_data.length;
                    resdata.splice(k, 1);
                }
                loadedData -= rescount;
                loadedStreams[uuid] -= rescount;
            }
        }
        if (loadedData <= target) {
            return;
        }
    }
    
    // Delete extra cache entries in the current resolution, if deleting streams and resolutions was not enough
    alert("Deleting cache entries");
    for (i = 0; i < streams.length; i++) {
        resdata = dataCache[streams[i].uuid][res[i]];
        rescount = 0;
        for (j = resdata.length - 1; j >= 0; j--) {
            if (resdata[j].start_time <= startTime && resdata[j].end_time >= endTime) {
                continue; // This is the cache entry being displayed; we won't delete it
            }
            rescount += resdata[j].cached_data.length;
            resdata.splice(j, 1);
        }
        loadedData -= rescount;
        loadedStreams[streams[i].uuid] -= rescount;
        if (loadedData <= target) {
            return;
        }
    }
    
    // Delete all but displayed data, if deleting stremas, resolutions, and cache entries was not enough
    alert("Thinning last entry");
    loadedData = 0;
    for (i = 0; i < streams.length; i++) {
        resdata = dataCache[streams[i].uuid][res[i]][0];
        j = binSearch(resdata.cached_data, startTime, function (d) { return d[0]; });
        k = binSearch(resdata.cached_data, endTime, function (d) { return d[0]; });
        if (resdata.cached_data[j][0] >= startTime && j > 0) {
            j--;
        }
        if (resdata.cached_data[k][0] <= endTime && k < resdata.cached_data.length) {
            k++;
        }
        dataCache[streams[i].uuid][res[i]][0] = new CacheEntry(resdata.cached_data[j][0], resdata.cached_data[k][0], resdata.cached_data.slice(j, k));
        loadedStreams[streams[i].uuid] = k - j;
        loadedData += (k - j);
    }
    
    // If target is still less than loadedData, it means that target isn't big enough to accomodate the data that needs to be displayed on the screen
}
