var path = require('path')
var exec = require('child_process').exec

module.exports = function(nconf) {
  console.log('pm2')
  debugger
  var cmd = ['pm2',
    'start', path.resolve(nconf.get('kosmtik:dir'), 'index.js'),
    '--name', 'kosmtik',
    '--merge-logs',
    '--output', path.resolve(nconf.get('log:dir'), 'kosmtik-out.log'),
    '--error', path.resolve(nconf.get('log:dir'), 'kosmtik-error.log'),
    '--', 'serve',
    path.resolve(nconf.get('map:cartoDir'),nconf.get('map:cartoProject')),
    '--localconfig', './config/kosmtik-localconfig.json'
  ].join(' ')
  console.log('[start-kosmtik] ' + cmd)
  exec(cmd, function(err, stdout, stderr) {
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
