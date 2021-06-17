/**
 * Worker-related tasks
 */

import _data from './data.js'
import https from 'https'
import http from 'http'
import helpers from './helpers.js'
import _log from './logs.js'

let workers = {}

workers.gatherAllChecks = () => {
    // Get all checks, get their data, send to a validator
    _data.list('checks', (error, checks) => {
        if (!error && checks && checks.length > 0) {
            checks.forEach(check => {
                _data.read('checks', check, (error, originalCheckData) => {
                    if (!error && originalCheckData) {
                        // Pass it to the check validator and let that function continue or log errors are needed
                        workers.validateCheckData(originalCheckData)
                    } else {
                        console.log('Error reading one of the check\'s data')
                    }
                })
            });
        } else {
            console.log('Error: Could not find any checks to process')
        }
    })
}

workers.validateCheckData = (originalCheckData) => {
    // Sanity-check the check data
    originalCheckData = typeof (originalCheckData) == 'object' && originalCheckData != null ? originalCheckData : {}
    originalCheckData.id = typeof (originalCheckData.id) == 'string' && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false
    originalCheckData.userPhone = typeof (originalCheckData.userPhone) == 'string' && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false
    originalCheckData.protocol = typeof (originalCheckData.protocol) == 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
    originalCheckData.url = typeof (originalCheckData.url) == 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false
    originalCheckData.method = typeof (originalCheckData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
    originalCheckData.successCodes = originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false
    originalCheckData.timeoutSeconds = typeof (originalCheckData.timeoutSeconds) == 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false

    // Set the keys that may not be set (if the workers have never seen this check before)
    originalCheckData.state = typeof (originalCheckData.state) == 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
    originalCheckData.lastChecked = typeof (originalCheckData.lastChecked) == 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false

    // If all the checks pass, pass the data along to the next step in the process
    if (originalCheckData.id &&
        originalCheckData.userPhone &&
        originalCheckData.protocol &&
        originalCheckData.url &&
        originalCheckData.method &&
        originalCheckData.successCodes &&
        originalCheckData.timeoutSeconds
    ) {
        workers.performCheck(originalCheckData)
    } else {
        console.log('Error: One of the checks is not properly formatted. Skiping it')
    }

}

workers.performCheck = (originalCheckData) => {
    let checkOutcome = {
        'error': false,
        'responseCode': false
    }

    let outcomeSent = false

    const parsedURL = new URL(`${originalCheckData.protocol}://${originalCheckData.url}`);
    let hostname = parsedURL.hostname
    let path = parsedURL.path

    let requestDetails = {
        'protocol': originalCheckData.protocol + ':',
        'hostname': hostname,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 3000
    }

    // Instantiate the request object (using either the http or https module)
    let _moduleToUse = originalCheckData.protocol == 'http' ? http : https

    let request = _moduleToUse.request(requestDetails, (response) => {
        let status = response.statusCode

        checkOutcome.responseCode = status

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind to the error event so it doesn't get thrown
    request.on('error', (error) => {
        checkOutcome.error = { 'error': true, 'value': error }

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // Bind tot the timeout event
    request.on('timeout', (error) => {
        checkOutcome.error = { 'error': true, 'value': 'timeout' }

        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome)
            outcomeSent = true
        }
    })

    // End request /send request
    request.end()
}

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (dont't alert on that one)

workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
    let state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

    let alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

    let timeOfCheck = Date.now()
    // Log the outcome of the check
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

    // Update the check data
    let newCheckData = originalCheckData
    newCheckData.state = state
    newCheckData.lastChecked = timeOfCheck

    _data.update('checks', newCheckData.id, newCheckData, (error) => {
        if (!error) {
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData)
            } else {
                console.log('Check outcome has not changed, no alert needed');
            }
        } else {
            console.log('Error trying to save updates to one of the checks');
        }
    })
}

workers.alertUserToStatusChange = (newCheckData) => {
    let message = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`

    helpers.sendTwilioSms(newCheckData.userPhone, message, (error) => {
        if (!error) {
            console.log(`Success: User was alerted to a status change in their check, via SMS: ${message}`);
        } else {
            console.log(`Error: Could not send SMS alert to user who had a state change in their check.`);
        }
    })
}

workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
    let logData = {
        'check': originalCheckData,
        'outcome': checkOutcome,
        'state': state,
        'alert': alertWarranted,
        'time': timeOfCheck
    }

    let logString = JSON.stringify(logData)

    let logFileName = originalCheckData.id

    _log.append(logFileName, logString, (error) => {
        if (!error) {
            console.log("Logging to file succeeded");
        } else {
            console.log("Logging to file failed");
        }
    })
}

workers.rotateLogs = () => {
    // List all the (non compressed log files)
    _log.list(false, (error, logs) => {
        if (!error && logs && logs.length > 0) {
            logs.forEach((logName) => {
                let logId = logName.replace('.log', '')
                let newFileId = `${logId}-${Date.now()}`
                _log.compress(logId, newFileId, (error) => {
                    if (!error) {
                        _log.truncate(logId, (error) => {
                            if (!error) {
                                console.log('Success truncating logFile');
                            } else {
                                console.log('Error truncating logFile');
                            }
                        })
                    } else {
                        console.log('Error: Compressing one of the log files: ', error);
                    }
                })
            })
        } else {
            console.log('Error: Could not find any logs to rotate');
        }
    })
}

workers.logRotationLoop = () => {
    setInterval(() => { workers.rotateLogs() }, 1000 * 60 * 60 * 24)
}

workers.loop = () => {
    // Timer to execute the workers-process once per minute
    setInterval(() => { workers.gatherAllChecks() }, 1000 * 60)
}

workers.init = () => {
    workers.gatherAllChecks()

    workers.loop()

    // Compress all the logs immediately
    workers.rotateLogs()

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop()
}

export default workers