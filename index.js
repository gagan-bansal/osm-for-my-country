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

require('yargs')
  .usage('\nUsage: node $0 <command> [options]'
    + '\n\nFor command help:'
    + '\nnode $0 <command> --help'
  )
  .option({
    's': {
      alias: 'save',
      desc: 'save parameters to config file',
      type: 'boolean',
      default: true
    }
  })
  .command(
    'init', 
    'Initiate the data by downloading and inserting into postgres'
      + '\nand many more things', 
    {
      'r': {
        alias: 'region',
        describe: 'Region to download with complete path as per GEOFABRIK'
          + '\nlike: --region \'Asia, Nepal\'',
        type: 'string'
      },
    },
    handleInit
  )
  .command('start-kosmtik', 
    'Start kosmtik server with mapnik as map rendering engine'
      + '\nAt this stage you can preview map with ksomtik'
      + ' at http://127.0.0.1:6789/'
      + '\n You can make changes in CartoCSS and preview immediately.',
    {},
    function(argv) {
      kosmtik(nconf)
      saveToConfig(argv)
    }
  )
  .command('export', 
    'Export map tiles'
      + '\nBy default all the options are read from \'./config/default.json\'',
    { 
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
      }
    },
    handleExport
  )
  .command('serve',
    'Serve map tiles at http'
      + '\nThis will enable map tiles to be served at '
      + 'http://127.0.0.1:'+nconf.get('tileServer:port')+'/$z/$x/$y.png',
    {},
    function(argv) {
      serve(nconf)
      saveToConfig(argv)
    }
  )
  .command('demo', 
    'Privew map tiles with help of Leaflet'
      + '\nCheck your map at '
      + 'http://127.0.0.1:'+nconf.get('demo:port')+'/',
    {},
    function(argv) {
      demo(nconf)
      saveToConfig(argv)
    }
  )
  .command('update', 
    'Update the OSM data and map tiles based on daily update from GEOFABRIK.'
      + '\n You can set this command in your cron job to update on daily basis.',
    {},
    function(argv) {
      update(nconf)
      saveToConfig(argv)
    }
  )
  .demandCommand(1, 'must provide a valid command')
  .help()
  .alias('h', 'help')
  .argv

function handleInit(argv) {
  if (argv.region) {
    nconf.set('osm:region', argv.region)
  }
  if (nconf.get('osm:region')) {
    init(nconf)
    saveToConfig(argv)
  } else {
    argv.save = false
    console.error(
      '\nregion not specified and could not read from config file also\n')
    throw new Error()
  }
}

function handleExport(argv) {
  if (argv.u) nconf.set('exprot:tileServerURL', argv.u)
  if (argv.t) nconf.set('export:tileList', argv.t)
  if (argv.o) nconf.set('export:dir', argv.o)  
  
  var url = nconf.get('export').tileServerURL
  var tileList = path.resolve(nconf.get('data').dir,nconf.get('export').tileList)
  var dir = path.resolve(nconf.get('export').dir)
   
  exportTiles(url, tileList, dir)
  saveToConfig(argv)
}

function saveToConfig(argv) {
  console.log('\nUsing config file: \'./config/default.json\'\n')
  if (argv.save) {
    nconf.save(function (err) {
      fs.readFile('./config/default.json', function (err, data) {
        //console.dir(JSON.parse(data.toString()))
        console.log('Command options saved to following config file'
          + './config/default.json')
      })
    })
  }
}
