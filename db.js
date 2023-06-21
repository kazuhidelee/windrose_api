import express from 'express'
import mysql from 'mysql'
import cors from 'cors'
import got from 'got';

//import {db_insert_with_lat_long} from "./db_commands.js"

const app = express()
app.use(cors())
app.use(express.json())


//Create Connection to Database
const db = mysql.createConnection({
    user: 'admin',
    host: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com',
    password: 'mrapid123',
    database: 'MRAPID',
});

// GLOBAL VARS


/*
Eventual data dictionary (Its a goddamn Hashmap, I hate Javascript), 
probably to map the different units/paramters from the different API's
to one unit/parameter that will go into the database.
*/
var data_dict = {
    //OPENAQ
    "pm10µg/m³" : "pm10_mass_conc",
    "coppm" : "co_conc",
    "o3ppm" : "o3_conc",
    "so2ppm" : "so2_conc ",
    "pm25µg/m³" : "pm2.5_mass_conc",
    "no2ppm" : "no2_conc",
    "noppm" : "no_conc",
    "noxppm" : "nox_conc",

    //CLARITY

    //DST
}


// FUNCTIONS START HERE 

//OPENAQ
async function OPENAQ_db_add(){
    try {

        //Make API request and create JSON Object
        const URL = 'https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&city=Detroit-Warren-Livonia&order_by=lastUpdated&dumpRaw=false';
        const response = await got(URL);
        const data = JSON.parse(response.body);

        //Loop through all the locations in Detroit
        let num_locations = data.meta.found;

        for(let i = 0; i < num_locations; i++){

            let lat = data.results[i].coordinates.latitude;
            let long = data.results[i].coordinates.longitude;

            //add measurements for each location in to table
            for(let j = 0; j < data.results[i].measurements.length; j++){
                let val = data.results[i].measurements[j].value;
                let parameter = data.results[i].measurements[j].parameter;
                let time = data.results[i].measurements[j].lastUpdated;
                let unit = data.results[i].measurements[j].unit;
                
                //date = time.substring(0,10);
            
 
                db.query('INSERT INTO measurements (lati,longi,value,parameter,unit) VALUES (?,?,?,?,?)',
                    [lat,long,val,parameter,unit],
                    (err,result) => {
                        if(err){
                        console.log(err)
                        }
                    }
                )

            }

        }
    
    } catch (error) {
        console.log(error.data);
    }

};

//Clarity 
async function CLARITY_db_add(){
    try {
        // in URL, use parameter "code" for Device ID and "datasourceId" for Datasource ID
        const URL = 'https://clarity-data-api.clarity.io/v1/measurements?code=AT9BM6VV,ALQ1TJN6,AXPPQ0QF,AW2JHDG8&startTime=2023-06-01T00:00:00Z&endTime=2023-06-01T1:00:00Z';
        const APIkey = 'WIISszA2VDYFNB37ZdpkHoX07UHIvPSBkxc2npSR';

        const res = await fetch(URL, {
            method: 'GET',
            headers: {
                'x-api-key': APIkey
            }
        });
        const data = await res.json();

        for(let i = 0; i < data.length; i++){
            let lat = data[i].location.coordinates[0];
            let long = data[i].location.coordinates[1];
            let time = data[i].time; //didnt put this in yet becauce db's are finnicky with DATETIME formats

            let add_mes = [[],[]];
            add_mes.push([data[i].characteristics.relHumid.value,"Humidity","%"])
            add_mes.push([data[i].characteristics.temperature.value,"Temperature","Celsius"])
            add_mes.push([data[i].characteristics.no2Conc.calibratedValue,"no2","ppb"])

            add_mes.push([data[i].characteristics.pm2_5ConcNum.value,"pm2.5","particles/cm3"])
            add_mes.push([data[i].characteristics.pm2_5ConcMass.calibratedValue,"pm2.5","ug/m3"])
            add_mes.push([data[i].characteristics.pm1ConcNum.value,"pm1","particles/cm3"])

            add_mes.push([data[i].characteristics.pm1ConcMass.value,"pm1","ug/m3"])
            add_mes.push([data[i].characteristics.pm10ConcNum.value,"pm10","particles/cm3"])
            add_mes.push([data[i].characteristics.pm10ConcMass.calibratedValue,"pm10","ug/m3"])

            for(let j = 0; j < add_mes.length; j ++){

                if(add_mes[j][0]){

                    db.query('INSERT INTO measurements (lati,longi,value,parameter,unit) VALUES (?,?,?,?,?)',
                        [lat,long,add_mes[j][0],add_mes[j][1],add_mes[j][2]],
                        (err,result) => {
                            if(err){
                            console.log(err)
                            }
                        }
                    )

                }

            }

        }

    } catch (error) {
        console.log(error.data);
    }
};


//DST
async function devices_connected_DST(device_token){
    try {
        const URL = 'https://dstech.blynk.cc/external/api/isHardwareConnected?token=' + device_token;
        const response = await got(URL);
        const resp = JSON.parse(response.body);
        return resp;
        
    } 
    catch (error) {
        console.log(error);
    }


}

async function fetch_device_measurement_DST(device_token){
    try {
       const URL = 'https://dstech.blynk.cc/external/api/data/get?token=' + device_token + '&period=HOUR&tzName=UTC&sendEvents=false&output=JSON';
       const response = await got(URL);
       const resp = JSON.parse(response.body);
       return resp;
    }
    catch (error) {
        console.log(error);
    }

}

async function DST_db_add(){

    //ARRAY OF DST SENSORS
    const DST_Sensors = [
        '4CxBixmXESEOXLJQECt2P3AvxFwf7-ro',
        '6-bKPRHd9-nnJIyc42pCD2M_MbRnleXq',
        'WeBVmyQ49aMH6BbdH25B1wKleSsigyit',
        'MoKpBWWsEm7hfAaLC_yKOwR1Wh3woMvw',
        'PDPpH0pXXIhzOBPqIks30OoNPFFZi1fL',
        'i6bTtM_KrbCGTq7Eg06ZXtopUOUNrHJb',
        'fyhjiwaiIWfwQvw7-WLp88ngA6mLCkwA',
        'iOYFmSXb3fgXlNIGfEnCVD76vVJ1Dcs3',
        'zTbbd_PIkP0GbGSrUlaRENOjlVmYsqUv',
        'Aw_YN3AuW_ek8UEk8GDYEc8XI3TRwH7O',
    ] 
    const DST_Sensor_Locations = [
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

    //all parameters we will pull from DST (param to unit HASHMAP)
    const DST_params = {
        'Black Carbon': 'ug/m3',                  
        'GAS1':         'ppm', //What is GAS 1?          
        'GAS2':         'ppm', //What is GAS 2?                 
        'PM1':          'ug/m3',                 
        'PM2_5':        'ug/m3',                  
        'PM4':          'ug/m3',                 
        'PM10':         'ug/m3',                 
        'Ambient Relative Humidity': '%',    
        'Ambient Temperature':      'Celsius',                    
    }

    for(let i = 0; i < DST_Sensors.length ; i ++){
        devices_connected_DST(DST_Sensors[i]).then((response) => {
            if(response){ //if the device is connected
                
                fetch_device_measurement_DST(DST_Sensors[i]).then((response) => { //fetch the measurements from the sensor in the last hour
                    
                    let lat =  DST_Sensor_Locations[i][0];
                    let long = DST_Sensor_Locations[i][1];

                    for(let j = 0; j < response.data.length; j++){ //iterate through all recorded measurements

                        if(response.data[j].data_stream_name in DST_params){ // if the parameter is going inside the database (see DST_params)

                            let value = response.data[j].value;
                            let parameter = response.data[j].data_stream_name
                            let unit = DST_params[response.data[j].data_stream_name]

                            parameter == "GAS1" ? parameter = "CO" : parameter; //Catch for GAS1
                            parameter == "GAS2" ? parameter = "NO2" : parameter; //Catch for GAS2
    
                            //console.log(value + ' - ' + parameter + ' - ' + unit + ' - ' + lat + ' - ' + long);

                            db.query('INSERT INTO measurements (lati,longi,value,parameter,unit) VALUES (?,?,?,?,?)',
                            [lat,long,value,parameter,unit],
                            (err,result) => {
                                if(err){
                                console.log(err)
                                }
                            }
                            )

                        } //ENDIF

                    } //END j loop

                }); //END fetch_device_measurement_DST

            } //ENDIF
        });
    }
}

//TSI
/*
(async () => {

    try {
        // in URL, use parameter "code" for Device ID and "datasourceId" for Datasource ID
        const URL = 'https://api-prd.tsilink.com/api/v3/external/devices';

        const res = await fetch(URL, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Authorization": "Bearer [PKJqYB0yeGrZu9RE4JJaBaVZzC0OLHDe5nDZ9m7T0mc0tG2a]"
            }
        });

        const data = await res.json();

        

        console.log(data);



    } catch (error) {
        console.log(error.data);
    }

})();

*/

//ENDPAGE