import * as crypto from 'crypto';

// Cryptographically Secure Pseudorandom Number Generator
export const csrpng = () => {
    return parseInt(crypto.randomBytes(8).toString('hex'), 16)
};

export const createHash = (data: any) => {
    return crypto.createHash('sha1').update(data.toString('utf-8')).digest('hex')
}

export const formatDateTime = (date: Date) => {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}