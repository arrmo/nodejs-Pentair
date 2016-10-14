(function () {
    'use strict';
    // this function is strict...
}());
console.log('\033[2J'); //clear the console

var dateFormat = require('dateformat');
var Dequeue = require('dequeue')
var decodeHelper = require('./lib/decode.js');
var version = '0.1.11 alpha 3'
//-------  EQUIPMENT SETUP -----------

//ONE and only 1 of the following should be set to 1.
var intellicom = 0; //set this to 1 if you have the IntelliComII, otherwise 0.
var intellitouch = 1; //set this to 1 if you have the IntelliTouch, otherwise 0.
var pumpOnly = 0; //set this to 1 if you ONLY have pump(s), otherwise 0.

//1 or 0
var ISYController = 0; //1 if you have an ISY, otherwise 0
var chlorinator = 0; //set this to 1 if you have a chlorinator, otherwise 0.

//only relevant if pumpOnly=1
var numberOfPumps = 1; //this is only used with pumpOnly=1.  It will query 1 (or 2) pumps every 30 seconds for their status
var safePumpOperation = true; //Set this to true if you want the app to run the pump for successive 1 minute operations; false if you want to set the timer on the pump directly.
//-------  END EQUIPMENT SETUP -----------

//-------  MISC NETWORK SETUP -----------
// Setup for Network Connection (socat or nc)
var netConnect = 0; //set this to 1 to use a remote (net) connection, 0 for direct serial connection;
//-------  END MISC NETWORK SETUP -----------

//-------  LOG SETUP -----------
//Change the following log message levels as needed
var loglevel = 1; //1=more, 0=less;  This will show more or less messages within the logType
var logType = 'debug'; // one of { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
var logPumpMessages = 1; //variable if we want to output pump messages or not
var logDuplicateMessages = 1; //variable if we want to output duplicate broadcast messages
var logConsoleNotDecoded = 1; //variable to hide any unknown messages
var logConfigMessages = 1; //variable to show/hide configuration messages
var logMessageDecoding = 1; //variable to show messages regarding the buffer, checksum calculation, etc.
var logChlorinator = 1; //variable to show messages from the chlorinator
//-------  END EQUIPMENT SETUP -----------

var bufferArr = []; //variable to process buffer.  interimBufferArr will be copied here when ready to process
var interimBufferArr = []; //variable to hold all serialport.open data; incomind data is appended to this with each read
var currentStatus; // persistent object to hold pool equipment status.
var currentStatusBytes; //persistent variable to hold full bytes of pool status
var currentWhatsDifferent; //persistent variable to hold what's different
var currentCircuitArrObj; //persistent variable to hold circuit info
var currentPumpStatus; //persistent variable to hold pump information
var currentHeat; //persistent variable to heald heat set points
var currentSchedule = ["blank", {}]; //schedules
var queuePacketsArr = []; //array to hold messages to send

//var instruction = ''; //var to hold potential chatter instructions
var processingBuffer = false; //flag to tell us if we are processing the buffer currently
var msgCounter = 0; //log counter to help match messages with buffer in log
var msgWriteCounter = {
    counter: 0,
    msgWrote: []
}; //How many times are we writing the same packet to the bus?
var needConfiguration = 1; //variable to let the program know we need the configuration from the Intellitouch
var preambleByte; //variable to hold the 2nd preamble byte... it used to by 10 for me.  Now it is 16.  Very strange.  So here is a variable to find it.

//search placeholders for sockets.io Search
var searchMode = 'stop'
var searchSrc = '';
var searchDest = '';
var searchAction = '';
var customNameArr = [];
const state = {
    OFF: 0,
    ON: 1,
}

const stateStr = {
    'off': state.OFF,
    'on': state.ON
}

const strState = {
    0: "Off",
    1: "On"
}


// this first four bytes of ANY packet are the same
const packetFields = {
    DEST: 2,
    FROM: 3,
    ACTION: 4,
    LENGTH: 5,
}

const controllerStatusPacketFields = {
    HOUR: 6,
    MIN: 7,
    EQUIP1: 8,
    EQUIP2: 9,
    EQUIP3: 10,
    UOM: 15, //Celsius (4) or Farenheit (0); Also Service/Timeout.  See strRunMode below.
    VALVES: 16,
    UNKNOWN: 19, //Something to do with heat.
    POOL_TEMP: 20,
    SPA_TEMP: 21,
    HEATER_ACTIVE: 22, //0=off.  32=on.  More here?
    AIR_TEMP: 24,
    SOLAR_TEMP: 25,
    HEATER_MODE: 28
}

const chlorinatorPacketFields = {
    DEST: 2,
    ACTION: 3
}

const pumpPacketFields = {
    DEST: 2,
    FROM: 3,
    ACTION: 4,
    LENGTH: 5,
    CMD: 6, //
    MODE: 7, //?? Mode in pump status. Means something else in pump write/response
    DRIVESTATE: 8, //?? Drivestate in pump status.  Means something else in pump write/response
    WATTSH: 9,
    WATTSL: 10,
    RPMH: 11,
    RPML: 12,
    PPC: 13, //??
    //14 Unknown
    ERR: 15,
    //16 Unknown
    TIMER: 18, //Have to explore
    HOUR: 19, //Hours
    MIN: 20 //Mins
}

const namePacketFields = {
    NUMBER: 6,
    CIRCUITFUNCTION: 7,
    NAME: 8,
}

const pumpAction = {
    1: 'WRITE', //Write commands to pump
    4: 'REMOTE', //Turn on/off pump control panel
    5: 'MODE', //Set pump mode
    6: 'RUN', //Set run mode
    7: 'STATUS' //Request status

}

const strCircuitName = {
    1: 'AERATOR',
    2: 'AIR BLOWER',
    3: 'AUX 1',
    4: 'AUX 2',
    5: 'AUX 3',
    6: 'AUX 4',
    7: 'AUX 5',
    8: 'AUX 6',
    9: 'AUX 7',
    10: 'AUX 8',
    11: 'AUX 9',
    12: 'AUX 10',
    13: 'BACKWASH',
    14: 'BACK LIGHT',
    15: 'BBQ LIGHT',
    16: 'BEACH LIGHT',
    17: 'BOOSTER PUMP',
    18: 'BUG LIGHT',
    19: 'CABANA LTS',
    20: 'CHEM. FEEDER',
    21: 'CHLORINATOR',
    22: 'CLEANER',
    23: 'COLOR WHEEL',
    24: 'DECK LIGHT',
    25: 'DRAIN LINE',
    26: 'DRIVE LIGHT',
    27: 'EDGE PUMP',
    28: 'ENTRY LIGHT',
    29: 'FAN',
    30: 'FIBER OPTIC',
    31: 'FIBER WORKS',
    32: 'FILL LINE',
    33: 'FLOOR CLNR',
    34: 'FOGGER',
    35: 'FOUNTAIN',
    36: 'FOUNTAIN 1',
    37: 'FOUNTAIN 2',
    38: 'FOUNTAIN 3',
    39: 'FOUNTAINS',
    40: 'FRONT LIGHT',
    41: 'GARDEN LTS',
    42: 'GAZEBO LTS',
    43: 'HIGH SPEED',
    44: 'HI-TEMP',
    45: 'HOUSE LIGHT',
    46: 'JETS',
    47: 'LIGHTS',
    48: 'LOW SPEED',
    49: 'LO-TEMP',
    50: 'MALIBU LTS',
    51: 'MIST',
    52: 'MUSIC',
    53: 'NOT USED',
    54: 'OZONATOR',
    55: 'PATH LIGHTS',
    56: 'PATIO LTS',
    57: 'PERIMETER L',
    58: 'PG2000',
    59: 'POND LIGHT',
    60: 'POOL PUMP',
    61: 'POOL',
    62: 'POOL HIGH',
    63: 'POOL LIGHT',
    64: 'POOL LOW',
    65: 'SAM',
    66: 'POOL SAM 1',
    67: 'POOL SAM 2',
    68: 'POOL SAM 3',
    69: 'SECURITY LT',
    70: 'SLIDE',
    71: 'SOLAR',
    72: 'SPA',
    73: 'SPA HIGH',
    74: 'SPA LIGHT',
    75: 'SPA LOW',
    76: 'SPA SAL',
    77: 'SPA SAM',
    78: 'SPA WTRFLL',
    79: 'SPILLWAY',
    80: 'SPRINKLERS',
    81: 'STREAM',
    82: 'STATUE LT',
    83: 'SWIM JETS',
    84: 'WTR FEATURE',
    85: 'WTR FEAT LT',
    86: 'WATERFALL',
    87: 'WATERFALL 1',
    88: 'WATERFALL 2',
    89: 'WATERFALL 3',
    90: 'WHIRLPOOL',
    91: 'WTRFL LGHT',
    92: 'YARD LIGHT',
    93: 'AUX EXTRA',
    94: 'FEATURE 1',
    95: 'FEATURE 2',
    96: 'FEATURE 3',
    97: 'FEATURE 4',
    98: 'FEATURE 5',
    99: 'FEATURE 6',
    100: 'FEATURE 7',
    101: 'FEATURE 8',
    200: 'USERNAME-01',
    201: 'USERNAME-02',
    202: 'USERNAME-03',
    203: 'USERNAME-04',
    204: 'USERNAME-05',
    205: 'USERNAME-06',
    206: 'USERNAME-07',
    207: 'USERNAME-08',
    208: 'USERNAME-09',
    209: 'USERNAME-10'
}

const strCircuitFunction = {
    0: 'Generic',
    1: 'Spa',
    2: 'Pool',
    5: 'Master Cleaner',
    7: 'Light',
    9: 'SAM Light',
    10: 'SAL Light',
    11: 'Photon Gen',
    12: 'color wheel',
    14: 'Spillway',
    15: 'Floor Cleaner',
    16: 'Intellibrite',
    17: 'MagicStream',
    19: 'Not Used',
    64: 'Freeze protection on'
}

const strActions = {
    1: 'Ack Message',
    2: 'Controller Status',
    5: 'Date/Time',
    7: 'Pump Status',
    8: 'Heat/Temperature Status',
    10: 'Custom Names',
    11: 'Circuit Names/Function',
    16: 'Heat Pump Status?',
    17: 'Schedule details',
    19: 'IntelliChem pH',
    23: 'Pump Status',
    24: 'Pump Config',
    25: 'IntelliChlor Status',
    29: 'Valve Status',
    34: 'Solar/Heat Pump Status',
    35: 'Delay Status',
    39: 'Set ?',
    40: 'Settings?',
    133: 'Set Date/Time',
    134: 'Set Circuit',
    136: 'Set Heat/Temperature',
    138: 'Set Custom Name',
    139: 'Set Circuit Name/Function',
    144: 'Set Heat Pump',
    147: 'Set IntelliChem',
    152: 'Set Pump Config',
    153: 'Set IntelliChlor',
    157: 'Set Valves',
    162: 'Set Solar/Heat Pump',
    163: 'Set Delay',
    197: 'Get Date/Time',
    200: 'Get Heat/Temperature',
    202: 'Get Custom Name',
    203: 'Get Circuit Name/Function',
    208: 'Get Heat Pump',
    209: 'Get Schedule',
    211: 'Get IntelliChem',
    215: 'Get Pump Status',
    216: 'Get Pump Config',
    217: 'Get IntelliChlor',
    221: 'Get Valves',
    226: 'Get Solar/Heat Pump',
    227: 'Get Delays',
    231: 'Get ?',
    232: 'Get Settings?',
    252: 'SW Version Info',
    253: 'Get SW Version',
}


const strRunMode = {
//same bit as UOM.  Need to fix naming.
    0: 'Auto', //0x00000000
    1: 'Service', //0x00000001
    4: 'Celsius', //if 1, Celsius.  If 0, Farenheit
    128: '/Timeout' //Timeout always appears with Service; eg this bit has not been observed to be 128 but rather 129.  Not sure if the timer is in the controller.  0x10000001

}


const strValves = {
    3: 'Pool',
    15: 'Spa',
    48: 'Heater' // I've seen the value of 51.  I think it is Pool + Heater.  Need to investigate.
}

const heatModeStr = {
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
    0: 'OFF',
    1: 'Heater',
    2: 'Solar Pref',
    3: 'Solar Only'
}

const heatMode = {
    OFF: 0,
    HEATER: 1,
    SOLARPREF: 2,
    SOLARONLY: 3
}

const ctrl = {
    CHLORINATOR: 2,
    BROADCAST: 15,
    INTELLITOUCH: 16,
    REMOTE: 32,
    WIRELESS: 34, //Looks like this is any communications through the wireless link (ScreenLogic on computer, iPhone...)
    PUMP1: 96,
    PUMP2: 97
}

const ctrlString = {
    2: 'Chlorinator',
    15: 'Broadcast',
    16: 'Main',
    32: 'Remote',
    34: 'Wireless', //GUESS
    96: 'Pump1',
    97: 'Pump2'
}



var configurationFile = 'config.json';
const fs = require('fs');
var configFile = JSON.parse(fs.readFileSync(configurationFile));
intellicom = configFile.Equipment.intellicom;
intellitouch = configFile.Equipment.intellitouch;
pumpOnly = configFile.Equipment.pumpOnly;
ISYController = configFile.Equipment.ISYController;
chlorinator = configFile.Equipment.chlorinator;
numberOfPumps = configFile.Equipment.numberOfPumps;
safePumpOperation = configFile.Equipment.safePumpOperation;
netConnect = configFile.Network.netConnect;
netPort = configFile.Network.netPort;
netHost = configFile.Network.netHost;
loglevel = configFile.Log.loglevel;
logType = configFile.Log.logType;
logPumpMessages = configFile.Log.logPumpMessages;
logDuplicateMessages = configFile.Log.logDuplicateMessages;
logConsoleNotDecoded = configFile.Log.logConsoleNotDecoded;
logConfigMessages = configFile.Log.logConfigMessages;
logMessageDecoding = configFile.Log.logMessageDecoding;
logChlorinator = configFile.Log.logChlorinator;
/*
 for (var key in configFile.Equipment) {
 if (poolConfig.Pentair.hasOwnProperty(key)) {
 var myEQ = 0;
 if (j < 8) {
 myEQ = 0; //8 bits for first mode byte
 } else if (j >= 8 && j < 16) {
 (myEQ = 1) //8 bits for 2nd mode byte
 } else(myEQ = 2); //8 bits for 3rd mode byte
 circuitArr[myEQ].push(poolConfig.Pentair[key]);
 j++;
 }
 }*/

if (netConnect === 0) {
    const serialport = require("serialport");
    //var SerialPort = serialport.SerialPort;
    var sp = new serialport("/dev/ttyUSB0", {
        baudrate: 9600,
        databits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false,
        parser: serialport.parsers.raw
    });
} else {
    var network = require('net');
    var sp = new network.Socket();
    sp.connect(netPort, netHost, function () {
        logger.info('Network connected to: ' + netHost + ':' + netPort);
    });
}


if (ISYController) {
    var ISYHelper = require('./lib/ISY.js')
    var ISYConfig; //object to hold ISY variables.
    ISYConfig = JSON.parse(JSON.stringify(configFile.ISY))
}


var winston = require('winston');
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: function () {
                return dateFormat(Date.now(), "HH:MM:ss.l");
            },
            formatter: function (options) {
                // Return string will be passed to logger.
                return options.timestamp() + ' ' + winston.config.colorize(options.level, options.level.toUpperCase()) + ' ' + (undefined !== options.message ? options.message : '') +
                        (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
            },
            colorize: true,
            level: logType
        })
    ]
});
//New Objects to replace arrays
function circuit(number, numberStr, name, circuitFunction, status, freeze) {
    this.number = number; //1
    this.numberStr = numberStr; //circuit1
    this.name = name; //Pool
    this.circuitFunction = circuitFunction; //Generic, Light, etc
    this.status = status; //On, Off
    this.freeze = freeze; //On, Off
}
var circuit1 = new circuit();
var circuit2 = new circuit();
var circuit3 = new circuit();
var circuit4 = new circuit();
var circuit5 = new circuit();
var circuit6 = new circuit();
var circuit7 = new circuit();
var circuit8 = new circuit();
var circuit9 = new circuit();
var circuit10 = new circuit();
var circuit11 = new circuit();
var circuit12 = new circuit();
var circuit13 = new circuit();
var circuit14 = new circuit();
var circuit15 = new circuit();
var circuit16 = new circuit();
var circuit17 = new circuit();
var circuit18 = new circuit();
var circuit19 = new circuit();
var circuit20 = new circuit();
//array of circuit objects.  Since Pentair uses 1-20, we'll just use a placeholder for the 1st [0] element in the array
var currentCircuitArrObj = ['blank', circuit1, circuit2, circuit3, circuit4, circuit5, circuit6, circuit7, circuit8, circuit9, circuit10, circuit11, circuit12, circuit13, circuit14, circuit15, circuit16, circuit17, circuit18, circuit19, circuit20];
function heatObj(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode) {
    this.poolSetPoint = poolSetPoint;
    this.poolHeatMode = poolHeatMode;
    this.poolHeatModeStr = heatModeStr[poolHeatMode]
    this.spaSetPoint = spaSetPoint;
    this.spaHeatMode = spaHeatMode;
    this.spaHeatModeStr = heatModeStr[spaHeatMode]
}
var currentHeat = new heatObj;
function chlorinatorObj(saltPPM, outputPercent, outputSpaPercent, outputLevel, superChlorinate, version, name, status) {

    this.saltPPM = saltPPM;
    this.outputPercent = outputPercent; //for intellitouch this is the pool setpoint, for standalone it is the default
    this.outputSpaPercent = outputSpaPercent; //intellitouch has both pool and spa set points
    this.outputLevel = outputLevel;
    this.superChlorinate = superChlorinate;
    this.version = version;
    this.name = name;
    this.status = status;
}

var currentChlorinatorStatus = new chlorinatorObj(0, 0, 0, 0, 0, 0, '', '');
// This one should be removed once all instances are cleaned up and moved the the object directly above this.
//-----array format
var j = 0;
var circuitArr = [
    [], //Circuits 0-7
    [], //Circuits 8-15
    [] //Circuits 16-?
];
function pump(number, time, run, mode, drivestate, watts, rpm, ppc, err, timer, duration, currentprogram, program1rpm, program2rpm, program3rpm, program4rpm, remotecontrol, power) {
    this.pump = number; //1 or 2
    this.time = time;
    this.run = run;
    this.mode = mode;
    this.drivestate = drivestate;
    this.watts = watts;
    this.rpm = rpm;
    this.ppc = ppc;
    this.err = err;
    this.timer = timer;
    this.duration = duration;
    this.currentprogram = currentprogram;
    this.program1rpm = program1rpm;
    this.program2rpm = program2rpm;
    this.program3rpm = program3rpm;
    this.program4rpm = program4rpm;
    this.remotecontrol = remotecontrol;
    this.power = power;
}
var pump1 = new pump(1, 'timenotset', 'runnotset', 'modenotset', 'drivestatenotset', 'wattsnotset', 'rpmnotset', 'ppcnotset', 'errnotset', 'timernotset', 'durationnotset', 'currentprognotset', 'prg1notset', 'prg2notset', 'prg3notset', 'prg4notset', 'remotecontrolnotset', 'powernotset');
var pump2 = new pump(2, 'timenotset', 'runnotset', 'modenotset', 'drivestatenotset', 'wattsnotset', 'rpmnotset', 'ppcnotset', 'errnotset', 'timernotset', 'durationnotset', 'currentprognotset', 'prg1notset', 'prg2notset', 'prg3notset', 'prg4notset', 'remotecontrolnotset', 'powernotset');
//object to hold pump information.  Pentair uses 1 and 2 as the pumps so we will set array[0] to a placeholder.
var currentPumpStatus = ['blank', pump1, pump2]
var currentPumpStatusPacket = ['blank', [], []]; // variable to hold the status packets of the pumps

var NanoTimer = require('nanotimer'); //If you get an error here, re-run 'npm install` because this is a new dependency.
var writePacketTimer = new NanoTimer();
var introMsg = '\n*******************************';
introMsg += '\n Important:';
introMsg += '\n Configuration is now read from your pool.  The application will send the commands to retrieve the custom names and circuit names.';
introMsg += '\n It will dynamically load as the information is parsed.  If there is a write error 10 times, the logging will change to debug mode.';
introMsg += '\n If the message fails to be written 20 times, it will abort the packet and go to the next one.';
introMsg += '\n If you have an IntelliComII, or pumps only, set the appropriate flags in lines 21-23 of this app.';
introMsg += '\n In general, if you specify the Intellitouch controller, the app will get the status  (pumps, chlorinator, heater, etc)from the controller directly.  If you specify pumps only or IntellicomII, the app will retrieve the status information from the peripherals themselves.'
introMsg += '\n To change the amount of output to the console, change the "logx" flags in lines 45-51 of this app.';
introMsg += '\n Visit http://_your_machine_name_:3000 to see a basic UI';
introMsg += '\n Visit http://_your_machine_name_:3000/debug.html for a way to listen for specific messages\n\n';
introMsg += '*******************************\n'
logger.info(introMsg)

var settingsStr = '' // \n*******************************';
settingsStr += '\n Version: ' + version;
settingsStr += '\n ';
settingsStr += '\n //-------  EQUIPMENT SETUP -----------';
settingsStr += '\n var intellicom = ' + intellicom;
settingsStr += '\n var intellitouch = ' + intellitouch;
settingsStr += '\n var chlorinator = ' + chlorinator;
settingsStr += '\n var pumpOnly = ' + pumpOnly;
settingsStr += '\n var numberOfPumps = ' + numberOfPumps;
settingsStr += '\n var safePumpOperation = ' + safePumpOperation;
settingsStr += '\n //-------  END EQUIPMENT SETUP -----------';
settingsStr += '\n ';
settingsStr += '\n //-------  MISC NETWORK SETUP -----------';
settingsStr += '\n // Setup for Network Connection (socat or nc)';
settingsStr += '\n var netConnect = ' + netConnect;
settingsStr += '\n //-------  END MISC NETWORK SETUP -----------';
settingsStr += '\n ';
settingsStr += '\n //-------  LOG SETUP -----------';
settingsStr += '\n var loglevel = ' + loglevel;
settingsStr += '\n var logType = ' + logType;
settingsStr += '\n var logPumpMessages = ' + logPumpMessages;
settingsStr += '\n var logDuplicateMessages = ' + logDuplicateMessages;
settingsStr += '\n var logConsoleNotDecoded = ' + logConsoleNotDecoded;
settingsStr += '\n var logConfigMessages = ' + logConfigMessages;
settingsStr += '\n var logMessageDecoding = ' + logMessageDecoding;
settingsStr += '\n var logChlorinator = ' + logChlorinator;
settingsStr += '\n //-------  END EQUIPMENT SETUP -----------\n\n';
//settingsStr += '\n*******************************';

logger.debug(settingsStr);
//return a given equipment name given the circuit # 0-16++
/*function circuitArrStr(equip) {
    equip = equip - 1; //because equip starts at 1 but array starts at 0
    if (equip < 8) {
        return circuitArr[0][equip]
    } else if (equip >= 8 && equip < 16) {
        return circuitArr[1][equip - 8]
    } else {
        return circuitArr[2][equip - 16]
    }
    return 'Error';
}*/

//Used to count all items in array 
//countObjects(circuitArr) will count all items provided in config.json
function countObjects(obj) {
    var count = 0;
    // iterate over properties, increment if a non-prototype property
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            for (var key2 in obj[key]) {
                if (obj[key].hasOwnProperty(key2))
                    count++
            }
    }
    return count;
}


sp.on('error', function (err) {
    logger.error('Error opening port: ', err.message)
    process.exit(1)
})


sp.on('open', function () {
    logger.verbose('Serial Port opened');
})
var interimBuffer = [];
var bufferToProcess = [];
var bufferArrayOfArrays = new Dequeue();


sp.on('data', function (data) {
    //Push the incoming array onto the end of the dequeue array

    bufferArrayOfArrays.push(Array.prototype.slice.call(data));
    
    if (!processingBuffer)
        iterateOverArrayOfArrays();
});


function iterateOverArrayOfArrays() {

    var chatter = []; //a {potential} message we have found on the bus
    var packetType;
    var preambleStd = [255, 165];
    var preambleChlorinator = [16, 2]
    var breakLoop = false

    processingBuffer = true; //we don't want this function to run asynchronously beyond this point or it will start to process the same array multiple times

    if (bufferToProcess.length == 0) {
        bufferToProcess = bufferArrayOfArrays.shift()  //move the first element from Array of Arrays to bufferToProcess

    }
    else
    {
        bufferToProcess = bufferToProcess.concat(bufferArrayOfArrays.shift())

    }
    if (bufferToProcess.length % 16 == 0)
    {
        //this logic is here because many of the longer Intellitouch controller status packets come through in chunks of 32 bits
        //eg  
        //[255,255,255,255,255,255,255,255,0,255,165,16,15,16,2,29,5,50,0,64,0,0,0,0,0,0,3,0,64,4,86,86]
        //[32,0,61,58,0,0,6,0,0,126,138,0,13,4,15]
        //Instead of going through this logic twice, let's be proactive.
        //We can simply bypass this loop because next time we come here the bufferToProcess.concat will merge the packets
        //Is this the same on all O/S?  This is from a RasPi 3.
        console.log('\n\n')
        logger.debug('iOAOA: Packet analysis delayed because a partial packet is in the queue.')
        breakLoop = true
    }else
    {
    if (logMessageDecoding)
        console.log('\n\n')
        logger.debug('iOAOA: Packet being analyzed: %s', bufferToProcess);
    }


    while (bufferToProcess.length > 0 && !breakLoop) {
        if (preambleStd[0] == bufferToProcess[0] && preambleStd[1] == bufferToProcess[1]) //match on pump or controller packet
        {

            var chatterlen = bufferToProcess[6] + 6 + 2; //chatterlen is length of following message not including checksum (need to add 6 for start of chatter, 2 for checksum)
            //   0,   1,      2,      3,    4, 5,        6
            //(255,165,preambleByte,Dest,Src,cmd,chatterlen) and 2 for checksum)

            if (chatterlen == undefined || ((bufferToProcess.length - chatterlen) <= 0)) {

                if (logMessageDecoding) {
                    if (logMessageDecoding)
                        logger.silly('Msg#  n/a   Incomplete message in bufferToProcess.')
                    if (bufferArrayOfArrays.length > 0) {
                        bufferToProcess = bufferToProcess.concat(bufferToProcess, bufferArrayOfArrays.shift())
                    } else {
                        breakLoop = true //do nothing, but exit until we get a second buffer to concat
                    }
                }
            } else
            {
                msgCounter += 1;
                bufferToProcess.shift() //remove the 255 byte
                chatter = bufferToProcess.splice(0, chatterlen); //splice modifies the existing buffer.  We remove chatter from the bufferarray.

                if (((chatter[2] == ctrl.PUMP1 || chatter[2] == ctrl.PUMP2)) || chatter[3] == ctrl.PUMP1 || chatter[3] == ctrl.PUMP2) {
                    packetType = 'pump'
                } else {
                    packetType = 'controller';
                    preambleByte = chatter[1]; //not sure why we need this, but the 165,XX packet seems to change.  On my system it used to be 165,10 and then switched to 165,16.  Not sure why!  But we dynamically adjust it so it works for any value.  It is also different for the pumps (should always be 0 for pump messages)
                }
                if (logMessageDecoding)
                    logger.info('Msg# %s  Found incoming %s packet: %s', msgCounter, packetType, chatter)

                processChecksum(chatter, msgCounter, packetType);

            }
            breakLoop = true;
        } else if (preambleChlorinator[0] == bufferToProcess[0] && preambleChlorinator[1] == bufferToProcess[1]
                && (bufferToProcess[2] == 0 || bufferToProcess[2] == 80)) {
            /*Match on chlorinator packet
             //the ==80 and ==0 is a double check in case a partial packet comes through.
             
             //example packet:
             //byte  0  1   2   3  4    5   6  7
             //len                             8
             //     16  2  80  20  2  120  16  3*/

            msgCounter += 1;
            chatter = [];
            var i = 0;
            //Looking for the Chlorinator preamble 16,2
            while (!(bufferToProcess[i] == 16 && bufferToProcess[i + 1] == 3) && !breakLoop) {
                chatter.push(bufferToProcess[i]);
                i++;
                if (bufferToProcess[i] == 16 && bufferToProcess[i + 1] == 3) {
                    chatter.push(bufferToProcess[i]);
                    chatter.push(bufferToProcess[i + 1]);
                    i += 2;
                    processChecksum(chatter, msgCounter, 'chlorinator');
                    bufferToProcess.splice(0, i)
                    breakLoop = true;
                }

            }

        } else { //not a preamble for chlorinator or pump/controller packet.  Eject the first byte.
            bufferToProcess.shift();
        }

    }

    /*if (bufferToProcess.length == 0) { //if no more bytes in the current bufferToProcess, remove the buffer.
     bufferToProcess.shift()
     if (logMessageDecoding)
     logger.silly('iOAOA: Shifting 1st array (empty) out.  No more messages in bufferToProcess.')
     } else 
     */
    if (bufferArrayOfArrays.length > 0)
    {
        if (logMessageDecoding)
            logger.silly('iOAOA: Partial message in queue.  Appending next buffer in bufferArrayOfArrays to bufferToProcess.')
        bufferToProcess = bufferToProcess.concat(bufferToProcess, bufferArrayOfArrays.shift())
    }
    /*
     if (bufferArrayOfArrays.length == 0 && bufferArrayOfArrays.length > 2)
     
     {
     var tempPacket = Array.prototype.concat(bufferToProcess, bufferArrayOfArrays.shift())  //new temp packet of [0] and [1] arrays
     bufferToProcess.splice(0, 2, tempPacket) //remove 2 elements starting at 0 position and then insert the tempPacket
     logger.debug('Merging 1st two arrays')
     }
     */
    processingBuffer = false;

}



function processChecksum(chatter, counter, packetType) {

//call new function to process message; if it isn't valid, we noted above so just don't continue
    if (decodeHelper.checksum(chatter, counter, packetType, logMessageDecoding, logger)) {
        if (queuePacketsArr.length > 0) {
            if (decodeHelper.isResponse(chatter, counter, packetType, logger, loglevel, packetFields, queuePacketsArr)) {
                successfulAck(chatter, counter, true);
            } else {
                successfulAck(chatter, counter, false);
            }


        }
        decode(chatter, counter, packetType)
    }
}



function decode(data, counter, packetType) {
    var decoded = false;
    //when searchMode (from socket.io) is in 'start' status, any matching packets will be set to the browser at http://machine.ip:3000/debug.html
    if (searchMode == 'start') {

        var resultStr = 'Msg#: ' + counter + ' Data: ' + JSON.stringify(data)
        if (searchAction == data[packetFields.ACTION] && searchSrc == data[packetFields.FROM] && searchDest == data[packetFields.DEST]) {
            io.sockets.emit('searchResults',
                    resultStr
                    )
        }
    }

    if (needConfiguration) {

        if (intellitouch) // ONLY check the configuration if the controller is Intellitouch (address 16)
        {
            if (preambleByte != undefined) {
                getControllerConfiguration(data[packetFields.DEST], data[packetFields.FROM])
                needConfiguration = 0; //we will no longer request the configuration.  Need this first in case multiple packets come through.
            }

        } else {

            if (intellicom) {
                logger.info('IntellicomII Controller Detected.  No configuration request messages sent.')
            } else {
                logger.info('No pool controller (Intellitouch or IntelliComII) detected.  No configuration request messages sent.')
            }
            needConfiguration = 0; //we will no longer request the configuration.  Need this first in case multiple packets come through.
        }
    }

    if (logMessageDecoding)
        logger.silly('Msg# %s  TYPE %s,  packet %s', counter, packetType, data)

    //Start Controller Decode

    //I believe this should be any packet with 165,10.  Need to verify. --Nope, 165,16 as well.  

    if (packetType == 'controller') {




//logger.silly('Msg# %s  Packet info: dest %s   from %s', counter, data[packetFields.DEST], data[packetFields.FROM]);
        switch (data[packetFields.ACTION]) {

            case 2: //Controller Status 
            {

//status will be our return object
                var status = {};
                //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3
                var timeStr = ''
                if (data[controllerStatusPacketFields.HOUR] > 12) {
                    timeStr += data[controllerStatusPacketFields.HOUR] - 12
                } else {
                    timeStr += data[controllerStatusPacketFields.HOUR]
                }
                timeStr += ':'
                if (data[controllerStatusPacketFields.MIN] < 10)
                    timeStr += '0';
                timeStr += data[controllerStatusPacketFields.MIN]
                if (data[controllerStatusPacketFields.HOUR] > 11 && data[controllerStatusPacketFields.HOUR] < 24) {
                    timeStr += " PM"
                } else {
                    timeStr += " AM"
                }

                status.time = timeStr;
                status.poolTemp = data[controllerStatusPacketFields.POOL_TEMP];
                status.spaTemp = data[controllerStatusPacketFields.SPA_TEMP];
                status.airTemp = data[controllerStatusPacketFields.AIR_TEMP];
                status.solarTemp = data[controllerStatusPacketFields.SOLAR_TEMP];
                status.poolHeatMode2 = heatModeStr[data[controllerStatusPacketFields.UNKNOWN] & 3]; //mask the data[6] with 0011
                status.spaHeatMode2 = heatModeStr[(data[controllerStatusPacketFields.UNKNOWN] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places

                status.poolHeatMode = heatModeStr[data[controllerStatusPacketFields.HEATER_MODE] & 3]; //mask the data[6] with 0011
                status.spaHeatMode = heatModeStr[(data[controllerStatusPacketFields.HEATER_MODE] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places

                status.valves = strValves[data[controllerStatusPacketFields.VALVES]];
                status.runmode = strRunMode[data[controllerStatusPacketFields.UOM] & 129]; // more here?
                status.UOM = String.fromCharCode(176) + ((data[controllerStatusPacketFields.UOM] & 4) >> 3) ? ' Farenheit' : ' Celsius';
                if (data[controllerStatusPacketFields.HEATER_ACTIVE] == 0) {
                    status.HEATER_ACTIVE = 'Off'
                } else
                if (data[controllerStatusPacketFields.HEATER_ACTIVE] == 32) {
                    status.HEATER_ACTIVE = 'Heater On'
                } else {
                    status.HEATER_ACTIVE = 'Unknown'
                }
                ;
                //Initialize static variable (currentStatus) if not defined, and log it.
                if (currentStatus == null || currentStatus == undefined) {

//currentStatus = clone(status);
//currentStatusBytes = data.slice(0);
                    currentStatus = JSON.parse(JSON.stringify(status));
                    currentStatusBytes = JSON.parse(JSON.stringify(data));
                    logger.info('Msg# %s   Discovered initial system settings: ', counter, currentStatus)
                    logger.verbose('\n ', decodeHelper.printStatus(data));
                    //Loop through the three bits that start at 3rd (and 4th/5th) bit in the data payload
                   /* for (var i = 0; i < circuitArr.length; i++) {
//loop through all physical circuits within each of the bits
                        for (j = 0; j < circuitArr[i].length; j++) {
//get rid of next two lines?
                            var tempFeature = circuitArr[i][j]; //name of circuit
                            equip = data[controllerStatusPacketFields.EQUIP1 + i]


                            currentCircuitArrObj[j + (i * 8) + 1].status = (equip & (1 << (j))) >> j ? "on" : "off"
                        }
                    }*/

                    var circuitStr = '';
                    //logger.info('Msg# %s  Initial circuits status discovered', counter)
                    for (var i = 1; i <= 20; i++) {
                        if (currentCircuitArrObj[i].name != undefined) {
                            circuitStr += currentCircuitArrObj[i].name + ' : ' + currentCircuitArrObj[i].status + '\n'
                        }
                    }
                    logger.info('Msg# %s: Circuit state discovered: \n %s', counter, circuitStr)


                    emit();
                } else {

//Check if we have the same data
//if (!data.equals(currentStatusBytes)) {
                    if (JSON.stringify(data) != JSON.stringify(currentStatusBytes)) {

//the following is a copy of the array.  We will update it and then compare it back to the currentCircuitArrObj  
                        var circuitArrObj = JSON.parse(JSON.stringify(currentCircuitArrObj));
                  /*      for (var i = 0; i < circuitArr.length; i++) {
//loop through all physical circuits within each of the bits
                            for (j = 0; j < circuitArr[i].length; j++) {
//delete the next line?
                                equip = data[controllerStatusPacketFields.EQUIP1 + i]

                                circuitArrObj[j + (i * 8) + 1].status = (equip & (1 << (j))) >> j ? "on" : "off"
                            }
                        }*/


                        logger.info('Msg# %s   System Status changed: %s', counter, currentStatus.whatsDifferent(status))


                        //THE LOOP IS BECAUSE THERE IS A BUG IN THE RECURSIVE LOOP.  It won't display the output.  Need to fix for objects embedded inside an array.
                        var results;
                        for (var i = 1; i <= 20; i++) {
                            if (currentCircuitArrObj[i].status != undefined) {
                                results = currentCircuitArrObj[i].whatsDifferent(circuitArrObj[i]);
                                if (!(results == "Nothing!" || currentCircuitArrObj[i].name == undefined)) {
                                    logger.info('Msg# %s   Circuit %s change:  %s', counter, circuitArrObj[i].name, results)
                                }
                            }
                        }
//console.log('Msg# %s   What\'s Different with Circuits? (Need to fix): %s', counter, currentCircuitArrObj.whatsDifferent(circuitArrObj))


                        logger.verbose('Msg# %s: \n', counter, decodeHelper.printStatus(currentStatusBytes, data));
                        //currentStatus = clone(status);
                        //currentStatusBytes = data.slice(0);
                        currentStatus = JSON.parse(JSON.stringify(status));
                        currentStatusBytes = JSON.parse(JSON.stringify(data))
                        currentCircuitArrObj = JSON.parse(JSON.stringify(circuitArrObj));
                        decoded = true;
                        emit();
                    } else {

                        if (logDuplicateMessages)
                            logger.debug('Msg# %s   Duplicate broadcast.', counter)
                        decoded = true;
                    }
                }
                decoded = true;
                break;
            }

            case 7:

            //Send request/response for pump status
            {
                var pumpNum;
                if (data[packetFields.FROM] == 96 || data[packetFields.DEST] == 96) {
                    pumpNum = 1
                } else {
                    pumpNum = 2
                }
                ;
                //var pumpname = (data[packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
                //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3


                var pumpStatus;
                //pump status has not been copied to currentPumpStatus yet 
                //if (currentPumpStatus[pumpNum].name == undefined) {
                //    pumpStatus = new pump();
                //} else {
                pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]));
                pumpStatus.name = ctrlString[pumpNum + 95];
                //}


                if (data[packetFields.FROM] == 16) //Request of status from Main
                {
                    if (logPumpMessages) {
                        logger.verbose('Msg# %s   Main asking pump %s for status: %s', counter, ctrlString[data[packetFields.DEST]], JSON.stringify(data));
                    }
                } else //Response to request for status 
                {




                    pumpStatus.pump = pumpNum;
                    var pumpname = (data[packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
                    //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3

                    pumpStatus.time = data[pumpPacketFields.HOUR] + ':' + data[pumpPacketFields.MIN];
                    pumpStatus.run = data[pumpPacketFields.CMD]
                    pumpStatus.name = ctrlString[pumpname];
                    pumpStatus.mode = data[pumpPacketFields.MODE]
                    pumpStatus.drivestate = data[pumpPacketFields.DRIVESTATE]
                    pumpStatus.watts = (data[pumpPacketFields.WATTSH] * 256) + data[pumpPacketFields.WATTSL]
                    pumpStatus.rpm = (data[pumpPacketFields.RPMH] * 256) + data[pumpPacketFields.RPML]
                    pumpStatus.ppc = data[pumpPacketFields.PPC]
                    pumpStatus.err = data[pumpPacketFields.ERR]
                    pumpStatus.timer = data[pumpPacketFields.TIMER]
                    //pumpStatus.packet = data;

                    if (logPumpMessages)
                        logger.debug('Msg# %s  %s Status: ', counter, pumpStatus.name, JSON.stringify(pumpStatus), data);
                    //if (logPumpMessages) logger.silly('currentPumpStatusPacket', currentPumpStatusPacket)

                    if (pumpNum == 1 || pumpNum == 2) {

                        //pump status has not been copied to currentPumpStatus yet 
                        // if (currentPumpStatus[pumpStatus.pump].name == undefined) {
                        //currentPumpStatus[pumpStatus.pump] = status;
                        //currentPumpStatusPacket[status.pump] = data;
                        //} else
                        //if the packets are different
                        //{

                        //if (logPumpMessages) logger.silly('currentPumpPacket:  %s  \n Data:  %s', currentPumpStatusPacket[status.pump], data)
                        //if (logPumpMessages) logger.silly('currentPumpStatusPacket[status.pump] == data', currentPumpStatusPacket[status.pump] == data)
                        //if (logPumpMessages) logger.silly('JSON.stringify(currentPumpStatusPacket[status.pump]) == JSON.stringify(data)', JSON.stringify(currentPumpStatusPacket[status.pump]) == JSON.stringify(data))

                        //TODO - I don't think the following works...
                        if (JSON.stringify(currentPumpStatus[status.pump]).equals(JSON.stringify(status))) {

                            if (logPumpMessages)
                                logger.debug('Msg# %s   Pump %s status has not changed: ', counter, status.pump, data)
                        } else {

                            if (logPumpMessages)
                                logger.silly('currentPumpStatus: ', currentPumpStatus[status.pump], 'status: ', status)


                            if (logPumpMessages)
                                logger.verbose('Msg# %s   Pump %s status changed: ', counter, status.pump, currentPumpStatus[pumpNum].whatsDifferent(status));
                            currentPumpStatus[pumpNum] = pumpStatus;
                            //currentPumpStatusPacket[status.pump] = data;
                            emit();
                        }
                        //}
                    }



                }
                decoded = true;
                break;
            }
            case 8: //Broadcast current heat set point and mode 
            {
//   [15,16,8,13,75,75,64,87,101,11,0,0,62,0,0,0,0,2,190]

                var status = new heatObj(data[9], data[11] & 3, data[10], (data[11] & 12) >> 2)

                logger.debug('heat status ', status, data);
                logger.debug('currentHeat ', currentHeat)

                if (currentHeat.poolSetPoint == undefined) {
                    currentHeat = status;
                    logger.info('Msg# %s   Pool/Spa heat set point discovered:  \n  Pool heat mode: %s @ %s degrees \n  Spa heat mode: %s at %s degrees', counter, heatModeStr[currentHeat.poolHeatMode], currentHeat.poolSetPoint, heatModeStr[currentHeat.spaHeatMode], currentHeat.spaSetPoint);
                } else {

                    if (currentHeat.equals(status)) {
                        logger.debug('Msg# %s   Pool/Spa heat set point HAS NOT CHANGED:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, heatModeStr[status.poolHeatMode], status.poolSetPoint, heatModeStr[status.spaHeatMode], status.spaSetPoint);
                    } else {
                        logger.verbose('Msg# %s   Pool/Spa heat set point changed:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, heatModeStr[status.poolHeatMode], status.poolSetPoint, heatModeStr[status.spaHeatMode], status.spaSetPoint);
                        logger.info('Msg# %s  Change in Pool/Spa Heat Mode:  %s', counter, currentHeat.whatsDifferent(status))
                        currentHeat = status;
                        emit();
                    }
                }

                decoded = true;
                break;
            }

            /*            case 8: //Get Heat/Temp Setpoints
             {
             
             var status = {};
             
             status.POOLSETPOINT = data[4];
             status.SPASETPOINT = data[5];
             status.POOLHEATMODE = 
             status.SPAHEATMODE = (data[6] & 12) >> 2; //mask the data[6] with 1100 and shift right two places
             logger.debug('Msg# %s   Pool/Spa heat set point HAS NOT CHANGED:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, status.POOLHEATMODE, status.POOLSETPOINT, status.SPAHEATMODE, status.SPASETPOINT);
             if (currentHeat != status) {
             currentHeat = status;
             logger.verbose('Msg# %s   Pool/Spa heat set point changed:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, status.POOLHEATMODE, status.POOLSETPOINT, status.SPAHEATMODE, status.SPASETPOINT);
             emit();
             }
             decoded = true;
             break;
             }
             */
            case 10: //Get Custom Names
            {
                var customName = '';
                for (var i = 7; i < 18; i++) {
                    if (data[i] > 0 && data[i] < 251) //251 is used to terminate the custom name string if shorter than 11 digits
                    {
//console.log('i: %s and data[i]: %s',i, data[i])
                        customName += String.fromCharCode(data[i])
                    }
                    ;
                }

                if (logConfigMessages) {
                    logger.silly('Msg# %s  Custom Circuit Name Raw:  %s  & Decoded: %s', counter, JSON.stringify(data), customName)
                    logger.verbose('Msg# %s  Custom Circuit Name Decoded: "%s"', counter, customName)
                }

                customNameArr[data[6]] = customName;
                //display custom names when we reach the last circuit
                if (data[6] == 9) {
                    logger.info('\n  Custom Circuit Names retrieved from configuration: ', customNameArr)
                }

                emit();
                decoded = true;
                break;
            }



            case 11: // Get Circuit Names
            {


                var whichCircuit = 0;
                if (data[namePacketFields.NUMBER] <= 8) {
                    whichCircuit = 0; //8 bits for first mode byte
                } else if (data[namePacketFields.NUMBER] > 8 && data[namePacketFields.NUMBER] <= 16) {
                    (whichCircuit = 1) //8 bits for 2nd mode byte
                } else
                    (whichCircuit = 2); //8 bits for 3rd mode byte

                var freezeProtection;
                if ((data[namePacketFields.CIRCUITFUNCTION] & 64) == 64) {
                    freezeProtection = 'on'
                } else {
                    freezeProtection = 'off'
                }
//The &63 masks to 00111111 because 01000000 is freeze protection bit
                if (logConfigMessages) {
                    logger.silly('Msg# %s  Circuit Info  %s', counter, JSON.stringify(data))

                    //if (logConfigMessages == 1) console.log('Msg# %s  Schedule Discovered.  CIRCUIT NUMBER: %s  CIRCUIT NAME: %s(%s)  CIRCUIT FUNCTION: %s(%s, %s)  FREEZE PROTECTION: %s(masked:%s)', counter, data[namePacketFields.NUMBER], strCircuitName[data[namePacketFields.NAME]], data[namePacketFields.NAME], strCircuitFunction[data[namePacketFields.CIRCUITFUNCTION] & 63], data[namePacketFields.CIRCUITFUNCTION], data[namePacketFields.CIRCUITFUNCTION] & 63, freezeProtection, data[namePacketFields.CIRCUITFUNCTION] & 64)


                    if (logConfigMessages)
                        logger.verbose('Msg# %s  Circuit %s:   Name: %s  Function: %s  Freeze Protection: %s', counter, data[namePacketFields.NUMBER], strCircuitName[data[namePacketFields.NAME]], strCircuitFunction[data[namePacketFields.CIRCUITFUNCTION] & 63], freezeProtection)
                }


//if the ID of the circuit name is 1-101 then it is a standard name.  If it is 200-209 it is a custom name.  The mapping between the string value in the getCircuitNames and getCustomNames is 200.  So subtract 200 from the circuit name to get the id in the custom name array.
//data[4]-1 because this array starts at 1 and JS arrays start at 0.
//-(8*whichCircuit) because this will subtract 0, 8 or 16 from the index so each secondary index will start at 0

//array
               /* if (data[namePacketFields.NAME] < 200) {
                    circuitArr[whichCircuit][data[namePacketFields.NUMBER] - (8 * whichCircuit) - 1] = strCircuitName[data[namePacketFields.NAME]];
                } else {
                    if (logConfigMessages)
                        logger.silly('mapping %s to %s', strCircuitName[data[namePacketFields.NAME]], customNameArr[data[namePacketFields.NAME] - 200]);
                    circuitArr[whichCircuit][data[namePacketFields.NUMBER] - (8 * whichCircuit) - 1] = customNameArr[data[namePacketFields.NAME] - 200];
                }

                if (logConfigMessages)
                    logger.debug('circuit name for %s: %s', data[namePacketFields.NUMBER], strCircuitName[data[namePacketFields.NAME]])
*/
                //arrayObj
                if (data[namePacketFields.NUMBER] != null) { //|| data[namePacketFields.NUMBER] != undefined) {
                    if (data[namePacketFields.NAME] < 200) {
                        currentCircuitArrObj[data[namePacketFields.NUMBER]].name = strCircuitName[data[namePacketFields.NAME]]
                    } else {
                        currentCircuitArrObj[data[namePacketFields.NUMBER]].name = customNameArr[data[namePacketFields.NAME] - 200];
                    }
                    currentCircuitArrObj[data[namePacketFields.NUMBER]].number = data[namePacketFields.NUMBER];
                    currentCircuitArrObj[data[namePacketFields.NUMBER]].numberStr = 'circuit' + data[namePacketFields.NUMBER];
                    currentCircuitArrObj[data[namePacketFields.NUMBER]].circuitFunction = strCircuitFunction[data[namePacketFields.CIRCUITFUNCTION] & 63];
                    currentCircuitArrObj[data[namePacketFields.NUMBER]].freeze = freezeProtection;
                }

                if (logConfigMessages)
                    logger.debug('currentCircuitArrObj[%s]: %s ', data[namePacketFields.NUMBER], JSON.stringify(currentCircuitArrObj[data[namePacketFields.NUMBER]]))




                if (data[namePacketFields.NUMBER] == 20)
                    logger.info('\n  Circuit Array Discovered from configuration: \n[[%s][[]\n', circuitArr.join('],\n['))

                emit();
                decoded = true;
                break;
            }

            case 17: // Get Schedules
            {   //byte:      0  1  2  3  4 5 6 7 8  9 10 11  12 13 14
                //example: 165,16,15,16,17,7,1,6,9,25,15,55,255,2, 90
                var schedule = {};
                schedule.ID = data[6];
           /*     var whichCircuit = 0;
                if (data[7] < 8) {
                    whichCircuit = 0; //8 bits for first mode byte
                } else if (data[7] >= 8 && data[7] < 16) {
                    (whichCircuit = 1) //8 bits for 2nd mode byte
                } else
                    (whichCircuit = 2); //8 bits for 3rd mode byte*/
        schedule.CIRCUIT = currentCircuitArrObj[data[7]].name; //Correct???
                if (data[8] == 25) //25 = Egg Timer 
                {
                    schedule.MODE = 'Egg Timer'
                    schedule.DURATION = data[10] + ':' + data[11];
                } else {
                    schedule.MODE = 'Schedule'
                    schedule.DURATION = 'n/a'
                    schedule.START_TIME = data[8] + ':' + data[9];
                    schedule.END_TIME = data[10] + ':' + data[11];
                    schedule.DAYS = '';
                    if (data[12] == 255) {
                        schedule.DAYS += 'EVERY DAY'
                    } else { //0 = none
                        if ((data[12] & 129) == 129)
                            schedule.DAYS += 'Sunday '; //129
                        if ((data[12] & 2) >> 1 == 1)
                            schedule.DAYS += 'Monday '; // 2
                        if ((data[12] & 4) >> 2 == 1)
                            schedule.DAYS += 'Tuesday '; // 4
                        if ((data[12] & 8) >> 3 == 1)
                            schedule.DAYS += 'Wednesday '; //8
                        if ((data[12] & 16) >> 4 == 1)
                            schedule.DAYS += 'Thursday '; //16
                        if ((data[12] & 32) >> 5 == 1)
                            schedule.DAYS += 'Friday '; //32
                        if ((data[12] & 64) >> 6 == 1)
                            schedule.DAYS += 'Saturday '; //64
                    }
                }





                if (logConfigMessages)
                    logger.silly('\nMsg# %s  Schedule packet %s', counter, JSON.stringify(data))
                if (schedule.MODE == 'Egg Timer') {
                    if (logConfigMessages)
                        logger.info('Msg# %s  Schedule: ID:%s  CIRCUIT:(%s)%s  MODE:%s  DURATION:%s  ', counter, schedule.ID, data[6], schedule.CIRCUIT, schedule.MODE, schedule.DURATION)
                } else {
                    if (logConfigMessages)
                        logger.info('Msg# %s  Schedule: ID:%s  CIRCUIT:(%s)%s  MODE:%s  START_TIME:%s  END_TIME:%s  DAYS:(%s)%s', counter, schedule.ID, data[7], schedule.CIRCUIT, schedule.MODE, schedule.START_TIME, schedule.END_TIME, data[12], schedule.DAYS)
                }

                currentSchedule[schedule.ID] = schedule;
                decoded = true;
                break;
            }
//Set Circuit Function On/Off

            case 25: //Intellichlor status
            {
                if (intellitouch) { //this is to test configs without a chlorinator.  can get rid of it.
                    if (logChlorinator)
                        logger.info('Msg# %s   Chlorinator status packet: %s', counter, data)

                    //copy the currentChlorinatorStatus to temp object
                    //var chlorinatorStatus = JSON.parse(JSON.stringify(currentChlorinatorStatus));;
                    var chlorinatorStatus = new chlorinatorObj;
                    chlorinatorStatus.outputSpaPercent = (data[6] - 1) / 2; //41 would equal 20%, for example
                    chlorinatorStatus.outputPercent = data[7];
                    chlorinatorStatus.saltPPM = data[9] * 50;
                    switch (data[10]) {
                        case 0: //ok
                        {
                            chlorinatorStatus.status = "Ok";
                            break;
                        }
                        case 1:
                        {
                            chlorinatorStatus.status = "No flow";
                            break;
                        }
                        case 2:
                        {
                            chlorinatorStatus.status = "Low Salt";
                            break;
                        }
                        case 4:
                        {
                            chlorinatorStatus.status = "High Salt";
                            break;
                        }

                        case 144:
                        {
                            chlorinatorStatus.status = "Clean Salt Cell"
                            break;
                        }
                        case 145:
                        {
                            chlorinatorStatus.status = "???"
                            break;
                        }
                        default:
                        {
                            chlorinatorStatus.status = "Unknown - Status code: " + data[5];
                        }
                    }
                    chlorinatorStatus.name = '';
                    for (var i = 12; i <= 27; i++) {
                        chlorinatorStatus.name += String.fromCharCode(data[i]);
                    }
                    if (currentChlorinatorStatus.name == '') {
                        currentChlorinatorStatus = chlorinatorStatus;
                        if (logChlorinator)
                            logger.info('Msg# %s   Initial chlorinator settings discovered: ', counter, JSON.stringify(currentChlorinatorStatus))
                        emit();
                    } else
                    if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
                        if (logChlorinator)
                            logger.verbose('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
                    } else {
                        if (logChlorinator)
                            logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                        currentChlorinatorStatus = chlorinatorStatus;
                        emit();
                    }
                    decoded = true;
                    break;
                }
            }
            case 134:
            {


                var status = {

                    source: null,
                    destination: null,
                    b3: null,
                    CMD: null,
                    sFeature: null,
                    ACTION: null,
                    b7: null

                }
                status.source = data[packetFields.FROM]
                status.destination = data[packetFields.DEST]
                status.b3 = data[4] //134... always?
                status.CMD = data[5] == 4 ? 'pool temp' : 'feature'; // either 4=pool temp or 2=feature


                if (data[5] == 2) {
                    status.sFeature = circuitArrStr(data[4])
                    if (data[7] == 0) {
                        status.ACTION = "off"
                    } else if (data[7] == 1) {
                        status.ACTION = "on"
                    }
                    logger.info('Msg# %s   %s --> %s: Change %s %s to %s : %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], status.CMD, status.sFeature, status.ACTION, JSON.stringify(data));
                    decoded = true;
                    break;
                }




            }

//This is _SET_ heat/temp... not the response.
            case 136:
            {
//  [16,34,136,4,POOL HEAT,SPA HEAT,Heat Mode,0,2,56]

                var status = {

                    source: null,
                    destination: null,
                    b3: null,
                    CMD: null,
                    sFeature: null,
                    ACTION: null,
                    b7: null

                }
                status.source = data[packetFields.FROM]
                status.destination = data[packetFields.DEST]

                status.POOLSETPOINT = data[6];
                status.SPASETPOINT = data[7];
                status.POOLHEATMODE = heatModeStr[data[8] & 3]; //mask the data[6] with 0011
                status.SPAHEATMODE = heatModeStr[(data[8] & 12) >> 2]; //mask the data[6] with 1100 and shift right two places
                logger.info('Msg# %s   %s asking %s to change pool heat mode to %s (@ %s degrees) & spa heat mode to %s (at %s degrees): %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], status.POOLHEATMODE, status.POOLSETPOINT, status.SPAHEATMODE, status.SPASETPOINT, JSON.stringify(data));
                decoded = true;
                break;
            }
            case 153: //Intellichlor status
            {

                if (logChlorinator)
                    logger.info('Msg# %s   Set Chlorinator packet: %s', counter, data)
                decoded = true;
                break;
            }
            case 217: //Intellichlor status
            {

                if (logChlorinator)
                    logger.info('Msg# %s   Get Chlorinator packet: %s', counter, data)
                decoded = true;
                break;
            }
            default:
            {

                var currentAction = strActions[data[packetFields.ACTION]]
                if (currentAction != undefined) {
                    if (logConsoleNotDecoded)
                        logger.verbose('Msg# %s   %s packet: %s', counter, currentAction, data)
                    decoded = true;
                } else {
                    if (logConsoleNotDecoded)
                        logger.verbose('Msg# %s   is NOT DEFINED packet: %s', counter, data)
                }

            }


        }

    }
//End Controller Decode

//Start Pump Decode
//I believe this should be any packet with 165,0.  Need to verify.
    else if (packetType == 'pump')

    {
        if (logPumpMessages)
            logger.silly('Msg# %s  Decoding pump packet %s', counter, data)

        var updatePumpStatus = false; //true if it is a response from the pump (we are getting something back that can be updated), false if it is a request to the pump (nothing to update). 
        if (data[packetFields.FROM] == 96 || data[packetFields.FROM] == 97) {
            updatePumpStatus = true;
        }

//var ctrlType = data2;
        var pumpNum;
        if (data[packetFields.FROM] == 96 || data[packetFields.DEST] == 96) {
            pumpNum = 1
        } else {
            pumpNum = 2
        }
        ;
        //var pumpname = (data[packetFields.FROM]).toString(); //returns 96 (pump1) or 97 (pump2)
        //time returned in HH:MM (24 hour)  <-- need to clean this up so we don't get times like 5:3

        //logger.error('BEFORE    currentPumpStatus: %s', JSON.stringify(currentPumpStatus))
        var pumpStatus;
        //pump status has not been copied to currentPumpStatus yet 
        //if (currentPumpStatus[pumpNum].name == undefined) {
        //    pumpStatus = new pump();
        //} else {
        pumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]));
        pumpStatus.name = ctrlString[pumpNum + 95];
        pumpStatus.pump =  pumpNum;
        //}

        //logger.error('pumpStatus: %s    currentPumpStatus: %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))


        switch (data[packetFields.ACTION]) {



            case 1: //Set speed setting
            {
                var str1;
                var str2;
                var setAmount = data[8] * 256 + data[9];
                //if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump.  Also think we know that if length = 4 than it is to the pump and length=2 is a response.
                //{

                if (data[5] == 2) // Length==2 is a response.
                {

                    var str1;
                    var setAmount = data[6] * 256 + data[7];
                    decoded = true;
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s responded with acknowledgement: %s', counter, ctrlString[data[packetFields.FROM]], JSON.stringify(data));
                } else if (data[6] == 3) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
                {
                    switch (data[7]) {

                        case 33: //0x21
                        {
                            setAmount = setAmount / 8
                            str1 = 'Set Current Program to ' + setAmount.toString();
                            pumpStatus.currentProgram = setAmount;
                            break;
                        }
                        case 39: //0x27
                        {
                            str1 = 'Save Program 1 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program1rpm = setAmount;
                            break;
                        }
                        case 40: //0x28
                        {
                            str1 = 'Save Program 2 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program2rpm = setAmount;
                            break;
                        }
                        case 41: //0x29
                        {
                            str1 = 'Save Program 3 as '
                            str2 = setAmount.toString() + 'rpm';
                            pumpStatus.program3rpm = setAmount;
                            break;
                        }
                        case 42: //0x2a
                        {
                            str1 = 'Save Program 4 as ';
                            pumpStatus.program4rpm = setAmount;
                            str2 = setAmount.toString() + 'rpm';
                            break;
                        }
                        case 43: //0x2B
                        {
                            str1 = 'Set Pump Timer for ';
                            pumpStatus.timer = setAmount;
                            str2 = setAmount.toString() + ' minutes'
                            break;
                        }
                        default:
                            {
                                str1 = 'unknown(?)'
                            }
//if (logPumpMessages && loglevel) logger.verbose('Msg# %s   %s: %s  \n', counter, ctrlString[data[packetFields.FROM]], str2, JSON.stringify(data));
                            decoded = true;
                    }

                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s: %s %s %s', counter, ctrlString[data[packetFields.FROM]], str1, str2, JSON.stringify(data));
                    decoded = true;
                } else if (data[6] == 2) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
                {

                    var str1;
                    var setAmount = data[8] * 256 + data[9];
                    if (logPumpMessages & loglevel)
                        logger.verbose('Msg# %s   %s --> %s: Set Speed (Intellitouch) to %s rpm: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], setAmount, JSON.stringify(data));
                } else {
                    str1 = '[' + data[6] + ',' + data[7] + ']';
                    str2 = ' rpm(?)'
                    logger.warn('Msg# %s  Pump data ?', str1, str2, counter, data)
                }
                decoded = true;
                break;
            }
            case 2: //??
            {
                logger.info('in pump area 2: ', data)
                decoded = true;
                break;
            }
            case 4: //Pump control panel on/off
            {

                if (data[pumpPacketFields.CMD] == 255) //Set pump control panel off (Main panel control only)
                {
                    pumpStatus.remotecontol = 'on';
                } else //0 = Set pump control panel on 
                {
                    pumpStatus.remotecontol = 'off';
                }



                if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                {
                    if (logPumpMessages & loglevel)
                        logger.verbose('Msg# %s   %s --> %s: Remote control (turn %s pump control panel): %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], pumpStatus.remotecontol, JSON.stringify(data));
                } else {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s: Remote control %s: %s', counter, ctrlString[data[packetFields.FROM]], pumpStatus.remotecontol, JSON.stringify(data));
                }
                decoded = true;
                break;
            }



            case 5: //Set pump mode
            {
//if (!responseBool){
                if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump 
                {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s --> %s: Set pump mode to _%s_: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], data[pumpPacketFields.CMD], JSON.stringify(data));
                    var pumpMode;
                    switch (data[7]) {
                        case 0:
                        {
                            pumpMode = "Filter";
                            break;
                        }
                        case 1:
                        {
                            pumpMode = "Manual";
                            break;
                        }
                        case 2:
                        {
                            pumpMode = "Speed 1";
                            break;
                        }
                        case 3:
                        {
                            pumpMode = "Speed 2";
                            break;
                        }
                        case 4:
                        {
                            pumpMode = "Speed 3";
                            break;
                        }
                        case 5:
                        {
                            pumpMode = "Speed 4";
                            break;
                        }
                        case 6:
                        {
                            pumpMode = "Feature 1";
                            break;
                        }
                        case 7:
                        {
                            pumpMode = "Unknown pump mode";
                            break;
                        }
                        case 8:
                        {
                            pumpMode = "Unknown pump mode";
                            break;
                        }
                        case 9:
                        {
                            pumpMode = "External Program 1";
                            break;
                        }
                        case 10:
                        {
                            pumpMode = "External Program 2";
                            break;
                        }
                        case 11:
                        {
                            pumpMode = "External Program 3";
                            break;
                        }
                        case 12:
                        {
                            pumpMode = "External Program 4";
                            break;
                        }

                        default:
                        {
                            pumpMode = "Oops, we missed something!"
                        }

                    }
                    logger.verbose('Pump mode: %s  %s', pumpMode, JSON.stringify(data))
                    pumpStatus.mode = pumpMode;
                    decoded = true;
                } else {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s confirming it is in mode %s: %s', counter, ctrlString[data[packetFields.FROM]], data[packetFields.CMD], JSON.stringify(data));
                    decoded = true;
                }
                break;
            }
            case 6: //Turn pump on/off
            {

                var power;
                if (data[6] == 10)
                    power = "on"
                else if (data[6] == 4)
                    power = "off";
                pumpStatus.power = power;
                //if (!responseBool) {
                if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s --> %s: Pump power to %s: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], power, JSON.stringify(data));
                    decoded = true;
                } else {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s: Pump power %s: %s', counter, ctrlString[data[packetFields.FROM]], power, JSON.stringify(data));
                    decoded = true;
                }
                break;
            }
            case 7: //cyclical status of controller requesting pump status
            {

                if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                {
                    if (logPumpMessages && loglevel)
                        logger.verbose('Msg# %s   %s --> %s: Provide status: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], JSON.stringify(data));
                    decoded = true;
                } else //response
                {


                    pumpStatus.time = data[pumpPacketFields.HOUR] + ':' + data[pumpPacketFields.MIN];
                    pumpStatus.run = data[pumpPacketFields.CMD] == 10 ? "On" : "Off" //10=On, 4=Off

                    pumpStatus.mode = data[pumpPacketFields.MODE]
                    pumpStatus.drivestate = data[pumpPacketFields.DRIVESTATE]
                    pumpStatus.watts = (data[pumpPacketFields.WATTSH] * 256) + data[pumpPacketFields.WATTSL]
                    pumpStatus.rpm = (data[pumpPacketFields.RPMH] * 256) + data[pumpPacketFields.RPML]
                    pumpStatus.ppc = data[pumpPacketFields.PPC]
                    pumpStatus.err = data[pumpPacketFields.ERR]
                    pumpStatus.timer = data[pumpPacketFields.TIMER]
                    //status.packet = data;

                    if (logPumpMessages)
                        logger.verbose('\n Msg# %s  %s Pump Status (from pump): ', counter, pumpStatus.name, JSON.stringify(pumpStatus), data, '\n');
                    //logger.error('1. what\'s different:', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))

                    currentPumpStatusPacket[pumpStatus.pump] = data;
                }
                decoded = true;
                break;
            }

            case 256: //03:17:39.122 INFO Msg# 5 is UNKNOWN: [16,96,255,1,8,2,29]  Possibly priming?
            {
                logger.warn('Msg# %s  Pump message?  Possibly priming?  %s', JSON.stringify(pumpStatus))
                decoded = true;
                break;
            }

            default:
            {
                if (logPumpMessages && loglevel)
                    logger.info('Msg# %s is UNKNOWN: %s', counter, JSON.stringify(data));
                decoded = true;
            }
        }

        if (updatePumpStatus) {
            if (logPumpMessages)
                logger.silly('\n Analyzing pump packets for pump ', pumpNum, ': \n currentPumpStatus: ', currentPumpStatus[pumpStatus.pump], '\n pumpStatus: ', JSON.stringify(pumpStatus), '\n equal?: ', JSON.stringify(currentPumpStatus[pumpNum]).equals(JSON.stringify(pumpStatus)))

            if ((currentPumpStatus[pumpNum].time != 'timenotset')) {

                if (JSON.stringify(currentPumpStatus[pumpNum]).equals(JSON.stringify(pumpStatus))) {

                    if (logPumpMessages)
                        logger.debug('Msg# %s   Pump %s status has not changed: %s  \n', counter, pumpStatus.pump, data)
                } else {



//  If the difference is less then (absolute) 5% and the watts is not the same as it previously was, then notify the user.
                    /*if (logPumpMessages & (Math.abs((status.watts-currentPumpStatus[status.pump].watts)/status.watts))<.05 & status.watts!=currentPumpStatus[status.pump].watts)
                     {
                     logger.info('Msg# %s   Pump %s WATTS CHANGED >5% changed: ', counter, status.pump, currentPumpStatus[status.pump].whatsDifferent(status));
                     }*/

                    if (logPumpMessages) {
                        if ((Math.abs((pumpStatus.watts - currentPumpStatus[pumpNum].watts) / pumpStatus.watts)) > .05) {
//logger.error('pumpnum.watts:', JSON.stringify(currentPumpStatus), currentPumpStatus[pumpNum].watts)
                            logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].watts, pumpStatus.watts)
                        }
//logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))
                        if (logPumpMessages)
                            logger.info('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].whatsDifferent(pumpStatus));
                    }

                    currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
                    emit();
                }


            } else //Not all pump packet info present yet
            {
                currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
            }
        }
    }
//End Pump Decode
//Start Chlorinator Decode
    else if (packetType == 'chlorinator') {

//put in logic (or logging here) for chlorinator discovered (upon 1st message?)

        if (!intellitouch) //If we have an intellitouch, we will get it from decoding the controller packets (25, 153 or 217)
        {
            var destination;
            if (data[chlorinatorPacketFields.DEST] == 80) {
                destination = 'Salt cell';
                from = 'Controller'
            } else {
                destination = 'Controller'
                from = 'Salt cell'
            }

//logger.error('currentChlorStatus  ', currentChlorinatorStatus)
//var chlorinatorStatus = clone(currentChlorinatorStatus);
//not sure why the above line failed...?  Implementing the following instead.
            var chlorinatorStatus = JSON.parse(JSON.stringify(currentChlorinatorStatus));
            if (currentChlorinatorStatus.name == '' && chlorinator)
                    //If we see a chlorinator status packet, then request the name.  Not sure when the name would be automatically sent over otherwise.
                    {
                        logger.verbose('Queueing messages to retrieve Salt Cell Name (AquaRite or OEM)')
                        //get salt cell name
                        queuePacket([16, 2, 80, 20, 0]);
                    }



            switch (data[chlorinatorPacketFields.ACTION]) {
                case 0: //Get status of Chlorinator
                {
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Please provide status: %s', counter, from, destination, data)
                    decoded = true;
                    break;
                }
                case 1: //Response to get status 
                {
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: I am here: %s', counter, from, destination, data)
                    decoded = true;
                    break;
                }
                case 3: //Response to version
                {
                    chlorinatorStatus.name = '';
                    chlorinatorStatus.version = data[4];
                    for (var i = 5; i <= 20; i++) {
                        chlorinatorStatus.name += String.fromCharCode(data[i]);
                    }
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Chlorinator version (%s) and name (%s): %s', counter, from, destination, chlorinatorStatus.version, chlorinatorStatus.name, data);
                    decoded = true;
                    break;
                }
                case 17: //Set Generate %
                {
                    chlorinatorStatus.outputPercent = data[4];
                    if (data[4] == 101) {
                        chlorinatorStatus.superChlorinate = 'On'
                    } else {
                        chlorinatorStatus.superChlorinate = 'Off'
                    }
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, chlorinatorStatus.superChlorinate == 'On' ? 'Super Chlorinate' : chlorinatorStatus.outputPercent, data);
                    decoded = true;
                    break;
                }
                case 18: //Response to 17 (set generate %)
                {
                    chlorinatorStatus.saltPPM = data[4] * 50;
                    switch (data[3]) {
                        case 0: //ok
                        {
                            chlorinatorStatus.status = "Ok";
                            break;
                        }
                        case 1:
                        {
                            chlorinatorStatus.status = "No flow";
                            break;
                        }
                        case 2:
                        {
                            chlorinatorStatus.status = "Low Salt";
                            break;
                        }
                        case 4:
                        {
                            chlorinatorStatus.status = "High Salt";
                            break;
                        }

                        case 144:
                        {
                            chlorinatorStatus.status = "Clean Salt Cell"
                            break;
                        }
                        default:
                        {
                            chlorinatorStatus.status = "Unknown - Status code: " + data[5];
                        }
                    }
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Current Salt level is %s PPM: %s', counter, from, destination, chlorinatorStatus.saltPPM, data);
                    decoded = true;
                    break;
                }
                case 20: //Get version 
                {
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: What is your version?: %s', counter, from, destination, data)
                    decoded = true;
                    break;
                }
                case 21: //Set Generate %, but value / 10??
                {
                    chlorinatorStatus.outputPercent = data[6] / 10;
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, chlorinatorStatus.outputPercent, data);
                    decoded = true;
                    break;
                }
                default:
                {
                    if (logChlorinator)
                        logger.verbose('Msg# %s   %s --> %s: Other chlorinator packet?: %s', counter, from, destination, data)
                    decoded = true;
                    break;
                }
            }

            if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
                if (logChlorinator)
                    logger.verbose('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
            } else {
                if (logChlorinator)
                    logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                currentChlorinatorStatus = chlorinatorStatus;
                emit();
            }
        } else //need to set decoded to true or it will show up as NOT DECODED in the log.  Essentially, we are dropping it if we have an intellitouch.
        {
            decoded = true;
        }

    }
//End Chlorinator Decode


//in case we get here and the first message has not already been set as the instruction command
    /*if (instruction == null || instruction == undefined) {
     instruction = data;
     }*/
    if (!decoded) {
        if (logConsoleNotDecoded) {

            logger.info('Msg# %s is NOT DECODED %s', counter, JSON.stringify(data));
        }
        ;
    } else {
        decoded = false
    }
    return true; //fix this; turn into callback(?)  What do we want to do with it?

}








//------------------START WRITE SECTION



function successfulAck(chatter, counter, messageAck) {
    if (logMessageDecoding)
        logger.silly('Msg#: %s in successfulAck  messageAck: %s counter: %s  packetWrittenAt: %s  queuePacketsArr.length: %s', counter, messageAck, counter, packetWrittenAt, queuePacketsArr.length)
    if (loglevel)
        logger.debug('Msg# %s  Msg received: %s \n                           Msg written: %s \n                           Match?: %s', counter, chatter, queuePacketsArr[0], messageAck)

    if (messageAck == true) {
        queuePacketsArr.shift();
    }

}

function queuePacket(message) {

    var checksum = 0;
    for (var j = 0; j < message.length; j++) {
        checksum += message[j]
    }


    var packet;
    if (message[0] == 16 && message[1] == ctrl.CHLORINATOR) {
        message.push(checksum)
        message.push(16)
        message.push(3)
        packet = message.slice();
        logger.silly('chrlorinator packet configured as: ', packet)
    } else {
//Process the packet to include the preamble and checksum

        message.push(checksum >> 8)
        message.push(checksum & 0xFF)
        packet = [255, 0, 255];
        Array.prototype.push.apply(packet, message);
    }






//-------Internally validate checksum

    if (message[0] == 16 && message[1] == ctrl.CHLORINATOR) //16,2 packet
    {
//example packet: 16,2,80,0,98,16,3
        var len = packet.length;
        //checksum is calculated by 256*2nd to last bit + last bit 
        var packetchecksum = packet[len - 3];
        var databytes = 0;
        // add up the data in the payload
        for (var i = 0; i < len - 3; i++) {
            databytes += packet[i];
        }
    } else //255,0,255,165 packet
    {
//example packet: 255,0,255,165,10,16,34,2,1,0,0,228
        var len = packet.length;
        //checksum is calculated by 256*2nd to last bit + last bit 
        var packetchecksum = (packet[len - 2] * 256) + packet[len - 1];
        var databytes = 0;
        // add up the data in the payload
        for (var i = 3; i < len - 2; i++) {
            databytes += packet[i];
        }
    }

    var validPacket = (packetchecksum == databytes);
    if (!validPacket) {
        logger.error('Asking to queue malformed packet: %s', packet)
    } else {
        queuePacketsArr.push(packet);
        logger.verbose('Just Queued Message to send: %s', packet)
    }


//-------End Internally validate checksum






    logger.silly('after push packet: %s  Message: %s', packet, message)

    //if length > 0 then we will loop through from isResponse
    if (queuePacketsArr.length == 1)
        writePacket();
}

var packetWrittenAt; //var to hold the message counter variable when the message was sent.  Used to keep track of how many messages passed without a successful counter.

function writePacket() {
    if (queuePacketsArr.length == 0) // need this because the correct packet might come back during the writePacketTimer.timeout.
    {
        logger.silly('Exiting write queue because last message was successfully received.')
    } else {
        logger.silly('Entering Write Queue')
        logger.silly('Queue = %s', JSON.stringify(queuePacketsArr))

        if (netConnect === 0) {
            sp.write(queuePacketsArr[0], function (err) {
                sp.drain(function () {
                    if (err) {
                        logger.error('Error writing packet: ' + err.message)
                    }
                    if (queuePacketsArr[0].equals(msgWriteCounter.msgWrote)) //msgWriteCounter will store the message that is being written.  If it doesn't match the 1st msg in the queue, then we have received the ACK for the message and can move on.  If it is the same message, then we are retrying the same message again so increment the counter.
                    {
                        msgWriteCounter.counter++;
                    } else {
                        msgWriteCounter.msgWrote = queuePacketsArr[0].slice(0);
                        msgWriteCounter.counter = 1;
                    }
                    if (loglevel)
                        logger.verbose('Sent Packet ' + queuePacketsArr[0] + ' Try: ' + msgWriteCounter.counter)
                    if (msgWriteCounter.counter >= 10) //if we get to 10 retries, then throw an Error.
                    {
                        logger.error('Error writing packet to serial bus.  Tried %s times to write %s', msgWriteCounter.counter, msgWriteCounter.msgWrote)
                        if (logType == "info" || logType == "warn" || logType == "error") {
                            logger.warn('Setting logging level to Debug')
                            logType = 'debug'
                            logger.transports.console.level = 'debug';
                        }
                        if (msgWriteCounter.counter >= 20) //if we get to 20 retries, then abort this packet.
                        {
                            msgWriteCounter.msgWrote = queuePacketsArr[0].slice(0);
                            msgWriteCounter.counter = 1;
                        }



                    }
                });
            })
        } else {
            sp.write(new Buffer(queuePacketsArr[0]), 'binary');
        }
        packetWrittenAt = msgCounter;
        if (queuePacketsArr.length > 0) {
            writePacketTimer.setTimeout(writePacket, '', '200m')
        }
    }



}


if (pumpOnly) {

    var pump1Timer = new NanoTimer();
    var pump1TimerDelay = new NanoTimer();
    var pumpInitialRequestConfigDelay = new NanoTimer();
    var pumpStatusTimer = new NanoTimer();
    if (numberOfPumps == 1) {
        pumpStatusTimer.setInterval(pumpStatusCheck, [1], '30s');
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], '2500m'); //must give a short delay to allow the port to open
    } else {
        var pump2Timer = new NanoTimer();
        var pump2TimerDelay = new NanoTimer();
        pumpStatusTimer.setInterval(pumpStatusCheck, [1, 2], '30s');
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1, 2], '2500m'); //must give a short delay to allow the port to open
    }

}

//Credit to this function http://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript  Changed it to be enumerable:false for SerialPort compatibility.
Object.defineProperty(Object.prototype, "equals", {
    enumerable: false,
    writable: true,
    value: function (object2) {
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
    value: function (object2) {
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




function getControllerConfiguration(dest, src) {

// Only drain serial port if directly connected - not for network connections.
    if (netConnect === 0)
        sp.drain();
    logger.info('Queueing messages to retrieve configuration from Intellitouch')
    logger.verbose('Queueing messages to retrieve Pool/Spa Heat Mode')

    //get Heat Mode
    queuePacket([165, preambleByte, 16, 34, 200, 1, 0]);
    logger.verbose('Queueing messages to retrieve Custom Names')

    var i = 0;
    //get custom names
    for (i; i < 10; i++) {
        queuePacket([165, preambleByte, 16, 34, 202, 1, i]);
    }


    logger.verbose('Queueing messages to retrieve Circuit Names')
    //get circuit names
    for (i = 1; i < 21; i++) {
        queuePacket([165, preambleByte, 16, 34, 203, 1, i]);
    }


    logger.verbose('Queueing messages to retrieve Schedules')
    //get schedules
    for (i = 1; i < 13; i++) {

        queuePacket([165, preambleByte, 16, 34, 209, 1, i]);
    }
}



function pumpStatusCheck(pump1, pump2) {
//request pump status
    var statusPacket = [165, 0, 96, 16, 7, 0];
    logger.verbose('Sending Request Pump 1 Status: %s', statusPacket)
    queuePacket([165, 0, 96, 16, 4, 1, 255]);
    queuePacket(statusPacket);
    //queuePacket([165, 0, 96, 16, 4, 1, 0]);

    if (pump2 == 2) {
        setTimeout(function () {
//request pump status
            var statusPacket = [165, 0, 97, 16, 7, 0];
            logger.verbose('Sending Request Pump 2 Status: %s', statusPacket)
            queuePacket([165, 0, 97, 16, 4, 1, 255]);
            queuePacket(statusPacket);
            //queuePacket([165, 0, 97, 16, 4, 1, 0]);
        }, 500)
    }
}


function pump1SafePumpMode() {
    currentPumpStatus[1].duration--;
    if (currentPumpStatus[1].duration > 0) {
//set pump to remote control
        var remoteControlPacket = [165, 0, 96, 16, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.  
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 96, 16, 1, 4, 3, 33, 0, currentPumpStatus[1].currentprogram * 8];
        logger.verbose('App -> Pump 1: Sending Run Program %s: %s (%s total minutes left)', currentPumpStatus[1].currentprogram, setProgramPacket, currentPumpStatus[1].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 96, 16, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        pump1TimerDelay.setTimeout(pump1SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 1 Program Finished.   Pump will shut down in ~10 seconds.')
        //Timer = 0, we are done.  Pump should turn off automatically
        pump1Timer.clearTimeout();
    }
}

function pump2SafePumpMode() {
    currentPumpStatus[2].duration--;
    if (currentPumpStatus[2].duration > 0) {
//set pump to remote control
        var remoteControlPacket = [165, 0, 97, 16, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.  
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 97, 34, 1, 4, 3, 33, 0, currentPumpStatus[2].currentprogram * 8];
        logger.verbose('App -> Pump 2: Sending Run Program %s: %s (%s total minutes left)', currentPumpStatus[2].currentprogram, setProgramPacket, currentPumpStatus[2].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 97, 16, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        //pad the timer with 10 seconds so we have a full minute per cycle
        pump2TimerDelay.setTimeout(pump2SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 2 Program Finished.  Pump will shut down in ~10 seconds.')
        //Timer = 0, we are done.  Pump should turn off automatically
        pump2Timer.clearTimeout();
    }
}

function pump1SafePumpModeDelay() {
    pump1Timer.setTimeout(pump1SafePumpMode, '', '50s')
}

function pump2SafePumpModeDelay() {
    pump2Timer.setTimeout(pump2SafePumpMode, '', '50s')
}

function emit() {


    if (ISYController) {
        ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger)
    }

    io.sockets.emit('circuit',
            currentCircuitArrObj
            )
    io.sockets.emit('config',
            currentStatus
            )
    io.sockets.emit('pump',
            currentPumpStatus
            );
    if (currentHeat != null) {
        io.sockets.emit('heat',
                currentHeat

                );
    }
    if (currentSchedule.length > 3) {
        io.sockets.emit('schedule',
                currentSchedule)
    }

    if (currentChlorinatorStatus.saltPPM != 'undefined')
        io.sockets.emit('chlorinator', currentChlorinatorStatus)

}


//<----  START SERVER CODE

// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
server.listen(port, function () {
    logger.verbose('Express Server listening at port %d', port);
});
// Routing
app.use(express.static(__dirname + '/public'));
app.get('/status', function (req, res) {
    res.send(currentStatus)
})

app.get('/circuit', function (req, res) {
    res.send(currentCircuitArrObj)
})

app.get('/schedule', function (req, res) {
    res.send(currentSchedule)
})

app.get('/pump', function (req, res) {
    res.send(currentPumpStatus)
})


app.get('/circuit/:circuit', function (req, res) {
    if (req.params.circuit > 0 && req.params.circuit <= 20) {
        res.send(currentCircuitArrObj[req.params.circuit])
    }
})

app.get('/circuit/:circuit/toggle', function (req, res) {

    var desiredStatus = currentCircuitArrObj[req.params.circuit].status == "on" ? 0 : 1;
    var toggleCircuitPacket = [165, preambleByte, 16, 34, 134, 2, Number(req.params.circuit), desiredStatus];
    queuePacket(toggleCircuitPacket);
    var response = 'User Request to toggle ' + currentCircuitArrObj[req.params.circuit].name + ' to ' + (desiredStatus == 0 ? 'off' : 'on') + ' received';
    console.log(response)
    res.send(response)
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

app.get('/spaheat/setpoint/:spasetpoint', function (req, res) {
    //  [16,34,136,4,POOL HEAT Temp,SPA HEAT Temp,Heat Mode,0,2,56]

    var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, parseInt(req.params.temp), updateHeatMode, 0]
    logger.info('User request to update spa set point to %s', req.params.spasetpoint, updateHeat)
    queuePacket(updateHeat);
    var response = 'Request to set spa heat setpoint to ' + req.params.spasetpoint + ' sent to controller'
    res.send(response)

})


app.get('/spaheat/mode/:spaheatmode', function (req, res) {
    var updateHeatMode = (parseInt(req.params.spaheatmode) << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    logger.info('User request to update spa heat mode to %s', req.params.spaheatmode, updateHeat)
    var response = 'Request to set spa heat mode to ' + heatModeStr[req.params.spaheatmode] + ' sent to controller'
    res.send(response)

})

app.get('/poolheat/setpoint/:poolsetpoint', function (req, res) {
    var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, 34, 136, 4, parseInt(req.params.poolsetpoint), currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    logger.info('User request to update pool set point to %s', req.params.poolsetpoint, updateHeat)
    var response = 'Request to set pool heat setpoint to ' + req.params.poolsetpoint + ' sent to controller'
    res.send(response)
})

app.get('/poolheat/mode/:poolheatmode', function (req, res) {
    var updateHeatMode = (currentHeat.spaHeatMode << 2) | req.params.poolheatmode;
    var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    logger.info('User request to update pool set point to %s', req.params.poolheatmode, updateHeat)
    var response = 'Request to set pool heat mode to ' + heatModeStr[req.params.poolheatmode] + ' sent to controller'
    res.send(response)
})

app.get('/sendthispacket/:packet', function (req, res) {


    logger.info('User request (REST API) to send packet: %s', req.params.packet);
    var packet;
    packet = req.params.packet.split('-');
    for (i = 0; i < packet.length; i++) {
        packet[i] = parseInt(packet[i])
    }
    if (packet[0] == 16 && packet[1] == ctrl.CHLORINATOR) {
        logger.silly('packet (chlorinator) detected: ', packet)
    } else {
        if (packet[0] == 96 || packet[0] == 97 || packet[1] == 96 || packet[1] == 97)
                //If a message to the controller, use the preamble that we have recorded
                {
                    var preamblePacket = [165, preambleByte]; //255,0,255 will be added later
                } else
                //if a message to the pumps, use 165,0
                {
                    preamble = [165, 0]
                }
        Array.prototype.push.apply(preamblePacket, packet);
        packet = preamblePacket.slice(0);
        logger.silly('packet (pool) detected: ', packet)
    }
    queuePacket(packet);
    var response = 'Request to send packet ' + packet + ' sent.'
    res.send(response)
})


io.on('connection', function (socket, error) {

    socket.on('error', function () {
        logger.error('Error with socket: ', error)
    })


    // when the client emits 'toggleEquipment', this listens and executes
    socket.on('toggleCircuit', function (equipment) {

        var desiredStatus = currentCircuitArrObj[equipment].status == "on" ? 0 : 1;
        var toggleCircuitPacket = [165, preambleByte, 16, 34, 134, 2, equipment, desiredStatus];
        queuePacket(toggleCircuitPacket);
        logger.info('User request to toggle %s to %s', currentCircuitArrObj[equipment].name, desiredStatus == 0 ? "off" : "on")


    });
    socket.on('search', function (mode, src, dest, action) {
        //check if we don't have all valid values, and then emit a message to correct.

        logger.debug('from socket.on search: mode: %s  src %s  dest %s  action %s', mode, src, dest, action);
        searchMode = mode;
        searchSrc = src;
        searchDest = dest;
        searchAction = action;
    })

    socket.on('sendPacket', function (incomingPacket) {


        logger.info('User request (send_request.html) to send packet: %s', incomingPacket);
        var packet;
        packet = incomingPacket.split(',');
        for (i = 0; i < packet.length; i++) {
            packet[i] = parseInt(packet[i])
        }
        if (packet[0] == 16 && packet[1] == ctrl.CHLORINATOR) {
            //logger.debug('packet (chlorinator) now: ', packet)
        } else {
            if (packet[0] == 96 || packet[0] == 97 || packet[1] == 96 || packet[1] == 97)
                    //If a message to the controller, use the preamble that we have recorded
                    {
                        var preamblePacket = [165, preambleByte]; //255,0,255 will be added later
                    } else
                    //if a message to the pumps, use 165,0
                    {
                        preamble = [165, 0]
                    }
            Array.prototype.push.apply(preamblePacket, packet);
            packet = preamblePacket.slice(0);
            //logger.debug('packet (pool) now: ', packet)
        }
        queuePacket(packet);
        io.sockets.emit('sendPacketResults', 'Sent packet: ' + JSON.stringify(packet))
    })

    socket.on('spasetpoint', function (spasetpoint) {
        var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
        var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, parseInt(spasetpoint), updateHeatMode, 0]
        logger.info('User request to update spa set point to %s', spasetpoint, updateHeat)
        queuePacket(updateHeat);
        //var response = 'Request to set spa heat setpoint to ' + req.params.temp + ' sent to controller'
        //res.send(response)
    })

    socket.on('spaheatmode', function (spaheatmode) {
        var updateHeatMode = (parseInt(spaheatmode) << 2) | currentHeat.poolHeatMode;
        var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        logger.info('User request to update spa heat mode to %s', spaheatmode)

    })

    socket.on('poolsetpoint', function (poolsetpoint) {
        var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
        var updateHeat = [165, preambleByte, 16, 34, 136, 4, parseInt(poolsetpoint), currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        logger.info('User request to update pool set point to %s', poolsetpoint)
        //var response = 'Request to set pool heat setpoint to ' + req.params.temp + ' sent to controller'

    })

    socket.on('poolheatmode', function (poolheatmode) {
        var updateHeatMode = (currentHeat.spaHeatMode << 2) | poolheatmode;
        var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        logger.info('User request to update pool heat mode to %s', poolheatmode)
    })

    socket.on('setHeatSetPoint', function (equip, change) {

        var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
        if (equip == "pool") {
            var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint + change, currentHeat.spaSetPoint, updateHeatMode, 0]
            logger.info('User request to update %s set point to %s', equip, currentHeat.poolSetPoint + change)
        } else {
            var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint + parseInt(change), updateHeatMode, 0]
            logger.info('User request to update %s set point to %s', equip, currentHeat.spaSetPoint + change)
        }
        queuePacket(updateHeat);
    })

    socket.on('setHeatMode', function (equip, change) {
        if (equip == "pool") {
            var updateHeatMode = (currentHeat.spaHeatMode << 2) | change;
            var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]

        } else {
            var updateHeatMode = (change << 2) | currentHeat.poolHeatMode;
            var updateHeat = [165, preambleByte, 16, 34, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
        }
        queuePacket(updateHeat);
        logger.info('User request to update %s heat mode to %s', equip, heatModeStr[change])
    })


    socket.on('pumpCommand', function (equip, program, value, duration) {

        logger.silly('Socket.IO pumpCommand variables - equip %s, program %s, value %s, duration %s', equip, program, value, duration)
        equip = parseInt(equip);
        value = parseInt(value);
        var pump;
        if (equip == 1) {
            pump = 96
        } else {
            pump = 97
        }

        var setPrg;
        var runPrg;
        var speed;
        console.log('\n\n')
        logger.verbose('Sending the following pump commands to pump %s:', equip)
        if (program == 'off' || program == 'on') {
            logger.info('User request to set pump %s to %s', equip, program);
            if (program == 'off') {
                setPrg = [6, 1, 4];
                if (equip == 1) {
                    currentPumpStatus[1].duration = 0;
                    pump1Timer.clearTimeout();
                    pump1TimerDelay.clearTimeout();
                } else {
                    currentPumpStatus[2].duration = 0;
                    pump2Timer.clearTimeout();
                    pump2TimerDelay.clearTimeout();
                }
            } else // pump set to on
            {
                setPrg = [6, 1, 10];
            }
            currentPumpStatus[equip].power = program;
        } else {
            program = parseInt(program);
            logger.verbose('User request to set pump %s to Ext. Program %s @ %s RPM', equip, program, value);
            //set speed
            setPrg = [1, 4, 3]
            setPrg.push(38 + program);
            setPrg.push(Math.floor(value / 256))
            setPrg.push(value % 256);
            //run program
            runPrg = [1, 4, 3, 33, 0]
            runPrg.push(8 * program)
            var str = 'program' + program + 'rpm';
            currentPumpStatus[equip][str] = value;
            currentPumpStatus[equip].currentprogram = program;
        }


        //set pump to remote control
        var remoteControlPacket = [165, 0, pump, 16, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //set program packet
        if (value < 450 || value > 3450) {
            logger.warn('Speed provided (%s) is outside of tolerances.  Program being run with speed that is stored in pump.', value)
        } else
        if (isNaN(value) || value == null) {
            logger.warn('Skipping Set Program Speed because it was not included.')
        } else {
            var setProgramPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(setProgramPacket, setPrg);
            //logger.info(setProgramPacket, setPrg)
            logger.verbose('Sending Set Program %s to %s RPM: %s', program, value, setProgramPacket);
            queuePacket(setProgramPacket);
        }

        if (program != 'off' && program != 'on') {
            //run program packet
            var runProgramPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(runProgramPacket, runPrg);
            logger.verbose('Sending Run Program %s: %s', program, runProgramPacket)
            queuePacket(runProgramPacket);
            //turn on pump
            var turnPumpOnPacket = [165, 0, pump, 16, 6, 1, 10];
            logger.verbose('Sending Turn pump on: %s', turnPumpOnPacket)
            queuePacket(turnPumpOnPacket);
            if (safePumpOperation) {
                //set a timer for 1 minute
                var setTimerPacket = [165, 0, pump, 16, 1, 4, 3, 43, 0, 1];
                logger.info('Sending Set a 1 minute timer (safe mode enabled, timer will reset every minute for a total of %s minutes): %s', duration, setTimerPacket);
                queuePacket(setTimerPacket);
                //fix until the default duration actually is set to 1
                if (duration < 1 || duration == null) {
                    duration = 1;
                }
                if (equip == 1) {
                    currentPumpStatus[1].duration = duration;
                    //run the timer update 50s into the 1st minute
                    pump1Timer.setTimeout(pump1SafePumpMode, '', '50s')
                } else {
                    currentPumpStatus[2].duration = duration;
                    //run the timer update 50s into the 1st minute
                    pump2Timer.setTimeout(pump2SafePumpMode, '', '50s')
                }
            } else {
                //set a timer for [duration] variable
                var setTimerPacket = [165, 0, pump, 16, 1, 4, 3, 43, 0, duration];
                logger.verbose('Sending Set a %s minute (safe mode disabled) timer: %s', duration, setTimerPacket);
                queuePacket(setTimerPacket);
            }


        } else {
            //turn pump on/off
            var pumpPowerPacket = [165, 0, pump, 16];
            Array.prototype.push.apply(pumpPowerPacket, setPrg)
            logger.verbose('Sending Turn pump %s: %s', program, pumpPowerPacket);
            queuePacket(pumpPowerPacket);
        }
        //set pump to local control
        var localControlPacket = [165, 0, pump, 16, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        //request pump status
        var statusPacket = [165, 0, pump, 16, 7, 0];
        logger.verbose('Sending Request Pump Status: %s', statusPacket)
        queuePacket(statusPacket);
        logger.info('End of Sending Pump Packet \n \n')

    })






    io.sockets.emit('circuit',
            currentCircuitArrObj
            );
    io.sockets.emit('config',
            currentStatus
            );
    io.sockets.emit('pump',
            currentPumpStatus
            );
    if (currentHeat != null) {
        io.sockets.emit('heat',
                currentHeat
                );
    }
    if (currentSchedule.length > 3) {
        io.sockets.emit('schedule',
                currentSchedule)
    }

    io.sockets.emit('searchResults',
            'Input values and click start.  All values optional.  Please refer to https://github.com/tagyoureit/nodejs-Pentair/wiki/Broadcast for values.');
})
        ;
//---->  END SERVER CODE