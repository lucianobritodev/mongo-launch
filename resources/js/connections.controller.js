const { BrowserWindow } = require('electron');
const spawn = require('child_process').spawn;
const path = __dirname;

function execVPN(str) {
    let conn = readConnections(str);
    spawn(
        'openconnect', [
        '--protocol=' + conn.protocol,
        conn.gateway,
        '-u ' + conn.login,
    ]);
}

function readConnections() {
    
    let data = fs.readFileSync(path + '/connections.json', 'utf8');
    let connections = JSON.parse(data);
    let conns = [];

    for(let i=0; i < connections.length; i++) {
        conns.push({label: connections[i].name, type: 'radio', click: () => {
            const child = new BrowserWindow({
                parent: mainWindow,
                show: false,
                minimizable: true,
                maximizable: true,
                closable: true,
                autoHideMenuBar: true
            });
            child.loadFile(path + '/index.html')
            child.show(true);
            child.setAlwaysOnTop(true);
            child.focus();
            child.setAlwaysOnTop(false);
        }});
    }

    return conns;
}