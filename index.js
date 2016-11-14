(function() {
    'use strict';
    // this function is strict...
}());
console.log('\033[2J'); //clear the console

var dateFormat = require('dateformat');
var Dequeue = require('dequeue')

var version = '1.0.3'

const events = require('events')

var bufferArr = []; //variable to process buffer.  interimBufferArr will be copied here when ready to process
var interimBufferArr = []; //variable to hold all serialport.open data; incomind data is appended to this with each read
var currentStatus; // persistent object to hold pool equipment status.
var currentStatusBytes; //persistent variable to hold full bytes of pool status
var currentWhatsDifferent; //persistent variable to hold what's different
var currentCircuitArrObj; //persistent variable to hold circuit info
var currentPumpStatus; //persistent variable to hold pump information
var currentHeat; //persistent variable to heald heat set points
var currentSchedule = ["blank"]; //schedules
var queuePacketsArr = []; //array to hold messages to send
var writeQueueActive = false //flag to tell us if we are currently processing the write queue or note

var processingBuffer = false; //flag to tell us if we are processing the buffer currently
var msgCounter = 0; //log counter to help match messages with buffer in log
var msgWriteCounter = {
    counter: 0, //how many times the packet has been written to the bus
    packetWrittenAt: 0, //var to hold the message counter variable when the message was sent.  Used to keep track of how many messages passed without a successful counter.
    msgWrote: []
}; //How many times are we writing the same packet to the bus?
var skipPacketWrittenCount = 0 //keep track of how many times we skipped writing the packet

var needConfiguration = 1; //variable to let the program know we need the configuration from the Intellitouch
var checkForChange = [0, 0, 0]; //[custom names, circuit names, schedules] 0 if we have not logged the initial array; 1 if we will only log changes
var preambleByte; //variable to hold the 2nd preamble byte... it used to by 10 for me.  Now it is 16.  Very strange.  So here is a variable to find it.
var countChecksumMismatch = 0; //variable to count checksum mismatches
var desiredChlorinatorOutput = 0; //variable for chlorinator output % (in pumpOnly mode; controllers take care of this otherwise).  0 = off.  1-100=% output; 101=superChlorinate

//search placeholders for sockets.io Search
var searchMode = 'stop'
var searchSrc = '';
var searchDest = '';
var searchAction = '';
var customNameArr = [];

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
    0: 'NOT USED',
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

const strPumpActions = {
    1: 'Pump set speed/program or run program',
    4: 'Pump control panel',
    5: 'Pump speed',
    6: 'Pump power',
    7: 'Pump Status'
}

const strChlorinatorActions = {
    0: 'Get Status',
    1: 'Response to Get Status',
    3: 'Response to Get Version',
    17: 'Set Salt %',
    18: 'Response to Set Salt % & Salt PPM',
    20: 'Get Version',
    21: 'Set Salt Generate % / 10'
}

const strControllerActions = {
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
    194: 'Get Status',
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
    34: 'Wireless',
    96: 'Pump1',
    97: 'Pump2',
    appAddress: 'nodejs-Pentair Server'
}

//-------  EQUIPMENT SETUP -----------

//ONE and only 1 of the following should be set to 1.
var intellicom; //set this to 1 if you have the IntelliComII, otherwise 0.
var intellitouch; //set this to 1 if you have the IntelliTouch, otherwise 0.
var pumpOnly; //set this to 1 if you ONLY have pump(s), otherwise 0.

//1 or 0
var ISYController; //1 if you have an ISY, otherwise 0
var chlorinator; //set this to 1 if you have a chlorinator, otherwise 0.

//only relevant if pumpOnly=1
var numberOfPumps; //this is only used with pumpOnly=1.  It will query 1 (or 2) pumps every 30 seconds for their status
var appAddress; //address the app should emulate/use on the serial bus
//-------  END EQUIPMENT SETUP -----------

//-------  MISC SETUP -----------
// Setup for Miscellaneous items
var netConnect; //set this to 1 to use a remote (net) connection, 0 for direct serial connection;
var netPort; //port for the SOCAT communications
var netHost; //host for the SOCAT communications

//-------  END MISC SETUP -----------


//-------  NETWORK SETUP -----------
// Setup for Network Connection (socat or nc)
var expressDir; //set this to the default directory for the web interface (either "/bootstrap" or "/public")
var expressPort; //port for the Express App Server
var expressTransport; //http, https, or both
var expressAuth; // Authentication (username, password) to access web interface (0=no auth, 1=auth)
var expressAuthFile; // Authentication file (created using htpasswd, stores username and password)
//-------  END NETWORK SETUP -----------

//-------  LOG SETUP -----------
//Change the following log message levels as needed
var logType; // one of { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
var logPumpMessages; //variable if we want to output pump messages or not
var logDuplicateMessages; //variable if we want to output duplicate broadcast messages
var logConsoleNotDecoded; //variable to hide any unknown messages
var logConfigMessages; //variable to show/hide configuration messages
var logMessageDecoding; //variable to show messages regarding the buffer, checksum calculation, etc.
var logChlorinator; //variable to show messages from the chlorinator
var logPacketWrites; //variable to log queueing/writing activities
var logPumpTimers; //variable to output timer debug messages for the pumps
//-------  END EQUIPMENT SETUP -----------

var configurationFile = 'config.json';
const fs = require('fs');
var configFile = JSON.parse(fs.readFileSync(configurationFile));
intellicom = configFile.Equipment.intellicom;
intellitouch = configFile.Equipment.intellitouch;
pumpOnly = configFile.Equipment.pumpOnly;
ISYController = configFile.Equipment.ISYController;
chlorinator = configFile.Equipment.chlorinator;
numberOfPumps = configFile.Equipment.numberOfPumps;
appAddress = configFile.Equipment.appAddress;
expressDir = configFile.Misc.expressDir;
expressPort = configFile.Misc.expressPort;
expressTransport = configFile.Misc.expressTransport;
expressAuth = configFile.Misc.expressAuth;
expressAuthFile = configFile.Misc.expressAuthFile;
netConnect = configFile.Network.netConnect;
netPort = configFile.Network.netPort;
netHost = configFile.Network.netHost;
logType = configFile.Log.logType;
logPumpMessages = configFile.Log.logPumpMessages;
logDuplicateMessages = configFile.Log.logDuplicateMessages;
logConsoleNotDecoded = configFile.Log.logConsoleNotDecoded;
logConfigMessages = configFile.Log.logConfigMessages;
logMessageDecoding = configFile.Log.logMessageDecoding;
logChlorinator = configFile.Log.logChlorinator;
logPacketWrites = configFile.Log.logPacketWrites;
logPumpTimers = configFile.Log.logPumpTimers;
logApi = configFile.Log.logApi;
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

// Setup express server
var express = require('express');
var app = express();
// And Enable Authentication (if configured)
if (expressAuth === 1) {
    var auth = require('http-auth');
    var basic = auth.basic({
        file: __dirname + expressAuthFile
    });
    app.use(auth.connect(basic));
}
// Create Server (and set https options if https is selected)
if (expressTransport === 'https') {
    var opt_https = {
        key: fs.readFileSync(__dirname + '/data/server.key'),
        cert: fs.readFileSync(__dirname + '/data/server.crt'),
        requestCert: false,
        rejectUnauthorized: false
    };
    var server = require('https').createServer(opt_https, app);
} else
    var server = require('http').createServer(app);
// Set up socket.io
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
server.listen(port, function() {
    logger.verbose('Express Server listening at port %d', port);
});



var winston = require('winston');
var winsocketio = require('./lib/winston-socketio.js').SocketIO


var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            timestamp: function() {
                return dateFormat(Date.now(), "HH:MM:ss.l");
            },
            formatter: function(options) {
                // Return string will be passed to logger.
                return options.timestamp() + ' ' + winston.config.colorize(options.level, options.level.toUpperCase()) + ' ' + (undefined !== options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
            },
            colorize: true,
            level: logType,
            stderrLevels: []
        })
    ]
});
var winsocketOptions = {
    server: server,
    level: 'info',
    SocketIO: io,

    customFormatter: function(level, message, meta) {
        // Return string will be passed to logger.
        return dateFormat(Date.now(), "HH:MM:ss.l") + ' ' + level.toUpperCase() + ' ' + (undefined !== message ? message.split('\n').join('<br \>') : '') +
            (meta && Object.keys(meta).length ? '\n\t' + JSON.stringify(meta, null, '<br \>') : '');
    }
}

logger.add(winsocketio, winsocketOptions)


var decodeHelper = require('./lib/decode.js');

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
    sp.connect(netPort, netHost, function() {
        logger.info('Network connected to: ' + netHost + ':' + netPort);
    });
}

const loggerEmitter = new events.EventEmitter();
//loggerEmitter.on('debug', )

if (ISYController) {
    var ISYHelper = require('./lib/ISY.js')
    var ISYConfig; //object to hold ISY variables.
    ISYConfig = JSON.parse(JSON.stringify(configFile.ISY))
}

var Circuit = require('./lib/circuit.js')
var currentCircuitArrObj = (new Circuit()).circuitArrObj()

var Heat = require('./lib/heat.js')
var currentHeat = new Heat();

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
var currentPumpStatusPacket = ['blank', [],
    []
]; // variable to hold the status packets of the pumps

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
settingsStr += '\n var ISYController = ' + ISYController;
settingsStr += '\n var appAddress = ' + appAddress;
settingsStr += '\n //-------  END EQUIPMENT SETUP -----------';
settingsStr += '\n ';
settingsStr += '\n //-------  MISC SETUP -----------';
settingsStr += '\n var expressDir = ' + expressDir;
settingsStr += '\n var expressPort = ' + expressPort;
settingsStr += '\n var expressTransport = ' + expressTransport;
settingsStr += '\n var expressAuth = ' + expressAuth;
settingsStr += '\n var expressAuthFile = ' + expressAuthFile;
settingsStr += '\n //-------  END MISC SETUP -----------';
settingsStr += '\n ';
settingsStr += '\n //-------  NETWORK SETUP -----------';
settingsStr += '\n // Setup for Network Connection (socat or nc)';
settingsStr += '\n var netConnect = ' + netConnect;
settingsStr += '\n var netHost = ' + netHost;
settingsStr += '\n var netPort = ' + netPort;
settingsStr += '\n //-------  END NETWORK SETUP -----------';
settingsStr += '\n ';
settingsStr += '\n //-------  LOG SETUP -----------';
settingsStr += '\n var logType = ' + logType;
settingsStr += '\n var logPumpMessages = ' + logPumpMessages;
settingsStr += '\n var logDuplicateMessages = ' + logDuplicateMessages;
settingsStr += '\n var logConsoleNotDecoded = ' + logConsoleNotDecoded;
settingsStr += '\n var logConfigMessages = ' + logConfigMessages;
settingsStr += '\n var logMessageDecoding = ' + logMessageDecoding;
settingsStr += '\n var logChlorinator = ' + logChlorinator;
settingsStr += '\n var logPacketWrites = ' + logPacketWrites;
settingsStr += '\n var logPumpTimers = ' + logPumpTimers;
settingsStr += '\n var logApi = ' + logApi;
settingsStr += '\n //-------  END LOG SETUP -----------\n\n';
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


sp.on('error', function(err) {
    logger.error('Error opening port: ', err.message)
    process.exit(1)
})


sp.on('open', function() {
    logger.verbose('Serial Port opened');
})
var interimBuffer = [];
var bufferToProcess = [];
var bufferArrayOfArrays = new Dequeue();
var testbufferArrayOfArrays = []
sp.on('data', function(data) {
    //Push the incoming array onto the end of the dequeue array
    bufferArrayOfArrays.push(Array.prototype.slice.call(data));

    //console.log('Input: ', JSON.stringify(data.toJSON().data) + '\n');
    //testbufferArrayOfArrays.push(Array.prototype.slice.call(data));

    if (!processingBuffer) {
        //console.log('Arrays being passed for processing: \n[[%s]]\n\n', testbufferArrayOfArrays.join('],\n['))
        iterateOverArrayOfArrays()
            //testbufferArrayOfArrays=[]
    }
});

//TEST function:  This function should simply output whatever comes into the serialport.  Comment out the one above and use this one if you want to test what serialport logs.
/*
var bufferArrayOfArrays = [];
sp.on('data', function (data) {
    console.log('Input: ', JSON.stringify(data.toJSON().data) + '\n');
    bufferArrayOfArrays.push(Array.prototype.slice.call(data));
    console.log('Array: \n[[%s]]\n\n', bufferArrayOfArrays.join('],\n['))

});*/

function pushBufferToArray() {
    if (bufferArrayOfArrays.length > 0) {
        if (bufferToProcess.length == 0) {
            bufferToProcess = bufferArrayOfArrays.shift() //move the first element from Array of Arrays to bufferToProcess
            if (logMessageDecoding)
                logger.silly('pBTA: bufferToProcess length=0;  bufferArrayOfArrays>0.  Shifting AoA to BTP')
        } else {
            bufferToProcess = bufferToProcess.concat(bufferArrayOfArrays.shift())
            if (logMessageDecoding)
                logger.silly('pBTA: bufferToProcess length>0;  bufferArrayOfArrays>0.  CONCAT AoA to BTP')
        }
    }
}

function iterateOverArrayOfArrays() {

    var chatter = []; //a {potential} message we have found on the bus
    var packetType;
    var preambleStd = [255, 165];
    var preambleChlorinator = [16, 2]
    var breakLoop = false

    processingBuffer = true; //we don't want this function to run asynchronously beyond this point or it will start to process the same array multiple times

    pushBufferToArray()

    if (logMessageDecoding) {
        if (logType === 'debug')
            console.log('\n\n')
        logger.debug('iOAOA: Packet being analyzed: %s', bufferToProcess);

        if (bufferArrayOfArrays.length === 1) {
            logger.silly('iOAOA: Next two packets in buffer: \n %s ', bufferArrayOfArrays.first())
        } else if (bufferArrayOfArrays.length > 1) {
            var tempArr = bufferArrayOfArrays.shift()
            logger.silly('iOAOA: Next two packets in buffer: \n %s \n %s', tempArr, bufferArrayOfArrays.first())
            bufferArrayOfArrays.unshift(tempArr)
        } else {
            logger.silly('iOAOA: No more packets in bufferArrayOfArrays')

        }


    }


    while (bufferToProcess.length > 0 && !breakLoop) {
        if (preambleStd[0] == bufferToProcess[0] && preambleStd[1] == bufferToProcess[1]) //match on pump or controller packet
        {

            var chatterlen = bufferToProcess[6] + 6 + 2; //chatterlen is length of following message not including checksum (need to add 6 for start of chatter, 2 for checksum)
            //   0,   1,      2,      3,    4, 5,        6
            //(255,165,preambleByte,Dest,Src,cmd,chatterlen) and 2 for checksum)

            if (chatterlen >= 50) //we should never get a packet greater than or equal to 50.  So if the chatterlen is greater than that let's shift the array and retry
            {
                if (logMessageDecoding) logger.debug('iOAOA: Will shift first element out of bufferToProcess because it appears there is an invalid length packet (>=50) Lengeth: %s  Packet: %s', bufferToProcess[6], bufferToProcess)
                bufferToProcess.shift() //remove the first byte so we look for the next [255,165] in the array.

            } else if ((bufferToProcess.length - chatterlen) <= 0) {
                if (logMessageDecoding)
                    logger.silly('Msg#  n/a   Incomplete message in bufferToProcess. %s', bufferToProcess)
                if (bufferArrayOfArrays.length > 0) {
                    pushBufferToArray()
                } else {
                    if (logMessageDecoding) logger.silly('iOAOA: Setting breakLoop=true because (bufferToProcess.length(%s) - chatterlen) <= 0(%s): %s', bufferToProcess.length, chatterlen == undefined || ((bufferToProcess.length - chatterlen), chatterlen == undefined || (bufferToProcess.length - chatterlen) <= 0))
                    breakLoop = true //do nothing, but exit until we get a second buffer to concat
                }
            } else
            if (chatterlen == undefined || isNaN(chatterlen)) {
                if (logMessageDecoding)
                    logger.silly('Msg#  n/a   chatterlen NaN: %s.', bufferToProcess)
                if (bufferArrayOfArrays.length > 0) {
                    pushBufferToArray()
                } else {
                    if (logMessageDecoding) logger.silly('iOAOA: Setting breakLoop=true because isNan(chatterlen) is %s.  bufferToProcess:', chatterlen, bufferToProcess)
                    breakLoop = true //do nothing, but exit until we get a second buffer to concat
                }
            } else {
                if (logMessageDecoding)
                    logger.silly('iOAOA: Think we have a packet. bufferToProcess: %s  chatterlen: %s', bufferToProcess, chatterlen)
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
                    logger.debug('Msg# %s  Found incoming %s packet: %s', msgCounter, packetType, chatter)

                processChecksum(chatter, msgCounter, packetType);
            }
            //breakLoop = true;
        } else if (preambleChlorinator[0] == bufferToProcess[0] && preambleChlorinator[1] == bufferToProcess[1] &&
            (bufferToProcess[2] == 0 || bufferToProcess[2] == 80)) {
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
                //check to make sure we aren't reaching the end of the buffer.
                if ((i + 1) === bufferToProcess.length) {
                    //if we get here, just silently abort
                    breakLoop = true
                    if (logMessageDecoding) logger.silly('Msg# %s  Aborting chlorinator packet because we reached the end of the buffer.', msgCounter, bufferToProcess)
                } else {
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

            }

        } else { //not a preamble for chlorinator or pump/controller packet.  Eject the first byte.
            bufferToProcess.shift();
        }

    }

    logger.silly('iOAOA: Criteria for recursing/exting.  \nbreakLoop: %s\nbufferArrayOfArrays.length(%s) === 0 && bufferToProcess.length(%s) > 0: %s', breakLoop, bufferArrayOfArrays.length, bufferToProcess.length, bufferArrayOfArrays.length === 0 && bufferToProcess.length > 0)
    if (breakLoop) {
        processingBuffer = false;
        if (logMessageDecoding)
            logger.silly('iOAOA: Exiting because breakLoop: %s', breakLoop)
    } else
    if (bufferToProcess.length > 0) {
        if (logMessageDecoding)
            logger.silly('iOAOA: Recursing back into iOAOA because no bufferToProcess.length > 0: %s', bufferToProcess.length > 0)
        iterateOverArrayOfArrays()
    } else
    if (bufferArrayOfArrays.length === 0) {
        processingBuffer = false;
        if (logMessageDecoding)
            logger.silly('iOAOA: Exiting out of loop because no further incoming buffers to append. bufferArrayOfArrays.length === 0 (%s) ', bufferArrayOfArrays.length === 0)

    } else {
        if (logMessageDecoding)
            logger.silly('iOAOA: Recursing back into iOAOA because no other conditions met.')
        iterateOverArrayOfArrays()
    }
}



function processChecksum(chatter, counter, packetType) {

    //call new function to process message; if it isn't valid, we noted above so just don't continue
    //TODO: countChecksumMismatch is not incrementing properly
    if (decodeHelper.checksum(chatter, counter, packetType, logMessageDecoding, logger, countChecksumMismatch)) {
        if (queuePacketsArr.length > 0) {
            if (decodeHelper.isResponse(chatter, counter, packetType, logger, logMessageDecoding, packetFields, queuePacketsArr)) {

                successfulAck(chatter, counter, 1);
            } else {
                successfulAck(chatter, counter, 0);
            }
        }
        decode(chatter, counter, packetType)
    } else {
        //TODO: we shouldn't need to increment the countChecksumMismatch.  Why is it not being increased with decodeHelper.checksum above?
        countChecksumMismatch++

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

                //NOTE:  Why do we need to send the DEST and FROM packets?
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
                    //quick gut test to see if we have a duplicate packet
                    if (JSON.stringify(data) !== JSON.stringify(currentStatusBytes)) {
                        //--------Following code (re)-assigns all the incoming data to the status object
                        var status = {};

                        //if the currentStatus is present, copy it.
                        if (currentStatus != undefined) {
                            status = JSON.parse(JSON.stringify(currentStatus))
                        }

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

                        var circuitArrObj = {}
                        if (currentCircuitArrObj != undefined) {
                            circuitArrObj = JSON.parse(JSON.stringify(currentCircuitArrObj))
                        }
                        //assign circuit status to circuitArrObj
                        for (var i = 0; i < 3; i++) {
                            for (var j = 0; j < 8; j++) {
                                if ((j + (i * 8) + 1) <= 20) {
                                    equip = data[controllerStatusPacketFields.EQUIP1 + i]
                                    if (logMessageDecoding)
                                        logger.silly('Decode Case 2:   i: %s  j:  %s  j + (i * 8) + 1: %s   equip: %s', i, j, j + (i * 8) + 1, equip)
                                    circuitArrObj[j + (i * 8) + 1].status = (equip & (1 << (j))) >> j ? "on" : "off"
                                }
                            }
                        }
                        //-----------------Finished assigning new data to temporary object


                        //For the first time we have a 2 packete
                        if (currentStatusBytes == null) {
                            logger.info('Msg# %s   Discovered initial system settings: ', counter, status)
                            logger.verbose('\n ', decodeHelper.printStatus(data));

                            //NOTE:  Commented this out because we only want to display the circuit discovery info when we have both the circuit names and status
                            /*var circuitStr = '';
                            //logger.info('Msg# %s  Initial circuits status discovered', counter)
                            for (var i = 1; i <= 20; i++) {
                                if (circuitArrObj[i].name != undefined) {
                                    circuitStr += circuitArrObj[i].name + " status: "
                                    circuitStr += circuitArrObj[i].status + '\n'
                                    logger.info('Msg# %s: Circuit states discovered: \n %s', counter, circuitStr)
                                }
                            }*/



                        } else {

                            //now, let's output what is different between the packet and stored packets
                            if (logConfigMessages) {
                                //what's different (overall) with the status packet
                                logger.verbose('-->EQUIPMENT Msg# %s   \n', counter)
                                    //this will output the difference between currentStatusByte and data
                                logger.verbose('Msg# %s: \n', counter, decodeHelper.printStatus(currentStatusBytes, data));
                                currentWhatsDifferent = currentStatus.whatsDifferent(status);
                                if (currentWhatsDifferent != "Nothing!") {
                                    logger.verbose('Msg# %s   System Status changed: %s', counter, currentWhatsDifferent)
                                }


                                //What's different with the circuit status?
                                //THE LOOP IS BECAUSE THERE IS A BUG IN THE RECURSIVE LOOP.  It won't display the output.  Need to fix for objects embedded inside an array.
                                var results;
                                for (var i = 1; i <= 20; i++) {
                                    if (currentCircuitArrObj[i].status != undefined) {
                                        results = currentCircuitArrObj[i].whatsDifferent(circuitArrObj[i]);
                                        if (!(results == "Nothing!" || currentCircuitArrObj[i].name == undefined)) {
                                            logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuitArrObj[i].name, results)
                                        }
                                    }
                                }
                            }
                        }

                        //and finally assign the temporary variables to the permanent one
                        currentStatus = JSON.parse(JSON.stringify(status));
                        currentStatusBytes = JSON.parse(JSON.stringify(data));
                        currentCircuitArrObj = JSON.parse(JSON.stringify(circuitArrObj));


                        //and finally emit the packets
                        emit('config')
                        emit('circuit')

                    } else {
                        if (logDuplicateMessages)
                            logger.debug('Msg# %s   Duplicate broadcast.', counter)
                    }

                    decoded = true;
                    break;
                }


            case 7:

                //Send request/response for pump status
                {
                    var pumpNum;
                    if (data[packetFields.FROM] === 96 || data[packetFields.DEST] === 96) {
                        pumpNum = 1
                    } else {
                        pumpNum = 2
                    }

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


                    if (data[packetFields.FROM] === 16) //Request of status from Main
                    {
                        if (logPumpMessages) {
                            logger.verbose('Msg# %s   Main asking pump %s for status: %s', counter, ctrlString[data[packetFields.DEST]], JSON.stringify(data));
                        }
                    } else //Response to request for status
                    {


                        //TODO: make this code the same (one function?) as coming from the pump/controller

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

                            //TODO - I don't think the following works...
                            if (JSON.stringify(currentPumpStatus[pumpStatus.pump]) === JSON.stringify(pumpStatus)) {

                                if (logPumpMessages)
                                    logger.debug('Msg# %s   Pump %s status has not changed: ', counter, pumpStatus.pump, data)
                            } else {
                                var needToEmit = 0
                                if (pumpStatus.watts !== currentPumpStatus[pumpNum].watts) {
                                    if ((Math.abs((pumpStatus.watts - currentPumpStatus[pumpNum].watts) / pumpStatus.watts)) > .05) {
                                        //logger.error('pumpnum.watts:', JSON.stringify(currentPumpStatus), currentPumpStatus[pumpNum].watts)
                                        if (logPumpMessages) logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].watts, pumpStatus.watts)
                                        needToEmit = 1;
                                    }
                                    //logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))
                                    if (logPumpMessages)
                                        if (logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].whatsDifferent(pumpStatus));
                                } else {
                                    //NOTE: Need to ignore TIME & remotecontrol so the packets aren't emitted every minute if there are no other changes.
                                    var tempPumpStatus = JSON.parse(JSON.stringify(pumpStatus))
                                    var tempcurrentPumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]))

                                    delete tempPumpStatus.time
                                    delete tempcurrentPumpStatus.time
                                    delete tempPumpStatus.remotecontrol
                                    delete tempcurrentPumpStatus.remotecontrol
                                    if (JSON.stringify(tempPumpStatus) === JSON.stringify(tempcurrentPumpStatus)) {
                                        //only time or remotecontrol has changed, so don't emit
                                        needToEmit = 0
                                    } else {
                                        needToEmit = 1
                                    }
                                    //We will still output any differences in verbose, including time
                                    var pumpWhatsDifferent = currentPumpStatus[pumpNum].whatsDifferent(pumpStatus)
                                    if (pumpWhatsDifferent != "Nothing!") {
                                        if (logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, pumpWhatsDifferent);
                                    }
                                }

                                //if we don't have a previous value for .watts than it should be the first time we are here and let's emit the pump status
                                if ((currentPumpStatus[pumpNum].watts).toLowerCase.indexOf('notset') >= 0) {
                                    needToEmit = 1
                                }
                                currentPumpStatus[pumpNum] = pumpStatus;
                                if (needToEmit) {
                                    emit('pump');
                                }
                            }
                        }
                    }
                    decoded = true;
                    break;
                }
            case 8: //Broadcast current heat set point and mode
                {
                    //   0 1  2  3 4  5  6 7   8  9  19 11 12 13  14 15 16 17 18 19  20
                    //[165,x,15,16,8,13,75,75,64,87,101,11,0,  0 ,62 ,0 ,0 ,0 ,0 ,2,190]
                    //function heatObj(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode)


                    var heat = new Heat(data[9], data[11] & 3, data[10], (data[11] & 12) >> 2)



                    if (logConfigMessages) {
                        logger.silly('heat status packet object: %s  data: %s  currentHeat: %s', JSON.stringify(heat), data, currentHeat == undefined ? "Not set yet" : JSON.stringify(currentHeat));
                    }
                    if (heat.poolSetPoint != undefined) //invalid packet?
                    {
                        if (currentHeat.poolSetPoint == undefined) {
                            currentHeat = JSON.parse(JSON.stringify(heat))
                            if (logConfigMessages)
                                logger.info('Msg# %s   Pool/Spa heat set point discovered:  \n  Pool heat mode: %s @ %s degrees \n  Spa heat mode: %s at %s degrees', counter, heatModeStr[currentHeat.poolHeatMode], currentHeat.poolSetPoint, heatModeStr[currentHeat.spaHeatMode], currentHeat.spaSetPoint);

                            emit('heat');
                        } else {

                            if (JSON.stringify(currentHeat) === JSON.stringify(heat)) {
                                logger.debug('Msg# %s   Pool/Spa heat set point HAS NOT CHANGED:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, heatModeStr[heat.poolHeatMode], heat.poolSetPoint, heatModeStr[heat.spaHeatMode], heat.spaSetPoint);
                            } else {
                                if (logConfigMessages) {
                                    logger.verbose('Msg# %s   Pool/Spa heat set point changed:  pool heat mode: %s @ %s degrees; spa heat mode %s at %s degrees', counter, heatModeStr[heat.poolHeatMode], heat.poolSetPoint, heatModeStr[heat.spaHeatMode], heat.spaSetPoint);
                                    logger.info('Msg# %s  Change in Pool/Spa Heat Mode:  %s', counter, currentHeat.whatsDifferent(heat))
                                }
                                currentHeat = JSON.parse(JSON.stringify(heat))
                                emit('heat');
                            }
                        }
                    }
                    decoded = true;
                    break;
                }


            case 10: //Get Custom Names
                {
                    var customName = '';
                    for (var i = 7; i < 18; i++) {
                        if (data[i] > 0 && data[i] < 251) //251 is used to terminate the custom name string if shorter than 11 digits
                        {

                            customName += String.fromCharCode(data[i])
                        };
                    }

                    if (logConfigMessages) {
                        logger.silly('Msg# %s  Custom Circuit Name Raw:  %s  & Decoded: %s', counter, JSON.stringify(data), customName)
                            //logger.verbose('Msg# %s  Custom Circuit Name Decoded: "%s"', counter, customName)
                    }

                    if (checkForChange[0]) {
                        if (customNameArr[data[6]] !== customName) {
                            logger.info('Msg# %s  Custom Circuit name %s changed to %s', customNameArr[data[6]], customName)
                            emit('circuit');
                        }
                    }

                    customNameArr[data[6]] = customName;
                    //display custom names when we reach the last circuit
                    if (data[6] == 9 && checkForChange[0] === 0) {
                        logger.info('\n  Custom Circuit Names retrieved from configuration: ', customNameArr)
                        checkForChange[0] = 1
                        emit('circuit');
                    }


                    decoded = true;
                    break;
                }

            case 11: // Get Circuit Names
                {
                    var circuitNumber = data[namePacketFields.NUMBER]
                    logger.silly('get circuit names packet: %s', data)
                    var freezeProtection;
                    if ((data[namePacketFields.CIRCUITFUNCTION] & 64) == 64) {
                        freezeProtection = 1
                    } else {
                        freezeProtection = 0
                    }
                    //The &63 masks to 00111111 because 01000000 is freeze protection bit

                    //if the ID of the circuit name is 1-101 then it is a standard name.  If it is 200-209 it is a custom name.  The mapping between the string value in the getCircuitNames and getCustomNames is 200.  So subtract 200 from the circuit name to get the id in the custom name array.
                    //data[4]-1 because this array starts at 1 and JS arrays start at 0.
                    //-(8*whichCircuit) because this will subtract 0, 8 or 16 from the index so each secondary index will start at 0

                    var circuit = JSON.parse(JSON.stringify(currentCircuitArrObj[circuitNumber]))

                    if (circuitNumber != null || circuit.name != undefined) {
                        if (data[namePacketFields.NAME] < 200) {
                            circuit.name = strCircuitName[data[namePacketFields.NAME]]
                        } else {
                            circuit.name = customNameArr[data[namePacketFields.NAME] - 200];
                        }
                        circuit.number = circuitNumber;
                        circuit.numberStr = 'circuit' + circuitNumber;
                        circuit.circuitFunction = strCircuitFunction[data[namePacketFields.CIRCUITFUNCTION] & 63];
                        circuit.freeze = freezeProtection;

                        if (checkForChange[1]) {
                            if (JSON.stringify(circuit) !== JSON.stringify(currentCircuitArrObj[circuitNumber])) {
                                results = currentCircuitArrObj[i].whatsDifferent(circuit);
                                if (!(results == "Nothing!" || currentCircuitArrObj[i].name === 'NOT USED')) {
                                    logger.verbose('Msg# %s   Circuit %s change:  %s', counter, circuit.name, results)

                                    if (logConfigMessages) {
                                        logger.silly('Msg# %s  Circuit Info  %s', counter, JSON.stringify(data))
                                            //logger.debug('currentCircuitArrObj[%s]: %s ', circuitNumber, JSON.stringify(currentCircuitArrObj[circuitNumber]))
                                            //logger.verbose('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: %s  Freeze Protection: %s', counter, circuitNumber, strCircuitName[data[namePacketFields.NAME]], strCircuitFunction[data[namePacketFields.CIRCUITFUNCTION] & 63], freezeProtection)
                                        if (circuit.status == undefined) {
                                            logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: (not received yet)  Freeze Protection: %s', counter, currentCircuitArrObj[circuitNumber].number, currentCircuitArrObj[circuitNumber].name, currentCircuitArrObj[circuitNumber].circuitFunction, currentCircuitArrObj[circuitNumber].freeze)
                                        } else {
                                            logger.debug('Msg# %s  Circuit %s:   Name: %s  Function: %s  Status: %s  Freeze Protection: %s', counter, currentCircuitArrObj[circuitNumber].number, currentCircuitArrObj[circuitNumber].name, currentCircuitArrObj[circuitNumber].circuitFunction, currentCircuitArrObj[circuitNumber].status, currentCircuitArrObj[circuitNumber].freeze)

                                        }
                                    }
                                    emit('circuit');
                                }
                            } else {
                                logger.debug('Msg# %s  No change in circuit %s', counter, circuit.number)
                            }
                        }
                        currentCircuitArrObj[circuitNumber] = JSON.parse(JSON.stringify(circuit));



                        if (data[namePacketFields.NUMBER] === 20 && checkForChange[1] === 0 && currentCircuitArrObj[20].name != undefined) {
                            var circuitStr = '';
                            for (var i = 1; i <= 20; i++) {
                                circuitStr += 'Circuit ' + currentCircuitArrObj[i].number + ': ' + currentCircuitArrObj[i].name
                                circuitStr += ' Function: ' + currentCircuitArrObj[circuitNumber].circuitFunction
                                if (currentCircuitArrObj[circuitNumber].status == undefined) {
                                    circuitStr += ' Status: (not received yet)'
                                } else {
                                    circuitStr += ' Status: ' + currentCircuitArrObj[circuitNumber].status
                                }
                                circuitStr += ' Freeze Protection: ' + currentCircuitArrObj[circuitNumber].freeze
                                circuitStr += '\n'
                            }
                            logger.info('\n  Circuit Array Discovered from configuration: \n%s \n', circuitStr)
                            emit('circuit');
                            checkForChange[1] = 1
                        }
                    }

                    decoded = true;
                    break;
                }

            case 17: // Get Schedules
                { //byte:      0  1  2  3  4 5 6 7 8  9 10 11  12 13 14
                    //example: 165,16,15,16,17,7,1,6,9,25,15,55,255,2, 90
                    var schedule = {};
                    schedule.ID = data[6];
                    schedule.CIRCUIT = data[7] === 0 ? strCircuitName[data[7]] : currentCircuitArrObj[data[7]].name; //Correct???
                    schedule.CIRCUITNUM = data[7]
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
                        // if (data[12] == 255) { //not sure this is needed as it is really x1111111 with the x=1 being unknown.  See following note.
                        //    schedule.DAYS += 'EVERY DAY'
                        //} else { //0 = none;  My Pentiar Intellitouch always adds a leading 1xxxxxxx to the schedule.  Don't know the significance of that.
                        if ((data[12] == 0))
                            schedule.DAYS += 'None';
                        if ((data[12] & 1) == 1)
                            schedule.DAYS += 'Sunday '; //1
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
                        //}
                    }





                    if (logConfigMessages)
                        logger.silly('\nMsg# %s  Schedule packet %s', counter, JSON.stringify(data))


                    if ((JSON.stringify(currentSchedule[schedule.ID])) === (JSON.stringify(schedule))) {
                        if (logConfigMessages)
                            logger.debug('Msg# %s:  Schedule %s has not changed.', counter, schedule.ID)
                    } else {
                        if (currentSchedule[schedule.ID] == undefined && schedule.ID === 12 && checkForChange[2] === 0) {
                            currentSchedule[schedule.ID] = schedule; //should only be called here for schedule.ID === 12.
                            var scheduleStr = 'Msg# ' + counter + '  Schedules discovered:'
                            for (var i = 1; i <= 12; i++) {
                                scheduleStr += '\nID:' + currentSchedule[i].ID + '  CIRCUIT:(' + currentSchedule[i].CIRCUITNUM + ')' + currentSchedule[i].CIRCUIT
                                if (currentSchedule[i].CIRCUIT !== 'NOT USED') {
                                    if (currentSchedule[i].MODE == 'Egg Timer') {
                                        scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' DURATION:' + currentSchedule[i].DURATION
                                    } else {
                                        scheduleStr += ' MODE:' + currentSchedule[i].MODE + ' START_TIME:' + currentSchedule[i].START_TIME + '  END_TIME:' + currentSchedule[i].END_TIME + '  DAYS:' + currentSchedule[i].DAYS
                                    }
                                }
                            }
                            logger.info('%s\n\n', scheduleStr)
                            checkForChange[2] = 1
                        } else if (checkForChange[2] === 1) {
                            //Explicitly writing out the old/new packets because if we call .whatsDifferent and the schedule switches from an egg timer to schedule (or vice versa) it will throw an error)

                            var scheduleChgStr = 'Msg# ' + counter + '  Schedule ' + 'ID:' + schedule.ID + ' changed from:\n'
                                //FROM string
                            if (currentSchedule[schedule.ID].MODE === 'Egg Timer') {

                                scheduleChgStr += 'ID:' + currentSchedule[schedule.ID].ID + ' CIRCUIT:(' + data[6] + ')' + currentSchedule[schedule.ID].CIRCUIT + ' MODE:' + currentSchedule[schedule.ID].MODE + ' DURATION:' + currentSchedule[schedule.ID].DURATION
                            } else {

                                scheduleChgStr += 'Schedule: ID:' + currentSchedule[schedule.ID].ID + ' CIRCUIT:(' + data[6] + ')' + currentSchedule[schedule.ID].CIRCUIT + ' MODE:' + currentSchedule[schedule.ID].MODE + ' START_TIME:' + currentSchedule[schedule.ID].START_TIME + ' END_TIME:' + currentSchedule[schedule.ID].END_TIME + ' DAYS:(' + data[12] + ')' + currentSchedule[schedule.ID].DAYS
                            }


                            scheduleChgStr += '\n'
                                //TO string
                            if (schedule.MODE == 'Egg Timer') {

                                scheduleChgStr += ' CIRCUIT:(' + data[6] + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' DURATION:' + schedule.DURATION
                            } else {

                                scheduleChgStr += ' CIRCUIT:(' + data[6] + ')' + schedule.CIRCUIT + ' MODE:' + schedule.MODE + ' START_TIME:' + schedule.START_TIME + ' END_TIME:' + schedule.END_TIME + ' DAYS:(' + data[12] + ')' + schedule.DAYS
                            }
                            logger.verbose(scheduleChgStr)
                        }

                        currentSchedule[schedule.ID] = schedule;
                        if (schedule.ID === 12) {
                            emit('schedule')
                        }
                    }
                    decoded = true;
                    break;
                }
                //Set Circuit Function On/Off

            case 25: //Intellichlor status
                {
                    if (intellitouch) { //this is to test configs without a chlorinator.  can get rid of it.
                        if (logChlorinator)
                            logger.debug('Msg# %s   Chlorinator status packet: %s', counter, data)

                        //copy the currentChlorinatorStatus to temp object
                        //var chlorinatorStatus = JSON.parse(JSON.stringify(currentChlorinatorStatus));;
                        //we are not using the parse(stringify) method here because the constructor contains a mapping function
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
                            case 132:
                                {
                                    chlorinatorStatus.status = "Comm Link Error(?).  Also Low Salt.  ";
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
                                    chlorinatorStatus.status = "Unknown - Status code: " + data[10];
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
                            emit('chlorinator');
                        } else
                        if (currentChlorinatorStatus.equals(chlorinatorStatus)) {
                            if (logChlorinator)
                                logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
                        } else {
                            if (logChlorinator)
                                logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                            currentChlorinatorStatus = chlorinatorStatus;
                            emit('chlorinator');
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
                        sFeature: null,
                        ACTION: null,
                    }
                    status.source = data[packetFields.FROM]
                    status.destination = data[packetFields.DEST]


                    status.sFeature = currentCircuitArrObj[data[6]].name
                    if (data[7] == 0) {
                        status.ACTION = "off"
                    } else if (data[7] == 1) {
                        status.ACTION = "on"
                    }
                    logger.info('Msg# %s   %s --> %s: Change %s to %s : %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], status.sFeature, status.ACTION, JSON.stringify(data));
                    decoded = true;
                    break;
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
                        if (logMessageDecoding)
                            logger.debug('Msg# %s   Get Chlorinator packet: %s', counter, data)
                    decoded = true;
                    break;
                }
            case 252: //Software/Bootloader Revision
                if (logConfigMessages) {
                    logger.info('Controller Bootloader Revision: %s  Full Packet: %s', data[11] + '.' + data[12] + data[13], JSON.stringify(data))
                }
            default:
                {

                    var currentAction = strControllerActions[data[packetFields.ACTION]]
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

        var pumpNum;
        if (data[packetFields.FROM] == 96 || data[packetFields.DEST] == 96) {
            pumpNum = 1
        } else {
            pumpNum = 2
        };
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
        pumpStatus.pump = pumpNum;
        //}

        //logger.error('pumpStatus: %s    currentPumpStatus: %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))


        switch (data[packetFields.ACTION]) {



            case 1: //Set speed setting
                {
                    var str1;
                    var str2;
                    var setAmount = data[8] * 256 + data[9];

                    if (data[5] == 2) // Length==2 is a response.
                    {

                        var str1;
                        var setAmount = data[6] * 256 + data[7];
                        decoded = true;
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s responded with acknowledgement: %s', counter, ctrlString[data[packetFields.FROM]], JSON.stringify(data));
                    } else if (data[6] == 3) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
                    {
                        switch (data[7]) {

                            case 33: //0x21
                                {
                                    setAmount = setAmount / 8
                                    str1 = 'Set Current Program to '
                                    str2 = setAmount.toString();
                                    pumpStatus.currentprogram = setAmount;
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
                                    //commented out the following line because we are not sure what the timer actually does
                                    //leaving it in creates problems for ISY that might rely on this variable
                                    //pumpStatus.timer = setAmount;
                                    str2 = setAmount.toString() + ' minutes'
                                    break;
                                }
                            default:
                                {
                                    str1 = 'unknown(?)'
                                }
                                decoded = true;
                        }

                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s: %s %s %s', counter, ctrlString[data[packetFields.FROM]], str1, str2, JSON.stringify(data));
                        decoded = true;
                    } else if (data[6] == 2) // data[4]: 1== Response; 2==IntelliTouch; 3==Intellicom2(?)/manual
                    {

                        var str1;
                        var setAmount = data[8] * 256 + data[9];
                        if (logPumpMessages)
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
                        pumpStatus.remotecontrol = 1;
                    } else //0 = Set pump control panel on
                    {
                        pumpStatus.remotecontrol = 0;
                    }
                    var remoteControlStr = pumpStatus.remotecontrol === 1 ? 'on' : 'off'


                    if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                    {
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s --> %s: Remote control (turn %s pump control panel): %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], remoteControlStr, JSON.stringify(data));
                    } else {
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s: Remote control %s: %s', counter, ctrlString[data[packetFields.FROM]], remoteControlStr, JSON.stringify(data));
                    }
                    decoded = true;
                    break;
                }



            case 5: //Set pump mode
                {
                    if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                    {
                        if (logPumpMessages)
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
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s confirming it is in mode %s: %s', counter, ctrlString[data[packetFields.FROM]], data[packetFields.CMD], JSON.stringify(data));
                        decoded = true;
                    }
                    break;
                }
            case 6: //Turn pump on/off
                {

                    var power;
                    if (data[6] == 10)
                        power = 1
                    else if (data[6] == 4)
                        power = 0;
                    var powerStr = power === 1 ? 'on' : 'off'
                    pumpStatus.power = power;
                    if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                    {
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s --> %s: Pump power to %s: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], powerStr, JSON.stringify(data));
                        decoded = true;
                    } else {
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s: Pump power %s: %s', counter, ctrlString[data[packetFields.FROM]], powerStr, JSON.stringify(data));
                        decoded = true;
                    }
                    break;
                }
            case 7: //cyclical status of controller requesting pump status
                {

                    if (data[packetFields.DEST] == 96 || data[packetFields.DEST] == 97) //Command to the pump
                    {
                        if (logPumpMessages)
                            logger.verbose('Msg# %s   %s --> %s: Provide status: %s', counter, ctrlString[data[packetFields.FROM]], ctrlString[data[packetFields.DEST]], JSON.stringify(data));
                        decoded = true;
                    } else //response
                    {


                        pumpStatus.time = data[pumpPacketFields.HOUR] + ':' + data[pumpPacketFields.MIN];
                        pumpStatus.run = data[pumpPacketFields.CMD] == 10 ? 1 : 0 //10=On, 4=Off

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
                    if (logPumpMessages)
                        logger.info('Msg# %s is UNKNOWN: %s', counter, JSON.stringify(data));
                    decoded = true;
                }
        }
        if (logPumpMessages)
            logger.silly('\n Analyzing pump packets for pump ', pumpNum, ': \n currentPumpStatus: ', JSON.stringify(currentPumpStatus[pumpStatus.pump]), '\n pumpStatus: ', JSON.stringify(pumpStatus), '\n equal?: ', JSON.stringify(currentPumpStatus[pumpNum]) === (JSON.stringify(pumpStatus)))

        if ((currentPumpStatus[pumpNum].rpm === 'rpmnotset')) {
            //we don't have status yet, but something changed
            currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
            emit('pump')
        } else {
            if (JSON.stringify(currentPumpStatus[pumpNum]) === (JSON.stringify(pumpStatus))) {
                if (logPumpMessages)
                    logger.debug('Msg# %s   Pump %s status has not changed: %s  \n', counter, pumpStatus.pump, data)
            } else {


                var needToEmit = 0
                    //  If the difference is less then (absolute) 5% and the watts is not the same as it previously was, then notify the user.
                    //  Separate check just for watts.  If not watts, this check isn't applicable.
                if (pumpStatus.watts !== currentPumpStatus[pumpNum].watts) {
                    if ((Math.abs((pumpStatus.watts - currentPumpStatus[pumpNum].watts) / pumpStatus.watts)) > .05) {
                        //logger.error('pumpnum.watts:', JSON.stringify(currentPumpStatus), currentPumpStatus[pumpNum].watts)
                        if (logPumpMessages) logger.info('Msg# %s   Pump %s watts changed >5%: %s --> %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].watts, pumpStatus.watts)
                        needToEmit = 1;
                    }
                    //logger.error('2 what\'s different: \n %s \n %s', JSON.stringify(pumpStatus), JSON.stringify(currentPumpStatus))

                    if (logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, currentPumpStatus[pumpNum].whatsDifferent(pumpStatus));
                }
                //something besides watts changed
                else {
                    //NOTE: Need to ignore TIME & remotecontrol so the packets aren't emitted every minute if there are no other changes.
                    var tempPumpStatus = JSON.parse(JSON.stringify(pumpStatus))
                    var tempcurrentPumpStatus = JSON.parse(JSON.stringify(currentPumpStatus[pumpNum]))

                    delete tempPumpStatus.time
                    delete tempcurrentPumpStatus.time
                    delete tempPumpStatus.remotecontrol
                    delete tempcurrentPumpStatus.remotecontrol
                    if (JSON.stringify(tempPumpStatus) === JSON.stringify(tempcurrentPumpStatus)) {
                        //only time or remotecontrol has changed, so don't emit
                        needToEmit = 0
                    } else {
                        needToEmit = 1
                    }
                    //We will still output any differences in verbose, including time
                    var pumpWhatsDifferent = currentPumpStatus[pumpNum].whatsDifferent(pumpStatus)
                    if (pumpWhatsDifferent != "Nothing!") {
                        if (logPumpMessages) logger.verbose('Msg# %s   Pump %s status changed: %s \n', counter, pumpStatus.pump, pumpWhatsDifferent);
                    }
                }
                //if we have 'notset' as part of the variable, then it's the first time we are here.

                currentPumpStatus[pumpStatus.pump] = JSON.parse(JSON.stringify(pumpStatus));
                if (needToEmit) {
                    emit('pump');
                }
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
            //TODO: better check besides pump power for asking for the chlorinator name
            if (currentChlorinatorStatus.name == '' && chlorinator && currentPumpStatus[1].power == 1)
            //If we see a chlorinator status packet, then request the name.  Not sure when the name would be automatically sent over otherwise.
            {
                logger.verbose('Queueing messages to retrieve Salt Cell Name (AquaRite or OEM)')
                    //get salt cell name
                if (logPacketWrites) logger.debug('decode: Queueing packet to retrieve Chlorinator Salt Cell Name: [16, 2, 80, 20, 0]')
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
                            chlorinatorStatus.superChlorinate = 1
                        } else {
                            chlorinatorStatus.superChlorinate = 0
                        }
                        if (logChlorinator)
                            logger.verbose('Msg# %s   %s --> %s: Set current output to %s %: %s', counter, from, destination, chlorinatorStatus.superChlorinate == 'On' ? 'Super Chlorinate' : chlorinatorStatus.outputPercent, data);
                        decoded = true;
                        break;
                    }
                case 18: //Response to 17 (set generate %)
                    {
                        chlorinatorStatus.saltPPM = data[4] * 50;
                        switch (data[5]) {
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

            if (JSON.stringify(currentChlorinatorStatus) === JSON.stringify(chlorinatorStatus)) {
                if (logChlorinator)
                    logger.debug('Msg# %s   Chlorinator status has not changed: ', counter, JSON.stringify(data))
            } else {
                if (logChlorinator)
                    logger.verbose('Msg# %s   Chlorinator status changed: ', counter, currentChlorinatorStatus.whatsDifferent(chlorinatorStatus));
                currentChlorinatorStatus = chlorinatorStatus;
                emit('chlorinator');
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
        };
    } else {
        decoded = false
    }
    return true; //fix this; turn into callback(?)  What do we want to do with it?

}






//------------------START WRITE SECTION



function successfulAck(chatter, counter, messageAck) {

    //TODO: There is nothing to do with mesageAck===0 currently.  We only care about matching if we have written something, so we'll account for this in the writePacket() function
    if (logMessageDecoding || logPacketWrites) {
        logger.debug('Msg# %s  Msg received: %s \n                           Msg written: %s \n                           Match?: %s', counter, chatter, queuePacketsArr[0], messageAck)
    }
    if (messageAck === 1) {
        if (logPacketWrites) {
            logger.debug('successfulAck: Incoming packet is a match. \nRemoving packet %s from queuePacketsArr and resetting msgWriteCounter variables', queuePacketsArr[0])
        }
        ejectPacketAndReset()
    }
}

function queuePacket(message) {
    if (logPacketWrites) logger.debug('queuePacket: Adding checksum and validating packet to be written %s', message)
    var checksum = 0;
    for (var j = 0; j < message.length; j++) {
        checksum += message[j]
    }


    var packet;
    var requestGet = 0;
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

        //if we request to "SET" a variable on the HEAT STATUS
        if (packet[7] === 136 && intellitouch) {
            requestGet = 1;
        }
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
        //pump packet
        if (packet[packetFields.DEST + 3] === 96 || packet[packetFields.DEST + 3] === 97) {
            if (logPacketWrites) logger.verbose('Just Queued Pump Message \'%s\' to send: %s', strPumpActions[packet[packetFields.ACTION + 3]], packet)

        }
        //chlorinator
        else if (packet[0] === 16) {
            if (logPacketWrites) logger.verbose('Just Queued Chlorinator Message \'%s\' to send: %s', strChlorinatorActions[packet[3]], packet)

        }
        //controller packet
        else {
            if (logPacketWrites) logger.verbose('Just Queued Message \'%s\' to send: %s', strControllerActions[packet[packetFields.ACTION + 3]], packet)

        }
    }


    //-------End Internally validate checksum

    if (requestGet) {
        //request the GET version of the SET packet
        var getPacket = [165, preambleByte, 16, appAddress, packet[packetFields.ACTION + 3] + 64, 1, 0]
        if (logPacketWrites) logger.debug('Queueing message %s to retrieve \'%s\'', getPacket, strControllerActions[getPacket[packetFields.ACTION]])
        queuePacket(getPacket);

        //var statusPacket = [165, preambleByte, 16, 34, 194, 1, 0]
        //logger.debug('Queueing messages to retrieve \'%s\'', strControllerActions[statusPacket[packetFields.ACTION]])
        //queuePacket(statusPacket);
    }



    if (logPacketWrites) logger.silly('queuePacket: Message: %s now has checksum added: %s', message, packet)

    //if length > 0 then we will loop through from isResponse
    if (!writeQueueActive)
        preWritePacketHelper();
}


function preWritePacketHelper() {
    if (queuePacketsArr.length === 0) // need this because the correct packet might come back during the writePacketTimer.timeout.
    {
        if (logPacketWrites) logger.silly('preWritePacketHelper: Setting writeQueueActive=false because last message was successfully received and there is no message to send. %s', queuePacketsArr)
        writeQueueActive = false
    } else {
        //msgWriteCounter===0;  this means no packet has been written yet (queuePacketsArr.shift() was called and msgWriteCounter reset)
        if (msgWriteCounter.counter === 0) {
            if (logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because it has not been written yet', queuePacketsArr[0])
            skipPacketWrittenCount = 0
            writePacket()
        } else if (skipPacketWrittenCount === 2) {
            if (logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because it has been skipped twice', queuePacketsArr[0])
            skipPacketWrittenCount = 0
            writePacket()
        }
        //if we have not processed more than 4 messages, let's delay again.  However, if we do this twice, then skipPacketWrittenCount >= 2 will be processed and we will write the message no matter what
        else if (msgCounter - msgWriteCounter.packetWrittenAt <= 4) {
            if (logPacketWrites) logger.silly('preWritePacketHelper: Skipping write packet %s time(s) because we have not processed four incoming messages since the last write. Packet: %s', skipPacketWrittenCount, queuePacketsArr[0])
            skipPacketWrittenCount++
            writePacketTimer.setTimeout(preWritePacketHelper, '', '150m')
        }
        //if the incoming buffer (bufferArrayOfArrays)>=2
        //OR
        //part of buffer current processing (bufferToProcess)>=50 bytes, let's skip writing the packet twice
        else if (bufferArrayOfArrays.length >= 2 || bufferToProcess.length >= 50) {
            //skipPacketWrittenCount>=2;  we've skipped writting it twice already, so write it now.
            skipPacketWrittenCount++
            if (logPacketWrites) logger.silly('preWritePacketHelper: Skipping write packet %s time(s) due to \n1. bufferArrayOfArrays.length>=2: %s (%s) \n2. bufferToProcess.length>=50:  %s (%s)', skipPacketWrittenCount, bufferArrayOfArrays.length >= 2, bufferArrayOfArrays.length, bufferToProcess.length >= 50, bufferToProcess.length)
            writePacketTimer.setTimeout(preWritePacketHelper, '', '150m')
        } else
        //if none of the conditions above are met, let's write the packet
        {
            if (logPacketWrites) logger.silly('preWritePacketHelper: Ok to write message %s because no other conditions have been met', queuePacketsArr[0])
            skipPacketWrittenCount = 0
            writePacket()
        }
    }
}

function writePacket() {
    if (logPacketWrites) logger.silly('writePacket: Entering writePacket() to write: %s\nFull queue: [[%s]]', queuePacketsArr[0], queuePacketsArr.join('],\n['))

    writeQueueActive = true
    if (netConnect === 0) {
        sp.write(queuePacketsArr[0], function(err) {
            if (err) {
                logger.error('Error writing packet: ' + err.message)
            } else {
                //if (logPacketWrites) logger.silly('Packet written: ', queuePacketsArr[0])
                postWritePacketHelper()
            }
        })
    } else {
        sp.write(new Buffer(queuePacketsArr[0]), 'binary', function(err) {
            if (err) {
                logger.error('Error writing packet: ' + err.message)
            } else {
                //if (logPacketWrites) logger.silly('Packet written: ', queuePacketsArr[0])
                postWritePacketHelper()
            }
        })
    }


}

function postWritePacketHelper() {

    if (msgWriteCounter.counter === 0) {
        //if we are here because we wrote a packet, but it is the first time, then the counter will be 0 and we need to set the variables for later comparison
        msgWriteCounter.packetWrittenAt = msgCounter;
        msgWriteCounter.msgWrote = queuePacketsArr[0].slice(0)
        msgWriteCounter.counter++
            if (logPacketWrites) logger.debug('postWritePacketHelper: First time writing packet.', msgWriteCounter)
    } else
    if (msgWriteCounter.counter === 5) //if we get to 5 retries, then throw an Error.
    {
        //TODO: Move the packet type and retrieve string logic to the module
        if (queuePacketsArr[0][packetFields.DEST + 3] === 96 || queuePacketsArr[0][packetFields.DEST + 3] === 97) {
            logger.warn('Error writing pump packet \'%s\' to serial bus.  Tried %s times to write %s', strPumpActions[queuePacketsArr[0][packetFields.ACTION + 3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }
        //chlorinator
        else if (queuePacketsArr[0][0] === 16) {
            logger.warn('Error writing chlorinator packet \'%s\' to serial bus.  Tried %s times to write %s', strChlorinatorActions[queuePacketsArr[0][3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }
        //controller packet
        else {
            logger.warn('Error writing controller packet \'%s\' to serial bus.  Tried %s times to write %s', strControllerActions[queuePacketsArr[0][packetFields.ACTION + 3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }

        if (logPacketWrites) logger.silly('postWritePacketHelper: msgWriteCounter: ', msgWriteCounter)
        msgWriteCounter.counter++;
    } else
    if (msgWriteCounter.counter === 10) //if we get to 10 retries, then abort this packet.
    {

        //TODO: Move the packet type and retrieve string logic to the module
        if (queuePacketsArr[0][packetFields.DEST + 3] === 96 || queuePacketsArr[0][packetFields.DEST + 3] === 97) {
            logger.error('Aborting pump packet \'%s\'.  Tried %s times to write %s', strPumpActions[queuePacketsArr[0][packetFields.ACTION + 3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }
        //chlorinator
        else if (queuePacketsArr[0][0] === 16) {
            logger.error('Aborting chlorinator packet \'%s\'.  Tried %s times to write %s', strChlorinatorActions[queuePacketsArr[0][3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }
        //controller packet
        else {
            logger.error('Aborting controller packet \'%s\'.  Tried %s times to write %s', strControllerActions[queuePacketsArr[0][packetFields.ACTION + 3]], msgWriteCounter.counter, msgWriteCounter.msgWrote)

        }
        ejectPacketAndReset()
        if (logPacketWrites) logger.silly('postWritePacketHelper: Tries===10.  Shifted queuePacketsArr.  \nWrite queue now: %s\nmsgWriteCounter:', queuePacketsArr, msgWriteCounter)
            //let's reconsider if we want to change the logging levels, or just fail silently/gracefully?
            /*if (logType == "info" || logType == "warn" || logType == "error") {
                logger.warn('Setting logging level to Debug')
                logType = 'debug'
                logger.transports.console.level = 'debug';
            }*/
    } else //we should get here between 1-4 packet writes
    {
        msgWriteCounter.counter++;
        if (logPacketWrites) logger.debug('postWritePacketHelper: Try %s.  Wrote: %s ', msgWriteCounter.counter, queuePacketsArr[0])
    }

    if (queuePacketsArr.length === 0) {
        if (logPacketWrites) logger.debug('postWritePacketHelper: Write queue empty.  writeQueueActive=false')
        writeQueueActive = false
    } else {
        if (logPacketWrites) logger.debug('writePacketHelper: Setting timeout to write next packet (will call preWritePacketHelper())\n')
        writePacketTimer.setTimeout(preWritePacketHelper, '', '175m')
    }
}

function ejectPacketAndReset() {
    if (queuePacketsArr.length > 0) {
        queuePacketsArr.shift();
    }
    msgWriteCounter.counter = 0
    msgWriteCounter.msgWrote = []
    msgWriteCounter.packetWrittenAt = 0
}

if (pumpOnly) {

    var pump1Timer = new NanoTimer();
    var pump1TimerDelay = new NanoTimer();
    var pumpInitialRequestConfigDelay = new NanoTimer();
    var pumpStatusTimer = new NanoTimer();
    if (numberOfPumps == 1) {
        if (logPumpTimers) logger.silly('pumpStatusTimer.setInterval(pumpStatusCheck, [1], \'30s\');')
        pumpStatusTimer.setInterval(pumpStatusCheck, [1], '30s');
        if (logPumpTimers) logger.silly('pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], \'3500m\');')
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1], '3500m'); //must give a short delay to allow the port to open
    } else {
        var pump2Timer = new NanoTimer();
        var pump2TimerDelay = new NanoTimer();
        pumpStatusTimer.setInterval(pumpStatusCheck, [1, 2], '30s');
        pumpInitialRequestConfigDelay.setTimeout(pumpStatusCheck, [1, 2], '3500m'); //must give a short delay to allow the port to open
    }

    if (!intellitouch && chlorinator) {
        var chlorinatorTimer = new NanoTimer();
        chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '3500m')
    }
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




function getControllerConfiguration(dest, src) {


    logger.info('Queueing messages to retrieve configuration from Intellitouch')

    logger.verbose('Queueing messages to retrieve SW Version')
        //get Heat Mode
    queuePacket([165, preambleByte, 16, appAddress, 253, 1, 0]);

    logger.verbose('Queueing messages to retrieve Pool/Spa Heat Mode')
        //get Heat Mode
    queuePacket([165, preambleByte, 16, appAddress, 200, 1, 0]);

    logger.verbose('Queueing messages to retrieve settings(?)')
        //get Heat Mode
    queuePacket([165, preambleByte, 16, appAddress, 232, 1, 0]);

    logger.verbose('Queueing messages to retrieve Custom Names')
    var i = 0;
    //get custom names
    for (i; i < 10; i++) {
        queuePacket([165, preambleByte, 16, appAddress, 202, 1, i]);
    }


    logger.verbose('Queueing messages to retrieve Circuit Names')
        //get circuit names
    for (i = 1; i < 21; i++) {
        queuePacket([165, preambleByte, 16, appAddress, 203, 1, i]);
    }


    logger.verbose('Queueing messages to retrieve Schedules')
        //get schedules
    for (i = 1; i < 13; i++) {

        queuePacket([165, preambleByte, 16, appAddress, 209, 1, i]);
    }
}



function pumpStatusCheck(pump1, pump2) {
    //request pump status
    if (logPumpTimers) logger.silly('pumpStatusCheck: Running pump 1 command on setInterval to check pump status')
    var statusPacket = [165, 0, 96, appAddress, 7, 0];
    logger.verbose('Sending Request Pump 1 Status: %s', statusPacket)
    queuePacket([165, 0, 96, appAddress, 4, 1, 255]);
    queuePacket(statusPacket);
    //queuePacket([165, 0, 96, appAddress, 4, 1, 0]);

    if (pump2 === 2) {
        //request pump status
        var statusPacket = [165, 0, 97, appAddress, 7, 0];
        logger.verbose('Sending Request Pump 2 Status: %s', statusPacket)
        queuePacket([165, 0, 97, appAddress, 4, 1, 255]);
        queuePacket(statusPacket);
        //queuePacket([165, 0, 97, 16, 4, 1, 0]);
    }
}


function pump1SafePumpMode() {
    if (logPumpTimers) logger.silly('pump1SafePumpMode: Running pump 1 on setTimer expiration')
    currentPumpStatus[1].duration = (currentPumpStatus[1].duration - 0.5);
    if (currentPumpStatus[1].duration > 0) {
        //set pump to remote control
        var remoteControlPacket = [165, 0, 96, appAddress, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 96, appAddress, 1, 4, 3, 33, 0, currentPumpStatus[1].currentprogram * 8];
        logger.verbose('App -> Pump 1: Sending Run Program %s: %s (%s total minutes left)', currentPumpStatus[1].currentprogram, setProgramPacket, currentPumpStatus[1].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 96, appAddress, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        if (logPumpTimers) logger.silly('pumpStatusCheck: Setting 10s delay to run pump1SafePumpModeDelay')
        pump1TimerDelay.setTimeout(pump1SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 1 Program Finished.   Pump will shut down in ~10 seconds.')
            //Timer = 0, we are done.  Pump should turn off automatically
        pump1Timer.clearTimeout();
        //set program to 0
        currentPumpStatus[1].currentprogram = 0;
        emit('pump')
    }
}

function pump2SafePumpMode() {
    currentPumpStatus[2].duration--;
    if (currentPumpStatus[2].duration > 0) {
        //set pump to remote control
        var remoteControlPacket = [165, 0, 97, appAddress, 4, 1, 255];
        logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
        queuePacket(remoteControlPacket);
        //Initially this was resending the 'timer' packet, but that was found to be ineffective.
        //Instead, sending the Program packet again resets the timer.
        var setProgramPacket = [165, 0, 97, 34, 1, 4, 3, 33, 0, currentPumpStatus[2].currentprogram * 8];
        logger.verbose('App -> Pump 2: Sending Run Program %s: %s (%s total minutes left)', currentPumpStatus[2].currentprogram, setProgramPacket, currentPumpStatus[2].duration);
        queuePacket(setProgramPacket);
        //set pump to local control
        var localControlPacket = [165, 0, 97, appAddress, 4, 1, 0];
        logger.verbose('Sending Set pump to local control: %s', localControlPacket)
        queuePacket(localControlPacket);
        //pad the timer with 10 seconds so we have a full minute per cycle
        pump2TimerDelay.setTimeout(pump2SafePumpModeDelay, '', '10s')
    } else {
        logger.info('Pump 2 Program Finished.  Pump will shut down in ~10 seconds.')
            //Timer = 0, we are done.  Pump should turn off automatically
        pump2Timer.clearTimeout();
        //set program to 0
        currentPumpStatus[2].currentprogram = 0;
        emit('pump')
    }
}

function pump1SafePumpModeDelay() {
    if (logPumpTimers) logger.silly('pumpStatusCheck: Setting 20s delay to run pump1SafePumpMode')
    pump1Timer.setTimeout(pump1SafePumpMode, '', '20s')
}

function pump2SafePumpModeDelay() {
    pump2Timer.setTimeout(pump2SafePumpMode, '', '20s')
}

function chlorinatorStatusCheck() {
    if (desiredChlorinatorOutput >= 0 && desiredChlorinatorOutput <= 101) {
        queuePacket([16, 2, 80, 17, desiredChlorinatorOutput])

        //not 100% sure if we need this, but just in case we get here in the middle of the 1800s timeout, let's clear it out
        //this would happen if the users sets the chlorinator from 0 to 1-100.
        chlorinatorTimer.clearTimeout()

        //if 0, then only check every 30 mins; else resend the packet every 4 seconds as a keep-alive
        if (desiredChlorinatorOutput === 0) {
            chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '1800s') //30 minutes
        } else {
            chlorinatorTimer.setTimeout(chlorinatorStatusCheck, '', '4s') // every 4 seconds
        }
    }
}


function emit(outputType) {
    logger.warn('EMIT: %s', outputType)
    if (outputType == 'circuit' || outputType == 'all') {
        io.sockets.emit('circuit',
            currentCircuitArrObj
        )
        if (ISYController) {
            ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
        }
    }

    if (outputType == 'config' || outputType == 'all') {
        io.sockets.emit('config',
            currentStatus
        )
        if (ISYController) {
            ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
        }
    }

    if (outputType == 'pump' || outputType == 'all') {
        io.sockets.emit('pump',
            currentPumpStatus
        )
        if (ISYController) {
            ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
        }
    }

    if (outputType == 'heat' || outputType == 'all') {
        if (currentHeat != null) {
            io.sockets.emit('heat',
                currentHeat
            )
            if (ISYController) {
                ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
            }
        }
    }

    if (outputType == 'schedule' || outputType == 'all') {
        if (currentSchedule.length > 3) {
            io.sockets.emit('schedule',
                currentSchedule)
            if (ISYController) {
                ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
            }
        }
    }

    if (outputType == 'chlorinator' || outputType == 'all') {
        if (currentChlorinatorStatus.saltPPM != 'undefined')
            io.sockets.emit('chlorinator', currentChlorinatorStatus)
        if (ISYController) {
            ISYHelper.emit(ISYConfig, currentStatus, currentPumpStatus, currentChlorinatorStatus, NanoTimer, logger, outputType)
        }
    }

    if (outputType == 'search' || outputType == 'all') {
        io.sockets.emit('searchResults',
            'Input values and click start.  All values optional.  Please refer to https://github.com/tagyoureit/nodejs-Pentair/wiki/Broadcast for values.');
    }
}



function changeHeatMode(equip, heatmode, src) {

    //pool
    if (equip === 'pool') {
        var updateHeatMode = (currentHeat.spaHeatMode << 2) | heatmode;
        var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
        queuePacket(updateHeat);
        //TODO: replace heatmode INT with string
        logger.info('User request to update pool heat mode to %s', heatmode)
    } else {
        //spaSetPoint
        var updateHeatMode = (parseInt(heatmode) << 2) | currentHeat.poolHeatMode;
        var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
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
    var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
    if (equip === 'pool') {
        var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint + parseInt(change), currentHeat.spaSetPoint, updateHeatMode, 0]
        logger.info('User request to update %s set point to %s', equip, currentHeat.poolSetPoint + change)
    } else {
        var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint + parseInt(change), updateHeatMode, 0]
        logger.info('User request to update %s set point to %s', equip, currentHeat.spaSetPoint + change)
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
    if (logApi) logger.verbose('Sending the following pump commands to pump %s:', _equip)
    if (_program === 'off' || _program === 'on') {
        if (logApi) logger.info('User request to set pump %s to %s', _equip, _program);
        if (_program === 'off') {
            setPrg = [6, 1, 4];

            if (_equip === 1) {
                currentPumpStatus[1].duration = 0;
                pump1Timer.clearTimeout();
                pump1TimerDelay.clearTimeout();
                //set program to 0
                currentPumpStatus[1].currentprogram = 0;
            } else {
                currentPumpStatus[2].duration = 0;
                pump2Timer.clearTimeout();
                pump2TimerDelay.clearTimeout();
                //set program to 0
                currentPumpStatus[2].currentprogram = 0;
            }

        } else // pump set to on
        {
            setPrg = [6, 1, 10];
        }
        currentPumpStatus[_equip].power = program;
    } else {
        if (logApi) logger.verbose('User request to set pump %s to Ext. Program %s @ %s RPM', _equip, _program, _value);
        //set speed
        setPrg = [1, 4, 3]
        setPrg.push(38 + _program);
        setPrg.push(Math.floor(_value / 256))
        setPrg.push(_value % 256);
        //run program
        runPrg = [1, 4, 3, 33, 0]
        runPrg.push(8 * _program)
        var str = 'program' + _program + 'rpm';
        currentPumpStatus[_equip][str] = _value;
        currentPumpStatus[_equip].currentprogram = _program;
    }

    //set pump to remote control
    var remoteControlPacket = [165, 0, pump, appAddress, 4, 1, 255];
    if (logApi) logger.verbose('Sending Set pump to remote control: %s', remoteControlPacket)
    queuePacket(remoteControlPacket);
    //set program packet
    if (_value < 450 || _value > 3450) {
        if (logApi) logger.warn('Speed provided (%s) is outside of tolerances.  Program being run with speed that is stored in pump.', _value)
    } else
    if (isNaN(_value) || _value == null) {
        if (logApi) logger.warn('Skipping Set Program Speed because it was not included.')
    } else {
        var setProgramPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(setProgramPacket, setPrg);
        //logger.info(setProgramPacket, setPrg)
        if (logApi) logger.verbose('Sending Set Program %s to %s RPM: %s', _program, _value, setProgramPacket);
        queuePacket(setProgramPacket);
    }

    if (_program >= 1 && _program <= 4) {
        //run program packet
        var runProgramPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(runProgramPacket, runPrg);
        if (logApi) logger.verbose('Sending Run Program %s: %s', _program, runProgramPacket)
        queuePacket(runProgramPacket);
        //turn on pump
        var turnPumpOnPacket = [165, 0, pump, appAddress, 6, 1, 10];
        if (logApi) logger.verbose('Sending Turn pump on: %s', turnPumpOnPacket)
        queuePacket(turnPumpOnPacket);
        //set a timer for 1 minute
        var setTimerPacket = [165, 0, pump, appAddress, 1, 4, 3, 43, 0, 1];
        if (logApi) logger.info('Sending Set a 1 minute timer (safe mode enabled, timer will reset every minute for a total of %s minutes): %s', _duration, setTimerPacket);
        queuePacket(setTimerPacket);
        //fix until the default duration actually is set to 1
        if (_duration < 1 || _duration == null) {
            _duration = 1;
        }
        if (_equip == 1) {
            currentPumpStatus[1].duration = _duration;
            //run the timer update 50s into the 1st minute
            pump1Timer.setTimeout(pump1SafePumpMode, '', '30s')
        } else {
            currentPumpStatus[2].duration = _duration;
            //run the timer update 50s into the 1st minute
            pump2Timer.setTimeout(pump2SafePumpMode, '', '30s')
        }



    } else {
        //turn pump on/off
        var pumpPowerPacket = [165, 0, pump, 16];
        Array.prototype.push.apply(pumpPowerPacket, setPrg)
        if (logApi) logger.verbose('Sending Turn pump %s: %s', _program, pumpPowerPacket);
        queuePacket(pumpPowerPacket);
    }
    //set pump to local control
    var localControlPacket = [165, 0, pump, appAddress, 4, 1, 0];
    if (logApi) logger.verbose('Sending Set pump to local control: %s', localControlPacket)
    queuePacket(localControlPacket);
    //request pump status
    var statusPacket = [165, 0, pump, appAddress, 7, 0];
    if (logApi) logger.verbose('Sending Request Pump Status: %s', statusPacket)
    queuePacket(statusPacket);
    if (logApi) logger.info('End of Sending Pump Packet \n \n')

    emit('pump')
}



//<----  START SERVER CODE


// Routing
app.use(express.static(__dirname + expressDir));
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/jquery', express.static(__dirname + '/node_modules/jquery-ui-dist/'));


app.get('/status', function(req, res) {
    res.send(currentStatus)
})

app.get('/heat', function(req, res) {
    res.send(currentHeat)
})

app.get('/circuit', function(req, res) {
    res.send(currentCircuitArrObj)
})

app.get('/schedule', function(req, res) {
    res.send(currentSchedule)
})

app.get('/pump', function(req, res) {
    res.send(currentPumpStatus)
})

app.get('/chlorinator/:chlorinateLevel', function(req, res) {
    if (pumpOnly && chlorinator) {

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
        res.send(currentCircuitArrObj[req.params.circuit])
    }
})

app.get('/circuit/:circuit/toggle', function(req, res) {
    var desiredStatus = currentCircuitArrObj[req.params.circuit].status == "on" ? 0 : 1;
    var toggleCircuitPacket = [165, preambleByte, 16, appAddress, 134, 2, Number(req.params.circuit), desiredStatus];
    queuePacket(toggleCircuitPacket);
    var response = 'User Request to toggle ' + currentCircuitArrObj[req.params.circuit].name + ' to ' + (desiredStatus == 0 ? 'off' : 'on') + ' received';
    logger.info(response)
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

app.get('/spaheat/setpoint/:spasetpoint', function(req, res) {
    //  [16,34,136,4,POOL HEAT Temp,SPA HEAT Temp,Heat Mode,0,2,56]

    var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, parseInt(req.params.temp), updateHeatMode, 0]
    logger.info('User request to update spa set point to %s', req.params.spasetpoint, updateHeat)
    queuePacket(updateHeat);
    var response = 'Request to set spa heat setpoint to ' + req.params.spasetpoint + ' sent to controller'
    res.send(response)

})


app.get('/spaheat/mode/:spaheatmode', function(req, res) {
    var updateHeatMode = (parseInt(req.params.spaheatmode) << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    //TODO: replace heatmode INT with string
    logger.info('User request to update spa heat mode to %s', req.params.spaheatmode, updateHeat)
    var response = 'Request to set spa heat mode to ' + heatModeStr[req.params.spaheatmode] + ' sent to controller'
    res.send(response)

})

app.get('/poolheat/setpoint/:poolsetpoint', function(req, res) {
    var updateHeatMode = (currentHeat.spaHeatMode << 2) | currentHeat.poolHeatMode;
    var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, parseInt(req.params.poolsetpoint), currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    logger.info('User request to update pool set point to %s', req.params.poolsetpoint, updateHeat)
    var response = 'Request to set pool heat setpoint to ' + req.params.poolsetpoint + ' sent to controller'
    res.send(response)
})

app.get('/poolheat/mode/:poolheatmode', function(req, res) {
    var updateHeatMode = (currentHeat.spaHeatMode << 2) | req.params.poolheatmode;
    var updateHeat = [165, preambleByte, 16, appAddress, 136, 4, currentHeat.poolSetPoint, currentHeat.spaSetPoint, updateHeatMode, 0]
    queuePacket(updateHeat);
    //TODO: replace heatmode INT with string
    logger.info('User request to update pool heat mode to %s', req.params.poolheatmode, updateHeat)
    var response = 'Request to set pool heat mode to ' + heatModeStr[req.params.poolheatmode] + ' sent to controller'
    res.send(response)
})

app.get('/sendthispacket/:packet', function(req, res) {
    logger.info('User request (REST API) to send packet: %s', req.params.packet);
    var packet;
    var preamblePacket;
    packet = req.params.packet.split('-');
    for (i = 0; i < packet.length; i++) {
        packet[i] = parseInt(packet[i])
    }
    if (packet[0] == 16 && packet[1] == ctrl.CHLORINATOR) {
        logger.silly('packet (chlorinator) detected: ', packet)
    } else {
        if (packet[0] === 96 || packet[0] === 97 || packet[1] === 96 || packet[1] === 97)
        //if a message to the pumps, use 165,0
        {
            preamblePacket = [165, 0]; //255,0,255 will be added later
        } else
        //If a message to the controller, use the preamble that we have recorded
        {
            preamblePacket = [165, preambleByte]
        }
        Array.prototype.push.apply(preamblePacket, packet);
        packet = preamblePacket.slice(0);
        logger.silly('packet (pool) detected: ', packet)
    }
    queuePacket(packet);
    var response = 'Request to send packet ' + packet + ' sent.'
    res.send(response)
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


io.on('connection', function(socket, error) {

    socket.on('error', function() {
        logger.error('Error with socket: ', error)
    })


    // when the client emits 'toggleEquipment', this listens and executes
    socket.on('toggleCircuit', function(equipment) {

        var desiredStatus = currentCircuitArrObj[equipment].status == "on" ? 0 : 1;
        var toggleCircuitPacket = [165, preambleByte, 16, appAddress, 134, 2, equipment, desiredStatus];
        queuePacket(toggleCircuitPacket);
        logger.info('User request to toggle %s to %s', currentCircuitArrObj[equipment].name, desiredStatus == 0 ? "off" : "on")


    });
    socket.on('search', function(mode, src, dest, action) {
        //check if we don't have all valid values, and then emit a message to correct.

        logger.debug('from socket.on search: mode: %s  src %s  dest %s  action %s', mode, src, dest, action);
        searchMode = mode;
        searchSrc = src;
        searchDest = dest;
        searchAction = action;
    })

    socket.on('sendPacket', function(incomingPacket) {


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

    socket.on('spasetpoint', function(spasetpoint) {
        changeHeatSetPoint('spa', spasetpoint, ' socket.io spasetpoint')
    })

    socket.on('spaheatmode', function(spaheatmode) {
        changeHeatMode('spa', spaheatmode, 'socket.io spaheatmode')

    })

    socket.on('poolsetpoint', function(poolsetpoint) {
        changeHeatSetPoint('pool', change, 'socket.io poolsetpoint')
    })

    socket.on('poolheatmode', function(poolheatmode) {
        changeHeatMode('pool', poolheatmode, 'socket.io poolheatmode')
    })

    socket.on('setHeatSetPoint', function(equip, change) {
        if (equip != null && change != null) {
            changeHeatSetPoint(equip, change, 'socket.io setHeatSetPoint')
        } else {
            logger.warn('setHeatPoint called with invalid values: %s %s', equip, change)
        }
    })

    socket.on('setHeatMode', function(equip, change) {
        if (equip == "pool") {
            changeHeatMode('pool', change, 'socket.io setHeatMode ' + equip + ' ' + change)

        } else {
            changeHeatMode('spa', change, 'socket.io setHeatMode ' + equip + ' ' + change)
        }
    })


    socket.on('pumpCommand', function(equip, program, value, duration) {

        logger.silly('Socket.IO pumpCommand variables - equip %s, program %s, value %s, duration %s', equip, program, value, duration)
        pumpCommand(equip, program, value, duration)
    })


    emit('all')
});
//---->  END SERVER CODE
