var path = require('path')
var execFile = require('child_process').execFile

module.exports = function(nconf) {
  console.log('pm2')
  execFile('pm2', [
    'start', './node_modules/.bin/http-server',
    '-i', '0',
    '--name', 'tile-server',
    '--merge-logs',
    '--output', path.resolve(nconf.get('log:dir'), 'tile-server-out.log'),
    '--error', path.resolve(nconf.get('log:dir'), 'tile-server-error.log'),
    '--', path.resolve(nconf.get('export:dir')), 
      '-c', nconf.get('tileServer:cacheTime'), 
      '-p', nconf.get('tileServer:port'), 
      nconf.get('tileServer:cors') ? '--cors' : '' 
  ], function(err, stdout, stderr) {
    if (err) throw err
    if (stderr) {
      console.log('tile-server error')
      console.error(sdterr) 
    } else {
      console.log('tile-server started')
      console.log(stdout)
    }
  })
}
