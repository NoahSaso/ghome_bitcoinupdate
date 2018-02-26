const https = require('https');

const ERROR_MESSAGE = "There was an error retrieving the bitcoin update: ";

function getDateString(date) {
    var year = date.getFullYear();
    var month = date.getMonth() + 1; // 0 = january
    var day = date.getDate();
    return [year, (month > 9 ? '' : '0') + month, (day > 9 ? '' : '0') + day].join('-');
}

function getPrice(isToday, callback) {
    if (isToday) {
        var dateString = getDateString(new Date());
        var todayDateString = dateString;
    } else {
        let lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        var dateString = getDateString(lastWeek);
        var todayDateString = getDateString(new Date());
    }

    var requestOptions = {
        host: "api.coinbase.com",
        port: 443,
        path: "/v2/prices/spot?currency=USD&date=" + dateString,
        method: "GET",
        headers: {
            "CB-VERSION": todayDateString
        }
    };

    https.get(requestOptions, function(res) {
        // console.log("Got response: " + res.statusCode);
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            var object = JSON.parse(chunk);
            callback({ status: 'ok', amount: object['data']['amount'] });
        });
    }).on('error', function(e) {
        // console.log("Got error: " + e.message);
        callback({ status: 'error', message: e.message });
    });
}

/*
* HTTP Cloud Function.
*
* @param {Object} req Cloud Function request context.
* @param {Object} res Cloud Function response context.
*/
exports.bitcoinUpdate = function bitcoinUpdate(req, res) {
    res.setHeader('Content-Type', 'application/json'); //Requires application/json MIME type
    getPrice(true, function (todayData) {
        if (todayData['status'] == 'ok') {
            getPrice(false, function (lastWeekData) {
                if (lastWeekData['status'] == 'ok') {
                    var todayPrice = parseFloat(todayData['amount']).toFixed(2);
                    var lastWeekPrice = parseFloat(lastWeekData['amount']).toFixed(2);
                    var change = ((todayPrice - lastWeekPrice) / lastWeekPrice * 100.0).toFixed(2);
                    // Speak
                    var response = "The current bitcoin price is " + todayPrice + " U.S. dollars, which is a " + Math.abs(change) + " percent " + (change < 0 ? "decrease" : "increase") + " from last week's price of " + lastWeekPrice + " U.S. dollars.";
                    res.send(JSON.stringify({ "speech": response, "displayText": response }));
                } else {
                    var response = ERROR_MESSAGE + lastWeekData['message'];
                    res.send(JSON.stringify({ "speech": response, "displayText": response }));
                }
            });
        } else {
            var response = ERROR_MESSAGE + todayData['message'];
            res.send(JSON.stringify({ "speech": response, "displayText": response }));
        }
    });
};
