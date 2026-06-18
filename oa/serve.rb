require 'webrick'
server = WEBrick::HTTPServer.new(
  Port: 3000,
  DocumentRoot: '/Users/kirsava/Downloads/Original Artwork'
)
trap('INT') { server.shutdown }
server.start
