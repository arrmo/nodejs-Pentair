(function() {
    'use strict';
    // this function is strict...
}());
console.log('\033[2J'); //clear the console



var Bottle = require('bottlejs')
var bottle = Bottle.pop('pentair-Bottle');


bottle.constant('appVersion', '2.0 alpha 5')
bottle.constant('logModuleLoading', 1)


//API
bottle.constant('apiSearch', require('./lib/api/api-search.js'))

//ETC
bottle.constant('settings', require('./etc/settings.js'))
bottle.factory('constants', require('./etc/constants.js'))



//COMMS
bottle.factory('server', require('./lib/comms/server.js'))
bottle.factory('io', require('./lib/comms/socketio-helper.js'))
bottle.factory('whichPacket', require('./lib/comms/which-packet.js'))
bottle.factory('sp', require('./lib/comms/sp-helper.js'))

//COMMS/INBOUND
bottle.factory('receiveBuffer', require('./lib/comms/inbound/receive-buffer.js'))
bottle.factory('decodeHelper', require('./lib/comms/inbound/decode-helper.js'))
bottle.factory('packetBuffer', require('./lib/comms/inbound/packet-buffer.js'))
bottle.factory('processController', require('./lib/comms/inbound/process-controller.js'))
bottle.factory('processPump', require('./lib/comms/inbound/process-pump.js'))
bottle.factory('processChlorinator', require('./lib/comms/inbound/process-chlorinator.js'))

//COMMS/INBOUND/CONTROLLER
bottle.factory('controller_2', require('./lib/comms/inbound/controller/2.js'))
bottle.factory('controller_8', require('./lib/comms/inbound/controller/8.js'))
bottle.factory('controller_10', require('./lib/comms/inbound/controller/10.js'))
bottle.factory('controller_11', require('./lib/comms/inbound/controller/11.js'))
bottle.factory('controller_17', require('./lib/comms/inbound/controller/17.js'))
bottle.factory('controller_25', require('./lib/comms/inbound/controller/25.js'))
bottle.factory('controller_134', require('./lib/comms/inbound/controller/134.js'))
bottle.factory('controller_136', require('./lib/comms/inbound/controller/136.js'))
bottle.factory('controller_153', require('./lib/comms/inbound/controller/153.js'))
bottle.factory('controller_217', require('./lib/comms/inbound/controller/217.js'))
bottle.factory('controller_252', require('./lib/comms/inbound/controller/252.js'))

//COMMS/INBOUND/COMMON
bottle.factory('common_7', require('./lib/comms/inbound/common/7.js'))

//COMMS/INBOUND/PUMP
bottle.factory('pump_1', require('./lib/comms/inbound/pump/1.js'))
bottle.factory('pump_2', require('./lib/comms/inbound/pump/2.js'))
bottle.factory('pump_4', require('./lib/comms/inbound/pump/4.js'))
bottle.factory('pump_5', require('./lib/comms/inbound/pump/5.js'))
bottle.factory('pump_6', require('./lib/comms/inbound/pump/6.js'))
//bottle.factory('pump_7', require('./lib/comms/inbound/pump/7.js'))

//COMMS/OUTBOUND
bottle.factory('ISYHelper', require('./lib/comms/outbound/ISY.js'))
bottle.factory('writePacket', require('./lib/comms/outbound/write-packet.js'))
bottle.factory('queuePacket', require('./lib/comms/outbound/queue-packet.js'))

//CONTROLLERS
bottle.factory('pumpController', require('./lib/controllers/pump-controller.js'))
bottle.factory('chlorinatorController', require('./lib/controllers/chlorinator-controller.js'))

//EQUIPMENT
bottle.factory('heat', require('./lib/equipment/heat.js'))
bottle.factory('chlorinator', require('./lib/equipment/chlorinator.js'))
bottle.factory('pump', require('./lib/equipment/pump.js'))
bottle.factory('circuit', require('./lib/equipment/circuit.js'))
//bottle.factory('status', require('./lib/equipment/status.js'))
bottle.factory('temperatures', require('./lib/equipment/temperatures.js'))
bottle.factory('time', require('./lib/equipment/time.js'))
bottle.factory('UOM', require('./lib/equipment/UOM.js'))
bottle.factory('valves', require('./lib/equipment/valves.js'))
bottle.factory('customNames', require('./lib/equipment/customNames.js'))
bottle.factory('schedule', require('./lib/equipment/schedule.js'))
bottle.factory('intellitouch', require('./lib/equipment/intellitouch.js'))


//LOGGER
//bottle.factory('winston', require('winston'))  how to call winston.Logger?
bottle.factory('logger', require('./lib/logger/winston-helper.js'))
bottle.factory('winstonToIO', require('./lib/logger/winstonToIO.js'))
//bottle.constant('dateFormat', require('dateformat'))  //for log formatting
//bottle.service('util', require('util'))








function init() {
    //Call the modules to initialize them
    bottle.container.io.io
    bottle.container.logger.info('initializing logger')
    bottle.container.winstonToIO.init()
    bottle.container.logger.info('Intro: ', bottle.container.settings.introMsg)
    bottle.container.logger.warn('Settings: ', bottle.container.settings.settingsStr)
    bottle.container.server.app
    bottle.container.sp.init()
    if (bottle.container.settings.pumpOnly) {
        bottle.container.pumpController.startPumpController
    }
    if (bottle.container.settings.chlorinator) {
        bottle.container.chlorinatorController.startChlorinatorController
    }
}

init()

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
