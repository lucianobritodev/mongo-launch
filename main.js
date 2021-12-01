const fs = require('fs');
const { basename, resolve } = require('path');
const { BrowserWindow, app, Tray, Menu, nativeImage, Notification } = require('electron');
const { spawn, exec, spawnSync } = require('child_process');
const notifier = require('node-notifier');
const Store = require('electron-store');
const { kill } = require('process');

let MONGO_PID = '';
let InstancesMongo = [];
let mainWindow = {};
let tray;

const schema = {
    connections: {
        type: 'string'
    }
}

const store = new Store({ schema });

store.set('connections', JSON.stringify([
  {
    type: "local",
    name: "meu banco mongo",
    path: "/home/luciano/mongo/db",
    hostname: "localhost",
    port: "27017",
    user: "Luciano Guedes",
    password: "",
    ssl: "",
    auth: ""
  },
  {
    type: "remote",
    name: "meu banco mongo 2",
    path: "/home/luciano/mongo/db",
    hostname: "localhost",
    port: "27017",
    user: "Luciano Guedes",
    password: "",
    ssl: "",
    auth: ""
  }
]));

function getMenu() {
    const locale = app.getLocale();

    switch (locale) {
      case 'es-419' || 'es':
        return JSON.parse(fs.readFileSync(resolve(__dirname, 'options/es.json')));
      case 'pt-BR' || 'pt-PT':
        return JSON.parse(fs.readFileSync(resolve(__dirname, 'options/pt.json')));
      default:
        return JSON.parse(fs.readFileSync(resolve(__dirname, 'options/en.json')));
    }
}


function render() {
    const connections = store.get('connections');
    const conns = connections ? JSON.parse(connections) : [];
    const menu = getMenu();
  
    const items = conns.map(conn => getSubmenu(conn, menu));
  
    const contextMenu = Menu.buildFromTemplate([
      {
        label: menu.add, type: 'normal', click: () => {
          let child = getBrowserWindow();
          child.loadFile(resolve(__dirname, 'index.html'))
          child.setAlwaysOnTop(true);
          child.focus();
          child.setAlwaysOnTop(false);
        },
      },
      {
        label: menu.compass,
        click: () => {
          spawn('$(mongodb-compass)', { shell: true });
        }
      },
      {
        type: 'separator',
      },
      ...items,
      {
        type: 'separator',
      },
      {
        type: 'normal',
        label: menu.close,
        role: 'quit',
        enabled: true,
      },
    ]);
  
    tray.setContextMenu(contextMenu);
  
    tray.on('click', tray.popUpContextMenu);
}


function getBrowserWindow() {

  const child = new BrowserWindow({
    parent: mainWindow,
    show: true,
    minimizable: true,
    maximizable: true,
    closable: true,
    autoHideMenuBar: true
  });

  return child;
}


function getSubmenu(conn, menu) {
  let connection = {
    label: conn.name,
    submenu: [
      {
        label: menu.start,
        click: () => {
          let mongoPID = launchNewConnection(conn);
          MONGO_PID = mongoPID;
          if(MONGO_PID) {
            InstancesMongo.push({
              pid: MONGO_PID,
              port: conn.port
            })
            return showNotification(null, {
              title: 'Running!',
              message: 'MongoDB está rodando na porta ' + conn.port
            });
          }
          showNotification(mongoPID, {
            title: 'Erro!',
            message: 'MongoDB não pôde ser iniciado'
          });
        },
      },
      {
        label: menu.finish,
        click: () => {
          kills = spawnSync('lsof', [ '-ti tcp:' + conn.port ], { shell: true, encoding : 'utf8' });
          kills = kills.stdout.trim();
          if(kills && kills !== '') {
            let pids = kills.split('\n');
            pids.map(pid => {
              spawn('kill ' + pid, { shell: true });
            })

            for(let i=0; i<InstancesMongo.length; i++) {
              if(InstancesMongo[i].port === conn.port) {
                InstancesMongo.splice(i, 1);
              }
            }

            showNotification(null, {
              title: 'Closed!',
              message: 'MongoDB stopped on port ' + conn.port
            })
          } else {
            showNotification(null, {
              title: 'Erro!',
              message: 'Não há nenhuma instância deste banco rodando!'
            })
          }
        },
      },
      {
        label: menu['local-stored'],
        click: () => {
          spawn("$(xdg-mime query default inode/directory | sed 's/.desktop//g') " + conn.path, { shell: true });
        }
      },
      {
        label: menu.edit,
        click: () => {
          let child = getBrowserWindow();
          child.loadFile(resolve(__dirname, 'index.html'))
          child.setAlwaysOnTop(true);
          child.focus();
          child.setAlwaysOnTop(false);
        },
      },
      {
        label: menu.remove,
        click: () => {
          store.set('connections', JSON.stringify(conns.filter(item => item !== conn)));
          render();
        },
      },
    ]
  }

  if(conn.type == 'remote') {
    connection.submenu.splice(0, 3);
  }

  return connection;
}

function showNotification(err, notify) {

  if(typeof err !== 'undefined' && err !== null) {
    return notifier.notify({
      title: notify.title,
      message: err.message,
      wait: true,
      timeout: false,
      icon: resolve(__dirname, 'assets/mongodb-pngrepo-com.png')
    })
  }

  notifier.notify({
    title: notify.title,
    message: notify.message,
    wait: true,
    timeout: false,
    icon: resolve(__dirname, 'assets/mongodb-pngrepo-com.png')
  })
}


function launchNewConnection(conn) {

  InstancesMongo.forEach(instance => {
    if(instance.port == conn.port) {
      throw new Error('Porta em uso!');
    }
  })

  if(conn.type === 'local') {
    if(conn.password && conn.password != '') {
      const mongoInstance = spawn('$(mongod --port ' + conn.port + ' --dbpath ' + conn.path + ')',  { shell: true });
      
      mongoInstance.on('exit', (code) => {
        console.log('Error code: ' + code)
      })
      
      return mongoInstance.pid;
    }

    const mongoInstance =  spawn('mongod --port ' + conn.port + ' --dbpath ' + conn.path + ' --noauth', { shell: true });
    
    mongoInstance.on('exit', (code) => {
      console.log('Error code: ' + code)
    })
    
    return mongoInstance.pid;
  }
}

app.whenReady().then(() => {
  tray = new Tray(nativeImage.createFromPath(resolve(__dirname, 'assets/mongodb-pngrepo-com.png')));
  render(tray);

  mainWindow = new BrowserWindow({ show: false });
})