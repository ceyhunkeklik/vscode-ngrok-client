import * as vscode from "vscode";
import * as request from "request";
import * as ngrok from "ngrok";
import * as httpServer from "http-server";
import * as portFinder from "portfinder";
import * as open from "open";

import constants from "./constants";

let output: any;
let httpServerInstance: any;
let statusBarIcon: vscode.StatusBarItem;

const createLog = (msg: string) => {
  if (msg) {
    output.appendLine(`ngrok-client: ${msg}`);
  }
};

const stopServer = () => {
  return new Promise(resolve => {
    request(constants.tunnelApi, { json: true }, (err, res, body) => {
      if (!err && body.tunnels) {
        body.tunnels.forEach((tunnel: any) => {
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
  if (statusBarIcon.text === constants.statusBarStopText) {
    vscode.commands.executeCommand(constants.commands.startServer);
  } else {
    vscode.commands.executeCommand(constants.commands.stopServer);
  }
};

const createStatusBarItem = () => {
  statusBarIcon = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, Number.MAX_SAFE_INTEGER);
  statusBarIcon.command = constants.commands.toggle;
  statusBarIcon.text = `$(globe) ngrok client: start server`;
  statusBarIcon.show();
};

export function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel("ngrok-client");

  createStatusBarItem();

  context.subscriptions.push(
    vscode.commands.registerCommand(constants.commands.startServer, () => {
      output.show();
      stopServer().then(() => {
        const path = vscode.workspace.rootPath;
        if (path) {
          createLog("Finding an available port...");

          var startPort = (port: any) => {
            try {
              createLog(`Creating local http server...`);
              httpServerInstance = httpServer.createServer({
                root: path,
                showDir: true,
                showDotfiles: true
              });

              httpServerInstance.listen(Number(port));

              createLog(`Local http-server started successfully; Local URL: http://localhost:${port}`);
              createLog(`Creating remote http server via ngrok...`);

              ngrok
                .connect(port)
                .then(result => {
                  createLog(`ngrok started successfully: Remote URL: ${result}`);

                  (async () => {
                    await open(result);
                  })();

                  statusBarIcon.text = constants.statusBarStartText;
                })
                .catch(error => {
                  if (error && error.error_code && error.error_code === 103) {
                  }
                  createLog(`An Error Occured. Error Detail: ${JSON.stringify(error)}`);
                });
            } catch (error) {
              createLog(`An Error Occured. Error Detail: ${JSON.stringify(error)}`);
            }
          };

          var portNumber = <number>vscode.workspace.getConfiguration("ngrok-client").get("portNumber");

          if (portNumber) {
            startPort(parseInt(portNumber.toString()));
          } else {
            portFinder.getPort((err, port) => {
              if (!err) {
                if (port) {
                  createLog(`Port was found: ${port}`);

                  startPort(port);
                } else {
                  createLog(`An Error Occured. Error Detail: There isn't any available port for http server`);
                }
              } else {
                createLog(`An Error Occured. Error Detail: ${JSON.stringify(err)}`);
              }
            });
          }
        } else {
          vscode.window.showWarningMessage("You must open a folder to use ngrok-client.", {
            modal: true
          });
        }
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(constants.commands.stopServer, function() {
      output.show();
      stopServer().then(() => {
        statusBarIcon.text = constants.statusBarStopText;
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(constants.commands.toggle, function() {
      updateStatusBarItem();
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {
  vscode.commands.executeCommand(constants.commands.stopServer);
}
