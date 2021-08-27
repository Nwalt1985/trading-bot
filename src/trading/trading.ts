import Trade from '../utils/trade';
import config from '../../config/trading.config';
import logUpdate from 'log-update';
import chalk from 'chalk';
import { AccountsResponse, OrderSide, OrderType } from '../../models/coinbaseAPI.interface';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from 'decimal.js/decimal';

const tradeUtil = new Trade();

let openingPrice: number;
let stopLossPrice = new Decimal(0);
let profitThreshold = new Decimal(0);
let dipPrice = new Decimal(0);
let upwardTrendPrice = new Decimal(0);
let toBuy = true;
let tradingAccount: AccountsResponse;
let cryptoAccount: AccountsResponse;
let fundAmount = new Decimal(0);
let buyPrice: number = 0;
let initalFunds = new Decimal(0);
let profit = new Decimal(0);

const { priceRange } = config.tradeConfig.trade;

/**
 * Logging to the CLI of key information
 * @param price 
 */
async function getPrices(price: number) {

    const accounts = await tradeUtil.listAccounts();
    cryptoAccount = accounts.filter(obj => obj.currency === config.tradeConfig.trade.cryptoToTrade)[0];
    tradingAccount =  accounts.filter(obj => obj.currency === config.tradeConfig.trade.currencyToTrade)[0];
    profitThreshold = new Decimal(tradeUtil.profitThreshold(price)).toDecimalPlaces(3);
    stopLossPrice = new Decimal(tradeUtil.stopLossPrice(price)).toDecimalPlaces(3);
    dipPrice = new Decimal(tradeUtil.dipThreshold(price)).toDecimalPlaces(3);
    upwardTrendPrice = new Decimal(tradeUtil.upwardTrendThreshold(price)).toDecimalPlaces(3);
    fundAmount = new Decimal(new Decimal(tradingAccount.available).dividedBy(100)).times(config.tradeConfig.trade.percentOfAvailable);

    const operation = toBuy ? 'BUY' : 'SELL';

    console.clear();

    console.log(`Next Operation: ${operation}`);
    console.log(`Initial funds: ${initalFunds}`);
    console.log(`${config.tradeConfig.trade.currencyToTrade} Remaining: ${new Decimal(tradingAccount.available).toFixed(3)}`);
    console.log(`${config.tradeConfig.trade.cryptoToTrade} To Trade: ${cryptoAccount.available}`);
    console.log(`Purchase Price: ${buyPrice}`);
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
        funds: fundAmount.toFixed(3)
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

    profit = new Decimal(newAmount).minus(initalFunds);

    getPrices(sellPrice);
}

async function trade() {
    const { price: currentPrice } = await tradeUtil.productTicker(config.tradeConfig.trade.market);
    const formattedPrice = new Decimal(currentPrice);   
    
    // Live logging, annoyingly has to be on one line to avoid the CLI being spammed with repeat lines
    logUpdate(`(${config.tradeConfig.trade.isLive}) - Currency: ${config.tradeConfig.trade.market}    |   Live Price: ${(formattedPrice.greaterThan(buyPrice)) ? chalk.greenBright(formattedPrice.toFixed(3)) : chalk.redBright(formattedPrice.toFixed(3))}   |   Total earnings: ${(profit.greaterThan(0)) ? chalk.greenBright(profit) : chalk.redBright(profit)}`);

    /**
     * If the current price is within the dip price range 
     * and operation is set to true we place a BUY order
     */
    if (
        formattedPrice.greaterThanOrEqualTo(dipPrice.minus(priceRange))
        && formattedPrice.lessThanOrEqualTo(dipPrice.plus(priceRange))
        && toBuy
    ) {
        buy(formattedPrice.toNumber());

    /**
     * If the current price is within the upward trend price range
     * and operation is set to true we place a BUY order
     */
    } else if (
        formattedPrice.greaterThanOrEqualTo(upwardTrendPrice.minus(priceRange)) 
        && formattedPrice.lessThanOrEqualTo(upwardTrendPrice.plus(priceRange))
        && toBuy
    ) {
        buy(formattedPrice.toNumber());
    }

    /**
     * If the current price is within the profit price range
     * and operation is set to false we place a SELL order
     */
    if (
        formattedPrice.greaterThanOrEqualTo(profitThreshold.minus(priceRange)) 
        && formattedPrice.lessThanOrEqualTo(profitThreshold.plus(priceRange))
        && !toBuy
    ) {
        sell(formattedPrice.toNumber());

    /**
     * If the current price is within the stop loss price range
     * and operation is set to false we place a SELL order
     */
    } else if (
        formattedPrice.greaterThanOrEqualTo(stopLossPrice.minus(priceRange))
        && formattedPrice.lessThanOrEqualTo(stopLossPrice.plus(priceRange))
        && !toBuy
    ) {
        sell(formattedPrice.toNumber());
    }
}

export default async function init() {
    try {
        const accounts = await tradeUtil.listAccounts();
        tradingAccount =  accounts.filter(obj => obj.currency === config.tradeConfig.trade.currencyToTrade)[0];
        initalFunds = new Decimal(tradingAccount.available).toDecimalPlaces(3);

        if (new Decimal(tradingAccount.available).lt(5)) { 
            throw new Error('Not enough funds in account');
        };
        
        const { price: currentPrice } = await tradeUtil.productTicker(config.tradeConfig.trade.market);
        openingPrice = new Decimal(currentPrice).toNumber();
        
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
