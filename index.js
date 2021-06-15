/**
 * Primary file for the API
 */

// Dependencies
import http from 'http'
import https from 'https'
import querystring from 'querystring'
import { StringDecoder } from 'string_decoder'
import config from './lib/config.js'
import fs from 'fs'
import _data from './lib/data.js'
import handlers from './lib/handlers.js'
import helpers from './lib/helpers.js'

// TESTING
// TODO: Delete after done testing
// _data.create('test', 'newFile', {'foo': 'bar'}, (error) => {
//     console.log('This is an error', error);
// })
// _data.read('test', 'newFile', (error, data) => {
//     console.log('This is an error ', error, ' and this was the data ', data);
// })
// _data.update('test', 'newFile', {'fizz': 'buzz'}, (error) => {
//     console.log('This is an error', error);
// })
// _data.delete('test', 'newFile', (error, data) => {
//     console.log('This is an error ', error, ' and this was the data ', data);
// })

// TODO: Delete after done testing
// helpers.sendTwilioSms('4151234567', 'Hello!', (error) => {
//     console.log('This was the error', error)
// })

const host = 'http://localhost'
const port = 3000;

// Instantiate HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
})

// Start HTTP server
httpServer.listen(config.httpPort, () => {
    console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
})

// Instantiate HTTPS server
let httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
}

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res)
})

// Start HTTPS server
httpsServer.listen(config.httpsPort, () => {
    console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
})
// Server logic for both http and https
let unifiedServer = (req, res) => {
    // Get URL and parse it
    const parsedURL = new URL(`${host}:${port}${req.url}`);


    // Get the path
    const path = parsedURL.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // Get query string as an object
    var queryStringObject = querystring.parse(parsedURL.search.replace(/^.*\?/, ''))

    // Get HTTP method 
    const method = req.method.toUpperCase()

    // Get headers as an object
    const headers = req.headers

    // Get payload, if any
    const decoder = new StringDecoder('utf-8')
    let buffer = ''
    req.on('data', (data) => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()

        // Choose the handler this request shoudl go to. If one is not found, use the notFound handler
        let chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        // Construct data object to send to the handler
        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        }

        // Route the request to the habdler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            // Use the status code called back by the handler or default 200
            statusCode = typeof (statusCode) == 'number' ? statusCode : 200

            // Use the payload called back by the handler, or default empty object
            payload = typeof (payload) == 'object' ? payload : {}

            // Convert the payload to a string
            let payloadString = JSON.stringify(payload)

            // Return response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode)
            res.end(payloadString)


            // Log the request path
            console.log('Returning this response: ', statusCode, payloadString);
            console.log(`Request received on path: ${trimmedPath} with method: ${method} and with these query string parameters \n`)
            console.log(queryStringObject);
            console.log(headers);
            console.log('Request receive with this payload:');
            console.log(buffer);
        })


    })

}

// Define a request router
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}
