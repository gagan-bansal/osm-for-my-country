var fs = require('fs')
var request = require('requestretry')
var async = require('async')
var path = require('path')
var exec = require('child_process').exec
var g = {
  host: 'http://download.geofabrik.de',
  regionPath: '',
  curSeq: '',
  seqPath: ''
}

async.waterfall(
  [
    init,
    getCurrentSeq,
    downloadAllUpdates,
    downloadUpdate,
    gunzip
  ],
  function(err, data) {
    if (err) {
      console.log('waterfall: '+err) 
    } else {
      console.log(data)
    }
    console.log('Waterfall in lake')
  }
)
 
function init(callback) {
  console.log('starting \'initiating\'')
  var data = {regions: ['asia', 'india']}
  g.regionPath = data.regions
    .map(function(reg) {
      return reg.toLowerCase().replace(/ /g, '-')
    })
    .join('/')
  g.cwd = process.cwd() 
  callback(null, {})
}
function getCurrentSeq(data, callback) {
  console.log('starting \'getCurrentSeq\'')
  console.log('URL state: '+ g.host + '/' + g.regionPath + '-updates/state.txt')
  request({
    url: g.host + '/' + g.regionPath + '-updates/state.txt',
    maxAttempts: 10,
    retryDelay: 10000,
    retryStrategy: request.RetryStrategies.HTTPOrNetworkError
  },
    function(err, resp, body) {
      if (err) {
        console.log('req error')
        return callback(err) 
      } else if (resp.statusCode == 200) {
        console.log('The number of request attempts: ' + resp.attempts);
        g.curSeq = parseInt(
          body.split('\n').find(function(rec) {
            return /^sequenceNumber/.test(rec)
          }).split('=')[1])
        if (!isNaN(g.curSeq)) {
          return callback(null, {})
        } else {
          console.log('could not get the current seq number')
          callback('Current sequence number error')
        } 
      } else if (resp.statusCode >= 400) {
        console.error('http code >= 400')
        callback('http code >= 400')
      }
      console.log('I am not hidden')
    }
  )
}

function readLastSeq(data,callback) {
  
}

function downloadAllUpdates(data, callback) {
  console.log('starting \'downloadAllUpdates\'')
  var lastSeq = parseInt(
    fs.readFileSync('./data/lastSequenceNumber.txt', 'utf8'))
  console.log('lastSeqNum: '+ lastSeq)
  console.log('cur seq number: '+ g.curSeq)
  callback(null, {seqNum: g.curSeq})
}

function downloadUpdate(data, callback) {
  debugger;
  var curPath = (1000000000 + data.seqNum).toFixed().slice(1).match(/.{1,3}/g).join('/')
  var url = g.host + '/' +g.regionPath + '-updates/' + curPath + '.osc.gz'
  console.log('downloading update: '+ url)
  var curl = 'echo '
    + ' `curl -s'  // Note curl command is executing with in tilda
    + ' --connect-timeout 10'
    + ' --retry 10'
    + ' --retry-delay 10'
    + ' --retry-max-time 500'
    + ' -w \'%{http_code}\''  // capturing the http status
    + ' ' + url
    + ' -o ' + data.seqNum + '.osc.gz `'  // closed tilda at the end
  console.log('curl: '+ curl)
  exec(
    curl, 
    {cwd: path.resolve(g.cwd,'data')},
    function(err, stdout, stderr) {
      if (err) throw err
      console.log(stdout)
      if (stderr) {
        callback(stderr)
      }
      if (stdout < 400) {
        callback(null,{seqNum: data.seqNum})
      } else {
        callback('download error: ' + stdout)
      }
    }
  )
}

function gunzip(data,callback) {
  exec('gunzip ' + data.seqNum + '.osc.gz',
    {cwd: path.resolve(g.cwd,'data')},
    function(err, stdout, stderr) {
      if (err) throw err
      if (stderr) {
        callback(stderr)
      } else {
        console.log('gunzipped')
        callback(null)
      }
    }
  )
}

