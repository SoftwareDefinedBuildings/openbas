// This code is to be run on the Meteor server (all other files in this package are to be run on the client)

Meteor.methods({
        processQuery: function (query, type) {
                this.unblock();
                var params = query.split(" ");
                var url, payload, request;
                if (params[0] === "SENDPOST") {
                    url = params[1];
                    payload = params.slice(2).join(' ');
                    request = "POST";
                } else {
                    url = params[0];
                    payload = '';
                    request = "GET";
                }
                try { 
                    var result = HTTP.call(request, url, {
                            content: payload
                        });
                    return result.content;
                } catch (err) {
                    console.log(err);
                    return '[]';
                }
            }
    });
