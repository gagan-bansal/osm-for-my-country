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
var exportTiles = require('./cmd-export-tiles.js')
var g = {}

module.exports = function(nconf) {
  g.config = nconf
  g.memory = parseInt(
    os.totalmem() * (g.config.get('system:memoryPercentage')/100)/1000000)
  g.seqFile = path.resolve(g.config.get('data:dir'),'seq-number.json')

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
      console.log('pending ' + JSON.stringify(pending))
      // create empty tile list
      fs.closeSync(fs.openSync(
        path.resolve(g.config.get('data:dir'), 'tiles-to-update.txt'), 'w'
      ))
      async.eachSeries(pending, updateData, function(err) {
        if (err) throw err
        async.series([
          concatTileList.bind({list: pending}),
          exportUpdate
        ], function(err) {
          if (err) throw err
          fs.writeFile(g.seqFile, JSON.stringify({sequenceNumber: cur}), 
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
  jsonfile.readFile(g.seqFile, function(err, json) {
    if (err) callback(err)
    callback(null, json.sequenceNumber)
  })
}

function getCurSeq(callback) {
  console.log('Getting current state of data ...')
  var url = g.config.get('osm:host') + '/'
    + g.config.get('osm').region.split(',')
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
  var url = g.config.get('osm:host') + '/'
    + g.config.get('osm').region.split(',')
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
    {cwd: path.resolve(g.config.get('data:dir'))},
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
  var input = path.resolve(g.config.get('data:dir'), this.seq + '.osc.gz')
  var tileList = path.resolve(g.config.get('data:dir'), 'tiles-to-update.txt')
  var outputList = path.resolve(g.config.get('data:dir'), this.seq + '-tiles-to-update.txt')
  var style = path.resolve(g.config.get('map:cartoDir'),
    g.config.get('map:cartoStyle'))
  console.log('osm2pgsql running ...')
  console.log(['osm2pgsql',
    '--append', '--slim', '--cache', g.memory,
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input,
    '--expire-tiles', g.config.get('export:myAreaMinZoom') + '-' 
      + g.config.get('export:myAreaMaxZoom'),
    '--expire-output', this.seq + '-tiles-to-update.txt' 
  ].join(' '))
  var cmd = spawn('osm2pgsql', [
    '--append', '--slim', '--cache', g.memory,
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input,
    '--expire-tiles', g.config.get('export:myAreaMinZoom') + '-' 
      + g.config.get('export:myAreaMaxZoom'),
    '--expire-output', outputList 
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
}

function concatTileList(callback) {
  var fileList = this.list.map(function(f) {
    return path.resolve(g.config.get('data:dir'), f + '-tiles-to-update.txt')
  })
  var combList = path.resolve(g.config.get('data:dir'), 'combined-list.txt')
  concat(fileList, combList, function(err) {
    if (err) return callback(err)
    var output = path.resolve(g.config.get('data:dir'), 'tiles-to-update.txt')
    exec('sort ' + combList + ' | uniq > ' + output, 
      function(err, stderr, stdout) {
        if (err || stderr) callback(err || stderr)
        callback()      
      }
    )
  })
}

function exportUpdate() {
  var url = g.config.get('export').tileServerURL
  var tileList = path.resolve(g.config.get('data:dir'), 'tiles-to-update.txt')
  var dir = path.resolve(g.config.get('export:dir'))
  console.log(url, tileList, dir)
  exportTiles(url, tileList, dir)
}
