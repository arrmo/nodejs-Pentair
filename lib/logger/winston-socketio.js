/**
 * Created by andy.batchelor on 2/26/14.
 */

//var express = require('express'),
//    app = express(),
//    server = require('http').createServer(app),
var
    winston = require('winston'),
    util = require('util'),
    logger = require('./winston-helper.js')._logger,
    dateFormat = require('dateformat'),
    Server = require('./server.js'),
    IO = require('./io.js')
    //io = require('../index.js')._io,
    //server = require('../index.js')._server
    //,    Settings = require('./settings')

var SocketIO = exports.SocketIO  = function (options) {
    options = options || {};
    if(!options.server){
        throw new Error("options cannot be null");
    }
    else{
        this.level      = options.level    || 'info';
        this.silent     = options.silent   || false;
        this.raw        = options.raw      || false;
        this.name       = options.name     || 'SocketIO';
        this.server     = options.server;
        this.customFormatter = options.customFormatter;

        //- Enabled loging of uncaught exceptions
        this.handleExceptions = options.handleExceptions || false

        //- Configure node-SocketIO module
        this.SocketIO = options.SocketIO  //io.attach(this.server);
    }
};

//
// Inherit from `winston.Transport` so you can take advantage
// of the base functionality and `.handleExceptions()`.
//
util.inherits(SocketIO, winston.Transport);

//- Attaches this Transport to the list of available transports
winston.transports.SocketIO = SocketIO;


SocketIO.prototype.log = function (level, message, meta, callback) {
    //- Use custom formatter for message if set
    var msg = this.customFormatter
        ? this.customFormatter(level, message, meta)
        : { text: "[" + level + "] " + message        };
    IO.io.sockets.emit('outputLog', msg);
    //            io.sockets.emit('searchResults',resultStr)

    callback(null, true);
};

var _winsocketOptions = exports.winsocketOptions =  {
    server: Server.server,
    level: extLogLevel,
    SocketIO: IO,

    customFormatter: function(level, message, meta) {
        // Return string will be passed to logger.
        return dateFormat(Date.now(), "HH:MM:ss.l") + ' ' + level.toUpperCase() + ' ' + (undefined !== message ? message.split('\n').join('<br \>') : '') +
            (meta && Object.keys(meta).length ? '\n\t' + JSON.stringify(meta, null, '<br \>') : '');
    }
}

logger.add(winsocketio.SocketIO, winsocketio.winsocketOptions)
