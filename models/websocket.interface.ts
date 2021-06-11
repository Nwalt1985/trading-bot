export interface WebsocketResponse {
    type: string;
    sequence: number;
    product_id: string;
    price: string;
    open_24h: string;
    volume_24h: string;
    low_24h: string;
    high_24h: string;
    volume_30d: string;
    best_bid: string;
    best_ask: string;
    side: string;
    time: string;
    trade_id: number;
    last_size: string;
}

export interface WebSocketError {
    type: string;
    message: string;
    reason: string;
}