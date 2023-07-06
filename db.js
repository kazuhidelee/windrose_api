import express from 'express'
import mysql from 'mysql'
import cors from 'cors'
import got from 'got';

import { DST_Sensors,DST_Sensor_Locations,DST_params } from './DST.js';

const app = express()
app.use(cors())
app.use(express.json())

//Create Connection to Database

    // AWS
    /*
    const db = mysql.createConnection({
        user: 'admin',
        host: 'mrapid-db-instance.csicgkuu36em.us-east-1.rds.amazonaws.com',
        password: 'mrapid123',
        database: 'MRAPID',
    });
    */

    // MYSQL PHP ADMIN
    /*
    */
    const db = mysql.createConnection({
        user: 'root',
        host: 'localhost',
        password: '',
        database: 'MRAPID',
    });

//Create Connection to Database

// GLOBAL VARS

    // 3 Character Source Code to Source Conversion
    const source_dict = {
        'OAQ' : 'OPENAQ',
        'CLA' : 'CLARITY',
        'DST' : 'DST',
        'TSI' : 'BLUESKY TSI',
    }

    // ALL SENSORS BY THEIR RESPECTIVE API IDS (API ID : [Sensor_name,Sensor_id])
        //sensor ID = (2 digit AQS State ID) + ( 3 digit AQS County ID) + (4 digit sensor ID) + (1 letter for source) = 10 digits
        //sensor ID = XX XXX XXXX X = XXXXXXXXXX
        // O = OAQ, C = CLA, D = DST, T = TSI
    const sensor_locations = {

        //OPENAQ (0-99)
        'ALLEN PARK' : ['OAQ : ALLEN PARK',"261630000O"],
        'PORT HURON' : ['OAQ : PORT HURON',"261470001O"],
        'NMH48217' : ['OAQ : NMH48217',"261630002O"],
        'WARREN' : ['OAQ : WARREN',"260990003O"],
        'NEW HAVEN' : ['OAQ : NEW HAVEN',"260990004O"],
        'DEARBORN' : ['OAQ : DEARBORN',"261630005O"],
        'OAK PARK' : ['OAQ : OAK PARK',"261250006O"],
        'DETROIT - E 7 MILE' : ['OAQ : DETROIT - E 7 MILE',"261630007O"],
        'DETROIT-SW' : ['OAQ : DETROIT-SW',"261630008O"],
        'ELIZA HOWELL-NR' : ['OAQ : ELIZA HOWELL-NR',"261630009O"],
        'TRINITY' : ['OAQ : TRINITY',"261630010O"],
        'DP4TH' : ['OAQ : DP4TH',"261630011O"],
        'MILITARY PARK' : ['OAQ : MILITARY PARK',"261630012O"],

        //CLARITY (100-199)
        'AHKQKKTX' : ['CLA : AHKQKKTX',"261630000C"],
        'AK9VQ3KV' : ['CLA : AK9VQ3KV',"380610001C"], // NORTH DAKOTA ?
        'AT9BM6VV' : ['CLA : EC3',"261630002C"],
        'AXPPQ0QF' : ['CLA : EC2',"261630003C"],
        'AW2JHDG8' : ['CLA : EC1',"261630004C"],
        'A6X7ZXF0' : ['CLA : EC4',"261250005C"],
        'ALQ1TJN6' : ['CLA : EC5',"261630006C"],
        'A5GGSW99' : ['CLA : EC6',"261630007C"],

        //DST (200-299)
        '4CxBixmXESEOXLJQECt2P3AvxFwf7-ro' : ['DST : 101 2236 14TH STREET',"060850000D"], // CALIFORNIA ?
        '6-bKPRHd9-nnJIyc42pCD2M_MbRnleXq' : ['DST : 102 TRINITY',"511070001D"], // VIRGINIA ?
        'WeBVmyQ49aMH6BbdH25B1wKleSsigyit' : ['DST : 103 TRINITY',"511070002D"], // VIRGINIA ?
        'MoKpBWWsEm7hfAaLC_yKOwR1Wh3woMvw' : ['DST : 93 2236 14TH STREET',"060850003D"], // CALIFORNIA ?
        'PDPpH0pXXIhzOBPqIks30OoNPFFZi1fL' : ['DST : RECOVERY PARK',"060850004D"], // CALIFORNIA ?
        'i6bTtM_KrbCGTq7Eg06ZXtopUOUNrHJb' : ['DST : OA 95',"261610005D"],
        'fyhjiwaiIWfwQvw7-WLp88ngA6mLCkwA' : ['DST : 96 ECN',"060370006D"], // CALIFORNIA ?
        'iOYFmSXb3fgXlNIGfEnCVD76vVJ1Dcs3' : ['DST : 99 TRINITY',"511070007D"], // VIRGINIA ?
        'zTbbd_PIkP0GbGSrUlaRENOjlVmYsqUv' : ['DST : ANN ARBOR 2',"261610008D"],
        'Aw_YN3AuW_ek8UEk8GDYEc8XI3TRwH7O' : ['DST : LINWOOD',"261610009D"],

        //TSI (300-399)
        'FBPOWER1' : ['TSI : FBPOWER1',"380530000T"], // NORTH DAKOTA ?
        'FBPOWER2' : ['TSI : FBPOWER2',"380530001T"], // NORTH DAKOTA ?
        'FBPOWER3' : ['TSI : FBPOWER3',"380610002T"], // NORTH DAKOTA ?
        'FBPOWER4' : ['TSI : FBPOWER4',"380530003T"], // NORTH DAKOTA ?
        'FBPOWER5' : ['TSI : FBPOWER5',"380530004T"], // NORTH DAKOTA ?
        'Sanctuary One' : ['TSI : SANCTUARY ONE',"261610005T"],

    }

    // PARAMETERS FOR API TO CONSISTENT PARAMETER IN DATABASE (API parameter name : db parameter name)
    var paramater_conversions = {

        //OPENAQ
        "pm10" : "pm10",
        "pm25" : "pm2.5",
        "o3" : "O3",
        "co" : "CO",
        "no2" : "NO2",
        "so2" : "SO2",
        "bc" : "Black C",
        "co2" : "CO2",
        "pm1" : "pm1",
        "wind_direction" : "Wind_direction",
        "no" : "NO",
        "rh" : "Relative Humidity",
        "nox" : "NOX",
        "ch4" : "CH4",
        "pn" : "Particle Number",
        "o3" : "O3",
        "ufp" : "Ultra-fine-particles",
        "wind_speed" : "Wind Speed",
        "pm" : "PM",
        "ambient_temp" : "Ambient Temperature",
        "pressure" : "Pressure",
        "pm25-old" : "pm2.5",
        "relativehumidity" : "Relative Humidity",
        "temperature" : "Temperature",
        "humidity" : "Humidity",
        "ozone" : "O3",
        "pm4" : "pm4",
        "so4" : "SO4",

        //CLARITY (already done in db add function)

        //DST
        "Black Carbon" : "Black C",
        "GAS1" : "CO",
        "GAS2" : "NO2",
        "PM1" : "pm1",
        "PM2_5" : "pm2.5",
        "PM4" : "pm4",
        "PM10" : "pm10",
        "Ambient Relative Humidity" : "Relative Humidity",
        "Ambient Temperature" : "Temperature",

        //TSI
        "PM 1.0" : "pm1",
        "PM 2.5" : "pm2.5",
        "PM 4.0" : "pm4",
        "PM 10" : "pm10",
        "NC 0.5" : "pm0.5",
        "NC 1.0" : "pm1",
        "NC 2.5" : "pm2.5",
        "NC 4.0" : "pm4",
        "NC 10" : "pm10",
        "Typical Particle Size" : "Particle Size",
        "Temperature" : "Temperature",
        "Relative Humidity" : "Relative Humidity",
        "Carbon Dioxide" : "CO2",
        "Carbon Monoxide" : "CO",
        "Barometric Pressure" : "Pressure",
        "Ozone" : "O3",
        "Nitrogen Dioxide" : "NO2",
        "Sulphur Dioxide" : "SO2",
        "PM 2.5 AQI" : "PM2.5 AQI",
        "PM 10 AQI" : "PM10 AQI",
    }


// GLOBAL VARS


//FUNCTIONS START HERE 

    //OPENAQ

        //add measurements to database
        async function OPENAQ_db_add(){
            try {

                //Make API request and create JSON Object
                const URL = 'https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&city=Detroit-Warren-Livonia&order_by=lastUpdated&dumpRaw=false';
                const response = await got(URL);
                let data = JSON.parse(response.body);

                let num_locations = data.meta.found;

                //console.log(data)
                
                for(let i = 0; i < num_locations; i++){

                    const loc = data.results[i].location;
                    const sensor_name = sensor_locations[loc][0]
            
                    //add measurements for each location in to table
                    for(let j = 0; j < data.results[i].measurements.length; j++){

                        let val = data.results[i].measurements[j].value;
                        let parameter = paramater_conversions[data.results[i].measurements[j].parameter];
                        let time = data.results[i].measurements[j].lastUpdated;
                        let unit = data.results[i].measurements[j].unit;
                        
                        
                        time = time.substr(0,10) + " " + time.substr(11).substr(0,8)

                        db.query('INSERT INTO measurements (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                        [val,parameter,unit,time,sensor_name],
                        (err,result) => {
                            if(err){
                                console.log(err)
                            }
                            
                        }) 
            
                    }

                    
            
                }

            
            } catch (error) {
                console.log(error.data);
            }

        };

        //add sensors to database (add to "sensors" table)
        async function OPENAQ_sensors_update(){
            try {

                //Make API request and create JSON Object
                const URL = 'https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&city=Detroit-Warren-Livonia&order_by=lastUpdated&dumpRaw=false';
                const response = await got(URL);
                let data = JSON.parse(response.body);

                //console.log(data);
                let num_locations = data.meta.found;
                
                
                for(let i = 0; i < num_locations; i++){
            
                    const loc = data.results[i].location;
                    const sensor_name = sensor_locations[loc][0];
                    const sensor_id = sensor_locations[loc][1];

                    const source = 'OPENAQ';
                    const lat = data.results[i].coordinates.latitude;
                    const long = data.results[i].coordinates.longitude;

                    db.query('INSERT INTO sensors (sensor_name,sensor_id,source,latitude,longitude) VALUES (?,?,?,?,?)',
                        [sensor_name,sensor_id,source,lat,long],
                        (err,result) => {
                            if(err){
                            console.log(err)
                            }

                        }
                    )
                        
                }
                
            
            } catch (error) {
                console.log(error.data);
            }

        };
    
    //OPENAQ

    //Clarity 
        
        //add measurements to database
        async function CLARITY_db_add(){
            try {
                // in URL, use parameter "code" for Device ID and "datasourceId" for Datasource ID
                //const URL = 'https://clarity-data-api.clarity.io/v1/measurements?code=AT9BM6VV,ALQ1TJN6,AXPPQ0QF,AW2JHDG8&startTime=2023-06-01T00:00:00Z&endTime=2023-06-01T1:00:00Z';
                const URL = 'https://clarity-data-api.clarity.io/v1/measurements?code=AT9BM6VV,ALQ1TJN6,AXPPQ0QF,AW2JHDG8,AK9VQ3KV,AHKQKKTX,A6X7ZXF0,A5GGSW99&startTime=2022-06-01T00:00:00Z&endTime=2023-06-01T1:00:00Z&outputFrequency=hour';
                //const URL = 'https://clarity-data-api.clarity.io/v1/devices';
                const APIkey = 'WIISszA2VDYFNB37ZdpkHoX07UHIvPSBkxc2npSR';

                const res = await fetch(URL, {
                    method: 'GET',
                    headers: {
                        'x-api-key': APIkey
                    }
                });

                const data = await res.json();
                //console.log(data);
                
                for(let i = 0; i < data.length; i++){

                    let code = data[i].deviceCode;
                    const sensor_name = sensor_locations[code][0];
                    let time = data[i].time;
                    time = time.substr(0,10) + " " + time.substr(11).substr(0,8);
                    //console.log(time);

                    let add_mes = [[],[]];
                    add_mes.push([data[i].characteristics.relHumid.value,"Humidity","%"])
                    add_mes.push([data[i].characteristics.temperature.value,"Temperature","Celsius"])
                    add_mes.push([data[i].characteristics.no2Conc.calibratedValue,"NO2","ppb"])

                    add_mes.push([data[i].characteristics.pm2_5ConcNum.value,"pm2.5","particles/cm³"])
                    add_mes.push([data[i].characteristics.pm2_5ConcMass.calibratedValue,"pm2.5","µg/m³"])
                    add_mes.push([data[i].characteristics.pm1ConcNum.value,"pm1","particles/cm³"])

                    add_mes.push([data[i].characteristics.pm1ConcMass.value,"pm1","µg/m³"])
                    add_mes.push([data[i].characteristics.pm10ConcNum.value,"pm10","particles/cm³"])
                    add_mes.push([data[i].characteristics.pm10ConcMass.calibratedValue,"pm10","µg/m³"])

                    for(let j = 0; j < add_mes.length; j++){

                        if(add_mes[j][0]){

                            db.query('INSERT INTO measurements (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                [add_mes[j][0],add_mes[j][1],add_mes[j][2],time,sensor_name],
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

        //add sensors to database (add to "sensors" table)
        async function CLARITY_sensors_update(){
            try {
                const URL = 'https://clarity-data-api.clarity.io/v1/devices';
                const APIkey = 'WIISszA2VDYFNB37ZdpkHoX07UHIvPSBkxc2npSR';

                const res = await fetch(URL, {
                    method: 'GET',
                    headers: {
                        'x-api-key': APIkey
                    }
                });

                const data = await res.json();
                

                for(let i = 0; i < data.length; i++){
                    let loc = data[i].code;
                    const source = 'CLARITY';
                    const sensor_name = sensor_locations[loc][0];
                    const sensor_id = sensor_locations[loc][1];
                    const long = data[i].location.coordinates[0];
                    const lat = data[i].location.coordinates[1];

                    db.query('INSERT INTO sensors (sensor_name,sensor_id,source,latitude,longitude) VALUES (?,?,?,?,?)',
                    [sensor_name,sensor_id,source,lat,long],
                    (err,result) => {
                        if(err){
                            console.log(err)
                        }

                    })


                }

            
            } catch (error) {
                console.log(error.data);
            }
        };

    //CLARITY

    //DST

        //Checks if the device is connected
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


        };

        //Fetches device measurements
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

        };

        //Adds measurements to db (utiliizes abode 2 functions)
        async function DST_db_add(){

            //ARRAY OF DST SENSORS

            //all parameters we will pull from DST (param to unit HASHMAP)
            for(let i = 0; i < DST_Sensors.length ; i ++){
                devices_connected_DST(DST_Sensors[i]).then((response) => {
                    if(response){ //if the device is connected
                        
                        fetch_device_measurement_DST(DST_Sensors[i]).then((response) => { //fetch the measurements from the sensor in the last hour
                            
                            const sensor_name = sensor_locations[DST_Sensors[i]][0];

                            for(let j = 0; j < response.data.length; j++){ //iterate through all recorded measurements

                                if(response.data[j].data_stream_name in DST_params){ // if the parameter is going inside the database (see DST_params)

                                    let time = response.data[j].ts;
                                    
                                    time = new Date(time * 1000);

                                    time = time.getFullYear() + "-" + time.getMonth() + "-" + time.getDay() + " " + 
                                    time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();

                                    let value = response.data[j].value;
                                    let parameter = paramater_conversions[response.data[j].data_stream_name];
                                    let unit = DST_params[response.data[j].data_stream_name]

                                    unit = unit == ("ug/m3") ? unit = "µg/m³" : unit; //catch for ug/m3 to using mu and m^3

                                    db.query('INSERT INTO measurements (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                        [value,parameter,unit,time,sensor_name],
                                        (err,result) => {
                                            if(err){
                                                console.log(err)
                                            }
                                        }
                                    )

                                } //ENDIF

                            } //END j loop

                        }); //EN1   `D fetch_device_measurement_DST

                    } //ENDIF
                });
            }
        };

        //add sensors to database (add to "sensors" table)
        async function DST_sensors_update(){

            for(let i = 0; i < DST_Sensors.length ; i ++){
                const code = DST_Sensors[i];

                const sensor_name = sensor_locations[code][0];
                const sensor_id = sensor_locations[code][1];
                const source = 'DST';
                const lat = DST_Sensor_Locations[i][0];
                const long = DST_Sensor_Locations[i][1];

                db.query('INSERT INTO sensors (sensor_name,sensor_id,source,latitude,longitude) VALUES (?,?,?,?,?)',
                [sensor_name,sensor_id,source,lat,long],
                (err,result) => {
                    if(err){
                        console.log(err)
                    }

                })


            }

        };

    //DST

    //TSI
        
        //add measurements to database
        async function TSI_db_add(){

            const client_id = "PKJqYB0yeGrZu9RE4JJaBaVZzC0OLHDe5nDZ9m7T0mc0tG2a"
            const secret = "XZZDwi2ElaOTldFTo4NwYJdfh2Z21R8hFwf9uqGHFzWNE52yCpeYx263v5rNFMSs"
            fetch("https://api-prd.tsilink.com/api/v3/external/oauth/client_credential/accesstoken?grant_type=client_credentials", {
            method: "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: "client_id=" + client_id + "&client_secret=" + secret,
            }).then((response) => response.json())
            .then((json) => fetch("https://api-prd.tsilink.com/api/v3/external/telemetry", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + json.access_token, // "Authorization": "Bearer [access_token]",
                    "Accept": "application/json",
                },
            }).then((response) => response.json())
                .then((json) => {

                    for(let i = 0; i < json.length; i++){
                        let code = json[i].metadata.friendly_name;
                        let sensor_name = sensor_locations[code][0];

                        
                        for(let j = 0; j < json[i].sensors.length; j++){
                            
                            for(let k = 0; k < json[i].sensors[j].measurements.length;k++){
                                const value = json[i].sensors[j].measurements[k].data.value;
                                const parameter = paramater_conversions[json[i].sensors[j].measurements[k].name];
                                let unit = json[i].sensors[j].measurements[k].unit;
                                let time = json[i].sensors[j].measurements[k].data.timestamp;
                                time = time.substr(0,10) + " " + time.substr(11).substr(0,8)

                                //Catches for Unit 
                                unit = (unit == "#/cm³") ? unit = "particles/cm³" : unit; 
                                unit = (unit == "°C") ? unit = "Celsius" : unit;
                                unit = (unit == "inHg") ? unit = "mmHg" : unit;
                                //Catches for Unit 
                                
                                
                                db.query('INSERT INTO measurements (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                    [value,parameter,unit,time,sensor_name],
                                    (err,result) => {
                                        if(err){
                                            console.log(err)
                                        }
                                    }
                                )
                                

                            }

                        }


                    }
                })
            );


        };

        //add sensors to database (add to "sensors" table)
        async function TSI_sensors_update(){

            const client_id = "PKJqYB0yeGrZu9RE4JJaBaVZzC0OLHDe5nDZ9m7T0mc0tG2a"
            const secret = "XZZDwi2ElaOTldFTo4NwYJdfh2Z21R8hFwf9uqGHFzWNE52yCpeYx263v5rNFMSs"

            fetch("https://api-prd.tsilink.com/api/v3/external/oauth/client_credential/accesstoken?grant_type=client_credentials", {
            method: "POST",
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: "client_id=" + client_id + "&client_secret=" + secret,
                }).then((response) => response.json())
                    .then((json) => fetch("https://api-prd.tsilink.com/api/v3/external/devices ", {
                        method: "GET",
                        headers: {
                            "Authorization": "Bearer " + json.access_token, // "Authorization": "Bearer [access_token]",
                            "Accept": "application/json",
                        },
                    }).then((response) => response.json())
                        .then((json) => {

                            for(let i = 0; i < json.length; i++){
                                const id = json[i].metadata.friendlyName;
                                
                                const sensor_name = sensor_locations[id][0];
                                const sensor_id = sensor_locations[id][1];
                                const source = "BLUESKY TSI";
                                const lat = json[i].metadata.latitude;
                                const long = json[i].metadata.longitude;

                                
                                db.query('INSERT INTO sensors (sensor_name,sensor_id,source,latitude,longitude) VALUES (?,?,?,?,?)',
                                    [sensor_name,sensor_id,source,lat,long],
                                    (err,result) => {
                                        if(err){
                                            console.log(err)
                                        }
                                });
                                


                            };
                        
                    })
                );


        };
    
    //TSI

    //Averages

        //calculate hourly means and add to hourly_mean table
        async function hourly_mean_add(){

            db.query('SELECT * FROM `measurements` ORDER BY parameter ASC, time ASC',
                (err,result) => {
                    if(err){
                        console.log(err)
                    }

                let param_before = result[0].parameter;
                let time_before = result[0].time;
                time_before = time_before.getFullYear() + " - " +  time_before.getMonth() + " - " + time_before.getDay() + " - " + time_before.getHours();

                    let sum = 0;
                    let count = 0;
                    let mean = 0;

                for(let i = 0; i < result.length; i++){

                    let source = result[i].sensor_name.substr(0,3);

                    let value = result[i].value;
                    let parameter = result[i].parameter;
                    let unit = result[i].unit;
                    let time = result[i].time;
                    let sensor_name = result[i].sensor_name;

                    let time_tracker = time.getFullYear() + " - " +  time.getMonth() + " - " + time.getDay() + " - " + time.getHours();


                    //console.log(source + "<>" + time.getMonth())

                    if(source == 'OAQ' || source == 'CLA'){
                        
                        db.query('INSERT INTO hourly_mean (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                [value,parameter,unit,time,sensor_name],
                                (err,result) => {
                                    if(err){
                                        console.log(err)
                                    }
                                }
                        )
                        

                    }
                    else{

                        //console.log( (param_before != parameter) || (time_before != time_tracker))

                        if( (param_before != parameter) || (time_before != time_tracker) ){

                
                            //console.log(mean);
                            
                            
                            db.query('INSERT INTO hourly_mean (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                    [mean,param_before,result[i-1].unit,result[i-1].time,"AGGREGATE"],
                                    (err,result) => {
                                        if(err){
                                            console.log(err)
                                        }
                                    }
                            )
                            
                        
                            sum = 0;
                            count = 0;
                            mean = 0;
                            param_before = parameter;
                            time_before = time_tracker;
                        }

                        
                        sum += Number(value);
                        count = count + 1;
                        
                        mean = sum/count;
                        //console.log(sum + " / " + count + " = " + mean);
                    

                    }
                    
                    if(param_before != parameter){
                        param_before = parameter;
                    }

                    if(time_before != time_tracker){
                        time_before = time_tracker;
                    }
                    
                }

            });

            
        };

        async function daily_mean_add(){

            db.query('SELECT * FROM `hourly_mean` ORDER BY parameter ASC, time ASC',
                (err,result) => {
                    if(err){
                        console.log(err)
                    }

                    let time_before = result[0].time;
                    time_before = time_before.getFullYear() + " - " +  time_before.getMonth() + " - " + time_before.getDay();

                    let count = 0;
                    let sum = 0;
                    let mean = 0;

                    for(let i = 0; i < result.length; i++){

                        let value = result[i].value;
                        let parameter = result[i].parameter;
                        let unit = result[i].unit;

                        let time = result[i].time;
                        let time_tracker = time.getFullYear() + " - " +  time.getMonth() + " - " + time.getDay();

                        if(time_before != time_tracker){

                            db.query('INSERT INTO daily_mean (value,parameter,unit,time,sensor_name) VALUES (?,?,?,?,?)',
                                    [mean,result[i-1].parameter,result[i-1].unit,result[i-1].time,"AGGREGATE"],
                                    (err,result) => {
                                        if(err){
                                            console.log(err)
                                        }
                                    }
                            )

                            sum = 0;
                            mean = 0;
                            count = 0;
                            time_before = time_tracker;

                        }

                        sum+= Number(value);
                        count++;
                        mean = sum/count;

                    }
                
            

            });

        };

    //Averages

    //Helpers

        //Add every sensor to sensor table in db
        function add_sensors(){
            OPENAQ_sensors_update();
            CLARITY_sensors_update();
            DST_sensors_update();
            TSI_sensors_update();
        }

        //Output latitude and longitude for every sensor
        async function lat_and_long_out(){
            db.query('SELECT * FROM `sensors` ORDER BY sensor_id ASC',
                (err,result) => {
                    if(err){
                        console.log(err)
                    }

                for(let i = 0; i < result.length; i++){
                    let res = result[i]
                    console.log(res.sensor_id + " - " + res.sensor_name + ": " + res.latitude + "," + res.longitude )
                }
            });
        };

    //Helpers

//FUNCTIONS END HERE 

//OPENAQ_db_add();
//CLARITY_db_add();
//DST_db_add();
//TSI_db_add();
//hourly_mean_add();
//daily_mean_add();
//lat_and_long_out();
add_sensors();

/*
db.end(function(error){
    if(error){
        console.log(error);
    }
})
*/

//ENDPAGE