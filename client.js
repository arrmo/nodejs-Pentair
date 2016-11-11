var fields = ['airTemp', 'poolTemp', 'spaTemp', 'poolHeatMode', 'spaHeatMode', 'runmode', 'HEATER_ACTIVE'];
var io = require('socket.io-client');
var socket = io.connect('https://localhost:3000', {secure: true, reconnect: true, rejectUnauthorized : false});

// Add a connect listener
//socket.on('connect', function (socket) {
//    console.log('Connected!');
//});

// Listen for cpnfig data, then exit ...
socket.on('config', function (data) {
    //console.log(data);
    if (Object.keys(data).length > 0) {
        for (var key in fields) {
            currData = data[fields[key]];
            if (typeof(currData) === 'string')
                currData = currData.toLowerCase();
            console.log(currData);
        }
        process.exit();
    }
});
