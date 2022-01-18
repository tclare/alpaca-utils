import { PositionSide } from "@master-chief/alpaca/@types/entities";

export interface QuoteConfig {
    symbol: string,
    side: PositionSide
}

export interface QuotePrice {
    symbol: string,
    side: PositionSide,
    price: number
}