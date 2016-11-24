var NanoTimer = require('nanotimer')


module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: sp-helper.js')



    if (container.settings.netConnect === 0) {
        serialport = require("serialport");
        //var SerialPort = serialport.SerialPort;
        var sp = new serialport(container.settings.rs485Port, {
            baudrate: 9600,
            databits: 8,
            parity: 'none',
            stopBits: 1,
            flowControl: false,
            parser: serialport.parsers.raw,
            autoOpen: false
        });
    } else {
        var network = require('net');
        var sp = new network.Socket();

    }




    var spTimer = new NanoTimer();

    function init() {
        if (container.settings.netConnect === 0) {
            sp.open(function(err) {
                if (err) {
                    return logger.error('Error opening port: %s.  Will retry in 10 seconds', err.message);
                    spTimer.setTimeout(init, [], '10s')
                }
            })
        } else {
            sp.connect(container.settings.netPort, container.settings.netHost, function() {
                logger.info('Network connected to: ' + container.settings.netHost + ':' + container.settings.netPort);
            });

        }
    }


    sp.on('data', function(data) {
        //Push the incoming array onto the end of the dequeue array
        //bufferArrayOfArrays.push(Array.prototype.slice.call(data));
        container.packetBuffer.push(data)
        //console.log(JSON.stringify(data.toJSON()))

        /*  if (!container.receiveBuffer.getProcessingBuffer()) {
              //console.log('Arrays being passed for processing: \n[[%s]]\n\n', testbufferArrayOfArrays.join('],\n['))
              container.receiveBuffer.iterateOverArrayOfArrays()
                  //testbufferArrayOfArrays=[]
          }*/
    });

    /*var spTimer = new NanoTimer()

        function sptimertest(){
          var data
        data = sp.read()

        spTimer.setTimeout(sptimertest, [], '100m')
        if (data!==null)
        {
              //console.log(data)
          container.packetBuffer.push(data)
        }


      }
      sptimertest()*/

    sp.on('error', function(err) {
        console.log('calling ERROR function')
        logger.error('Error with port: %s.  Will retry in 10 seconds', err.message)
        spTimer.setTimeout(init, [], '10s')
    })




    //TEST function:  This function should simply output whatever comes into the serialport.  Comment out the one above and use this one if you want to test what serialport logs.
    /*
    var bufferArrayOfArrays = [];
    sp.on('data', function (data) {
        console.log('Input: ', JSON.stringify(data.toJSON().data) + '\n');
        bufferArrayOfArrays.push(Array.prototype.slice.call(data));
        console.log('Array: \n[[%s]]\n\n', bufferArrayOfArrays.join('],\n['))

    });*/

    sp.on('open', function() {
        logger.verbose('Serial Port opened');
    })


    if (container.logModuleLoading)
        container.logger.info('Loaded: sp-helper.js')


    return {
        sp,
        init: init
    }
}
