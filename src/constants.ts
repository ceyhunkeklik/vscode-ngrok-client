export default {
  commands: {
    startServer: "ngrok-client.startServer",
    stopServer: "ngrok-client.stopServer",
    toggle: "ngrok-client.toggle"
  },
  tunnelApi: "http://localhost:4040/api/tunnels",
  statusBarStartText: `$(circle-slash) ngrok client: stop server`,
  statusBarStopText: `$(globe) ngrok client: start server`
};
