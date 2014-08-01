from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
from SocketServer import ThreadingMixIn
import os
import string
import sys
import urllib

from smapx_data import get_smapx_data

if sys.argv[-1] == '-l':
    local = True
else:
    local = False

class HTTPRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.find('?') != -1:
            self.path, self.query = self.path.split('?', 1)
        else:
            self.query = ''
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET POST')
        self.send_header('Content-type','text/html')
        self.end_headers()
        if self.query:
            f = urllib.urlopen(self.query)
            self.wfile.write(f.read())
            print 'Sent response'
            f.close()
        else:
            self.wfile.write('GET communication successful')
            
    def do_POST(self):
        self.query = self.rfile.read(int(self.headers['Content-Length']))
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET POST')
        self.send_header('Content-type','text/html')
        self.end_headers()
        print self.query
        if 'fake-data' in self.query:
            qIndex = self.query.find('?')
            args = self.query[qIndex+1:]
            kvpairs = map(lambda x: x.split('='), args.split('&'))
            kwargs = {pair[0]: pair[1] for pair in kvpairs}
            data = string.replace(str(get_smapx_data(**kwargs)).translate(None, 'L'), "'", '"')
            self.wfile.write(data)
            print 'Sent response'
        elif self.query:
            if local:
                prefix = '['
            else:
                f = urllib.urlopen(self.query)
                data = f.read();
                prefix = data[:-1] + ', '
            if ('/backend/api/tags' in self.query):
                data = prefix + '{"Path": "/tests/Data Range Test", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data", "Properties": {"UnitofTime": "ns", "Timezone": "UTC", "UnitofMeasure": "N", "ReadingType": "long"}}, {"Path": "/tests/Data Range Test 2", "Metadata": {"SourceName": "Fake Data", "Instrument": {"ModelName": "A Python Program"}}, "uuid": "fake-data2", "Properties": {"UnitofTime": "ns", "Timezone": "America/Phoenix", "UnitofMeasure": "N", "ReadingType": "long"}}]'
            self.wfile.write(data)
            print 'Sent response'
            if not local:
                f.close()
        else:
            self.wfile.write('POST communication successful')
        
class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass
        
serv = ThreadedHTTPServer(('', 7856), HTTPRequestHandler)
serv.serve_forever()
