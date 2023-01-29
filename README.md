# Project Reality Intelligent Server Manager

PRISM is a powerful administration tool. This tool allows admins to keep an eye on the players in the server as if you were in the game itself, by allowing you to view the map, list of players, chat, and interact using all of the normal RealityAdmin commands.

## Disclaimer

This is a project that aim to make interactice with the PRISM server easier, it is not a official project from the PRISM team, and it is not supported by them. If you have any issues with the tool, please open an issue in the github repo. If you have any issues with the PRISM server, please contact the PRISM team.

## Commands

This command availabel via the `send_raw_command` function.

- `say <message>` - Send a message to the server
- `sayteam <team> <message>` - Send a message to specific team in the server (1 bluefor | 2 opfor)
- `serverdetailsalawys` - Alawys Show server details
- `serverdetails` - Show server details when server ready
- `gameplaydetails` - List of Map Details
- `listplayers` - List all players in the server
- `getusers` - List all prism users in the server
- `adduser` - Add a prism user to the server
- `changeuser` - Change a prism user in the server
- `deleteuser` - Delete a prism user from the server
- `readmaplist` - List all maps in the server
- `readbanlist` - List all ban player in the server
- `apiadmin` - Send a Reality Admin Command to the server

## Reality Admin Commands

This command availabel via the `send_command` function. Wrapper for `apiadmin` command.
args should be a list like ["setnext", "kashan", "cq", "std"]

- `kick <player>` - Kick a player from the server
- `ban <player>` - Ban a player from the server
- `unban <player>` - Unban a player from the server
- `mute <player>` - Mute a player from the server
- `unmute <player>` - Unmute a player from the server
- `move <player> <team>` - Move a player to a team
- `setnext <map>` - Set the next map
- more... - Check the [RCON Commands Wiki]() for more commands

## Available functions

- `send_command(...args)` - Send a Reality Admin Command to the server
- `send_raw_command(subject, ...args)` - Send a raw command to the server
- `login()` - Login to the server
- `disconnect()` - Disconnect from the server
- `reconnect()` - Reconnect to the server

## Available events

- `connect` - Fired when the client is connected to the server
- `disconnect` - Fired when the client is disconnected from the server
- `log` - Fired when the PRISM log something
- `error` - Fired when the PRISM log an error
- `game` - Fired when the PRISM log a game message chat response
- `adminalert` - Fired when the PRISM log an admin alert chat response
- `response` - Fired when the PRISM log a response after issuing a command
- `APIAdminResult` - Fired when the PRISM log a response after issuing a Reality Admin Command
- `maplist` - Fired when the PRISM recive a map list
- `serverdetails` - Fired when the PRISM recive a server details

## Credit

This project is based on the work of [PRISMBot](https://github.com/ShrapGnoll/PRISMBot). Checkout the original project for more information.
