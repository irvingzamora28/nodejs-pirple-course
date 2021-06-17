/**
 * Library for storing and rotating logs
 */

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

let lib = {}

let __dirname = path.resolve(path.dirname(''));

lib.baseDir = path.join(__dirname, '/.logs/')

/**
 * Append a string to a file. Create the file if it does not exist.
 * @param {*} file 
 * @param {*} str 
 * @param {*} callback 
 */
lib.append = (file, str, callback) => {
    fs.open(`${lib.baseDir}${file}.log`, 'a', (error, fileDescriptor) => {
        if (!error && fileDescriptor) {
            fs.appendFile(fileDescriptor, `${str}\n`, (error) => {
                if (!error) {
                    fs.close(fileDescriptor, (error) => {
                        if (!error) {
                            callback(false)
                        } else {
                            callback('Error closing file that was being appended')
                        }
                    })
                } else {
                    callback ('Error appending to the file')
                }
            })
        } else {
            callback('Could not open the file for appending')
        }
    })
}

/**
 * List all the logs and optionally include the compressed logs
 * @param {*} includeCompressedLogs 
 * @param {*} callback 
 */
lib.list = (includeCompressedLogs, callback) => {
    fs.readdir(lib.baseDir, (error, data) => {
        if (!error && data && data.length > 0) {
            let trimmedFileNames = []
            data.forEach((fileName) => {
                if (fileName.indexOf('.log') > -1) {
                    trimmedFileNames.push(fileName.replace('.log', ''))
                }

                // Add on the .gz files
                if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
                    trimmedFileNames.push(fileName.replace('.gz.b64', ''))
                }

            })
            callback(false, trimmedFileNames)
        } else {
            callback(error, data)
        }
    })
}

/**
 * Compress the contents of one .log file into a .gz.b64 file within the same directory
 * @param {*} logId 
 * @param {*} newFileId 
 * @param {*} callback 
 */
lib.compress = (logId, newFileId, callback) => {
    let sourceFile = `${logId}.log`
    let destFile = `${newFileId}.bz.b64`

    fs.readFile(`${lib.baseDir}${sourceFile}`, 'utf8', (error, inputString) => {
        if (!error && inputString) {
            zlib.gzip(inputString, (error, buffer) => {
                if (!error && buffer) {
                    fs.open(`${lib.baseDir}${destFile}`, 'wx', (error, fileDescriptor) => {
                        if (!error && fileDescriptor) { 
                            fs.writeFile(fileDescriptor, buffer.toString('base64'), (error) => {
                                if (!error) {
                                    fs.close(fileDescriptor, (error) => {
                                        if (!error) {
                                            callback(false)
                                        } else {
                                            callback(error)
                                        }
                                    })
                                } else {
                                    callback(error)
                                }
                            })
                        } else {
                            callback(error)
                        }
                    })
                } else {
                    callback(error)
                }
            })
        } else {
            callback(error)
        }
    })
}

/**
 * Truncate a log file
 * @param {*} logId 
 * @param {*} callback 
 */
lib.truncate = (logId, callback) => {
    fs.truncate(`${lib.baseDir}${logId}.log`, 0, (error) => {
        if (!error) {
            callback(false)
        } else {
            callback(error)
        }
    })
}

/**
 * Decompress the contents of a .gz.b64 file into a string variable
 * @param {} fileId 
 * @param {*} callback 
 */
lib.decompress = (fileId, callback) => {
    let fileName = `${fileId}.gz.b64`

    fs.readFile(`${lib.baseDir}${fileName}`, 'utf8', (error, str) => {
        if (!error && str) {
            let inputBuffer = Buffer.from(str, 'base64')
            zlib.unzip(inputBuffer, (error, outputBuffer) => {
                if (!error && outputBuffer) {
                    let str = outputBuffer.toString()
                     callback(false, str)
                } else {
                    callback(error)
                }
            })
        } else {
            callback(error)
        }
    })
}

export default lib