var path = require('path')
var execFile = require('child_process').execFile

module.exports = function(nconf) {
  console.log('pm2')
  execFile('pm2', [
    'start', './node_modules/.bin/http-server',
    '--name', 'demo',
    '--merge-logs',
    '--output', path.resolve(nconf.get('log:dir'), 'demo-out.log'),
    '--error', path.resolve(nconf.get('log:dir'), 'demo-error.log'),
    '--', path.resolve(nconf.get('demo:dir')),
      '-p', nconf.get('demo:port') 
  ], function(err, stdout, stderr) {
    if (err) throw err
    if (stderr) {
      console.log('demo error')
      console.error(sdterr) 
    } else {
      console.log('demo started')
      console.log(stdout)
    }
  })
}
