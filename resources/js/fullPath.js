const fs = require('fs');
const { basename, resolve }  = require('path');
const { spawn } = require('child_process');
const inputAddress = document.querySelector(#inputAddress);

function getPath() {
    console.log("cheguei")
    let fullPath = spawn("$(xdg-mime query default inode/directory | sed 's/.desktop//g')", { shell: true });
    inputAddress.value = fullPath;
}

