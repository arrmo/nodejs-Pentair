Dequeue = require('dequeue')


module.exports = function(container) {
    var logger = container.logger
    s = container.settings



    var bufferArrayOfArrays =  new Dequeue()

    function push(packet){
      var packetArr = packet.toJSON().data
      //console.log(packetArr)
      bufferArrayOfArrays.push(packetArr)

      if (!container.receiveBuffer.getProcessingBuffer()) {
          //console.log('Arrays being passed for processing: \n[[%s]]\n\n', testbufferArrayOfArrays.join('],\n['))
          container.receiveBuffer.iterateOverArrayOfArrays()
              //testbufferArrayOfArrays=[]
      }

    }

    function pop(){
      return bufferArrayOfArrays.shift()
    }

    function length() {
      return bufferArrayOfArrays.length
    }

return{
    push : push,
    pop : pop,
    length : length }
}
