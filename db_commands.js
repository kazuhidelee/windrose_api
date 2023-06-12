export function db_insert_with_lat_long(datum,column,lat,long){

    let query = 'INSERT INTO measurements (' + column + ') VALUES (?) WHERE lati = ' + lati  
    console.log(query);
    /*
    db.query('INSERT INTO measurements (lati,longi,pm10) VALUES (?,?,?)',
              [lat,long,mes],
              (err,result) => {
                  if(err){
                      console.log(err)
                  }
              }
    )
    */


}