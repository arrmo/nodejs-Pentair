/**
 * Created by andy.batchelor on 2/26/14.
 */

//var express = require('express'),
//    app = express(),
//    server = require('http').createServer(app),
var
    util = require('util'),
    winston = require('winston'),
    dateFormat = require('dateformat');

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
    this.SocketIO.emit('outputLog', msg);

    callback(null, true);
};
