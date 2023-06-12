import express from 'express'
import mysql from 'mysql'
import cors from 'cors'
import got from 'got';

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

//ENDPAGE