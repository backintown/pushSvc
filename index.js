const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const { google } = require('googleapis');

// routes
const appsRoutes = require('./api/routes/apps');
const devicesRoutes = require('./api/routes/devices');
const notificationRoutes = require('./api/routes/notifications');
console.log(process.env.MONGO_PW)
mongoose.connect(`mongodb+srv://user1:${process.env.MONGO_PW}@pushservertest-mwuwk.mongodb.net/test?retryWrites=true`);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/apis/v1/pushService/apps', appsRoutes);
app.use('/apis/v1/pushService/devices', devicesRoutes);
app.use('/apis/v1/pushService/notification', notificationRoutes);
getAccessToken().then(token => console.log(token));

app.get('/', (req, res, next) => {
  res.send('Hello world');
});

app.listen(3000, () => {
  console.log('server start');
})

function getAccessToken() {
  const SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']
  return new Promise(function (resolve, reject) {
    // var key = require('./mytest.json');
    var jwtClient = new google.auth.JWT(
      "firebase-adminsdk-iau8p@mytest-cc974.iam.gserviceaccount.com",
      null,
      "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1E6t9UWROYUWz\nN0GFSkU9A/nwmp/Oger1FHS8zAEGGbp9P1yByP0W3f9BTu3M2pKVbCISLgk9e1ip\n2HSzpD/h/g4Oth9Nd2va0v0bGBr/hulNOxGTRVInfWCn3ULMBGibAEs8AsyeWDR2\nCq4xTFh3I2WT3oAXjC+GjyjKURqhEhNC24TKDkUyFUcFNAQhQHAZTgimneGw6Mrc\nXuOml03Eyqeup/QZrPU8lcXKA/ml0uv4xQaddv47jkkFO0au8tRc5KGCHSoEa/IS\nSDe6jZgCVA1lg9tWRZ/i6N5ZW5Axl0ZwpPWuLZTUXa8P9rNlr9rtpBbxFGqjXLCC\nI1Xq40vbAgMBAAECggEASgGVCC3YwhQNaZa+x5w4OhzC7Sw0/jCo96t5nqP+EyE2\nz/OyejTMA6mNpoJ8vEnkuP8t2aJJEoC0Fw6pe7Y4icPMuQSEPKP/R7sNySIL/r2D\n4pWutDMTxaH/e/v5TerLWfY/yXIXcOv53Pi2gt2CFoc3/7xjO7yGvAcMk8ucB5Hs\noJFUFvu4qt3+j2q8q3eWs4zw790RxFlZ+lUdJmak6I0hTztomEzHCTR6DLA8WNh3\n7/hVuklTWbGnTidsa4yVsP6BjkLaxAB4pO0xYK8fyN3jmm+S57aN7CtJHAPxnSGA\n0b9rtPSRDyc7GdZuwPQ14NcjkqH9grNbv3fMyricaQKBgQDYmLqY0jT5ACO9StKI\nnLx8I5Up3csHsescVNRuX7c9xA2rmjJyyn0CmJ4qVRdw+FQ5WBzhTQXa8wgCn4x3\ngw+5HcRkRwlQxO3vZ7QHPSPa+lZg8xT3vZlwEq/Q8fwDzP0WqYCyzAqye14u1t1K\ncYNNH3i6Q7qX5TaFWpBXpRpNHQKBgQDWBLmz/IPFJnpGOnpyMnEkW6+YQFdaF6hv\nO4m8lzVv/1eqgJ/7DoHt+f/t8lrirkVVz0Q+QOt/Xtdoy/r1aV79VdocIpPX9YiJ\nZVXwHHTA+oSQnyuoX/QXjJ67ndxMLzPzGCi18/8tSCUvG21qX8r2hwDf5Tz/BDeP\nIO0qpy7DVwKBgBojjFlG/PeTybxdXDz6VVDR5n1v88GQ+iOoJR7Q1EdS8qdj63So\n9R8sFeJb9IFApsFo3ctexTcgHzZZ1NTTb0FS01GatQgXS/OZW0OIYFxb27LFgyFG\ns06wIqGfol8/DMgAWrS5JQ1XEA2tBnWmb0cOZj5sUAdmtQaw4DyDg0INAoGBAML1\nAwWGXbLWXkRjOO+WK6LnMooK8ofLTVAmeE4noDIp9H4JNbLJgGp8djsXrtsXzWlh\nqdTb5qrchnWcezvbhQBZmJpQlUUBEiO3ABX+lgzFKMVleauj3QMmweI+51MvHK+x\nrkQxxJ5HPjgvT/i60nTIfm92r53PBZ2IbQORz/N5AoGARVG/+huHuYRqfmFy6IDY\nunLfHw4nW0buXymSZtPI6ObjO9gdRRqUHfN/cOV4/E7k15ILacfaTTy+1YsZkuda\nU54tC2kEOWIRl47cTBgmkMVcLTtS03HrN3ti68PJOSPj0Hswv7IM0J3tevM8hNGe\n4yaRdaAswK+lcHSp29cYuB8=\n-----END PRIVATE KEY-----\n",
      SCOPES,
      null
    );
    jwtClient.authorize(function (err, tokens) {
      if (err) {
        reject(err);
        return;
      }
      resolve(tokens.access_token);
    });
  });
}