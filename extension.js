const vscode = require("vscode");
const request = require("request");
const ngrok = require("ngrok");
const opn = require("opn");
const httpServer = require("http-server");
const portFinder = require("portfinder");

const commands = {
  startServer: "ngrok-client.startServer",
  stopServer: "ngrok-client.stopServer",
  toggle: "ngrok-client.toggle"
};
const tunnelApi = "http://localhost:4040/api/tunnels";
const statusBarStartText = `$(circle-slash) ngrok client: stop server`;
const statusBarStopText = `$(globe) ngrok client: start server`;

let output;
let httpServerInstance;
let statusBarIcon;

const createLog = msg => {
  if (msg) {
    output.appendLine(`ngrok-client: ${msg}`);
  }
};

const stopServer = () => {
  return new Promise(resolve => {
    request(tunnelApi, { json: true }, (err, res, body) => {
      if (!err && body.tunnels) {
        body.tunnels.forEach(tunnel => {
          ngrok.disconnect(tunnel.public_url);
        });

        createLog("Remote server closed.");
      }

      if (httpServerInstance && httpServerInstance.close) {
        httpServerInstance.close();
        createLog("Local server closed.");
      }

      resolve();
    });
  });
};

const updateStatusBarItem = () => {
  if (statusBarIcon.text === statusBarStopText) {
    vscode.commands.executeCommand(commands.startServer);
  } else {
    vscode.commands.executeCommand(commands.stopServer);
  }
};

const createStatusBarItem = () => {
  statusBarIcon = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    Number.MAX_SAFE_INTEGER
  );
  statusBarIcon.command = commands.toggle;
  statusBarIcon.text = `$(globe) ngrok client: start server`;
  statusBarIcon.show();
};

function activate(context) {
  output = vscode.window.createOutputChannel("ngrok-client");

  createStatusBarItem();

  context.subscriptions.push(
    vscode.commands.registerCommand(commands.startServer, () => {
      output.show();
      stopServer().then(() => {
        //output.clear();

        const path = vscode.workspace.rootPath;
        if (path) {
          createLog("Finding an available port...");
          portFinder.getPort((err, port) => {
            if (!err) {
              if (port) {
                createLog(`Port was found: ${port}`);

                try {
                  createLog(`Creating local http server...`);
                  httpServerInstance = httpServer.createServer({
                    root: path,
                    showDir: true,
                    showDotfiles: true
                  });

                  httpServerInstance.listen(Number(port));

                  createLog(
                    `Local http-server started successfully; Local URL: http://localhost:${port}`
                  );
                  createLog(`Creating remote http server via ngrok...`);

                  ngrok
                    .connect(port)
                    .then(result => {
                      createLog(
                        `ngrok started successfully: Remote URL: ${result}`
                      );

                      opn(result);

                      statusBarIcon.text = statusBarStartText;
                    })
                    .catch(error => {
                      if (
                        error &&
                        error.error_code &&
                        error.error_code === 103
                      ) {
                      }
                      createLog(
                        `An Error Occured. Error Detail: ${JSON.stringify(
                          error
                        )}`
                      );
                    });
                } catch (error) {
                  createLog(
                    `An Error Occured. Error Detail: ${JSON.stringify(error)}`
                  );
                }
              } else {
                createLog(
                  `An Error Occured. Error Detail: There isn't any available port for http server`
                );
              }
            } else {
              createLog(
                `An Error Occured. Error Detail: ${JSON.stringify(err)}`
              );
            }
          });
        } else {
          vscode.window.showWarningMessage(
            "You must open a folder to use ngrok-client.",
            {
              modal: true
            }
          );
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(commands.stopServer, function() {
      output.show();
      stopServer().then(() => {
        statusBarIcon.text = statusBarStopText;
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(commands.toggle, function() {
      updateStatusBarItem();
    })
  );
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {
  vscode.commands.executeCommand(commands.stopServer);
}

module.exports = {
  activate,
  deactivate
};
