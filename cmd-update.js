var fs = require('fs')
var os = require('os')
var spawn = require('child_process').spawn
var request = require('requestretry')
var async = require('async')
var jsonfile = require('jsonfile')
var concat = require('concat-files')
var path = require('path')
var requestretry = require('requestretry')
var exec = require('child_process').exec
var exportTiles = require('./cmd-export.js')
var config

module.exports = function(nconf) {
  config = nconf
  async.parallel([
    readLastSeq,
    getCurSeq 
  ], function(err, results) {
    if (err) throw err
    console.log(results)
    var last = results[0], cur = results[1]
    if (last == cur) {
      console.log('Your data is up to date!')
    } else {
      var pending = Array.apply(null, Array(cur - last))
        .map(function(e,i) {return this + i +1},last)
      // create empty tile list
      fs.closeSync(fs.openSync(
        path.resolve(config.get('data:dir'), 'tiles-to-update.txt'), 'w'
      ))
      async.each(pending, updateData, function(err) {
        if (err) throw err
        async.series([
          concatTileList.bind({list: pending}),
          exportTiles
        ], function(err) {
          fs.writeFile(seqFile, JSON.stringify({sequenceNumber: seq}), 
            function(err) {
              if (err) throw err
              console.log('Map data updated to sequenceNumber: ' 
                + pending[pending.length - 1])
            }
          )
        })
      })
    }
  })
}

function updateData(seq, callback) {
  async.series([
    downloadData.bind({seq: seq}),
    osm2pgsql.bind({seq: seq}),
  ], function(err) {
    if (err) callback(err)
    callback()
  })
}
function readLastSeq(callback) {
  var seqFile = path.resolve(config.get('data:dir'),'seq-number.json')
  jsonfile.readFile(seqFile, function(err, json) {
    if (err) callback(err)
    callback(null, json.sequenceNumber)
  })
}

function getCurSeq(callback) {
  console.log('Getting current state of data ...')
  var url = config.get('osm:host') + '/'
    + config.get('osm').region.split(',')
      .map(function(part) {
        return part.toLowerCase().trim().replace(/ +/g, '-')
      })
      .join('/')
    + '-updates/state.txt'
  console.log('Current state: '+ url)
  requestretry({
    url: url,
    maxAttempts: 10,
    retryDelay: 10000,
    retryStrategy: requestretry.RetryStrategies.HTTPOrNetworkError
  }, function(err, resp, body) {
      if (err) throw callback(err)
      if (!err && resp.statusCode == 200) {
        console.log('The number of request attempts: ' + resp.attempts)
        var seq;
        body.split('\n').forEach(function(line) {
          if (line.indexOf('sequenceNumber') >= 0) {
            var rec = line.split('=')
            seq = parseInt(rec[1].trim())
          }
        })
        if (seq  && !isNaN(seq)) {
          callback(null, seq)
      } else {
        console.log('Error: Could not get the current sequence number')
        callback('err')
      }
    }
  })
}

function downloadData(callback2) {
  var curPath = (1000000000 + this.seq).toFixed().slice(1).match(/.{1,3}/g).join('/')
  var url = config.get('osm:host') + '/'
    + config.get('osm').region.split(',')
      .map(function(part) {
        return part.toLowerCase().trim().replace(/ +/g, '-')
      })
      .join('/') 
    + '-updates/' 
    + curPath + '.osc.gz'
  console.log('downloading update: '+ url)
  var curl = 'echo '
    + ' `curl -s'  // Note curl command is executing with in tilda
    + ' --connect-timeout 10'
    + ' --retry 10'
    + ' --retry-delay 10'
    + ' --retry-max-time 500'
    + ' -w \'%{http_code}\''  // capturing the http status
    + ' ' + url
    + ' -o ' + this.seq + '.osc.gz `'  // closed tilda at the end
  console.log('curl: '+ curl)
  exec(
    curl, 
    {cwd: path.resolve(config.get('data:dir'))},
    function(err, stdout, stderr) {
      if (err) throw err
      console.log(stdout)
      if (stderr) {
        callback2(stderr)
      }
      if (stdout < 400) {
        callback2()
      } else {
        callback2('download error: ' + stdout)
      }
    }
  )
}


function osm2pgsql(callback2) {
  var input = path.resolve(config.get('data:dir'), this.seq + '.osc.gz')
  var tileList = path.resolve(config.get('data:dir'), 'tiles-to-update.txt')
  var style = path.resolve(config.get('map:cartoDir'),
    config.get('map:cartoStyle'))
  console.log('osm2pgsql running ...')
  console.log(['osm2pgsql', 
    '--append', '--slim', '--cache', parseInt(os.totalmem()*0.75/1000000),
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input,
    '&> /dev/null'].join(' '))
/*  var cmd = spawn('osm2pgsql', [
    '--create', '--slim', '--cache', parseInt(os.totalmem()*0.75/1000000),
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input,
    '--expire-tiles', config.get('export:myAreaMinZoom') + '-' 
      + config.get('export:myAreaMaxZoom'),
    '--expire-output', this.seq + '-tiles-to-update.txt' 
  ])
  cmd.on('error', function(err) {
    callback2(err)
  })
  cmd.stderr.on('data', function(data) {
    console.error('Error: ' + data)
    //callback(data) //as osm2pgsql logging stdout as stderr
  })
  cmd.stdout.on('data', function(data) {
    outFileStream.write(data)
  })
  cmd.on('close', function(code) {
    console.log('osm2pgsql completed')
    callback2(null)
  })
*/
callback2() 
}

function concatTileList(callback) {
  var fileList = this.list.map(function(f) {
    return path.resolve(config.get('data:dir'), f)
  })
  var combList = path.resovle(config.get('data:dir'), 'combined-list.txt')
  concat(fileList, combList, function(err) {
    if (err) callback(err)
    var output = path.resovle(config.get('data:dir'), 'tiles-to-update.txt')
    exec('sort ' + combList + ' | uniq > ' + output, 
      function(err, stderr, stdout) {
        if (err || stderr) callback(err || stderr)
        callback()      
      }
    )
  })
}

function exportUpdate() {
  var url = nconf.get('export').tileServerURL
  var tileList = path.resovle(config.get('data:dir'), 'tiles-to-update.txt')
  var dir = path.resolve(config.get('export:dir'))
  
  console.log(url, tileList, dir)
   
  exportTiles(url, tileList, dir)
  
}
