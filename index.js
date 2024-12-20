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
    RequestSession: "RequestSession",
    Offer: "Offer",
    Answer: "Answer",
    IceCandidates: "IceCandidates",
    StartSession: "StartSession",
    SessionMeta: "SessionMeta",
    EndSession: "EndSession",
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
            const payload = JSON.parse(message.utf8Data);
            const currentUser = findUser(payload.sessionId)
            const userToReceive = findUser(payload.target)
            console.log("message:", payload)
            switch (payload.type) {
                case Types.SignIn:
                    if (currentUser) return
                    users.push({
                        sessionId: payload.sessionId, 
                        conn: connection
                    })
                    break
                case Types.RequestSession:
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.RequestSession,
                        sessionId: currentUser.sessionId,
                        target: userToReceive.sessionId
                    })
                    break
                case Types.Offer :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.Offer, 
                        sessionId: payload.sessionId,
                        target: userToReceive.sessionId,
                        data: payload.data
                    })
                    break
                case Types.Answer :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.Answer,
                        sessionId: payload.sessionId,
                        data: payload.data
                    })
                    break
                case Types.IceCandidates:
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.IceCandidates, 
                        sessionId: payload.sessionId, 
                        target: userToReceive.sessionId, 
                        data: payload.data
                    })
                    break
                case Types.StartSession :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.StartSession,
                        sessionId: currentUser.sessionId,
                        target: userToReceive.sessionId
                    })
                    break
                case Types.SessionMeta :
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.SessionMeta,
                        sessionId: currentUser.sessionId,
                        target: userToReceive.sessionId,
                        data: payload.data
                    })
                    break
                case Types.EndSession:
                    if (userToReceive) sendToConnection(userToReceive.conn, {
                        type: Types.EndSession, 
                        sessionId: currentUser.sessionId,
                        target: userToReceive.sessionId
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


