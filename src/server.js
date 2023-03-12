import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname+"/views");
app.use("/public", express.static(__dirname + "/public"));

app.get("/", (req, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));


const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

function countRoom(roomName) {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket)=>{
    socket["nickname"] = "Anon";
    socket.on("join_room", (roomName, nickname, done) => {
        socket.nickname = nickname
        socket.join(roomName);
        done();

        socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    });

    socket.on("exit_room", () => {
        console.log(`socket3 ${socket}`);
    });

    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    
    socket.on("nickname", nickname => socket["nickname"] = nickname);
    

});

const handleListen = () => console.log("server start");
httpServer.listen(3000, handleListen);
