import { Socket } from 'net';
import EventBus, { IEmissions } from './eventbus';
import Message from './message';
import { Layers } from '../types/layers';
import { ServerDetail } from '../types/serverdetail';
import { GameMap } from '../types/gamemap';
import { createHash, csrpng, formatDateTime } from './utils';
import { LAYERS } from '../constant';

class PRISM {
  port: number;
  host: string;
  username: string;
  password: string;

  client: Socket;
  event: EventBus;

  private inputBuffer: string;
  private outputBuffer: Buffer[];
  private passwordHash: string;
  private clientChallange: string;
  private serverChallange: string;
  private salt: string;
  private authenticated: boolean;
  private status: boolean;

  constructor(port: number, host: string, username: string, password: string) {
    // NET
    this.port = port;
    this.host = host;
    this.outputBuffer = [];
    this.inputBuffer = '';
    this.client = new Socket();

    // Credential
    this.username = username;
    this.password = password;
    this.passwordHash = '';
    this.clientChallange = '';
    this.serverChallange = '';
    this.salt = '';

    // State
    this.authenticated = false;
    this.event = new EventBus();
    this.status = false;

    this.connect();
    this.after();
  }

  after() {
    const self = this;
    this.client.on('end', () => {
      self.event.emit('log', 'Disconnected from PRISM Server');
      self.status = false;
    });

    this.client.on('data', function (data) {
      self.messages(data.toString());
    });

    this.client.on('connect', () => {
      self.status = true;
      self.event.emit('log', 'Connected to PRISM Server');
    });

    this.client.on('error', (data) => {
      self.event.emit('log', data);
    });
  }

  connect() {
    this.client.connect(this.port, this.host);
  }

  reconnect() {
    const self = this;
    this.client.removeAllListeners();

    // Call connect
    this.connect();

    this.client.on('error', (err) => {
      self.event.emit('log', err);
    });

    this.client.once('connect', function () {
      self.event.emit('log', 'Connectd to PRISM Server');
      self.after();
      self.login();
    });
    this.event.emit('log', 'Reconnecting to PRISM Server');
  }

  disconnect() {
    this.authenticated = false;
    this.client.end();
    this.event.emit('log', 'Disconnected from PRISM Server');
  }

  /**
   * Send Reality admin command
   * @param  {...string} args
   * args should be a list like ["setnext", "kashan", "cq", "std"]
   */
  send_command(...args: string[]) {
    this.send_raw_command('apiadmin', ...args);
  }

  messages(data: string) {
    const DELIMITER = '\x04\x00';
    if (this.inputBuffer) {
      data = this.inputBuffer + data;
      this.clear_inputBuffer();
    }

    const msg = data.split(DELIMITER, 1);

    if (data.includes(DELIMITER) && (msg[1] === undefined || msg[1] == null)) {
      this.parse_command(msg[0]);
    } else if (!data.includes(DELIMITER)) {
      this.set_inputBuffer(data);
    } else if (data.includes(DELIMITER) && !msg[1].includes(DELIMITER)) {
      this.parse_command(msg[0]);
      this.set_inputBuffer(msg[1]);
    } else if (data.includes(DELIMITER) && msg[1].includes(DELIMITER)) {
      this.parse_command(msg[0]);
      this.messages(msg[1]);
    }
  }

  parse_command(command: string) {
    const message = new Message(command);
    const subject = message.subject;

    switch (subject) {
      case 'login1':
        this._login1(message);
        break;

      case 'connected':
        this._connected(message);
        break;

      case 'serverdetails':
        this._serverdetails(message);
        break;

      case 'updateserverdetails':
        break;

      case 'APIAdminResult':
        this.event.emit(subject, message);
        break;

      case 'chat':
        this._chat(message);
        break;

      case 'success':
        this._log(message);
        break;

      case 'error':
        this.event.emit('error', message);
        this._log(message);
        break;

      case 'errorcritical':
        break;

      case 'raconfig':
        break;

      case 'gameplaydetails':
        break;

      case 'serverdetails':
        break;

      case 'listplayers':
        // TODO: Handel multiple data chunks
        this._listplayers(message);
        break;

      case 'updateplayers':
        // TODO: Update player list
        break;

      case 'maplist':
        this._maplist(message);
        break;

      case 'getusers':
        break;

      case 'playerleave':
        // TODO: Remove player from list
        break;
      default:
        this.event.emit('log', 'No parser found: ' + subject);
        break;
    }
  }

  set_inputBuffer(data: string) {
    this.inputBuffer = data;
  }

  clear_inputBuffer() {
    this.inputBuffer = '';
  }

  send_outputBuffer() {
    if (!this.client) return;
    const client = this.client;

    while (this.outputBuffer.length > 0) {
      const data = this.outputBuffer.shift();
      if (!data) return;
      client.write(data);
    }
  }

  get_server_details() {
    this.send_raw_command('serverdetailsalways');
  }

  get_gameplay_details() {
    this.send_raw_command('gameplaydetails');
  }

  get_player_list() {
    this.send_raw_command('listplayers');
  }

  get_map_list() {
    this.send_raw_command('readmaplist');
  }

  get_ban_list() {
    this.send_raw_command('readbanlist');
  }

  send_raw_command(subject: string, ...args: string[]) {
    const data = '\x01' + subject + '\x02' + args.join('\x03') + '\x04' + '\x00';
    this.outputBuffer.push(Buffer.from(data, 'utf-8'));
    this.send_outputBuffer();
  }

  login(username = this.username, password = this.password) {
    if (this.authenticated) {
      this.event.emit('log', 'already authenticated!');
      return;
    }

    this.passwordHash = createHash(password);
    this.clientChallange = csrpng().toString(16).replace(/(x0)+/, '').replace(/L+$/, '');

    this.send_raw_command('login1', '1', username, this.clientChallange);
  }

  auth_digest(username: string, passwordHash: string, salt: string, clientChallange: string, serverChallange: string) {
    const saltPass = salt + '\x01' + passwordHash;
    const saltedHash = createHash(saltPass);
    const res = [username, clientChallange, serverChallange, saltedHash].join('\x03').toString();
    return createHash(res);
  }

  /**
   * SUBJECT HANDLER
   */

  _login1(message: Message) {
    [this.salt, this.serverChallange] = message.messages;
    if (this.salt && this.serverChallange) {
      this._login2();
    }
  }

  _login2() {
    const digest = this.auth_digest(
      this.username,
      this.passwordHash,
      this.salt,
      this.clientChallange,
      this.serverChallange,
    );
    this.send_raw_command('login2', digest);
    this.passwordHash = '';
    this.clientChallange = '';
  }

  _connected(message: Message) {
    this.authenticated = true;
    this._log(message);
    this.event.emit('log', 'Authenticated as Skynet');

    this.get_map_list();
  }

  _log(message: Message) {
    this.event.emit('log', message);
  }

  isGameManagementChat(message: Message) {
    if (message.subject !== 'chat') return false;
    if (message.messages.length < 3) return false;
    if (
      message.messages[2].includes('Game') ||
      message.messages[2].includes('Admin Alert') ||
      message.messages[2].includes('Response')
    )
      return true;
    return false;
  }

  _chat(message: Message) {
    if (this.isGameManagementChat(message)) {
      message.messages = message.messages.slice(2);

      switch (message.messages[0]) {
        case 'Game':
          this._man_game(message);
          this._log(message);
          break;

        case 'Admin Alert':
          this._man_adminalert(message);
          this._log(message);
          break;

        case 'Response':
          this._man_response(message);
          this._log(message);
          break;

        default:
          break;
      }
    }
  }

  _man_game(message: Message) {
    this.event.emit('game', message);
  }

  _man_adminalert(message: Message) {
    this.event.emit('adminalert', message);
  }

  _man_response(message: Message) {
    this.event.emit('response', message);
  }

  _listplayers(message: Message) {
    // TODO: parse player list
  }

  /**
   * Parse maplist message
   * @param {Message} message
   */
  _maplist(message: Message) {
    const msg = message.messages;
    const msgList = msg[2].split('\n');

    const maplist: GameMap[] = [];

    for (const map of msgList) {
      const maps = map.split(' ');
      if (maps.length < 4) continue;

      const mapObj: GameMap = {
        index: maps[0].slice(0, -1),
        name: maps[1].replace(/"/gm, ''),
        mode: maps[2],
        layer: LAYERS[maps[3] as keyof Layers],
      };

      maplist.push(mapObj);
    }

    this.event.emit('maplist', maplist);
  }

  /**
   * Parse server details message
   * @param {Message} message
   */
  _serverdetails(message: Message) {
    const msg = message.messages;

    const details: ServerDetail = {
      servername: msg[0],
      serverIP: msg[1],
      serverPort: msg[2],
      serverStartupTime: msg[3],
      serverWarmup: msg[4],
      serverRoundLength: msg[5],
      maxPlayers: msg[6],
      status: msg[7],
      map: msg[8],
      mode: msg[9],
      layer: msg[10],
      timeStarted: msg[11],
      players: msg[12],
      team1: msg[13],
      team2: msg[14],
      tickets1: msg[15],
      tickets2: msg[16],
      rconUsers: msg[17],
    };

    details.serverStartupTime = formatDateTime(new Date(parseFloat(details.serverStartupTime) * 1000));
    details.serverWarmup = parseFloat(details.serverWarmup) / 60 + ' minutes';
    details.serverRoundLength = parseFloat(details.serverRoundLength) / 60 + ' minutes';
    details.layer = LAYERS[details['layer'] as keyof Layers]; // tslint:disable-line
    details.timeStarted = formatDateTime(new Date(parseFloat(details.timeStarted) * 1000));

    if (parseInt(details.status, 2) !== 0) {
      details.status = 'LOADING SCREEN';
      details.mode = '';
      details.layer = '';
      details.team1 = '';
      details.team2 = '';
    } else {
      details.status = '';
    }

    this.event.emit('serverdetails', details);
  }
}

export default PRISM;
