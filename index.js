/**
 * Primary file for the API
 */

// Dependencies
import http from 'http'
import url from 'url'

const host = 'http://localhost'
const port = 3000;

// The server should respond to all requests with a string
const server = http.createServer((req, res) => {
    // Get URL and parse it
    const parsedURL = new URL(`${host}:${port}${req.url}`);


    // Get the path
    const path = parsedURL.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '')
    
    // Send the response
    res.end(trimmedPath)
    // res.end('Hello World\n')
    

    // Log the request path

})

// Start the server, and have it listen on port 3000
server.listen(3000, () => {
    console.log('The server is listening on port 3000');
})