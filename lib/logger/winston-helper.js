var

    winston = require('winston'),
    //winsocketio = require('./winston-socketio.js'),
    dateFormat = require('dateformat')


module.exports = function(container) {
  if (container.logModuleLoading)
  console.log('Loading: winston-helper.js')


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
                //level: 'info',
                level: container.settings.logType,
                stderrLevels: []
            })
        ]
    });

    //__logger.add(winsocketio.SocketIO, winsocketio.winsocketOptions)


    logger.info('Loaded: winston-helper.js')

    return       logger

}
