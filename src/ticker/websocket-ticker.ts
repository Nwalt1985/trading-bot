import WebSocket from 'ws';
import { WebSocketError, WebsocketResponse } from '../../models/websocket.interface';
import config from '../../config/trading.config';
import logUpdate from 'log-update';
import chalk from 'chalk';

let previousPrice = 0;

function logData (data: WebsocketResponse) {
  logUpdate(`
    ----------------------------------
    
    Currency: ${data.product_id}
    Current price: ${(parseFloat(data.price) > previousPrice) ? chalk.greenBright(data.price) : chalk.redBright(data.price)}  
    24Hr High: ${data.high_24h}    
    24Hr Low: ${data.low_24h}
    
    ----------------------------------
    `);
}

function ticker () {
  try {
    const ws = new WebSocket(config.tradeConfig.websocket);

    ws.on('open', function open() {
        ws.send(JSON.stringify(config.tradeConfig.subscription));
    });
      
    ws.on('message', async function incoming(rawData) {

      const parsedData = JSON.parse(rawData.toString()) as WebsocketResponse | WebSocketError;
  
      if (parsedData.type === 'error')  {
        console.error('Unable to subscribe to websocket');
        process.exit();
      } else {

        const data = parsedData as WebsocketResponse
        
        if ((data).trade_id) {
          previousPrice = parseFloat(data.price);
          logData(data);
        }
      }  
    });
    
  } catch (err) {
    throw err;
  } 
};

export default async function () {
  ticker();
}