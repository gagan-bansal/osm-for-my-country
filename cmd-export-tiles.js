var fs = require('fs')
var path = require('path')
var mkdirp = require('mkdirp')
var request = require('request')
var async = require('async')

var totalReq, reqSend = 0, reqReceived = 0

module.exports = function(url, tileList, dir) {
  fs.readFile(tileList, 'utf8', function(err, data) {
    if (err) throw err
    var tiles = data.split('\n')
    totalReq = tiles.length
    tiles.pop()
    async.eachOfLimit(tiles,20, function(tile, index, callback) {
      reqSend++
      request(
        url + '/' + tile, 
        {encoding:'binary'}, 
        function(err, resp, body) {
          if (err) return console.error('Error for: ' + tile + ': ' + err)
          var filePath = dir + '/' + tile
          var dirPath = path.dirname(filePath)
          if (!isDir(dirPath)) mkdirp.sync(dirPath)
          fs.writeFile(filePath, body, 'binary', function(err) {
            if (err) throw err;
            console.log(filePath)
            reqReceived++
            callback()
          })
        }
      )
    }, function(err) {
      if (err) {
        throw err
      } else {
        console.log('All tiles exproted.')
      }
      isAllDone = true
    })
  })
  var isAllDone = false
  var lastReqReceived = 0
  var timerId = setInterval(function() {
  
    console.log('Status - peding requests: %s, throughput: %s', 
      totalReq - reqReceived, reqReceived - lastReqReceived)
    lastReqReceived = reqReceived
    if (isAllDone) {
      clearInterval(timerId)
    }
  },1000)
}

function isDir(dir) { 
  try {
    return fs.statSync(dir).isDirectory()
  } catch (err) {
    return false
  }
}

