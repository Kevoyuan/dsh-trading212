(function(){
function box(sel,root){var e=(root||document).querySelector(sel);if(!e)return null;var r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]}
function kids(sel){var p=document.querySelector(sel);var out=[];Array.prototype.forEach.call(p.children,function(c){var r=c.getBoundingClientRect();var cls=String(c.className||'').split(' ')[0]||c.tagName.toLowerCase();out.push(cls+' y='+Math.round(r.top)+' h='+Math.round(r.height))});return out}
return {
 w:document.documentElement.clientWidth,
 ledger:kids('.cockpit-ledger'), insight:kids('.cockpit-insight'),
 subAnalytics:kids('.cockpit-sub-analytics-grid'),
 ledgerSum:box('.cockpit-ledger'), insightSum:box('.cockpit-insight'),
 lastLedger:box('.cockpit-ledger > *:last-child'), lastInsight:box('.cockpit-insight > *:last-child'),
 chart:box('.price-chart'), table:box('.holdings-preview, .cockpit-holdings-preview'),
 tiles:box('.dynamic-treemap-container'), doc:{w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight}
};})()