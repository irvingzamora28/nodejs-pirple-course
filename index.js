/**
 * Primary file for the API
 */

// Dependencies
import http from 'http'
import querystring from 'querystring'
import {StringDecoder} from 'string_decoder'

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
    req.on('data',(data) => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()

        // Send the response
        res.end(`Hello World`)
        
        // Log the request path
        console.log(`Request received on path: ${trimmedPath} with method: ${method} and with these query string parameters \n`)
        console.log(queryStringObject);
        console.log(headers);
        console.log('Request receive with this payload:');
        console.log(buffer);
    })



})

// Start the server, and have it listen on port 3000
server.listen(3000, () => {
    console.log('The server is listening on port 3000');
})