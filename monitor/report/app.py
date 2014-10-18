from flask import Flask, render_template, url_for, jsonify
import json

def fix_name(name):
    return name.replace(" ","_")

data = json.load(open('report.json'))
app = Flask(__name__)
app.add_template_global(fix_name)

"""
data:
    zones:
    disaggreate:
    hvac:
    disaggregate_histograms:
    demand:
        Min Inst Demand:
            Date: str date
            Amount: double ?
            Data:
                Server:
                    temp_heat:
                        {utc_time -> temp}
                    temp_cool:
                    hvac_state:
                    temp:
                DOSA:
                Open:
                South:
                General Area:
        Demand Data:
        Max Inst Demand:
        Min Daily Avg Demand:
        Min Daily Total Demand:
        Max Daily Total Demand:
        Total Demand:
        Max Daily Avg Demand:
"""

# reportdata = {k:v for k,v in data['demand'].iteritems() if k not in ["Demand Data", "Total Demand"]}
# print("reportdata: {}".format(reportdata.keys()))

@app.route("/")
def report():
    total_demand = data['demand']['Total Demand']
    disaggregation_results = data['disaggregate']
    reportdata = {k:v for k,v in data['demand'].iteritems() if k not in ["Demand Data", "Total Demand"]}
    return render_template("index.html", total_demand=total_demand, demand=reportdata, disaggregation_results=disaggregation_results, zones=data['zones'])

@app.route("/tgraphs")
def tgraphs():
    return render_template("tgraphs.html")

@app.route("/pichart")
def pichart():
    def get_sec(s):
        l = s.split(':')
        return int(l[0]) * 3600 + int(l[1]) * 60 + int(l[2])

    rtus_power = data['disaggregate']
    rtus_energy = {}
    for rtu in rtus_power:
        cooling_time = get_sec(data['hvac'][rtu]['Total Cooling Time'])
        rtus_energy[rtu] = rtus_power[rtu] * cooling_time
    total_energy = data['demand']['Total Demand']['Amount']
    rtus_energy['other'] = total_energy - sum(rtus_energy.values())
    print(rtus_energy)
    return render_template("pichart.html", rtus_energy=rtus_energy)

@app.route("/demanddata")
def demanddata():
    return jsonify({'data': [{'date': k,'value': v} for k,v in data['demand']['Demand Data'].iteritems()]})

@app.route("/zonedata/<key>/<zone>")
def zonedata(key, zone):
    """
    key: "Min Daily Avg Demand" from report.demand_report
    zone: zone name like "DOSA"
    """
    key = key.replace("_"," ")
    ret = {}
    for ts, dd in data['demand'][key]['Data'][zone].iteritems():
        ret[ts] = [{'date': k, 'value': v} for k,v in dd.iteritems()]
    return jsonify(ret)

@app.route("/histogram/<zone>")
def histogram(zone):
    return jsonify({'data': data['disaggregate_histograms'][zone]})

@app.route("/hvacdemand")
def hvacdemand():
    return jsonify(data['hvac_demand'])

if __name__=='__main__':
    app.run(host="0.0.0.0",debug=True)
