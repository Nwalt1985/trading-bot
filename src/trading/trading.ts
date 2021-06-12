import Trade from '../utils/trade';
import config from '../../config/trading.config';
import logUpdate from 'log-update';
import chalk from 'chalk';
import { AccountsResponse, OrderSide, OrdersResponse, OrderType } from '../../models/coinbaseAPI.interface';
import { v4 as uuidv4 } from 'uuid';

const tradeUtil = new Trade();

let openingPrice = 0;
let stopLossPrice: number = 0;
let profitThreshold: number = 0;
let dipPrice: number = 0;
let upwardTrendPrice: number = 0;
let toBuy = true;
let orderHistory: number[] = [];
let tradingAccount: AccountsResponse;
let cryptoAccount: AccountsResponse;
let fundAmount: number = 0;
let buyPrice: number = 0;
let initalFunds: string;

const { priceRange } = config.tradeConfig.trade;

/**
 * Logging to the CLI of key information
 * @param price 
 */
async function getPrices(price: number) {

    const accounts = await tradeUtil.listAccounts();
    cryptoAccount = accounts.filter(obj => obj.currency === config.tradeConfig.trade.cryptoToTrade)[0];
    tradingAccount =  accounts.filter(obj => obj.currency === config.tradeConfig.trade.currencyToTrade)[0];
    profitThreshold = tradeUtil.profitThreshold(price);
    stopLossPrice = tradeUtil.stopLossPrice(price);
    dipPrice = tradeUtil.dipThreshold(price);
    upwardTrendPrice = tradeUtil.upwardTrendThreshold(price);
    fundAmount = (parseFloat(tradingAccount.available) / 100 ) * config.tradeConfig.trade.percentOfAvailable;

    const operation = toBuy ? 'BUY' : 'SELL';

    console.clear();

    console.log(`Next Operation: ${operation}`);
    console.log(`Initial funds: ${initalFunds}`);
    console.log(`${config.tradeConfig.trade.currencyToTrade} Remaining: ${parseFloat(tradingAccount.available).toFixed(2)}`);
    console.log(`${config.tradeConfig.trade.cryptoToTrade} To Trade: ${cryptoAccount.available}`);
    console.log(`Purchase Amount: ${fundAmount.toFixed(2)}`);
    console.log(`BUY/SELL Range: ${priceRange * 2} +/- `)
    console.log(`Buy Dip Price: ${dipPrice}`);
    console.log(`Buy Trend Price: ${upwardTrendPrice}`);
    console.log(`Sell Price: ${profitThreshold}`);
    console.log(`Stop Loss: ${stopLossPrice}`);
    console.log();
    console.log();
}

/**
 * Place a BUY order
 * @param price 
 */
async function buy(currentPrice: number) {

    const order = await tradeUtil.placeOrder({
        client_oid: uuidv4(),
        product_id: config.tradeConfig.trade.market,
        type: OrderType.market,
        side: OrderSide.buy,
        funds: fundAmount.toFixed(2)
    });

    if (!order) {
        // If the BUY order fails set the operation to true so we can continue trying to BUY
        toBuy = true;
        console.log('Error on BUY order. Continuing...');

    } else {
        // Set operation to false so next step is to SELL
        toBuy = false;
        buyPrice = currentPrice;  
        getPrices(currentPrice);  
    }
}

/**
 * Place a SELL order
 * @param price 
 */
async function sell(currentPrice: number) {

    const order = await tradeUtil.placeOrder({
        client_oid: uuidv4(),
        product_id: config.tradeConfig.trade.market,
        type: OrderType.market,
        side: OrderSide.sell,
        size: cryptoAccount.available
    });

    if (!order) {
        // If the SELL order fails set the operation to false so we can continue trying to SELL
        toBuy = false;
        console.log('Error on SELL order. Continuing...');

    } else {
        // Set operation to false so next step is to BUY
        toBuy = true;
        const sellPrice = currentPrice;
    
        earnings(sellPrice);
    }
}

/**
 * Here we want to get our total earnings. We compare the current available funds 
 * to the new funds after a SELL order. This total be added to an array so we can 
 * then get the total earnings after each iteration.
 * @param price 
 */
async function earnings(sellPrice: number) {
    const newAmount = (await tradeUtil.getAccount(tradingAccount.id)).available;

    const result = parseFloat(newAmount) - parseFloat(initalFunds);
    orderHistory.push(result);

    getPrices(sellPrice);
}

async function trade() {
    const { price: currentPrice } = await tradeUtil.productTicker(config.tradeConfig.trade.market);
    const formattedPrice = parseFloat(currentPrice);   
    const total = orderHistory.reduce((a, b) => a + b, 0);
    
    // Live logging, annoyingly has to be on one line to avoid the CLI being spammed with repeat lines
    logUpdate(`(${config.tradeConfig.trade.isLive}) - Currency: ${config.tradeConfig.trade.market}    |   Live Price: ${(formattedPrice > buyPrice) ? chalk.greenBright(formattedPrice.toString()) : chalk.redBright(formattedPrice.toString())}   |   Total earnings: ${(total > 0) ? chalk.greenBright(total) : chalk.redBright(total)}`);

    /**
     * If the current price is within the dip price range 
     * and operation is set to true we place a BUY order
     */
    if (
        formattedPrice >= (dipPrice - priceRange)
        && formattedPrice <= (dipPrice + priceRange)
        && toBuy
    ) {
        buy(formattedPrice);

    /**
     * If the current price is within the upward trend price range
     * and operation is set to true we place a BUY order
     */
    } else if (
        formattedPrice >= (upwardTrendPrice - priceRange) 
        && formattedPrice <= (upwardTrendPrice + priceRange)
        && toBuy
    ) {
        buy(formattedPrice);
    }

    /**
     * If the current price is within the profit price range
     * and operation is set to false we place a SELL order
     */
    if (
        formattedPrice >= (profitThreshold - priceRange) 
        && formattedPrice <= (profitThreshold + priceRange)
        && !toBuy
    ) {
        sell(formattedPrice);

    /**
     * If the current price is within the stop loss price range
     * and operation is set to false we place a SELL order
     */
    } else if (
        formattedPrice >= (stopLossPrice - priceRange) 
        && formattedPrice <= (stopLossPrice + priceRange)
        && !toBuy
    ) {
        sell(formattedPrice);
    }
}

export default async function init() {
    try {
        const accounts = await tradeUtil.listAccounts();
        tradingAccount =  accounts.filter(obj => obj.currency === config.tradeConfig.trade.currencyToTrade)[0];
        initalFunds = parseFloat(tradingAccount.available).toFixed(2);

        if (parseFloat(tradingAccount.available) < 10) { 
            throw new Error('Not enough funds in account');
        };
        
        const { price: currentPrice } = await tradeUtil.productTicker(config.tradeConfig.trade.market);
        openingPrice = tradeUtil.formatPrice(parseInt(currentPrice));
        
        console.clear();
        console.log(`Opening price: ${openingPrice}`);
        getPrices(openingPrice);

        setInterval(() => {
            trade();
        }, config.tradeConfig.trade.tradingInterval);
        
    } catch (err) {
        console.error(err);
        process.exit();
    }
}
