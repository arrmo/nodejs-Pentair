Dequeue = require('dequeue')


module.exports = function(container) {
    logger = container.logger
    s = container.settings



    var bufferArrayOfArrays =  new Dequeue()

    function push(packet){
      bufferArrayOfArrays.push(packet)
    }

    function pop(){
      return bufferArrayOfArrays.shift()
    }

    function length() {
      return bufferArrayOfArrays.length
    }

return{
    bufferArrayOfArrays,
    push : push,
    pop : pop,
    length : length }
}