import express from 'express'
import mysql from 'mysql'
import cors from 'cors'
import got from 'got';

import {db_insert_with_lat_long} from "./db_commands.js"

const app = express()
app.use(cors())
app.use(express.json())

//Create Connection to Database
const db = mysql.createConnection({
    user: 'root',
    host: 'localhost',
    password: '',
    database: 'MRAPID',
});

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

    //CLARIty
}

//OPENAQ
async function get_loc_and_mes_AQ(){
    try {
        const URL = 'https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&location_id=7002&order_by=lastUpdated&dumpRaw=false';
        const response = await got(URL);
        const data = JSON.parse(response.body);

        const lat = data.results[0].coordinates.latitude;
        const long = data.results[0].coordinates.longitude;
        const mes = data.results[0].measurements[0].value;

        //inserts into table
        
        db.query('INSERT INTO measurements (lati,longi,pm10) VALUES (?,?,?)',
              [lat,long,mes],
              (err,result) => {
                  if(err){
                      console.log(err)
                  }
              }
          )
    } 
    catch (error) {
        console.log(error.data);
    }

};

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
async function get_mes_Clarity(){
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

        // Example isolating fields for one data point
        const lat = data[0].location.coordinates[1];
        const long = data[0].location.coordinates[0];
        const mes = data[0].characteristics.pm2_5ConcMass.value;

        db.query('INSERT INTO measurements (lati,longi,pm10) VALUES (?,?,?)',
        [lat,long,mes],
        (err,result) => {
            if(err){
                console.log(err)
            }
        }
    )


    } catch (error) {
        console.log(error.data);
    }

};

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
            add_mes.push([data[i].characteristics.temperature.value,"Temperature","Celcius"])
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
async function get_mes_DST(){
    try {
        const URL = 'https://dstech.blynk.cc/external/api/data/get?token=4CxBixmXESEOXLJQECt2P3AvxFwf7-ro&period=DAY&tzName=UTC&sendEvents=true&output=JSON';
        const response = await got(URL);
        const resp = JSON.parse(response.body);

        //Lat and long for 14th street
        const lat = 37.1835;
        const long = -121.7714;
        const mes = resp.data[0].value;

        db.query('INSERT INTO measurements (lati,longi,pm10) VALUES (?,?,?)',
              [lat,long,mes],
              (err,result) => {
                  if(err){
                      console.log(err)
                  }
              }
          )

    } 
    catch (error) {
        console.log(error);
    }


};

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


OPENAQ_db_add();
CLARITY_db_add();

//ENDPAGE