$(function() {
 var FADE_TIME = 150 // In milliseconds.
 var TYPING_TIMER_LENGTH = 400 // In milliseconds.
 var COLORS = [
  '#e21400', '#91580f', '#f8a700', '#f78b00',
  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
 ]
 
 // Initialize variables.
 var $window        = $(window)
 var $usernameInput = $('.usernameInput') // Input for username.
 var $messages      = $('.messages') // Messages area.
 var $loginPage     = $('.login.page') // The login page.
 var $chatPage      = $('.chat.page') // The chatroom page.
 
 var chat_page = document.getElementsByClassName('nuclear_prison--chat_page')[0]
 
 var chat_input = document.createElement ('input'); chat_input.className = "nuclear_prison--chat_input nuclear_prison--bottom_area_button"
 chat_input.setAttribute ('placeholder', "Type here...")
 chat_page.appendChild (chat_input)
 var $inputMessage = $(chat_input)
 
 var join_lobby_button = document.createElement ('div'); join_lobby_button.className = "nuclear_prison--join_lobby_button nuclear_prison--bottom_area_button"
 join_lobby_button.innerHTML = "Join Lobby"
 join_lobby_button.addEventListener ('click', function () {
  var room_name = smoke.prompt ("Please enter a lobby name to join.", function (result) {
   $currentInput = $usernameInput
   if (result == "") return
   socket.emit('join room', result)
  })
  $currentInput = $(room_name.dialog.input)
 })
 chat_page.appendChild (join_lobby_button)
 
 var create_lobby_button = document.createElement ('div'); create_lobby_button.className = "nuclear_prison--create_lobby_button nuclear_prison--bottom_area_button"
 create_lobby_button.innerHTML = "Create Lobby"
 create_lobby_button.addEventListener ('click', function () {
  var room_name = smoke.prompt ("Please enter a new lobby name.", function (result) {
   $currentInput = $usernameInput
   if (result == "") return
   socket.emit('create room', result)
  })
  $currentInput = $(room_name.dialog.input)
 })
 chat_page.appendChild (create_lobby_button)
 
 // Prompt for setting a username.
 var username       = undefined
 var connected      = false
 var typing         = false
 var lastTypingTime = undefined
 var $currentInput  = $usernameInput.focus ()
 
 var socket = io()
 
 function addParticipantsMessage (data) {
  var message = ""
  if (data.numUsers === 1) {
   message += "There's 1 participant."
  } else {
   message += "There are " + data.numUsers + " participants."
  }
  log(message)
 }
 
 // Set the client's username.
 function setUsername () {
  username = cleanInput($usernameInput.val().trim())
  
  // If the username is valid, add the user.
  if (username) {
   $loginPage.fadeOut()
   $chatPage.show()
   $loginPage.off('click')
   $currentInput = $inputMessage.focus()
   
   // Tell the server your username.
   socket.emit('add user', username)
  }
 }
 
 // Send a chat message.
 function sendMessage () {
  var message = $inputMessage.val()
  // Prevent markup from being injected into the message.
  message = cleanInput(message)
  // if there is a non-empty message and a socket connection.
  if (message && connected) {
   $inputMessage.val ('')
   addChatMessage ({username: username, message: message})
   // Tell server to execute 'new message' and send along one parameter.
   socket.emit('new message', message)
  }
 }
 
 // Log a message.
 function log (message, options) {
  var $el = $('<li>').addClass('log').text(message);
  addMessageElement($el, options);
 }
 
 // Adds the visual chat message to the message list
 function addChatMessage (data, options) {
  // Don't fade the message in if there is an 'X was typing'
  var $typingMessages = getTypingMessages(data)
  options = options || {}
  if ($typingMessages.length !== 0) {
   options.fade = false
   $typingMessages.remove()
  }
  
  var $usernameDiv = $('<span class="username"/>')
   .text(data.username)
   .css('color', getUsernameColor(data.username))
  var $messageBodyDiv = $('<span class="messageBody">')
   .text(data.message)
  
  var typingClass = data.typing ? 'typing' : ''
  var $messageDiv = $('<li class="message"/>')
   .data('username', data.username)
   .addClass(typingClass)
   .append($usernameDiv, $messageBodyDiv)
  
  addMessageElement($messageDiv, options)
 }

 // Adds the visual chat typing message
 function addChatTyping (data) {
  data.typing = true
  data.message = 'is typing'
  addChatMessage(data)
 }

 // Removes the visual chat typing message
 function removeChatTyping (data) {
  getTypingMessages(data).fadeOut(function () {
   $(this).remove()
  })
 }

 // Adds a message element to the messages and scrolls to the bottom
 // el - The element to add as a message
 // options.fade - If the element should fade-in (default = true)
 // options.prepend - If the element should prepend
 //  all other messages (default = false)
 function addMessageElement (el, options) {
  var $el = $(el)

  // Setup default options.
  if (!options) options = {}
  if (typeof options.fade === 'undefined') options.fade = true
  if (typeof options.prepend === 'undefined') options.prepend = false
  
  // Apply options.
  if (options.fade) $el.hide().fadeIn(FADE_TIME)
  
  if (options.prepend) {
   $messages.prepend($el)
  } else {
   $messages.append($el)
  }
  $messages[0].scrollTop = $messages[0].scrollHeight
 }

 // Prevents input from having injected markup.
 function cleanInput (input) {
  return $('<div/>').text(input).text()
 }
 
 // Updates the typing event.
 function updateTyping () {
  if (connected) {
   if (!typing) {
    typing = true
    socket.emit('typing')
   }
   lastTypingTime = (new Date()).getTime()
   
   setTimeout(function () {
    var typingTimer = (new Date()).getTime()
    var timeDiff = typingTimer - lastTypingTime;
    if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
     socket.emit('stop typing')
     typing = false
    }
   }, TYPING_TIMER_LENGTH)
  }
 }
 
 // Gets the 'X is typing' messages of a user
 function getTypingMessages (data) {
  return $('.typing.message').filter(function (i) {
   return $(this).data('username') === data.username
  })
 }
 
 // Gets the color of a username through our hash function
 function getUsernameColor (username) {
  // Compute hash code.
  var hash = 7
  for (var i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + (hash << 5) - hash
  }
  // Calculate color.
  var index = Math.abs(hash % COLORS.length)
  return COLORS[index]
 }
 
 // Keyboard events.
 
 $window.keydown(function (event) {
  // Auto-focus the current input when a key is typed.
  if (!(event.ctrlKey || event.metaKey || event.altKey)) $currentInput.focus ()
  
  // When the client hits ENTER on their keyboard, emit the "stop typing" event.
  if (event.which === 13) {
   if (username) {
    sendMessage()
    socket.emit('stop typing')
    typing = false
   } else {
    setUsername()
   }
  }
 })
 
 $inputMessage.on('input', function () {updateTyping()})
 
 // Click events.
 
 // Focus input when clicking anywhere on login page.
 $loginPage.click(function () {$currentInput.focus()})
 
 // Focus input when clicking on the message input's border.
 $inputMessage.click(function () {$inputMessage.focus()})
 
 // Socket events
 
 // Whenever the server emits 'login', log the login message.
 socket.on('login', function (data) {
  connected = true
  
  // Display the welcome message.
  var message = "Welcome to Nuclear Prison."
  log(message, {prepend: true})
  addParticipantsMessage (data)
 })
 
 // Whenever the server emits 'new message', update the chat body.
 socket.on('new message', function (data) {
  addChatMessage(data)
 })
 
 // Whenever the server emits 'user joined', log it in the chat body.
 socket.on('user joined', function (data) {
  log (data.username + ' joined')
  addParticipantsMessage (data)
 })
 
 // Whenever the server emits 'user left', log it in the chat body.
 socket.on('user left', function (data) {
  log(data.username + ' left')
  addParticipantsMessage (data)
  removeChatTyping (data)
 })
 
 // Whenever the server emits 'typing', show the typing message.
 socket.on('typing', function (data) {addChatTyping(data)})
 
 // Whenever the server emits 'stop typing', kill the typing message.
 socket.on('stop typing', function (data) {removeChatTyping(data)})
 
 // A room was created.
 socket.on('room created', function (data) {console.dir (data)})
 
 // A room was joined.
 socket.on('room joined', function (data) {
  console.dir (data)
 })
})