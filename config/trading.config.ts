import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv)).argv

const market = argv.market as string;

if (argv.options) {
  console.log(
    `
    Required Arguments 

    --market=[string]    : Market to trade on eg: BTC-GBP
    --currency=[string]  : Currency to purchase coins with eg: GBP
    --crypto=[string]    : Crypto to trade with eg: BTC

    Optional Arguments

    --live=[string]             : Trade on live account with real money. Default false
    --interval=[number]         : Frequency of requests to API. Default 1000ms
    --percentAvailable=[number] : Percent of available funds to trade with. Default 25%
    --dip=[number]              : Percent of price to drop before placing BUY order. Default 2%
    --upTrend=[number]          : Percent of price to increase to before placing BUY order. Default 2%
    --stopLoss=[number]         : Percent to SELL below BUY price. Default 2.5%
    --profit=[number]           : Percent to SELL above BUY price. Default 5%
    --range=[number]            : Amount to add to either side of limits. Default 0 
    `
  )

  process.exit();
}

if (!argv.market || !argv.currency || !argv.crypto ) {
  console.log('Missing argument');
  process.exit();
}

const tradeConfig = {
    api: {
      host: (argv.live) ? 'https://api.pro.coinbase.com' : 'https://api-public.sandbox.pro.coinbase.com',
      secret: (argv.live) ? process.env.COINBASE_SECRET as string : process.env.COINBASE_SANDBOX_SECRET as string,
      key: (argv.live) ? process.env.COINBASE_KEY as string : process.env.COINBASE_SANDBOX_KEY as string,
      passphrase: (argv.live) ? process.env.COINBASE_PASS as string : process.env.COINBASE_SANDBOX_PASS as string
    },
    websocket: 'wss://ws-feed-public.sandbox.pro.coinbase.com',
    subscription : {
        type: 'subscribe',
        product_ids: [
          market,
        ],
        channels: ['ticker'],
    },
    trade: {
      isLive: (argv.live) ? 'LIVE' : 'SANDBOX',
      market,
      currencyToTrade: argv.currency as string,
      cryptoToTrade: argv.crypto as string,
      tradingInterval: argv.interval as number || 1000,
      percentOfAvailable: argv.percentAvailable as number || 25,
      buy: {
        dipThreshold: argv.dip as number || 2,
        upwardTrendThreshold: argv.upTrend as number || 2 
      },
      sell: {
        stopLossPercent: argv.stopLoss as number || 2.5,
        profitThreshold: argv.profit as number || 5
      },
      priceRange: argv.range as number || 0
    }
}

export default {
  tradeConfig
} 
  