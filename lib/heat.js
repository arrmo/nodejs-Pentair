//TODO: Move this to a constants.js implementation
const heatModeStr = {
    //Pentair controller sends the pool and spa heat status as a 4 digit binary byte from 0000 (0) to 1111 (15).  The left two (xx__) is for the spa and the right two (__xx) are for the pool.  EG 1001 (9) would mean 10xx = 2 (Spa mode Solar Pref) and xx01 = 1 (Pool mode Heater)
    //0: all off
    //1: Pool heater            Spa off
    //2: Pool Solar Pref        Spa off
    //3: Pool Solar Only        Spa off
    //4: Pool Off               Spa Heater
    //5: Pool Heater            Spa Heater
    //6: Pool Solar Pref        Spa Heater
    //7: Pool Solar Only        Spa Heater
    //8: Pool Off               Spa Solar Pref
    //9: Pool Heater            Spa Solar Pref
    //10: Pool Solar Pref       Spa Solar Pref
    //11: Pool Solar Only       Spa Solar Pref
    //12: Pool Off              Spa Solar Only
    //13: Pool Heater           Spa Solar Only
    //14: Pool Solar Pref       Spa Solar Only
    //15: Pool Solar Only       Spa Solar Only
    0: 'OFF',
    1: 'Heater',
    2: 'Solar Pref',
    3: 'Solar Only'
}


function Heat(poolSetPoint, poolHeatMode, spaSetPoint, spaHeatMode) {
    this.poolSetPoint = poolSetPoint;
    this.poolHeatMode = poolHeatMode;
    this.poolHeatModeStr = heatModeStr[poolHeatMode]
    this.spaSetPoint = spaSetPoint;
    this.spaHeatMode = spaHeatMode;
    this.spaHeatModeStr = heatModeStr[spaHeatMode]
}

module.exports = Heat;
