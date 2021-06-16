/**
 * Primary file for the API
 */

// Dependencies
import server from './lib/server.js'
import workers from './lib/workers.js'

let app = {}

// Init function
app.init = () => {
    
    // Start server
    server.init()

    // Start workers
    workers.init()
}

// Execute
app.init()

export default app