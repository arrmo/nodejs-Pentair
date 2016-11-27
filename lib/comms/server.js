// Setup express server


module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: server.js')
        //var express = require('express');
    var express = container.express
    var app = express();


    // And Enable Authentication (if configured)
    if (container.settings.expressAuth === 1) {
        //var auth = require('http-auth');
        var auth = container.auth
        var basic = auth.basic({
            file: __dirname + '/../..' + container.settings.expressAuthFile
        });
        app.use(auth.connect(basic));
    }
    // Create Server (and set https options if https is selected)
    if (container.settings.expressTransport === 'https') {
        var opt_https = {
            key: container.fs.readFileSync(__dirname + '/../..' + '/data/server.key'),
            cert: container.fs.readFileSync(__dirname + '/../..' + '/data/server.crt'),
            requestCert: false,
            rejectUnauthorized: false
        };
        var server = container.https.createServer(opt_https, app);
    } else
    //var server = require('http').createServer(app);
        var server = container.http.createServer(app);


    container.logger.debug('server.js about to call server.listen')
    var port = process.env.PORT || 3000;
    server.listen(port, function logRes() {
        container.logger.verbose('Express Server listening at port %d', port);

    });


    // Routing
    app.use(express.static(__dirname + '/../..' + container.settings.expressDir));
    app.use('/bootstrap', express.static(__dirname + '/../..' + '/node_modules/bootstrap/dist/'));
    app.use('/jquery', express.static(__dirname + '/../..' + '/node_modules/jquery-ui-dist/'));


    /*app.get('/status', function(req, res) {
        res.send(container.status.getCurrentStatus())
    })*/

    app.get('/heat', function(req, res) {
        res.send(container.heat.getCurrentHeat())
    })

    app.get('/circuit', function(req, res) {
        res.send(container.circuit.getCurrentCircuits())
    })

    app.get('/schedule', function(req, res) {
        res.send(container.schedule.getCurrentSchedule())
    })

    app.get('/temperatures', function(req, res) {
        res.send(container.temperatures.getTemperatures())
    })

    app.get('/time', function(req, res) {
        res.send(container.time.getTime())
    })

    app.get('/pump', function(req, res) {
        res.send(container.pump.getCurrentPumpStatus())
    })

    app.get('/chlorinator', function(req, res) {
        res.send(container.chlorinator.getChlorinatorStatus())
    })

    app.get('/chlorinator/:chlorinateLevel', function(req, res) {
        container.chlorinator.setChlorinatorLevel(parseInt(req.params.chlorinateLevel), function(response) {
            res.send(response)
        })
    })

    app.get('/circuit/:circuit', function(req, res) {
        if (req.params.circuit > 0 && req.params.circuit <= 20) {
            res.send(container.circuit.getCircuit(req.params.circuit))
        }
    })

    app.get('/circuit/:circuit/toggle', function(req, res) {
        container.circuit.toggleCircuit(req.params.circuit, function(response) {
            res.send(response)
        })
    })



    app.get('/spaheat/setpoint/:spasetpoint', function(req, res) {
        container.heat.setSpaSetpoint(parseInt(req.params.temp), function(response) {
            res.send(response)
        })
    })


    app.get('/spaheat/mode/:spaheatmode', function(req, res) {
        container.heat.setSpaHeatmode(parseInt(req.params.spaheatmode), function(response) {
            res.send(response)
        })
    })

    app.get('/poolheat/setpoint/:poolsetpoint', function(req, res) {
        container.heat.setPoolSetpoint(parseInt(req.params.poolsetpoint), function(response) {
            res.send(response)
        })

    })

    app.get('/poolheat/mode/:poolheatmode', function(req, res) {
        container.heat.setPoolHeatmode(parseInt(req.params.poolheatmode), function(response) {
            res.send(response)
        })

    })

    app.get('/sendthispacket/:packet', function(req, res) {
        container.queuePacket.sendThisPacket(req.params.packet, function(response) {
            res.send(response)
        })

    })


    app.get('/pumpCommand/:equip/:program', function(req, res) {
        var equip = req.params.equip
        var program = req.params.program


        var response = 'REST API pumpCommand variables - equip: ' + equip + ', program: ' + program + ', value: null, duration: null'
        container.pumpController.pumpCommand(equip, program, null, null)
        res.send(response)
    })

    app.get('/pumpCommand/:equip/:program/:value1', function(req, res) {
        var equip = req.params.equip
        var program = req.params.program
        var value = req.params.value1

        var response = 'REST API pumpCommand variables - equip: ' + equip + ', program: ' + program + ', value: ' + value + ', duration: null'
        container.pumpController.pumpCommand(equip, program, value, null)
        res.send(response)
    })

    app.get('/pumpCommand/:equip/:program/:value1/:duration', function(req, res) {
        var equip = req.params.equip
        var program = req.params.program
        var value = req.params.value1
        var duration = req.params.duration
        var response = 'REST API pumpCommand variables - equip: ' + equip + ', program: ' + program + ', value: ' + value + ', duration: ' + duration
        container.pumpController.pumpCommand(equip, program, value, duration)
        res.send(response)
    })


    if (container.logModuleLoading)
        container.logger.info('Loaded: server.js')


    return {
        server,
        app
    }
}
