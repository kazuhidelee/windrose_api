/* List of public monitors
 * Name: Device Code
 * ------------------------
 * DP4TH: R7QRSH6R
 * Military Park: RNVWJ1Q2
 * Detroit-SW: R53ZKFL9
 * Trinity: RRM5KZQT
 * NMH48217: R532W7DP
 */

/* List of our 8 Clarity monitors
 * Device Code
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

// fetch data from 2 of our Clarity monitors, print example data to terminal
(async () => {
    try {
        const URL = 'https://clarity-data-api.clarity.io/v1/measurements?code=AT9BM6VV,ALQ1TJN6,AXPPQ0QF,AW2JHDG8,AK9VQ3KV,AHKQKKTX,A6X7ZXF0,A5GGSW99&startTime=2023-06-01T00:00:00Z&endTime=2023-06-01T1:00:00Z';
        // Using Batterman's API key below. Ecology Center's is '5UbTU5080oq7M0GZjMPUFIq0jOIAoIO9j7CTjzAA'. Either should work
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