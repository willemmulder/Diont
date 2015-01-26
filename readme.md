# Diont

Easy Service Discovery on Local Networks in pure Javascript.


## Features
* 100% javascript: no external dependencies
* 100% complete: no node dependencies
* allows for transmitting extra, arbitrary service information
* includes examples
* also available for Cordova/Phonegap as [Diont for Cordova](https://github.com/willemmulder/Diont-for-Cordova)

## Installation
Install the plugin with npm using this command

```shell
npm install diont
```

## Get started (see example folder for more)
```javascript
var diont = require('diont')();

// ======
// Listen for announcements and renouncements in services
// ======
diont.on("serviceAnnounced", function(serviceInfo) {
	// A service was announced
	// This function triggers for services not yet available in diont.getServiceInfos()
	// serviceInfo is an Object { isOurService : Boolean, service: Object }
	// service.name, service.host and service.port are always filled
	console.log("A new service was announced", serviceInfo.service);
	// List currently known services
	console.log("All known services", diont.getServiceInfos());
});

diont.on("serviceRenounced", function(serviceInfo) {
	console.log("A service was renounced", serviceInfo.service);
	console.log("All known services", diont.getServiceInfos());
});

// ======
// Announce our own service
// ======
var service = {
	name: "TestServer 1",
	host: "127.0.0.1", // when omitted, defaults to the local IP
	port: "1231"
	// any additional information is allowed and will be propagated
};
diont.announceService(service);

// Renounce after 5 seconds
setTimeout(function() {
	diont.renounceService(service);
}, 5000);
```

## Trouble shooting
If service-messages are not propagated properly (especially on wifi connections), there's a plenty of trouble in Wifi routers that might cause it (see http://superuser.com/questions/730288/why-do-some-wifi-routers-block-multicast-packets-going-from-wired-to-wireless). 

Diont supports manual setting of the TTL. From experience, the default TTL of 1 does not always cause routers to forward the service-messages to the whole network, so you might want to try higher values and see if that works.

```javascript
var diont = require('diont')({
	ttl: 10
});
```

Diont can also use `broadcast` instead of `multicast` to send its messages, which should work a little more reliable, but clutters the network a bit more. You can use `broadcast` like this:

```javascript
var diont = require('diont')({
	broacast: true
});
```