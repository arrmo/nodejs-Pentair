var Dequeue = require('dequeue')



module.exports = function(container) {
    if (container.logModuleLoading)
        container.logger.info('Loading: sp-helper.js')

        var bufferArrayOfArrays = new Dequeue()

    if (container.settings.netConnect === 0) {
        const serialport = require("serialport");
        //var SerialPort = serialport.SerialPort;
        var sp = new serialport(container.settings.rs485Port, {
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
        sp.connect(container.settings.netPort, container.settings.netHost, function() {
            logger.info('Network connected to: ' + container.settings.netHost + ':' + container.settings.netPort);
        });

    }

    sp.on('data', function(data) {
        //Push the incoming array onto the end of the dequeue array
        bufferArrayOfArrays.push(Array.prototype.slice.call(data));

        //console.log('Input: ', JSON.stringify(data.toJSON().data) + '\n');
        //testbufferArrayOfArrays.push(Array.prototype.slice.call(data));

        if (!container.receiveBuffer.processingBuffer) {
            //console.log('Arrays being passed for processing: \n[[%s]]\n\n', testbufferArrayOfArrays.join('],\n['))
            container.receiveBuffer.iterateOverArrayOfArrays()
                //testbufferArrayOfArrays=[]
        }
    });

    sp.on('error', function(err) {
        logger.error('Error opening port: ', err.message)
        process.exit(1)
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
      bufferArrayOfArrays
    }
}
