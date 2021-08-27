import got from 'got';
import config from '../../config/trading.config';
import { AccountsResponse, OrderRequest, OrdersResponse, Product, ProductTicker } from '../../models/coinbaseAPI.interface';
import buildHeaders from './apiAuth';
import Decimal from 'decimal.js';

const host = config.tradeConfig.api.host;

export default class Trade {
    constructor() {}

    async listAccounts() {
        try {
            const { body } = await got.get(`${host}/accounts`, {
                headers: await buildHeaders('GET', '/accounts', ''),
                responseType: 'json'
            });
            
            return body as AccountsResponse[];
        } catch (err) {
            throw new Error(`Error listing accounts: ${err}`);
        }
    }

    async getAccount(id: string) {
        try {
            const { body } = await got.get(`${host}/accounts/${id}`, {
                headers: await buildHeaders('GET', `/accounts/${id}`, ''),
                responseType: 'json'
            });
            
            return body as AccountsResponse;
        } catch (err) {
            throw new Error(`Error fetching account ${id}: ${err}`);
        }
    }

    async getOrder(id: string) {
        try {  
            const { body } = await got.get(`${host}/orders/${id}`, {
                headers: await buildHeaders('GET', `/orders/${id}`, ''),
                responseType: 'json'
            });

            return body as OrdersResponse;
        } catch (err) {
            console.error(`Error placing order: ${err}`);
        }
    }

    async placeOrder(request: OrderRequest) {
        try {  
            const { body } = await got.post(`${host}/orders`, {
                headers: await buildHeaders('POST', '/orders', JSON.stringify(request)),
                json: request,
                responseType: 'json'
            });

            return body as OrdersResponse;
        } catch (err) {
            console.error(`Error placing order: ${err}`);
        }
    }

    async getProducts() {
        const { body } = await got.get(`${host}/products`);
        return JSON.parse(body) as Product[];
    }

    async getSingleProduct(id: string) {
        const { body } = await got.get(`${host}/products/${id}`);
        return JSON.parse(body) as Product;
    }

    async productTicker(id: string) {
        const { body } = await got.get(`${host}/products/${id}/ticker`);
        return JSON.parse(body) as ProductTicker;
    }

    getPercentChange(previous: number, current: number) {
        return this.formatPrice(100 * Math.abs(( current - previous) / ( (current + previous) / 2 )));
    }

    formatPrice(price: number) {
        return new Decimal(
            (new Decimal(price).times(100)).dividedBy(100)
        ).toNumber();
    }

    /**
     * Ideally, we would only want our bot to sell when it makes a profit. 
     * However, maybe the market is just going down significantly and we want to get out before it’s 
     * too late and then buy at a lower price. Therefore, this threshold is used to sell at a loss, 
     * but with the goal of stopping a bigger loss from happening.
     * @param openingPrice 
     * @returns 
     */
    stopLossPrice(openingPrice: number) {
        const percentage = config.tradeConfig.trade.sell.stopLossPercent;
        return this.formatPrice(openingPrice - ((openingPrice / 100) * percentage));
    }

    /**
     * Sells the asset if its price has increased above the threshold since we bought it. 
     * This is how we profit. We sell at a higher price than we bought.
     * @param openingPrice 
     * @returns 
     */
    profitThreshold(openingPrice: number) {
        const percentage = config.tradeConfig.trade.sell.profitThreshold;
        return this.formatPrice(((openingPrice / 100) * percentage) + openingPrice);
    }

    /**
     * Buys the asset if its price decreased by more than the threshold. 
     * The idea of this is to follow the “buy low, sell high” strategy, 
     * where you attempt to buy an asset when it is undervalued, 
     * expecting its value to rise so you can sell.
     * @param openingPrice 
     * @returns 
     */
    dipThreshold(openingPrice: number) {
        const percentage = config.tradeConfig.trade.buy.dipThreshold;
        return this.formatPrice(openingPrice - ((openingPrice / 100) * percentage));
    }

    /**
     * Buys the asset if its price increased by more than the threshold. 
     * This goes against the “buy low, sell high” philosophy, but aims to identify when 
     * the price is going up and we don’t want to miss an opportunity to buy before it goes even higher.
     * @param openingPrice 
     * @returns 
     */
    upwardTrendThreshold(openingPrice: number) {
        const percentage = config.tradeConfig.trade.buy.upwardTrendThreshold;
        return this.formatPrice(((openingPrice / 100) * percentage) + openingPrice);
    }

    
}