//DST information, such as Sensors IDs, locations, etc, stored here in global vars


//Sensor by ID
export const DST_Sensors = [
    '4CxBixmXESEOXLJQECt2P3AvxFwf7-ro',
    '6-bKPRHd9-nnJIyc42pCD2M_MbRnleXq',
    'WeBVmyQ49aMH6BbdH25B1wKleSsigyit',
    'MoKpBWWsEm7hfAaLC_yKOwR1Wh3woMvw',
    'PDPpH0pXXIhzOBPqIks30OoNPFFZi1fL',
    'i6bTtM_KrbCGTq7Eg06ZXtopUOUNrHJb',
    'fyhjiwaiIWfwQvw7-WLp88ngA6mLCkwA',
    'iOYFmSXb3fgXlNIGfEnCVD76vVJ1Dcs3',
    'zTbbd_PIkP0GbGSrUlaRENOjlVmYsqUv',
    'UJAP0ynm2WFA55mP09y9xo-VfocL-6Nn',
] 

//Sensor locations, indexes match with vector above
export const DST_Sensor_Locations = [
    ['37.1835','-121.7714'],
    ['39.0469','-77.4903'],
    ['39.0469','-77.4903'],
    ['37.1835','-121.7714'],
    ['37.1835','-121.7714'],
    ['42.3068','-83.7059'],
    ['34.0544','-118.244'],
    ['39.0469','-77.4903'],
    ['42.3068','-83.7059'],
    ['42.3068','-83.7059'],
]

//All allowable parameters inside database
export const DST_params = {
    'Black Carbon': 'ug/m3',                  
    'GAS1':         'ppm', // CO         
    'GAS2':         'ppm', // NO2               
    'PM1':          'ug/m3',                 
    'PM2_5':        'ug/m3',                  
    'PM4':          'ug/m3',                 
    'PM10':         'ug/m3',                 
    'Ambient Relative Humidity': '%',    
    'Ambient Temperature':      'Celsius',                    
}

