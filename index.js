const PORT = 3000
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const socket = require("websocket").server
const http = require("http");
const app = express();
const router = express.Router();

const users = []
const Types = {
    SignIn: "SignIn",
    StartStreaming: "StartStreaming",
    UserFoundSuccessfully: "UserFoundSuccessfully",
    Offer: "Offer",
    Answer: "Answer",
    IceCandidates: "IceCandidates",
    EndCall: "EndCall",
}

router.get('/session', (req, res, next) => {
    res.sendFile(path.join(__dirname, 'public', 'session.html'))
})

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/remote-control', router)
app.use((req, res, next) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'))
})

const server = http.createServer(app);
server.listen(PORT, () => {
    console.log('Server listening on port ' + PORT);
});

const webSocket = new socket({
    httpServer: server, 
    autoAcceptConnections: false
});
webSocket.on('request', (req) => {
    const connection = req.accept();
    connection.on('message', (message) => {
        try {
            const data = JSON.parse(message.utf8Data);
            const currentUser = findUser(data.sessionId)
            const userToReceive = findUser(data.target)
            console.log("message:", data)
            switch (data.type) {
                case Types.SignIn:
                    if (currentUser) return
                    users.push({sessionId: data.sessionId, conn: connection, password: data.data})
                    break
                case Types.StartStreaming :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.StartStreaming,
                        sessionId: currentUser.sessionId,
                        target: userToReceive.sessionId
                    })
                    break
                case Types.Offer :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.Offer, 
                        sessionId: data.sessionId,
                        target: userToReceive.sessionId,
                        data: data.data
                    })
                    break
                case Types.Answer :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.Answer, sessionId: data.sessionId, data: data.data
                    })
                    break
                case Types.IceCandidates:
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.IceCandidates, 
                        sessionId: data.sessionId, 
                        target: userToReceive.sessionId, 
                        data: data.data
                    })
                    break
                case Types.EndCall:
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.EndCall, sessionId: data.sessionId
                    })
                    break
            }
        } catch (error) { console.log("error:", error.message) }

    });
    connection.on('close', () => {
        users.forEach(user => {
            if (user.conn === connection) users.splice(users.indexOf(user), 1)
        })
    })
});

const sendToConnection = (connection, message) => {
    connection.send(JSON.stringify(message))
}
const findUser = sessionId => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].sessionId === sessionId) return users[i]
    }
}


