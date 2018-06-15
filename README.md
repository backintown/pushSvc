# pushSvc

A push notification server microservice made using Node, Express, and MongoDB. 

Send push notifications to Android and iOS apps using Firebase Cloud Messaging and Apple Push Notification service. 

## Features
- Easily register your iOS or Android app with the server to send push notifications.
- Send push notifications using http requests to the server.
- Send to all devices or specific devices.

## Setup

### Android/FCM

1. Create a Firebase project for your app.
2. Add your app to your Firebase project and download the Android config json file.
3. Add [Firebase/FCM](https://firebase.google.com/docs/cloud-messaging/android/client) to your app. 
4. Send a post request to the server with your app information (form/multipart). 
    - Required fields:
        - name
        - organizationId
        - appId
        - osPlatform ('iOS' or 'Android', case sensitive)
        - FCMjson
        - FCMServerKey
        - FCMProjectId
5. Send a post request to the server from your app with device information (application/json).
    - Required fields:
        - serialNumber (IMEI, etc)
        - appId
        - osPlatform
        - pushId (Firebase token, see step 3 on how to get token)

### iOS/APNs

1. Set up your iOS app to receive [push notifications](https://developer.apple.com/documentation/usernotifications)
2. Generate your iOS [pem files](https://github.com/node-apn/node-apn/wiki/Preparing-Certificates).
3. Send a post request to the server with your app information.
    - Required fields:
        - name
        - organizationId
        - appId
        - osPlatform
        - iOSCert
        - iOSKey
4. Send a post request to the server from your app with device information.
    - Required fields: same as Android
        - pushId ([APNs app token](https://developer.apple.com/documentation/usernotifications/registering_your_app_with_apns))


## Routes

### APPS - /apis/v1/pushService/apps

- GET - returns all apps in database

- POST - register your app with database

- PUT - update existing apps

- DELETE (/:appId) - delete app (requires osPlatform)

### DEVICES - /apis/v1/pushService/devices

- GET - returns devices in database, must include filters (accountId or appId or both) in request body (json)

- GET (/:serialNumber) - returns device

- POST - register your device with database

- PUT - update existing devices

- DELETE (/:serialNumber) - delete device
 
### NOTIFICATIONS - /apis/v1/pushService/notification

- GET (/logs/:transactionId) - returns logs (requires transactionId)

- POST (/app) - sends notification to all devices (requires osPlatform, appId). returns transactionId.

- POST (/device) - sends notification to one device (requires device serialNumber). returns transactionId.

- POST (/account) - sends notification to one account (multiple devices) (requires appId, accountId, osPlatform). returns transactionId.


## Sample Requests

I used Postman for testing. Feel free to use CURL or other methods.

### Register an app

- [Android](https://imgur.com/fi6ZiJV)

- [iOS](https://imgur.com/RWROVhN)

### Register a device

- [iOS](https://imgur.com/SAOV01j)

### Send notification

- [device (Android)](https://imgur.com/SPLlzUK)

- [get logs](https://imgur.com/OR7ZI3X)

## TODOS

### Documentation

- Write docs
    - Create program flow chart
### Functionality

- Notifications
    - Scheduled delivery
- Logs
    - Include broadcast flag
    - Create update route

### Deployment

- Dockerize server
- Deploy to AWS