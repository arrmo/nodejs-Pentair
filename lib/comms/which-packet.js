module.exports = function(container) {


if (container.logModuleLoading)
      container.logger.info('Loading: which-packet.js')


outbound = function(packet){
  //TODO: swap out 96/97 for ctrlString vars
  if (packet[container.constants.packetFields.DEST + 3] === 96 || packet[container.constants.packetFields.DEST + 3] === 97)
    {
      return 'pump'
    }
  else if (packet[0] === 16)
  {
    return 'chlorinator'
  }
  else {
    return 'controller'
  }
}

inbound = function(packet){
  if (packet[container.constants.packetFields.DEST] === 96 || packet[container.constants.packetFields.DEST] === 97)
    {
      return 'pump'
    }
  else if (packet[0] === 16)
  {
    return 'chlorinator'
  }
  else {
    return 'controller'
  }
}

if (container.logModuleLoading)
      container.logger.info('Loaded: which-packet.js')

return {
  outbound: outbound,
  inbound: inbound
}

}
