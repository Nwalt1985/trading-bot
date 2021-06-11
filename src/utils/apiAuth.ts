/**
 * All REST requests must contain the following headers:
 *
 * CB-ACCESS-KEY The api key as a string.
 * CB-ACCESS-SIGN The base64-encoded signature (see Signing a Message).
 * CB-ACCESS-TIMESTAMP A timestamp for your request.
 * CB-ACCESS-PASSPHRASE The passphrase you specified when creating the API key.
 */
import crypto from 'crypto';
import config from '../../config/trading.config';
import got from 'got';
import { ServerTime } from '../../models/coinbaseAPI.interface';

async function getTime () {
    const { body } = await got.get(`${config.tradeConfig.api.host}/time`);
    return JSON.parse(body) as ServerTime;
}

async function buildHeaders (method: string, requestPath: string, body: string) {
    const timestamp = (await getTime()).epoch.toString();
    const message = timestamp + method + requestPath + body;
    const key = Buffer.from(config.tradeConfig.api.secret, 'base64');
    const hmac = crypto.createHmac('sha256', key);
    const accessSign = hmac.update(message).digest('base64');

    return {
        'Accept': 'application/json',
        'CB-ACCESS-KEY': config.tradeConfig.api.key,
        'CB-ACCESS-SIGN': accessSign,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-ACCESS-PASSPHRASE': config.tradeConfig.api.passphrase
    }
}

export default buildHeaders;
