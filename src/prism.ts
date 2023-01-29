import { Socket } from "net";
import EventBus from "./eventbus";
import Message from "./message";
import { createHash, csrpng, formatDateTime } from "./utils";

class PRISM {
    port: number;
    host: string;
    client: Socket;
    username: string;
    password: string;
    
    private inputBuffer: string;
    private outputBuffer: Buffer[];
    private passwordHash: string;
    private clientChallange: string;
    private serverChallange: string;
    private salt: string;
    private authenticated: boolean;
    private eventEmitter: EventBus;
    private status: boolean;

    constructor(port: number, host: string, username: string, password: string) {
        // NET
        this.port = port;
        this.host = host;
        this.outputBuffer = [];
        this.inputBuffer = "";
        this.client = new Socket();

        // Credential
        this.username = username;
        this.password = password;
        this.passwordHash = '';
        this.clientChallange = '';
        this.serverChallange = '';
        this.salt = "";

        // State
        this.authenticated = false;
        this.eventEmitter = new EventBus();
        this.status = false;

        this.connect();
        this.after();
    }

    after() {
        let self = this;
        this.client.on('end', () => {
            self.emit_event('log', 'Disconnected from PRISM Server');
            self.status = false;
            console.log('Disconnected form PRISM Server');
        });

        this.client.on('data', function(data) {
            //console.log("RECEIVED "+data.toString());
            self.messages(data.toString());
        });

        this.client.on('connect', () => {
            self.status = true;
            self.emit_event('log', 'Connected to PRISM Server');
            console.log('Connected to PRISM Server');
        });

        this.client.on('error', (data) => {
            self.emit_event('log', data);
            console.error(data);
        });
    }

    connect() {
        this.client.connect(this.port, this.host);
    }

    reconnect() {
        let self = this;
        this.client.removeAllListeners();
        
        // Call connect
        this.connect();

        this.client.on('error', err => {
            console.error(err);
            console.error(err);
        });

        this.client.once('connect', function() {
            self.emit_event('log', 'Connectd to PRISM Server');
            console.info('Connected to server!');
            self.after();
            self.login();
        });
        console.log('Reconnecting to PRISM Server');
    }

    disconnect() {
        this.authenticated = false;
        this.client.end();
        console.log('Disconnected form PRISM Server');
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
        if(this.inputBuffer) {
            data = this.inputBuffer + data;
            this.clear_inputBuffer();
        }

        const msg = data.split(DELIMITER, 1);

        if(data.includes(DELIMITER) && (msg[1] == undefined || msg[1] == null) ) {
            this.parse_command(msg[0]);
        } else if(!data.includes(DELIMITER)) {
            this.set_inputBuffer(data);
        } else if(data.includes(DELIMITER) && !msg[1].includes(DELIMITER)) {
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
                // this._log(message);
                break;

            case 'APIAdminResult':
                this.emit_event(subject, message.messages);
                //this._log(message);
                //console.log(message.messages)
                break;

            case 'chat':
                this._chat(message);
                break;

            case 'success':
                this._log(message);
                break;

            case 'error':
                this.emit_event('error', message);
                this._log(message);
                break;

            case 'errorcritical':
                this._log(message);
                break;

            case 'raconfig':
                //this._log(message);
                //console.log(message.messages)
                break;

            default:
                console.log('No parser found: ' + subject);
                // this._log(message);
                //console.log(message.messages)
                break;
        }
    }

    set_inputBuffer(data: string) {
        console.log('Set Input Buffer');
        this.inputBuffer = data;
    }

    clear_inputBuffer() {
        console.log('Clear Input Buffer');
        this.inputBuffer = "";
    }

    send_outputBuffer() {
        if(!this.client) return;
        const client = this.client;

        while (this.outputBuffer.length > 0) {
            const data = this.outputBuffer.shift();
            if(!data) return;
            // console.log(data.toString());
            client.write(data);
        }
    }

    get_server_details() {
        this.send_raw_command("serverdetailsalways");
    }

    send_raw_command(subject: string, ...args: string[]) {
        const data = '\x01' + subject + '\x02' + args.join('\x03') + '\x04' + '\x00';
        this.outputBuffer.push(Buffer.from(data, 'utf-8'));
        this.send_outputBuffer();
    }

    login(username = this.username, password = this.password) {
        if(this.authenticated) {
            this.emit_event('log', 'already authenticated!');
            return;
        }

        this.passwordHash = createHash(password);
        this.clientChallange = csrpng().toString(16).replace(/(x0)+/, '').replace(/L+$/, '');

        this.send_raw_command("login1", "1", username, this.clientChallange);
    }

    auth_digest(username: string, passwordHash: string, salt: string, clientChallange: string, serverChallange: string) {
        const saltPass = salt + '\x01' + passwordHash;
        const saltedHash = createHash(saltPass);
        const res = [username, clientChallange, serverChallange, saltedHash].join('\x03').toString();
        return createHash(res);
    }

    get event() {
        return this.eventEmitter;
    }

    emit_event(subject: string, ...data: any[]) {
        this.eventEmitter.emit(subject, ...data);
    }

    /**
     * SUBJECT HANDLER
     */

    _login1(message: Message) {
        [this.salt, this.serverChallange] = message.messages;
        if(this.salt && this.serverChallange) {
            this._login2();
        }
    }

    _login2() {
        const digest = this.auth_digest(this.username, this.passwordHash, this.salt, this.clientChallange, this.serverChallange);
        this.send_raw_command('login2', digest);
        this.passwordHash = '';
        this.clientChallange = '';
    }

    _connected(message: Message) {
        this.authenticated = true;
        this._log(message);
        this.emit_event('log', 'Authenticated as Skynet');
    }

    _log(message: Message) {
        this.emit_event('log', message);
    }

    isGameManagementChat(message: Message) {
        if(message.subject != 'chat') return false;
        if(message.messages.length < 3) return false;
        if(message.messages[2].includes('Game') || message.messages[2].includes('Admin Alert') || message.messages[2].includes('Response')) return true;
        return false;
    }

    _chat(message: Message) {
        if(this.isGameManagementChat(message)) {
            message.messages = message.messages.slice(2);

            //console.log(message);
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
                    //console.log(message);
                    break;
            }
        }
    }

    _man_game(message: Message) {
        this.emit_event('game', message);
    }

    _man_adminalert(message: Message) {
        this.emit_event('adminalert', message);
    }

    _man_response(message: Message) {
        this.emit_event('response', message);
    }

    /**
     * Parse server details message
     * @param {Message} message
     */
    _serverdetails(message: Message) {
        const msg = message.messages;

        const layers: Layers = {
            '16': 'inf',
            '32': 'alt',
            '64': 'std',
            '128': 'large',
        };

        const details: Details = {
            'servername'        : msg[0],
            'serverIP'          : msg[1],
            'serverPort'        : msg[2],
            'serverStartupTime' : msg[3],
            'serverWarmup'      : msg[4],
            'serverRoundLength' : msg[5],
            'maxPlayers'        : msg[6],
            'status'            : msg[7],
            'map'               : msg[8],
            'mode'              : msg[9],
            'layer'             : msg[10],
            'timeStarted'       : msg[11],
            'players'           : msg[12],
            'team1'             : msg[13],
            'team2'             : msg[14],
            'tickets1'          : msg[15],
            'tickets2'          : msg[16],
            'rconUsers'         : msg[17],
        };

        details["serverStartupTime"] = formatDateTime(new Date(details["serverStartupTime"]));
        details["serverWarmup"] = parseFloat(details["serverWarmup"])/60 + " minutes"
        details["serverRoundLength"] = parseFloat(details["serverRoundLength"])/60 + " minutes"
        details['layer'] = layers[ details['layer'] as keyof Layers];
        details["timeStarted"] = formatDateTime(new Date(details['timeStarted']))

        if(details['status']){
            details['status'] = "LOADING SCREEN";
            details["mode"] = '';
            details["layer"] = ''
            details["team1"] = '';
            details["team2"] = '';
        } else {
            details['status'] = '';
        }

        this.emit_event('serverdetails', details);
    }
}

type Layers = {
    '16': string;
    '32': string;
    '64': string;
    '128': string;
}

interface Details {
    'servername'        : string,
    'serverIP'          : string,
    'serverPort'        : string,
    'serverStartupTime' : string,
    'serverWarmup'      : string,
    'serverRoundLength' : string,
    'maxPlayers'        : string,
    'status'            : string,
    'map'               : string,
    'mode'              : string,
    'layer'             : string,
    'timeStarted'       : string,
    'players'           : string,
    'team1'             : string,
    'team2'             : string,
    'tickets1'          : string,
    'tickets2'          : string,
    'rconUsers'         : string,
}