const socket = io();

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const inputForm = welcome.querySelectorAll("input");

const mainroom = document.getElementById("room");
mainroom.hidden = true; // hide 기능

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection = new RTCPeerConnection;
let roomID, nickname;


function addMessage(message){
    const ul = mainroom.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const input = mainroom.querySelector("input");
    const value = input.value;
    console.log(`submit msg ${value}`);
    socket.emit("new_message", input.value, roomID, () => {
        addMessage(`You : ${value}`);
    });
    input.value = "";
}

function handleNicknameSubmit(event) {
    event.preventDefault();
    const input = mainroom.querySelector("#name input");
    const value = input.value;
    socket.emit("nickname", value);

}

function makeConnection(){
    mypeerConnection = new RTCPeerConnection();
    myStream.getTracks().forEach(track => myPeerConnection.addTrack(track, myStream));
}

async function getCameras() {
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if ( currentCamera.label === camera.label){
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        })
    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId){
    const initialConstraints = {
        audio: false,
        video: { facingMode: "user"},
    };
    const cameraConstraints = {
        audio: false,
        video: { deviceId: {exact: deviceId } },
    };

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        }
        
    } catch(e){
        console.log(e);
    }
}

async function showRoom() {
    welcome.hidden = true;
    mainroom.hidden = false;
    
    const h3 = mainroom.querySelector("h3");
    h3.innerText = `Room ${roomID}`;

    //const nameForm = mainroom.querySelector("#name");
    const msgForm = mainroom.querySelector("#msg ");
    const mainroomExitForm = mainroom.querySelector("#exit");
    mainroomExitForm.addEventListener("submit", handleExitSubmit);

    msgForm.addEventListener("submit", handleMessageSubmit);
    socket.emit("nickname", nickname);

    await getMedia();
    makeConnection();
    //nameForm.addEventListener("submit", handleNicknameSubmit);
}

function handleWelcomeSubmit(event){
    event.preventDefault();

    nickname = inputForm[0].value;
    roomID = inputForm[1].value;

    socket.emit("join_room", roomID, nickname, showRoom);

    inputForm[0].value = "";
    inputForm[1].value = "";
    
    
}

function handleExitSubmit(event){
    event.preventDefault();
    socket.emit("exit_room");
    welcome.hidden = false;
    mainroom.hidden = true;
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);
socket.on("new_message", addMessage);

socket.on("welcome", (user, newCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomID} (${newCount})`;
    addMessage(`${user} join:)`);
});