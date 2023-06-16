// Get Access Token
fetch("https://api-prd.tsilink.com/api/v3/external/oauth/client_credential/accesstoken?grant_type=client_credentials", {
  method: "POST",
  headers: {'Content-Type': 'application/x-www-form-urlencoded'},
  body: "client_id=fAGJGmQUCr3zENr7Asy7Q0YeJCXAYIzURkCHILJ2qz7KP90N&client_secret=cKSMDR9GXaKrfpI81xhSmAzgwUiC5CpR2m48dIVp8ad00GTvUtzZXN9BvpDtmsuy",
})
  .then((response) => response.json())
  .then((json) => console.log(json));


// Get Devices 
// fetch("https://api-prd.tsilink.com/api/v3/external/devices", {
//   method: "GET",
//   headers: {
//     "Authorization": "Bearer KStzLMAsNwbAWk3Is3sJJ2DyvpsR", // "Authorization": "Bearer [access_token]",
//     "Accept": "application/json",
//   },
// })
//   .then((response) => response.json())
//   .then((json) => console.log(json));