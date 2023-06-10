# Diont

Easy Service Discovery on Local Networks in pure Javascript.

## Used in

-   [Sniper](https://lunarline.com/sniper) A real-time, collaborative penetration testing framework

## Features

-   100% javascript: no external dependencies
-   100% complete: no node dependencies
-   allows for transmitting extra, arbitrary service information
-   includes examples
-   also available for Cordova/Phonegap as [Diont for Cordova](https://github.com/willemmulder/Diont-for-Cordova)

## Installation

Install the plugin with npm using this command

```shell
npm install diont
```

## Get started (see example folder for more)

```typescript
import Diont, { IService } from 'diont'

const diont = Diont()

// ======
// Listen for announcements and renouncements in services
// ======
diont.on('serviceAnnounced', function (serviceInfo) {
	// A service was announced
	// This function triggers for services not yet available in diont.getServiceInfos()
	// serviceInfo is an Object { isOurService : Boolean, service: Object }
	// service.name, service.host and service.port are always filled
	console.log('A new service was announced', serviceInfo.service)
	// List currently known services
	console.log('All known services', diont.getServiceInfos())
})

diont.on('serviceRenounced', function (serviceInfo) {
	console.log('A service was renounced', serviceInfo.service)
	console.log('All known services', diont.getServiceInfos())
})

// ======
// Announce our own service
// ======
const service: IService = {
	name: 'TestServer 1',
	host: '127.0.0.1', // when omitted, defaults to the local IP
	port: '1231',
	// any additional information is allowed and will be propagated
}

const serviceId = diont.announceService(service)

// Renounce after 5 seconds
setTimeout(function () {
	if (!serviceId) return

	diont.renounceService(serviceId)
}, 5000)
```

## Trouble shooting

If service-messages are not propagated properly (especially on wifi connections), there's a plenty of trouble in Wifi routers that might cause it (see http://superuser.com/questions/730288/why-do-some-wifi-routers-block-multicast-packets-going-from-wired-to-wireless).

### Manual TTL

Diont supports manual setting of the TTL. From experience, the default TTL of 1 does not always cause routers to forward the service-messages to the whole network, so you might want to try higher values and see if that works.

```javascript
import Diont from 'diont'

const diont = Diont({
	ttl: 10,
})
```

### Broadcast

Diont can also use `broadcast` instead of `multicast` to send its messages, which should work a little more reliable, but clutters the network a bit more. You can use `broadcast` like this:

```javascript
import Diont from 'diont'

const diont = Diont({
	broacast: true,
})
```

### Refreshing Services

If you're experiencing a situation where Diont [stops working after awhile](https://github.com/willemmulder/Diont/issues/2) you might actually just need to trigger a manual query.

```typescript
diont.queryForServices()
```

This causes Diont to send a UDP packet to the network with event "query". Diont servers are designed to take this event and re-broadcast their registered services. This re-broadcasting does not happen automatically on an interval -- so if you need that you must use this method.

## Suggested reads

-   Nice blogpost with considerations about service discovery and how to do them. http://hintjens.com/blog:32
-   Another UDP discovery library by the friendly mafintosh. https://github.com/mafintosh/polo
-   Pure javascript implementation of Multicast DNS by the same mafintosh. https://github.com/mafintosh/multicast-dns

## License

**This software is licensed under "MIT"**

> Copyright (c) 2015 Willem Mulder
>
> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
