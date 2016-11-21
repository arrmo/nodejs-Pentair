var winston = require('winston'),
    dateFormat = require('dateFormat'),
    util = require('util'),
    Bottle = require('bottlejs')
bottle = Bottle.pop('pentair-Bottle')

module.exports = function(container) {

    function init() {

        winstonToIO = winston.transports.winstonToIO = function(options) {
            this.name = 'winstonToIO'
            this.level = options.level
            this.customFormatter = options.customFormatter
        }

        util.inherits(winstonToIO, winston.Transport)

        var winstonToIOOptions = {
            level: bottle.container.settings.extLogLevel,
            customFormatter: function(level, message, meta) {
                // Return string will be passed to logger.
                return dateFormat(Date.now(), "HH:MM:ss.l") + ' ' + level.toUpperCase() + ' ' + (undefined !== message ? message.split('\n').join('<br \>') : '') +
                    (meta && Object.keys(meta).length ? '\n\t' + JSON.stringify(meta, null, '<br \>') : '');
            }
        }

        winstonToIO.prototype.log = function(level, msg, meta, callback) {
          msg = this.customFormatter ?
              this.customFormatter(level, msg, meta) :
              {
                  text: "[" + level + "] " + msg
              };
            bottle.container.io.emitDebugLog(msg)
            callback(null, true)
        }
        //bottle.container.logger.addCustomLogger(winstonToIO, winstonToIOOptions)
        container.logger.add(winstonToIO, winstonToIOOptions)
    }
    return {
        init: init
    }

}
