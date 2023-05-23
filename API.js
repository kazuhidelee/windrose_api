//import the got library into your application
import got from 'got';

//fetch data from a specific REST API and prints its body to the terminal
(async () => {
    try {
        const URL = 'https://api.openaq.org/v2/latest?limit=100&page=1&offset=0&sort=desc&radius=1000&city=Detroit-Warren-Livonia&order_by=lastUpdated&dumpRaw=false'; 
        const response = await got(URL);
        const data = JSON.parse(response.body);

        console.log(data);
    } 
    catch (error) {
        console.log(error.data);
    }

})();