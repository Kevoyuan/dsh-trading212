# Trading 212 dashboard chart map

The dashboard is a live React surface inside the dsh plugin. Account, position, and fill values are sourced from the connected Trading 212 API. Individual-stock daily price candles are fetched from Yahoo Finance's unofficial chart endpoint; there is no sample-data fallback.

| Section | Analytical question | Form | Fields | Palette | Scope note |
| --- | --- | --- | --- | --- | --- |
| Hero and KPI strip | What is the account worth and what drives current return? | Scorecards | total value, invested value, cost basis, cash, realised/unrealised P/L, FX impact | blue/gold + neutral | Current account snapshot |
| Portfolio allocation | Where is invested value concentrated? | Stacked composition bar | current value, portfolio weight, top five + other | single blue root | Current open positions |
| P/L contribution | Which positions dominate current unrealised P/L? | Ranked horizontal bars | unrealised P/L, position return | blue/gold signed bars + signed labels | Current open positions; no realised P/L |
| Instrument-currency exposure | Which instrument trading currencies contain invested value? | Ranked horizontal bars | current value, weight, position count | single blue root | Not a net FX-risk calculation |
| History summaries | What characterises the records currently loaded? | Scorecards + category bars when 4+ categories | orders, cash transactions, dividends | blue/gold + neutral | Current cursor pages only; never labelled full history |
| Trade timeline | At what prices and times did one stock actually execute? | Time-positioned event plot | fill time, fill price, side, quantity, instrument currency | blue circle buy / gold diamond sell | Real fills only; focused y-scale; not a market-price curve |
| Individual stock detail | How did market price move around my executions? | ECharts daily close line + execution scatter markers | Yahoo close; Trading 212 fill time, fill price, side, quantity | blue price line + blue circle buy / gold diamond sell | 1m/3m/1y/5y; focused y-scale; crosshair, tooltip and data zoom; sources and date range shown; history remains available if Yahoo fails |
| Holdings and orders | What exact values support follow-up? | Detail tables | quantity, prices, cost, value, weight, return, FX, pending-order fields | neutral + signed text | Current snapshot |
