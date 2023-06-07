/* List of public monitors, waiting for access permissions 
 * Name: Datasource ID
 * ------------------------
 * DP4TH: DEKVS8386
 * Military Park: DJNUW3797
 * Detroit-SW: DCPXR1876
 * Trinity: DJIFY1059
 * NMH48217: DICXP6694
 */

/* List of our 8 Clarity monitors
 * Device ID
 * ----------
 * AT9BM6VV
 * ALQ1TJN6
 * AXPPQ0QF
 * AW2JHDG8
 * AK9VQ3KV
 * AHKQKKTX
 * A6X7ZXF0
 * A5GGSW99
 */

// fetch data from 4 of our Clarity monitors, print example data to terminal
(async () => {
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

        // All data from multiple monitors, sorts by time most to least recent
        console.log(data);

        // Example isolating fields for one data point
        console.log('Time: ' + data[0].time);
        console.log('Location longitude: ' + data[0].location.coordinates[0]);
        console.log('Location latitude: ' + data[0].location.coordinates[1]);
        console.log('PM 2.5 Concentration (microgram/m3): ' + data[0].characteristics.pm2_5ConcMass.value);


    } catch (error) {
        console.log(error.data);
    }

})();