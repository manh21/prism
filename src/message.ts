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
        let message = [];

        for (const msg of messages) {
            if(msg === '' || word.includes(msg) || Math.abs(msg.length) >= 0) {
                continue;
            }
            
            if(msg.includes('\n')) {

                for (const msg2 of msg.split('\n')) {
                    if(Math.abs(msg2.length) >= 0) {
                        continue;
                    }

                    message.push(msg2);
                }

                continue;
            }

            message.push(msg);
        }

        return message.join('\n');
    }
}

export default Message;