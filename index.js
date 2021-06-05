/**
 * Primary file for the API
 */

// Dependencies
import http from 'http'
import querystring from 'querystring'
import { StringDecoder } from 'string_decoder'
import config from './config.js'

const host = 'http://localhost'
const port = 3000;

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
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
            'payload': buffer
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

})

// Start the server
server.listen(config.port, () => {
    console.log(`The server is listening on port ${config.port} in ${config.envName} mode`);
})

// Define handlers
const handlers = {}
handlers.sample = (data, callback) => {
    // Callback a http status code, and a payload object
    callback(406, { 'name': 'Sample handler' })
}

handlers.notFound = (data, callback) => {
    callback(404)
}

// Define a request router
const router = {
    'sample': handlers.sample
}
