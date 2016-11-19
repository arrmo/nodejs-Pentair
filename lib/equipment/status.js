module.exports = function(container) {

    if (container.logModuleLoading)
        container.logger.info('Loading: status.js')

    //var bufferArr = []; //variable to process buffer.  interimBufferArr will be copied here when ready to process
    //var interimBufferArr = []; //variable to hold all serialport.open data; incomind data is appended to this with each read
    var currentStatus = {}; // persistent object to hold pool equipment status.
    var currentStatusBytes = []; //persistent variable to hold full bytes of pool status

    function getCurrentStatus() {
        return currentStatus
    }

    function getCurrentStatusBytes() {
        return currentStatusBytes
    }

    function setCurrentStatusBytes(data, counter) {
        //TODO:  Is this right?  And do we even need to store this anymore?


        if (currentStatusBytes.length === 0) {
            if (container.settings.logConfigMessages) logger.verbose('\n ', printStatus(data));
        } else
        if (data !== currentStatusBytes) {
            if (container.settings.logConfigMessages) {
                logger.verbose('-->EQUIPMENT Msg# %s   \n', counter)
                logger.verbose('Msg# %s: \n', counter, printStatus(currentStatusBytes, data));
            }
            currentStatusBytes.splice(0, currentStatusBytes.length, data)

        } else //data ===currentStatusBytes
        {
            //do nothing?
        }

    }



    function printStatus(data1, data2) {

        var str1 = ''
        var str2 = ''
        var str3 = ''

        str1 = JSON.parse(JSON.stringify(data1));
        if (data2 != null) str2 = JSON.parse(JSON.stringify(data2));
        str3 = ''; //delta
        spacepadding = '';
        spacepaddingNum = 19;
        for (var i = 0; i <= spacepaddingNum; i++) {
            spacepadding += ' ';
        }


        header = '\n';
        header += (spacepadding + '               S       L                                           V           H   P   S   H       A   S           H\n');
        header += (spacepadding + '               O       E           M   M   M                       A           T   OO  P   T       I   O           E\n');
        header += (spacepadding + '           D   U       N   H       O   O   O                   U   L           R   L   A   R       R   L           A                           C   C\n');
        header += (spacepadding + '           E   R   C   G   O   M   D   D   D                   O   V           M   T   T   _       T   T           T                           H   H\n');
        header += (spacepadding + '           S   C   M   T   U   I   E   E   E                   M   E           D   M   M   O       M   M           M                           K   K\n');
        header += (spacepadding + '           T   E   D   H   R   N   1   2   3                       S           E   P   P   N       P   P           D                           H   L\n');
        //                    e.g.  165, xx, 15, 16,  2, 29, 11, 33, 32,  0,  0,  0,  0,  0,  0,  0, 51,  0, 64,  4, 79, 79, 32,  0, 69,102,  0,  0,  7,  0,  0,182,215,  0, 13,  4,186


        //compare arrays so we can mark which are different
        //doing string 2 first so we can compare string arrays
        if (data2 != null || data2 != undefined) {
            for (var i = 0; i < str2.length - 1; i++) {
                if (str1[i] == str2[i]) {
                    str3 += '    '
                } else {
                    str3 += '   *'
                }
                str2[i] = pad(str2[i], 3);
            }
            str2 = ' New: ' + spacepadding.substr(6) + str2 + '\n'
            str3 = 'Diff:' + spacepadding.substr(6) + str3 + '\n'
        } else {
            str2 = ''
        }


        //format status1 so numbers are three digits
        for (var i = 0; i < str1.length - 1; i++) {
            str1[i] = pad(str1[i], 3);
        }
        str1 = 'Orig: ' + spacepadding.substr(6) + str1 + '\n';

        str = header + str1 + str2 + str3;

        return (str);
    }




    if (container.logModuleLoading)
        container.logger.info('Loaded: status.js')

    return {
        getCurrentStatus: getCurrentStatus,
        getCurrentStatusBytes: getCurrentStatusBytes,
        setCurrentStatusBytes: setCurrentStatusBytes,
        currentStatus,
        currentStatusBytes
    }


}
