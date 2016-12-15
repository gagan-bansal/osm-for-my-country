var async = require('async')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var execFile = require('child_process').execFile
var path = require('path')
var fs = require('fs')
var init = require('./cmd-init.js')
var kosmtik = require('./cmd-start-kosmtik.js')
var exportTiles = require('./cmd-export-tiles.js') 
var serve = require('./cmd-serve.js') 
var demo = require('./cmd-demo.js') 
var update = require('./cmd-update.js') 
var g = {}

var nconf = require('nconf')
  .argv()
  .file({file: './config/default.json'})

var yargs = require('yargs')
  .usage('\nUsage: node $0 command')
  .command(
    'init', 
    'Initiate the data by downloading and inserting into postgres'
      + '\nand many more things')
  .command('start-kosmtik', 
    'Start kosmtik server with mapnik as map rendering engine')
  .command('export', 'Export map tiles')
  .command('serve', 'Serve map tiles at http port')
  .command('demo', 'Privew map tiles with help of Leaflet')
  .command('update', 'Update the OSM data and map tiles based on daily update.')
  .demand(1, 'must provide a valid command')
var argv= yargs.argv
var command = argv._[0] 

if (command === 'init') {
  yargs.reset()
    .usage('Usage:node $0 init [options]'
      + '\n\nExamples: '
      + '\n  node $0 init --region \'asia,sri lanka\'')
    .options({
      'r': {
        alias: 'region',
        describe: 'Region to download with complete path',
        type: 'string'
      },
      'save': {
        desc: 'save parameters to config file',
        type: 'boolean',
        default: true
      }
    })
    /*.coerce('region', function(val) {
      nconf.set('osm:region', val)  
      return val.split(',')
        .map(function(part) {
          return part.trim()
        })
    })*/
    .help('h')
    .alias('h', 'help')
  
  if (yargs.argv.region) {
    nconf.set('osm:region', yargs.argv.region)
  }
  if (nconf.get('osm:region')) {
    init(nconf)
  } else {
    yargs.argv.save = false
    console.error(
      '\nregion not specified and could not read from config file also\n')
    yargs.showHelp() 
    return
  }
} else if (command === 'export') {
  yargs.reset()
    .usage('\nUsage: $0 export -u [str] -t [str] -o [str]'
      + '\nby default all these options are read from \'./config/default.json\''
    )
    .options({ 
      'u': {
        alias: 'tileServerURL',
        describe: 'base url serving map tile',
        type: 'string'
      },
      't': {
        alias: 'tileList',
        describe: 'a file for tiles list',
        type: 'string'
      },
      'o': {  
        alias: 'dir',
        desc: 'output tile directory',
        type: 'string'
      },
      'save': {
        desc: 'save parameters to config file',
        type: 'boolean',
        default: false
      }
    })
    .help('h')
    .alias('h', 'help')
    .argv
  
  if (yargs.argv.u) nconf.set('exprot:tileServerURL', argv.u)
  if (yargs.argv.t) nconf.set('export:tileList', argv.t)
  if (yargs.argv.o) nconf.set('export:dir', argv.o)  
  
  var url = nconf.get('export').tileServerURL
  var tileList = path.resolve(nconf.get('data').dir,nconf.get('export').tileList)
  var dir = path.resolve(nconf.get('export').dir)
  
  console.log(url, tileList, dir)
   
  exportTiles(url, tileList, dir)
} else if (command === 'start-kosmtik') {
  kosmtik(nconf)
} else if (command === 'serve') {
  serve(nconf)
} else if (command === 'demo') {
  demo(nconf)
} else if (command === 'update') {
  update(nconf)
} else {
  yargs.showHelp()
}

console.log('\nUsing config file: \'./config/default.json\'\n')

  if (yargs.argv.save) {
    nconf.save(function (err) {
      fs.readFile('./config/default.json', function (err, data) {
        //console.dir(JSON.parse(data.toString()))
        console.log('Command options saved to following config file'
          + './config/default.json')
      })
    })
  }

