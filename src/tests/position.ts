import { Position } from "@master-chief/alpaca";

const position: Position = {
    "asset_id": "904837e3-3b76-47ec-b432-046db621571b",
    "symbol": "AAPL ",
    "exchange": "NASDAQ",
    "asset_class": "us_equity",
    "avg_entry_price": 100.0,
    "qty": 5,
    "side": "long",
    "market_value": 600.0,
    "cost_basis": 500.0,
    "unrealized_pl": 100.0,
    "unrealized_plpc": 0.20,
    "unrealized_intraday_pl": 10.0,
    "unrealized_intraday_plpc": 0.0084,
    "current_price": 120.0,
    "lastday_price": 119.0,
    "change_today": 0.0084,
    raw: () => ({
        "asset_id": "904837e3-3b76-47ec-b432-046db621571b",
        "symbol": "AAPL ",
        "exchange": "NASDAQ",
        "asset_class": "us_equity",
        "avg_entry_price": "100.0",
        "qty": "5",
        "side": "long",
        "market_value": "600.0",
        "cost_basis": "500.0",
        "unrealized_pl": "100.0",
        "unrealized_plpc": "0.20",
        "unrealized_intraday_pl": "10.0",
        "unrealized_intraday_plpc": "0.0084",
        "current_price": "120.0",
        "lastday_price": "119.0",
        "change_today": "0.0084"
      })
}

export const positionData = [ position ];