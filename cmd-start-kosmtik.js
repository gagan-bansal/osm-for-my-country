var path = require('path')
var execFile = require('child_process').execFile

module.exports = function(nconf) {
  console.log('pm2')
  debugger
  execFile('pm2', [
    'start', path.resolve(nconf.get('kosmtik:dir'), 'index.js'),
    '--name', 'kosmtik',
    '--merge-logs',
    '--output', path.resolve(nconf.get('log:dir'), 'kosmtik-out.log'),
    '--error', path.resolve(nconf.get('log:dir'), 'kosmtik-error.log'),
    '--', path.resolve(nconf.get('map:cartoDir'),nconf.get('map:cartoProject'))
  ], function(err, stdout, stderr) {
    if (err) throw err
    if (stderr) {
      console.log('kosmtik error')
      console.error(sdterr) 
    } else {
      console.log('kosmtik started')
      console.log(stdout)
    }
  })
}
