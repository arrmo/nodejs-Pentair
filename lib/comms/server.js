// Setup express server
var express = require('express');
var app = express();

module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: server.js')



    // And Enable Authentication (if configured)
    if (container.settings.expressAuth === 1) {
        var auth = require('http-auth');
        var basic = auth.basic({
            file: __dirname + container.settings.expressAuthFile
        });
        app.use(auth.connect(basic));
    }
    // Create Server (and set https options if https is selected)
    if (container.settings.expressTransport === 'https') {
        var opt_https = {
            key: fs.readFileSync(__dirname + '/data/server.key'),
            cert: fs.readFileSync(__dirname + '/data/server.crt'),
            requestCert: false,
            rejectUnauthorized: false
        };
        var server = require('https').createServer(opt_https, app);
    } else
        var server = require('http').createServer(app);


    container.logger.info('server.js about to call server.listen')
    var port = process.env.PORT || 3000;
    server.listen(port, function logRes() {
        container.logger.verbose('Express Server listening at port %d', port);

    });


    // Routing
    app.use(express.static(__dirname + '/../..' + container.settings.expressDir));
    app.use('/bootstrap', express.static(__dirname + '/../..' + '/node_modules/bootstrap/dist/'));
    app.use('/jquery', express.static(__dirname + '/../..' + '/node_modules/jquery-ui-dist/'));

    app.get('/container', function(req, res){
      var Bottle = require('bottlejs')
      var bottle = Bottle.pop('pentair-Bottle');
      res.send(bottle.list())
    })

    app.get('/status', function(req, res) {
        res.send(container.currentStatus)
    })

    app.get('/heat', function(req, res) {
        res.send(container.heat.currentHeat)
    })

    app.get('/circuit', function(req, res) {
        res.send(container.circuit.currentCircuitArrObj)
    })

    app.get('/schedule', function(req, res) {
        res.send(container.currentSchedule)
    })

    app.get('/pump', function(req, res) {
        res.send(container.pump.currentPumpStatus)
    })

    app.get('/chlorinator', function(req, res) {
        res.send(container.chlorinator.currentChlorinatorStatus)
    })

    app.get('/chlorinator/:chlorinateLevel', function(req, res) {
        if (container.settings.chlorinator) {

            var chlorLvl = parseInt(req.params.chlorinateLevel)
            if (chlorLvl >= 0 && chlorLvl <= 101) {
                desiredChlorinatorOutput = chlorLvl
                var str
                if (desiredChlorinatorOutput === 0) {
                    str = 'Chlorinator set to off.  Chlorinator will be queried every 30 mins for PPM'
                } else if (desiredChlorinatorOutput >= 1 && desiredChlorinatorOutput <= 100) {
                    str = 'Chlorinator set to ' + desiredChlorinatorOutput + '%.'
                } else if (desiredChlorinatorOutput === 101) {
                    str = 'Chlorinator set to super chlorinate'
                }
                chlorinatorStatusCheck()
                res.send(str)
            }
        } else {
            res.send('Method for chlorinator not implemented yet')
        }
        //TODO: implement for controller
        //TODO: implement for Socket.IO
    })

    app.get('/circuit/:circuit', function(req, res) {
        if (req.params.circuit > 0 && req.params.circuit <= 20) {
            res.send(container.circuit.currentCircuitArrObj[req.params.circuit])
        }
    })

    app.get('/circuit/:circuit/toggle', function(req, res) {
        /*var desiredStatus = currentCircuitArrObj[req.params.circuit].status == "on" ? 0 : 1;
        var toggleCircuitPacket = [165, container.intellitouch.getPreambleByte(), 16, bottle.container.settings.appAddress, 134, 2, Number(req.params.circuit), desiredStatus];
        queuePacket(toggleCircuitPacket);
        */
        container.circuit.toggleCircuit(req.params.circuit, function(response){
          res.send(response)
        })
    })


    /*
     //Pentair controller sends the pool and spa heat status as a 4 digit binary byte from 0000 (0) to 1111 (15).  The left two (xx__) is for the spa and the right two (__xx) are for the pool.  EG 1001 (9) would mean 10xx = 2 (Spa mode Solar Pref) and xx01 = 1 (Pool mode Heater)
     //0: all off
     //1: Pool heater            Spa off
     //2: Pool Solar Pref        Spa off
     //3: Pool Solar Only        Spa off
     //4: Pool Off               Spa Heater
     //5: Pool Heater            Spa Heater
     //6: Pool Solar Pref        Spa Heater
     //7: Pool Solar Only        Spa Heater
     //8: Pool Off               Spa Solar Pref
     //9: Pool Heater            Spa Solar Pref
     //10: Pool Solar Pref       Spa Solar Pref
     //11: Pool Solar Only       Spa Solar Pref
     //12: Pool Off              Spa Solar Only
     //13: Pool Heater           Spa Solar Only
     //14: Pool Solar Pref       Spa Solar Only
     //15: Pool Solar Only       Spa Solar Only
     0: 'Off',
     1: 'Heater',
     2: 'Solar Pref',
     3: 'Solar Only'
     */

    app.get('/spaheat/setpoint/:spasetpoint', function(req, res) {
        //  [16,34,136,4,POOL HEAT Temp,SPA HEAT Temp,Heat Mode,0,2,56]

        var updateHeatMode = (Heat.currentHeat.spaHeatMode << 2) | Heat.currentHeat.poolHeatMode;
        var updateHeat = [165, container.intellitouch.getPreambleByte(), 16, bottle.container.settings.appAddress, 136, 4, Heat.currentHeat.poolSetPoint, parseInt(req.params.temp), updateHeatMode, 0]
        logger.info('User request to update spa set point to %s', req.params.spasetpoint, updateHeat)
        queuePacket(updateHeat);
        var response = 'Request to set spa heat setpoint to ' + req.params.spasetpoint + ' sent to controller'
        res.send(response)

    })


    app.get('/spaheat/mode/:spaheatmode', function(req, res) {
        var updateHeatMode = (parseInt(req.params.spaheatmode) << 2) | Heat.currentHeat.poolHeatMode;
        var updateHeat = [165, container.intellitouch.getPreambleByte(), 16, bottle.container.settings.appAddress, 136, 4, Heat.currentHeat.poolSetPoint, Heat.currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        //TODO: replace heatmode INT with string
        logger.info('User request to update spa heat mode to %s', req.params.spaheatmode, updateHeat)
        var response = 'Request to set spa heat mode to ' + c.heatModeStr[req.params.spaheatmode] + ' sent to controller'
        res.send(response)

    })

    app.get('/poolheat/setpoint/:poolsetpoint', function(req, res) {
        var updateHeatMode = (Heat.currentHeat.spaHeatMode << 2) | Heat.currentHeat.poolHeatMode;
        var updateHeat = [165, container.intellitouch.getPreambleByte(), 16, bottle.container.settings.appAddress, 136, 4, parseInt(req.params.poolsetpoint), Heat.currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        logger.info('User request to update pool set point to %s', req.params.poolsetpoint, updateHeat)
        var response = 'Request to set pool heat setpoint to ' + req.params.poolsetpoint + ' sent to controller'
        res.send(response)
    })

    app.get('/poolheat/mode/:poolheatmode', function(req, res) {
        var updateHeatMode = (Heat.currentHeat.spaHeatMode << 2) | req.params.poolheatmode;
        var updateHeat = [165, container.intellitouch.getPreambleByte(), 16, bottle.container.settings.appAddress, 136, 4, Heat.currentHeat.poolSetPoint, Heat.currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        //TODO: replace heatmode INT with string
        logger.info('User request to update pool heat mode to %s', req.params.poolheatmode, updateHeat)
        var response = 'Request to set pool heat mode to ' + c.heatModeStr[req.params.poolheatmode] + ' sent to controller'
        res.send(response)
    })

    app.get('/sendthispacket/:packet', function(req, res) {
      container.queuePacket.sendThisPacket(req.params.packet, function(response){
                res.send(response)
      })

    })


    app.get('/pumpCommand/:equip/:program', function(req, res) {
        var _equip = req.params.equip
        var _program = req.params.program


        var response = 'REST API pumpCommand variables - equip: ' + _equip + ', program: ' + _program + ', value: null, duration: null'
        pumpCommand(_equip, _program, null, null)
        res.send(response)
    })

    app.get('/pumpCommand/:equip/:program/:value1', function(req, res) {
        var _equip = req.params.equip
        var _program = req.params.program
        var _value = req.params.value1

        var response = 'REST API pumpCommand variables - equip: ' + _equip + ', program: ' + _program + ', value: ' + _value + ', duration: null'
        pumpCommand(_equip, _program, _value, null)
        res.send(response)
    })

    app.get('/pumpCommand/:equip/:program/:value1/:duration', function(req, res) {
        var _equip = req.params.equip
        var _program = req.params.program
        var _value = req.params.value1
        var _duration = req.params.duration
        var response = 'REST API pumpCommand variables - equip: ' + _equip + ', program: ' + _program + ', value: ' + _value + ', duration: ' + _duration
        pumpCommand(_equip, _program, _value, _duration)
        res.send(response)
    })


    if (container.logModuleLoading)
        container.logger.info('Loaded: server.js')


    return {
        server,
        app


    }
}
