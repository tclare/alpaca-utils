import { isFuture, isPast } from "date-fns";
import { getDateTodayFromTime } from "../services/date-service";
import { MarketStrategyConfig, MarketStrategyConfigFunction } from "../interfaces/market-strategy.interface";

export default class MarketStrategy {

    private _config: MarketStrategyConfig;
    constructor (config: MarketStrategyConfig) {
        this._config = config;
    }

    private _mapDateToConfigFunction(): MarketStrategyConfigFunction {
        for (let f of this._config) {
            const startTimeToday = getDateTodayFromTime(f.startTime);
            const endTimeToday = getDateTodayFromTime(f.endTime);
            if (isPast(startTimeToday) && isFuture(endTimeToday)) return f;
        }
    }

    public execute() {
        const f = this._mapDateToConfigFunction();
        f.code();
        console.log('SUCCESS: function code executed successfully.')
    }

}