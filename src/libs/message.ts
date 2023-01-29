class Message {
    data: string;
    subject: string;
    messages: string[];

    constructor(data: string) {
        this.data = data;
        this.subject = data.split('\x02')[0].replace('\x01', '');
        this.messages = data.split('\x02')[1].split('\x03');
        this.messages[this.messages.length - 1] = this.messages[this.messages.length-1].replace('\x04\x00', '');
    }

    format() {
        const word = ['Response', 'Admin Alert', 'Game', 'Chat'];
        const messages = this.messages;
        const message: string[] = [];

        for (const msg of messages) {
            if(msg === '' || word.includes(msg) || Math.abs(parseFloat(msg)) >= 0) {
                continue;
            } else {
                if(msg.includes('\n')) {

                    for (const msg2 of msg.split('\n')) {
                        if(Math.abs(parseFloat(msg2)) >= 0) {
                            continue;
                        } else {
                            message.push(msg2);
                        }
                    }
    
                    continue;
                }
    
                message.push(msg);
            }
        }

        return message.join('\n');
    }
}

export default Message;