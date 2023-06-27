// Get Access Token

const client_id = "PKJqYB0yeGrZu9RE4JJaBaVZzC0OLHDe5nDZ9m7T0mc0tG2a"
const secret = "XZZDwi2ElaOTldFTo4NwYJdfh2Z21R8hFwf9uqGHFzWNE52yCpeYx263v5rNFMSs"
fetch("https://api-prd.tsilink.com/api/v3/external/oauth/client_credential/accesstoken?grant_type=client_credentials", {
  method: "POST",
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: "client_id=" + client_id + "&client_secret=" + secret,
}).then((response) => response.json())
  .then((json) => fetch("https://api-prd.tsilink.com/api/v3/external/devices", {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + json.access_token, // "Authorization": "Bearer [access_token]",
        "Accept": "application/json",
      },
  }).then((response) => response.json())
    .then((json) => console.log(json)));