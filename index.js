// Setup basic express server
var express = require('express')
var app    = express()
var server = require('http').createServer(app)
var io     = require('socket.io')(server)
var port   = process.env.PORT || 3000

server.listen(port, function () {console.log('Server listening at port %d', port)})

// Routing.
app.use(express.static(__dirname + '/public'))


// Chatroom.

// usernames which are currently connected to the chat
var lobby_list = []
var usernames  = {}
var numUsers   = 0

io.on ('connection', function (socket) {
 var addedUser = false
 
 // When the client emits "new message", this listens and executes.
 socket.on ('new message', function (data) {
  // Tell the client to execute "new message".
  socket.broadcast.emit('new message', {username: socket.username, message: data})
 })
 
 // When the client emits 'add user', this listens and executes.
 socket.on ('add user', function (username) {
  // Store the username in the socket session for this client.
  socket.username = username
  
  // Add the client's username to the global list.
  usernames[username] = username
  numUsers++
  addedUser = true
  socket.emit ('login', {numUsers: numUsers})
  
  // Echo globally (to all clients) that a person has connected.
  socket.broadcast.emit('user joined', {username: socket.username, numUsers: numUsers})
 })
 
 // When the client emits 'typing', we broadcast it to others.
 socket.on ('typing', function () {socket.broadcast.emit ('typing', {username : socket.username})})
 
 // When the client emits 'stop typing', we broadcast it to others.
 socket.on ('stop typing', function () {socket.broadcast.emit('stop typing', {username : socket.username})})
 
 socket.on ('disconnect', function () {
  if (!addedUser) return
  
  // Remove the username from global usernames list.
  delete usernames[socket.username]
  numUsers -= 1
  
  // Echo globally that this client has left.
  socket.broadcast.emit ('user left', {username: socket.username, numUsers: numUsers})
 })
 
 socket.on ('create room', function (room_name) {
  socket.emit ('room created', {room_name: room_name, username: socket.username})
 })
 
 socket.on ('join room', function (room_name) {
  socket.emit ('room joined', {room_name: room_name, username: socket.username})
 })
})