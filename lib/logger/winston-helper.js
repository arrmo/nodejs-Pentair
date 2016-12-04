
//var winston = require('winston'),
//  dateFormat = require('dateformat'),
//  util = require('util')

module.exports = function(container) {
  if (container.logModuleLoading)
  console.log('Loading: winston-helper.js')

  var winston = container.winston,
    dateFormat = container.dateFormat


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
                level: container.settings.logLevel,
                stderrLevels: []
            })
        ]
    });



logger.info('Loaded: winston-helper.js')

  return logger

}
