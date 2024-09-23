
const socket = io();

const rankingList = document.getElementById("rankingList");

// let userId = localStorage.getItem('userId');
// if (!userId) {
//   // Generate a new userId and store it in localStorage
//   userId = `user_${Math.random().toString(36).substr(2, 9)}`;
//   localStorage.setItem('userId', userId);
// }

// socket.emit("userConnected", userId);

socket.on('updateUserCount', (userCountMap) => {
    rankingList.innerHTML = "";  
    for (const country in userCountMap){
        rankingList.innerHTML += `<li>${country} : ${userCountMap[country]}</li>`;  
    }   
})

// window.addEventListener("beforeunload", ()=>{
//     socket.emit("userDisconnect", userId);
//     socket.disconnet();
// })