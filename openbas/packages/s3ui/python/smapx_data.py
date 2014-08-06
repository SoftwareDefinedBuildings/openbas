import math
import numpy
                          
class SMAPXexception (Exception):
    pass

def memoize(f):
    cache = {}
    def memoized_f(x):
        value = cache.get(x, None)
        if value == None:
            value = f(x)
            cache[x] = value
        return value
    return memoized_f
    
@memoize
def f(t):
    t = float(t) #Add scale here if required
    return 100*math.sin(t/100.0) + 10*math.sin(t/10.0) + 5*math.sin(t) + math.sin(10*t)

def get_smapx_data(starttime, endtime, unit, pw, hole):
    #Validate inputs
    if unit != "ns":
        raise SMAPXexception("invalid unit of time")
    try:
        starttime = int(starttime)
        endtime = int(endtime)
        pw = int(pw)
        assert starttime >= 0, "Start time is negative"
        assert endtime >= 0, "End time is negative"
        assert pw >= 0, "Point width is negative"
        assert endtime > starttime, "End time is less than or equal to start time"
        #TODO also check that times are sane given units
    except Exception as e:
        print "Bad request: ", e
        raise SMAPXexception("bad parameters")
    
    rv = []
    ival = 2 ** pw
    starttime >>= pw
    starttime <<= pw
    endtime >>= pw
    endtime <<= pw
    i = starttime # start of the first interval
    k = int(math.ceil(float(i) / 1000000)) * 1000000 # get the first millisecond after the start of the interval
    while i <= endtime:
        # We are imitating final data structure
        # max, min, mean, count
        krv = []
        while k < (i + ival):
            if hole and ((k / 1000000000) % 60 == 0):
                k += 1000000
                continue
            krv.append(f(k / 1000000))
            k += 1000000
        # I guess I could use quickselect to get the quartiles, but this program doesn't have to be efficient
        medtime = i + (ival / 2);
        if len(krv) > 0:
            e = [int(medtime / 1000000), int(medtime % 1000000), numpy.min(krv), numpy.mean(krv), numpy.max(krv), len(krv)]
            rv.append(e)
        i += ival
    # ival is the stepsize
    return [{'XReadings': rv}]
