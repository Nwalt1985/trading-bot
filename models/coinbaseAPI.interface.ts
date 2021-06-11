export interface Product {
    id: string;
    display_name: string;
    base_currency: string;
    quote_currency: string;
    base_increment: string;
    quote_increment: string;
    base_min_size: string;
    base_max_size: string;
    min_market_funds: string;
    max_market_funds: string;
    status: string;
    status_message: string;
    cancel_only: boolean;
    limit_only: boolean;
    post_only: boolean;
    trading_disabled: boolean;
}

export interface ProductTicker {
    trade_id: string;
    price: string;
    size: string;
    bid: string;
    ask: string;
    volume: string;
    time: string;
  }

export interface ServerTime {
    iso: string;
    epoch: number;
}

export interface AccountsResponse {
    id: string;
    currency: string;
    balance: string;
    available: string;
    hold: string;
    profile_id: string;
    trading_enabled: boolean;
}

export enum OrderType {
    limit = 'limit',
    market = 'market'
}

export enum OrderSide {
    sell = 'sell',
    buy = 'buy'
}

export interface OrderRequest {
    client_oid: string;
    funds?: string;
    side: OrderSide;
    product_id: string;
    type: OrderType;
    size?: string;
}

export interface OrdersResponse {
    id: string;
    price: string;
    size: string;
    product_id: string;
    side: string;
    stp: string;
    type: string;
    time_in_force: string;
    post_only: boolean;
    created_at: string;
    fill_fees: string;
    filled_size: string;
    executed_value: string;
    status: string;
    settled: boolean;
    funds: string;
}