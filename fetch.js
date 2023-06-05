/*
 This file is supposed to run get requests on a list of api links every x amount of time (currently set to 15 sec because testing)
 then print the results into the file temp_out.txt. 

 Theoretically it sends out the get requests concurrently and processes the promises after all are fulfilled/rejected but 
 that hasn't really been tested yet.

 to run, do a 'npm install' then 'node fetch.js'
*/
// import express from 'express';
import axios from 'axios';
import fs from 'fs';

/*
 I didn't add all the dst sensors but each sensor is the same link with a different token(authtoken under device 
 info in dstech website).

 The DST links currently pull minute averages from the last hour and pull every single type of data 
 (including irrelevant stuff like battery voltage); I couldn't figure out how to pull only some types of data at a time.
 
 To change the time frame of data pulled, change period to hour, day, week, month, or three months
 To change how long the data is averaged over, change granularityType to raw, minute, hourly, or daily

 I couldn't figure out how to get location. 
*/
const apis = [`https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&city=Detroit-Warren-Livonia&order_by=lastUpdated&dumpRaw=false`, 
              'https://dstech.blynk.cc/external/api/data/get?token=fyhjiwaiIWfwQvw7-WLp88ngA6mLCkwA&granularityType=MINUTE&period=HOUR&tzName=America%2FDetroit&sourceType=AVG&output=JSON',
              'https://dstech.blynk.cc/external/api/data/get?token=zTbbd_PIkP0GbGSrUlaRENOjlVmYsqUv&granularityType=MINUTE&period=HOUR&tzName=America%2FDetroit&sourceType=AVG&output=JSON']
            

//setinterval counter, delete later 
var num = 0
  
 
setInterval( () => {
  num++;
  // make concurrent api calls
  const requests = apis.map((request) =>
    axios.get(request)
  );
  Promise.allSettled(requests)
    .then((results) => results.forEach((result) => {
      if (result['status'] == 'fulfilled'){
        // console.log(num)
        // console.log((result['value']['data']))
        var output = num + ': \n' + JSON.stringify(result['value']['data']) + '\n' 
        fs.appendFile('temp_out.txt', output, function (err) {
          if (err) throw err;
        });
      }
    }))
    .catch((err) => {
      console.log("error :(")}
    );
//change time to be every 10 minutes? definitely not staying as every 5 minutes 
}, 3000)

