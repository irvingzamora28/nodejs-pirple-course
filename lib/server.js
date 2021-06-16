/**
 * Server-related tasks
 */

// Dependencies
import http from 'http'
import https from 'https'
import querystring from 'querystring'
import { StringDecoder } from 'string_decoder'
import config from './config.js'
import fs from 'fs'
import _data from './data.js'
import handlers from './handlers.js'
import helpers from './helpers.js'
import path from 'path'

let server = {}
let __dirname = path.resolve(path.dirname(''));


const host = 'http://localhost'
const port = 3000;

// Instantiate HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res)
})


// Instantiate HTTPS server
server.httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '/https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '/https/cert.pem'))
}

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
    server.unifiedServer(req, res)
})


// Server logic for both http and https
server.unifiedServer = (req, res) => {
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
        let chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

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
server.router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'tokens': handlers.tokens,
    'checks': handlers.checks
}

server.init = () => {
    // Start HTTP server
    server.httpServer.listen(config.httpPort, () => {
        console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`);
    })

    // Start HTTPS server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`);
    })
}

export default server