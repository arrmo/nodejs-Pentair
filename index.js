(function() {
    'use strict';
    // this function is strict...
}());
console.log('\033[2J'); //clear the console



var Bottle = require('bottlejs')
var bottle = Bottle.pop('pentair-Bottle');


bottle.constant('appVersion', '2.0 alpha 3')
bottle.constant('logModuleLoading', 1)

bottle.factory('constants', require('./etc/constants.js'))
bottle.factory('logger', require('./lib/logger/winston-helper.js'))

//bottle.factory('dequeue', require('dequeue'))

bottle.factory('packetBuffer', require('./lib/comms/inbound/packet-buffer.js'))


/*bottle.middleware('logger', function(logger, next) {
    // this middleware will only affect the Beer service.
    console.log('logger', logger);
    next();
});*/


bottle.constant('settings', require('./etc/settings.js'))
s = bottle.container.settings

logger = bottle.container.logger  //alias/assign bottle.container.logger to logger
bottle.factory('server', require('./lib/comms/server.js'))
bottle.container.server.app //app won't initialize unless we call it

var _checkForChange = [0, 0, 0]
bottle.service('checkForChange', function() {
  return {
    _checkForChange
  }
}); //[custom names, circuit names, schedules] 0 if we have not logged the initial array; 1 if we will only log changes


//var Dequeue = require('dequeue')
//bottle.factory('bufferArrayOfArrays', function() { return new Dequeue()});
bottle.factory('processController', require('./lib/comms/inbound/process-controller.js'))
bottle.factory('processPump', require('./lib/comms/inbound/process-pump.js'))
bottle.factory('processChlorinator', require('./lib/comms/inbound/process-chlorinator.js'))
bottle.factory('pumpController', require('./lib/controllers/pump-controller.js'))
bottle.service('chlorinatorController', require('./lib/controllers/chlorinator-controller.js'))

bottle.factory('receiveBuffer', require('./lib/comms/inbound/receive-buffer.js'))
bottle.factory('decodeHelper', require('./lib/comms/inbound/decode-helper.js'))


var dateFormat = require('dateformat');

const events = require('events')



bottle.factory('status', require('./lib/equipment/status.js'))
bottle.factory('temperatures', require('./lib/equipment/temperatures.js'))
bottle.factory('time', require('./lib/equipment/time.js'))
bottle.factory('UOM', require('./lib/equipment/UOM.js'))
bottle.factory('valves', require('./lib/equipment/valves.js'))
bottle.factory('customNames', require('./lib/equipment/customNames.js'))
bottle.constant('apiSearch', require('./lib/api/api-search.js'))

//var currentWhatsDifferent; //persistent variable to hold what's different
//var currentPumpStatus; //persistent variable to hold pump information
//var currentHeat; //persistent variable to heald heat set points

bottle.factory('schedule', require('./lib/equipment/schedule.js'))

var _msgCounter = {msgCounter:0}
bottle.service('msgCounter', function() {
    return _msgCounter
})

bottle.factory('writePacket', require('./lib/comms/outbound/write-packet.js'))
bottle.factory('queuePacket', require('./lib/comms/outbound/queue-packet.js'))



//bottle.constant = ('preambleByte', preambleByte)
bottle.factory('intellitouch', require('./lib/equipment/intellitouch.js'))

//TODO: GET THIS WORKING
//var logger = require('./lib/winston-helper.js')

logger.info('Intro: ', s.introMsg)
logger.warn('Settings: ', s.settingsStr)

//var io = require('./lib/io.js')
bottle.factory('io', require('./lib/comms/socketio-helper.js'))
bottle.container.io.io //call it to initialize the sockets
bottle.factory('sp', require('./lib/comms/sp-helper.js'))
sp = bottle.container.sp

const loggerEmitter = new events.EventEmitter();
//loggerEmitter.on('debug', )

if (s.ISYController) {
    //var ISYHelper = require('./lib/ISY.js')
    bottle.factory('ISYHelper', require('./lib/outbound/ISY.js'))
}

bottle.factory('whichPacket', require('./lib/comms/which-packet.js'))
bottle.factory('circuit', require('./lib/equipment/circuit.js'))
//currentCircuitArrObj =  bottle.container.heat

bottle.factory('heat', require('./lib/equipment/heat.js'))


//var Heat = require('./lib/heat.js')
//var currentHeat = new Heat();  === now Heat.currentHeat
//var Chlrorinator = require('./lib/equipment/chlorinator.js')
bottle.factory('chlorinator', require('./lib/equipment/chlorinator.js'))

//var currentChlorinatorStatus === now Chlorinator.currentChlorinatorStatus
//var Pump = require('./lib/equipment/pump.js')
bottle.factory('pump', require('./lib/equipment/pump.js'))
//var currentPumpStatus ==== now Pump.currentPumpStatus
//var currentPumpStatusPacket === now Pump.currentPumpStatusPacket




//RECEIVE - BUFFER call here.  Moved to sp-helper.on('data')









//------------------START WRITE SECTION






if (s.pumpOnly) {
   bottle.container.pumpController.startPumpController
}
if (!s.intellitouch && s.chlorinator) {
    bottle.container.chlorinatorController.startChlorinatorController
}



//Credit to this function http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript  Changed it to be enumerable:false for SerialPort compatibility.
Object.defineProperty(Object.prototype, "equals", {
    enumerable: false,
    writable: true,
    value: function(object2) {
        //For the first loop, we only check for types
        for (propName in this) {
            //Check for inherited methods and properties - like .equals itself
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
            //Return false if the return value is different
            if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                return false;
            }
            //Check instance type
            else if (typeof this[propName] != typeof object2[propName]) {
                //Different types => not equal
                return false;
            }
        }
        //Now a deeper check using other objects property names
        for (propName in object2) {
            //We must check instances anyway, there may be a property that only exists in object2
            //I wonder, if remembering the checked values from the first loop would be faster or not
            if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                return false;
            } else if (typeof this[propName] != typeof object2[propName]) {
                return false;
            }
            //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
            if (!this.hasOwnProperty(propName))
                continue;
            //Now the detail check and recursion

            //This returns the script back to the array comparing
            /**REQUIRES Array.equals**/
            if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                // recurse into the nested arrays
                if (!this[propName].equals(object2[propName]))
                    return false;
            } else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                // recurse into another objects
                //console.log("Recursing to compare ", this[propName],"with",object2[propName], " both named \""+propName+"\"");
                if (!this[propName].equals(object2[propName]))
                    return false;
            }
            //Normal value comparison for strings and numbers
            else if (this[propName] != object2[propName]) {
                return false;
            }
        }
        //If everything passed, let's say TRUE
        return true;
    }
})


//This function adapted from the prototype.equals method above
Object.defineProperty(Object.prototype, "whatsDifferent", {
    enumerable: false,
    writable: true,
    value: function(object2) {
        //For the first loop, we only check for types
        var diffString = '';
        for (propName in this) {
            //Check for inherited methods and properties - like .equals itself
            //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwnProperty
            //Return false if the return value is different
            if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                diffString += ' ' + this.hasOwnProperty(propName);
                //return this.hasOwnProperty(propName);
            }
            //Check instance type
            else if (typeof this[propName] != typeof object2[propName]) {
                //Different types => not equal
                diffString += ' Object type '
                    //return 'Object type';
            }
        }
        //Now a deeper check using other objects property names
        for (propName in object2) {
            //We must check instances anyway, there may be a property that only exists in object2
            //I wonder, if remembering the checked values from the first loop would be faster or not
            if (this.hasOwnProperty(propName) != object2.hasOwnProperty(propName)) {
                diffString += ' ' + this.hasOwnProperty(propName);
                //return this.hasOwnProperty(propName);
            } else if (typeof this[propName] != typeof object2[propName]) {
                diffString += ' Object type '
                    //return 'Object type';
            }
            //If the property is inherited, do not check any more (it must be equa if both objects inherit it)
            if (!this.hasOwnProperty(propName))
                continue;
            //Now the detail check and recursion

            //This returns the script back to the array comparing
            /**REQUIRES Array.equals**/
            if (this[propName] instanceof Array && object2[propName] instanceof Array) {
                // recurse into the nested arrays
                if (!this[propName].equals(object2[propName])) {
                    //diffString += ' (arr) ', propName, ': ', this[propName], ' --> ', object2[propName];
                    diffString += ' ', propName, ': ', this[propName], ' --> ', object2[propName];
                }
                //return (propName + ': ' + this[propName]);
            } else if (this[propName] instanceof Object && object2[propName] instanceof Object) {
                // recurse into another objects
                console.log("Recursing to compare ", this[propName], "with", object2[propName], " both named \"" + propName + "\"");
                if (!this[propName].equals(object2[propName])) {
                    diffString += ' (obj) ', this[propName], '  propname:' + propName + '///'
                        //return (propName + ': ' + this[propName]);
                    logger.debug("Recursing to compare ", this[propName], "with", object2[propName], " both named \"" + propName + "\"");
                    console.log(' ', Object.keys(this))
                    console.log(propName + ': ' + this[propName])
                }
            }
            //Normal value comparison for strings and numbers
            else if (this[propName] != object2[propName]) {
                diffString += ' ' + propName + ': ' + this[propName] + ' --> ' + object2[propName]
                    //return (propName + ': ' + this[propName]);
            }
        }
        if (diffString == '') {
            //console.log('What\'s different (from function): Nothing')
            return 'Nothing!';
        } else {
            //console.log('What\'s different (from function): %s', diffString)
            return diffString;
        }
    }
});
//Credit for this function belongs to: http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
function clone(obj) {
    if (null == obj || "object" != typeof obj)
        return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr))
            copy[attr] = obj[attr];
    }
    return copy;
}










function changeHeatMode(equip, heatmode, src) {

    //pool
    if (equip === 'pool') {
        var updateHeatMode = (bottle.container.currentHeat.spaHeatMode << 2) | heatmode;
        var updateHeat = [165, bottle.container.intellitouch.preambleByte, 16, s.appAddress, 136, 4, bottle.container.currentHeat.poolSetPoint, bottle.container.currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        //TODO: replace heatmode INT with string
        logger.info('User request to update pool heat mode to %s', heatmode)
    } else {
        //spaSetPoint
        var updateHeatMode = (parseInt(heatmode) << 2) | bottle.container.currentHeat.poolHeatMode;
        var updateHeat = [165, bottle.container.intellitouch.preambleByte, 16, s.appAddress, 136, 4, bottle.container.currentHeat.poolSetPoint, bottle.container.currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        //TODO: replace heatmode INT with string
        logger.info('User request to update spa heat mode to %s', heatmode)
    }
}

function changeHeatSetPoint(equip, change, src) {
    //TODO: There should be a function for a relative (+1, -1, etc) change as well as direct (98 degrees) method
    //ex spa-->103
    //255,0,255,165,16,16,34,136,4,95,104,7,0,2,65

    /*
    FROM SCREENLOGIC

    20:49:39.032 DEBUG iOAOA: Packet being analyzed: 255,0,255,165,16,16,34,136,4,95,102,7,0,2,63
    20:49:39.032 DEBUG Msg# 153  Found incoming controller packet: 165,16,16,34,136,4,95,102,7,0,2,63
    20:49:39.032 INFO Msg# 153   Wireless asking Main to change pool heat mode to Solar Only (@ 95 degrees) & spa heat mode to Heater (at 102 degrees): [165,16,16,34,136,4,95,102,7,0,2,63]
    #1 - request

    20:49:39.126 DEBUG iOAOA: Packet being analyzed: 255,255,255,255,255,255,255,255,0,255,165,16,34,16,1,1,136,1,113
    20:49:39.127 DEBUG Msg# 154  Found incoming controller packet: 165,16,34,16,1,1,136,1,113
    #2 - ACK

    20:49:41.241 DEBUG iOAOA: Packet being analyzed: 255,255,255,255,255,255,255,255,0,255,165,16,15,16,2,29,20,57,0,0,0,0,0,0,0,0,3,0,64,4,68,68,32,0,61,59,0,0,7,0,0,152,242,0,13,4,69
    20:49:41.241 DEBUG Msg# 155  Found incoming controller packet: 165,16,15,16,2,29,20,57,0,0,0,0,0,0,0,0,3,0,64,4,68,68,32,0,61,59,0,0,7,0,0,152,242,0,13,4,69
    20:49:41.241 VERBOSE -->EQUIPMENT Msg# 155  .....
    #3 - Controller responds with status
    */


    logger.debug('cHSP: setHeatPoint called with %s %s from %s', equip, change, src)
    var updateHeatMode = (bottle.container.currentHeat.spaHeatMode << 2) | bottle.container.currentHeat.poolHeatMode;
    if (equip === 'pool') {
        var updateHeat = [165, bottle.container.intellitouch.preambleByte, 16, s.appAddress, 136, 4, bottle.container.currentHeat.poolSetPoint + parseInt(change), bottle.container.currentHeat.spaSetPoint, updateHeatMode, 0]
        logger.info('User request to update %s set point to %s', equip, bottle.container.currentHeat.poolSetPoint + change)
    } else {
        var updateHeat = [165, bottle.container.intellitouch.preambleByte, 16, s.appAddress, 136, 4, bottle.container.currentHeat.poolSetPoint, bottle.container.currentHeat.spaSetPoint + parseInt(change), updateHeatMode, 0]
        logger.info('User request to update %s set point to %s', equip, bottle.container.currentHeat.spaSetPoint + change)
    }
    queuePacket(updateHeat);
}

function pumpCommand(equip, program, value, duration) {
    _equip = parseInt(equip)
    if (value != null) {
        _value = parseInt(value)
    }
    if (duration != null) {
        _duration = parseInt(duration)
    }

    //program should be one of 'on', 'off' or 1,2,3,4
    if (program == 'on' || program == 'off') {
        _program = program
    } else {
        _program = parseInt(program)
    }

    var pump;
    if (_equip === 1) {
        pump = 96
    } else {
        pump = 97
    }

    var setPrg;
    var runPrg;
    var speed;
    if (s.logApi) logger.verbose('Sending the following pump commands to pump %s:', _equip)
    if (_program === 'off' || _program === 'on') {
        if (s.logApi) logger.info('User request to set pump %s to %s', _equip, _program);
        if (_program === 'off') {
            setPrg = [6, 1, 4];

            if (_equip === 1) {
                Pump.currentPumpStatus[1].duration = 0;
                pump1Timer.clearTimeout();
                pump1TimerDelay.clearTimeout();
                //set program to 0
                Pump.currentPumpStatus[1].currentprogram = 0;
            } else {
                Pump.currentPumpStatus[2].duration = 0;
                pump2Timer.clearTimeout();
                pump2TimerDelay.clearTimeout();
                //set program to 0
                Pump.currentPumpStatus[2].currentprogram = 0;
            }

        } else // pump set to on
        {
            setPrg = [6, 1, 10];
        }
        Pump.currentPumpStatus[_equip].power = program;
    } else {
        if (s.logApi) logger.verbose('User request to set pump %s to Ext. Program %s @ %s RPM', _equip, _program, _value);
        //set speed
        setPrg = [1, 4, 3]
        setPrg.push(38 + _program);
        setPrg.push(Math.floor(_value / 256))
        setPrg.push(_value % 256);
        //run program
        runPrg = [1, 4, 3, 33, 0]
        runPrg.push(8 * _program)
        var str = 'program' + _program + 'rpm';
        Pump.currentPumpStatus[_equip][str] = _value;
        Pump.currentPumpStatus[_equip].currentprogram = _program;
    }

    //set pump to remote control
    var remoteControlPacket = [165, 0, pump, s.appAddress, 4, 1, 255];
    if (s.logApi) logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
    queuePacket(remoteControlPacket);
    //set program packet
    if (_value < 450 || _value > 3450) {
        if (s.logApi) logger.warn('Speed provided (%s) is outside of tolerances.  Program being run with speed that is stored in pump.', _value)
    } else
    if (isNaN(_value) || _value == null) {
        if (s.logApi) logger.warn('Skipping Set Program Speed because it was not included.')
    } else {
        var setProgramPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(setProgramPacket, setPrg);
        //logger.info(setProgramPacket, setPrg)
        if (s.logApi) logger.verbose('Sending Set Program %s to %s RPM: %s', _program, _value, setProgramPacket);
        queuePacket(setProgramPacket);
    }

    if (_program >= 1 && _program <= 4) {
        //run program packet
        var runProgramPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(runProgramPacket, runPrg);
        if (s.logApi) logger.verbose('Sending Run Program %s: %s', _program, runProgramPacket)
        queuePacket(runProgramPacket);
        //turn on pump
        var turnPumpOnPacket = [165, 0, pump, s.appAddress, 6, 1, 10];
        if (s.logApi) logger.verbose('Sending Turn pump on: %s', turnPumpOnPacket)
        queuePacket(turnPumpOnPacket);
        //set a timer for 1 minute
        var setTimerPacket = [165, 0, pump, s.appAddress, 1, 4, 3, 43, 0, 1];
        if (s.logApi) logger.info('Sending Set a 1 minute timer (safe mode enabled, timer will reset every minute for a total of %s minutes): %s', _duration, setTimerPacket);
        queuePacket(setTimerPacket);
        //fix until the default duration actually is set to 1
        if (_duration < 1 || _duration == null) {
            _duration = 1;
        }
        if (_equip == 1) {
            Pump.currentPumpStatus[1].duration = _duration;
            //run the timer update 50s into the 1st minute
            pump1Timer.setTimeout(pump1SafePumpMode, '', '30s')
        } else {
            Pump.currentPumpStatus[2].duration = _duration;
            //run the timer update 50s into the 1st minute
            pump2Timer.setTimeout(pump2SafePumpMode, '', '30s')
        }



    } else {
        //turn pump on/off
        var pumpPowerPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(pumpPowerPacket, setPrg)
        if (s.logApi) logger.verbose('Sending Turn pump %s: %s', _program, pumpPowerPacket);
        queuePacket(pumpPowerPacket);
    }
    //set pump to local control
    var localControlPacket = [165, 0, pump, s.appAddress, 4, 1, 0];
    if (s.logApi) logger.verbose('Sending Set pump to local control: %s', localControlPacket)
    queuePacket(localControlPacket);
    //request pump status
    var statusPacket = [165, 0, pump, s.appAddress, 7, 0];
    if (s.logApi) logger.verbose('Sending Request Pump Status: %s', statusPacket)
    queuePacket(statusPacket);
    if (s.logApi) logger.info('End of Sending Pump Packet \n \n')

    socket.io.io.emit('pump')
}
