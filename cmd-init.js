var async = require('async')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var execFile = require('child_process').execFile
var path = require('path')
var os = require('os')
var fs = require('fs')
var mkdirp = require('mkdirp')
var SphericalMercator = require('sphericalmercator')
var geojsonBbox = require('geojson-bbox')
var concat = require('concat-files')
var username = require('username')
var g = {}
var config;

module.exports = function(nconf) {
  config = nconf
  async.series([
    createDirs,
    parseRegion,
    downloadMyCountryData,
    pbf2osm,
    dropCountriesBorder,
    downloadCountriesBorder,
    downloadMyCountryBorder,
    osm2geojson,
    simplifyGeoJSON,
    writeInitView,
    geojson2poly,
    mergeOSMData,
    osm2pgsql,
    createWorldTileList,
    createMyCountryTileList,
    mergeTilesList,
    setKosmtikConfig
  ], function(err, result) {
    if (err) throw err
    console.log('all async function over')
  })
}

function createDirs(callback) {
  var confFile = config.stores.file.store
  Object.keys(confFile).forEach(function(key) {
    if (confFile[key].dir) mkdirp.sync(confFile[key].dir, function(err) {
      if (err) callback(err)
    })
  })
  callback()
}

function parseRegion(callback) {
  console.log('init ...')
  debugger
  g.fileName = config.get('osm').region
    .split(',')
    .map(function(part) {
      return part.toLowerCase().trim().replace(/ +/g,'-')
    })
    .join('-')
  g.name = config.get('osm').region.split(',').pop().trim().replace(/ +/g,' ')
  callback()
}

function downloadMyCountryData(callback) {
  console.log('downloadCountryData ...')
  var url = config.get('osm:host') + '/'
    + config.get('osm').region.split(',')
      .map(function(part) {
        return part.toLowerCase().trim().replace(/ +/g, '-')
      })
      .join('/')
    + '-latest.osm.pbf'
  console.log('downloading region data: '+ url)
  var curl = 'echo '
    + ' `curl -s'  // Note curl command is executing with in tilde
    + ' --connect-timeout 10'
    + ' --retry 10'
    + ' --retry-delay 10'
    + ' --retry-max-time 500'
    + ' -w \'%{http_code}\''  // capturing the http status
    + ' ' + url
    + ' -o my-area.osm.pbf `'  // closed tilde at the end
  console.log('curl: '+ curl)
  exec(
    curl,
    {cwd: path.resolve(config.get('data:dir'))},
    function(err, stdout, stderr) {
      if (err) throw err
      console.log(stdout)
      if (stderr) {
        callback(stderr)
      }
      if (stdout < 400) {
        callback(null)
      } else {
        callback(null)
      }
    }
  )
}

function pbf2osm(callback) {
  console.log('pbf2osm ...')
  var cmd = path.resolve(__dirname, 'osmconvert')
  var input = path.resolve(config.get('data:dir'),
    'my-area.osm.pbf')
  var output = path.resolve(config.get('data:dir'),
    'my-area.osm')
  execFile(cmd, [
    '--hash-memory=' + parseInt(os.totalmem()*0.75/1000000),
    input,
    '--out-osm', '-o=' + output
  ],
  {}, function(err, stdout, stderr) {
    if (err) callback(err)
    if (stderr) {
      console.log(stderr)
      callback(stderr)
    } else {
      callback(stderr)
      console.log(stdout)
    }
  })
}

function dropCountriesBorder(callback) {
  console.log('dropCountriesBorder ...')
  var cmd = path.resolve(__dirname, 'osmfilter')
  var input = path.resolve(config.get('data:dir'),
    'my-area.osm')
  var output = path.resolve(config.get('data:dir'),
    'my-area-dropped-countries.osm')
  execFile(cmd, [
    input,
    '--drop="admin_level=2"',
    '--out-osm', '-o=' + output
  ],
  handleExec.bind({callback: callback}))

}

function downloadCountriesBorder(callback) {
  console.log('downloading countries border data with overpass api..')
  var curl = 'echo '
    + ' `curl -s'  // Note curl command is executing with in tilde
    + ' --connect-timeout 10'
    + ' --retry 10'
    + ' --retry-delay 10'
    + ' --retry-max-time 500'
    + ' -H "Host: overpass-api.de" -H "Content-Type: text/xml"'
    + ' -w \'%{http_code}\''  // capturing the http status
    + ' -d \'relation["admin_level"="2"];(._;>;); out body;\''
    + ' http://overpass-api.de/api/interpreter'
    + ' -o countries-border.osm `'  // closed tilde at the end
  console.log('curl overpass: '+ curl)
  exec(
    curl,
    {cwd: path.resolve(config.get('data:dir'))},
    function(err, stdout, stderr) {
      if (err) callback(err)
      console.log(stdout)
      if (stderr) {
        callback(stderr)
      } else if (stdout < 400) {
        console.log('downloaded coutries borders')
        callback(null)
      } else {
        callback('download error: ' + stdout)
      }
    }
  )
}

function downloadMyCountryBorder(callback) {
  console.log('downloading my country border data with overpass api..')
  var apiData =
    'relation["admin_level"="'+ config.get('osm').region.split(',').length +'"] '
    + '["name:en"="'+g.name + '"];'
    + '(._;>;);'
    + ' out body;'
  var curl = 'echo '
    + ' `curl -s'  // Note curl command is executing with in tilde
    + ' --connect-timeout 10'
    + ' --retry 10'
    + ' --retry-delay 10'
    + ' --retry-max-time 500'
    + ' -H "Host: overpass-api.de" -H "Content-Type: text/xml"'
    + ' -w \'%{http_code}\''  // capturing the http status
    + ' -d \'' + apiData + '\''
    + ' http://overpass-api.de/api/interpreter'
    + ' -o my-area-border.osm `'  // closed tilde at the end
  console.log('curl my country overpass: '+ curl)
  exec(curl,
    {cwd: path.resolve(config.get('data:dir'))},
    function(err, stdout, stderr) {
      if (err) callback(err)
      console.log(stdout)
      if (stderr) {
        callback(stderr)
      } else if (stdout < 400) {
        console.log('downloaded my country border')
        callback(null)
      } else {
        callback('download error: ' + stdout)
      }
    }
  )
}

function osm2geojson(callback) {
  console.log('osm2geojson ...')
  var cmd = path.resolve(__dirname, './node_modules/.bin/osmtogeojson')
  var input = path.resolve(config.get('data:dir'),
    'my-area-border.osm')
  var output = path.resolve(config.get('data:dir'),
    'my-area-border.geojson')
  exec('node '
     + ' --max_old_space_size=' + parseInt(os.totalmem()*0.75/1000000)
     + ' ' + cmd
     + ' ' + input
     + ' > ' + output
    ,{},
    handleExec.bind({callback: callback})
  )
}

function simplifyGeoJSON(callback) {
  console.log('simplifyGeoJSON ...')
  var cmd = path.resolve(__dirname, './node_modules/.bin/simplify-geojson')
  var input = path.resolve(config.get('data:dir'),
    'my-area-border.geojson')
  var output = path.resolve(config.get('data:dir'),
    'my-area-border-simplified.geojson')
  var simplify = cmd
    + ' ' + input
    + ' --tolerance ' + config.get('map:boundaryTolerance')
    + ' > ' + output
  console.log(simplify)
  exec(simplify,
    {},
    handleExec.bind({callback: callback})
  )
}

function writeInitView(callback) {
  debugger
  var input = path.resolve(config.get('data').dir,
    'my-area-border-simplified.geojson')
  fs.readFile(input, 'utf8', function(err, data) {
    if (err) callback(err)
  debugger
    var reproject = new SphericalMercator()
    var bounds = reproject.convert(geojsonBbox(JSON.parse(data)),'900913')
    var width =  bounds[2] - bounds[0]
    var height = bounds[3] - bounds[1]
    var center = [bounds[0] + width/2, bounds[1] + height/2]
    var res = width > height ?
      width/config.get('demo').width : height/config.get('demo').height
    var zoom = getNearestZoom(res)
    var view = '// center [long,lat] \n var view = { zoom: ' + zoom + ','
      + 'center: [' + reproject.inverse(center) + ']}'
      + '\nvar tilesPort = '+ config.get('tileServer:port')
    var viewFile = path.resolve(config.get('demo').dir, 'view.js')
    fs.writeFile(viewFile, view, function(err) {
      if (err) callback(err)
      console.log('view file saved')
      callback()
    })
  })
}

function setKosmtikConfig(callback) {
  username().then(function(name) {
    var kosmticConfFile = './config/kosmtik-localconfig.json'
    fs.readFile(kosmticConfFile,'utf8', function(err,data) {
        debugger
      if (err) callback(err)
      var conf = JSON.parse(data)
      var ind = conf.findIndex(function(item) {
        return item && item.if && item.if['Datasource.type']
          && item.if['Datasource.type'] === 'postgis' && item.then
          && item.then['Datasource.user']
      })
      conf[ind].then['Datasource.user'] = name
      fs.writeFile(kosmticConfFile, JSON.stringify(conf,null,2), function(err) {
        if (err) callback(err)
        console.log('Kosmtik config file saved')
        callback()
      })
    })
  })
}

function getNearestZoom(res) {
  var zooms = Array.apply(null, Array(30)).map(function(e,i) {
    return 156412/Math.pow(2,i)
  })
  return zooms.findIndex(function(z) {return z < res}) - 1
}

function geojson2poly(callback) {
  console.log('geojson2poly ...')
  var cmd = path.resolve(__dirname, './node_modules/.bin/geojson2poly')
  var input = path.resolve(config.get('data:dir'),
    'my-area-border-simplified.geojson')
  var output = path.resolve(config.get('data:dir'),
    'my-area-border.poly')
  execFile(cmd, [input, output]
    ,{},
    handleExec.bind({callback: callback})
  )
}

function mergeOSMData(callback) {
  var input1 = path.resolve(config.get('data:dir'),
    'my-area-dropped-countries.osm')
  var input2 = path.resolve(config.get('data:dir'),
    'countries-border.osm')
  var outFile = path.resolve(config.get('data:dir'),
    'my-area-final-data.osm')

  execFile('./osmconvert', [
    '--hash-memory=' + parseInt(os.totalmem()*0.75/1000000),
    input1, input2,
    '--out-osm', '-o='+ outFile
  ],
  {},
  handleExec.bind({callback: callback}))
}

function osm2pgsql(callback) {
  var input = path.resolve(config.get('data:dir'),
    'my-area-final-data.osm')
  var style = path.resolve(config.get('map:cartoDir'),
    config.get('map:cartoStyle'))
  console.log('osm2pgsql running ...')
  console.log(['osm2pgsql', 
    '--create', '--slim', '--cache', parseInt(os.totalmem()*0.75/1000000),
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input,
    '&> /dev/null'].join(' '))
  var cmd = spawn('osm2pgsql', [
    '--create', '--slim', '--cache', parseInt(os.totalmem()*0.75/1000000),
    '--number-processes', os.cpus().length,
    '--hstore',
    '--style', style,
    input 
  ])
  cmd.on('error', function(err) {
    throw err
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
    callback(null)
  })
}

function createWorldTileList(callback) {
  console.log('createWorldTileList running ...')
  var worldBound = path.resolve('./world-bound.geojson')
  var outFileStream = fs.createWriteStream(
    path.resolve(config.get('data:dir'), 'world-tile-list.txt'))
  var cmd = spawn('./node_modules/.bin/osm-tile-list',
    [
      '--minZoom', '0',
      '--maxZoom', '5',
      '--tileBuffer', '3',
      '--only-corners', 'true',
      worldBound,
    ], {cwd: path.resolve('.') }
  )
  cmd.on('error', function(err) {
    throw err
  })
  cmd.stderr.on('data', function(data) {
    console.error('Error: ' + data)
    callback(data)
  })
  cmd.stdout.on('data', function(data) {
    outFileStream.write(data)
  })
  cmd.on('close', function(code) {
    outFileStream.close()
    callback(null)
  })
}

function createMyCountryTileList(callback) {
  console.log('createMyCountryTileList running ...')
  var countryBound = path.resolve(config.get('data:dir'),
    'my-area-border-simplified.geojson')
  var outFileStream = fs.createWriteStream(
    path.resolve(config.get('data:dir'), 'my-area-tile-list.txt'))
  var cmd = spawn('./node_modules/.bin/osm-tile-list',
    [
      '--minZoom', '6',
      '--maxZoom', '15',
      '--tileBuffer', '3',
      '--only-corners', 'true',
      countryBound,
    ], {cwd: path.resolve('.') }
  )
  cmd.on('error', function(err) {
    callback(err)
  })
  cmd.stderr.on('data', function(data) {
    console.error('Error: ' + data)
    callback(data)
  })
  cmd.stdout.on('data', function(data) {
    outFileStream.write(data)
  })
  cmd.on('close', function(code) {
    outFileStream.close()
    callback(null)
  })
}

function mergeTilesList(callback) {
  var worldList = path.resolve(config.get('data:dir'), 'world-tile-list.txt')
  var myAreaList = path.resolve(config.get('data:dir'),
    'my-area-tile-list.txt')
  var mergeList = path.resolve(config.get('data:dir'), 'final-tile-list.txt')
  concat([worldList, myAreaList], mergeList, function(err, res) {
    if (err) callback(err)
    console.log('merged files')
    callback()
  })
}

function handleExec(err, stdout, stderr) {
  debugger
  if (err) {
    console.log('some error in exec.')
    throw err //callback(err)
  }
  if (stderr) {
    console.log('some error in running programm')
    console.log(stderr)
    this.callback(stderr)
  } else {
    console.log(stdout)
    console.log('done')
    this.callback(stderr)
  }
}
