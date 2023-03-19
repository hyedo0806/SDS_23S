const socket = io();

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const inputForm = welcome.querySelectorAll("input");

const mainroom = document.getElementById("call");
mainroom.hidden = true; // hide 기능

const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

const msgForm = mainroom.querySelector("#msg");
const mainroomExitForm = mainroom.querySelector("#exit");

let myStream;
let muted = false;
let cameraOff = false;
let myPeerConnection;
let roomID, nickname;


async function addMessage(message){
    const ul = mainroom.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

async function handleMessageSubmit(event) {
    event.preventDefault();
    const input = mainroom.querySelector("input");
    const value = input.value;
    console.log(`submit msg ${value}`);
    await socket.emit("new_message", input.value, roomID, () => {
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

async function getCameras() {
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if (currentCamera.label === camera.label) {
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
    
    socket.emit("nickname", nickname);

    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event){
    event.preventDefault();

    nickname = inputForm[0].value;
    roomID = inputForm[1].value;
    await showRoom();
    socket.emit("join_room", roomID, nickname);

    inputForm[0].value = "";
    inputForm[1].value = "";
    
    
}

function handleExitSubmit(event){
    event.preventDefault();
    socket.emit("exit_room");
    welcome.hidden = false;
    mainroom.hidden = true;
}

function handleMuteClick() {
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if (!muted) {
      muteBtn.innerText = "Unmute";
      muted = true;
    } else {
      muteBtn.innerText = "Mute";
      muted = false;
    }
  }
function handleCameraClick() {
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
      cameraBtn.innerText = "Turn Camera Off";
      cameraOff = false;
    } else {
      cameraBtn.innerText = "Turn Camera On";
      cameraOff = true;
    }
  }
  
async function handleCameraChange() {
    await getMedia(camerasSelect.value);
    if (myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection.getSenders().find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
      }
  }

welcomeForm.addEventListener("submit", handleWelcomeSubmit);
mainroomExitForm.addEventListener("submit", handleExitSubmit);
msgForm.addEventListener("submit", handleMessageSubmit);

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

socket.on("new_message", addMessage);

socket.on("welcome", async(user, newCount) => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomID);

    const h3 = call.querySelector("h3");
    h3.innerText = `Room ${roomID} (${newCount})`;
    addMessage(`${user} join:)`);
});

socket.on("offer", async (offer) => {
    console.log("received the offer");

    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    
    myPeerConnection.setLocalDescription(answer);
    
    socket.emit("answer", answer, roomID);
    
    console.log("sent the answer");
});
  
socket.on("answer", (answer) => {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);
});
  
socket.on("ice", (ice) => {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);
});
  
// RTC Code
  
function makeConnection() {
    myPeerConnection = new RTCPeerConnection();

    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
      .getTracks()
      .forEach((track) => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data) {
    console.log("sent candidate");
    socket.emit("ice", data.candidate, roomID);
    console.log("after sent candidate");
}
  
function handleAddStream(data) {
  
    const peerFace = document.getElementById("peerFace");
    console.log(`handleaddstream : ${peerFace}`);
    peerFace.srcObject = data.stream;
}