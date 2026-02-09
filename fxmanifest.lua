fx_version 'cerulean'
game 'gta5'

author 'Goose'
description 'Goose Dev Menu for FiveM'
version '1.0.0'

ui_page 'html/index.html'

files {
  'html/index.html',
  'html/script.js',
  'config.json',
  'lastpos.json'
}

client_scripts {
  'client/noclip.js',
  'client/client.js'
}

server_scripts {
  'server/server.js'
}
