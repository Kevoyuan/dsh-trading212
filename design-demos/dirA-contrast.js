(async function(){
document.documentElement.setAttribute('data-theme','dark');
await new Promise(function(r){setTimeout(r,900)});
function lum(c){var m=c.match(/[\d.]+/g);if(!m)return null;var v=m.slice(0,3).map(Number).map(function(x){x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]}
function ratio(a,b){var l1=lum(a),l2=lum(b);if(l1===null||l2===null)return null;var hi=Math.max(l1,l2),lo=Math.min(l1,l2);return Math.round(((hi+0.05)/(lo+0.05))*100)/100}
function effBg(el){var n=el;while(n&&n.nodeType===1){var cs=getComputedStyle(n);var bg=cs.backgroundColor;if(bg&&bg.indexOf('rgba(0, 0, 0, 0)')<0){var m2=bg.match(/rgba?\([^)]*,\s*([\d.]+)\)/);if(!m2||parseFloat(m2[1])>0.85)return bg}n=n.parentElement}return 'rgb(255,255,255)'}
function pair(label,sel,idx){var els=document.querySelectorAll(sel);var e=els[idx||0];if(!e)return {label:label,missing:true};var cs=getComputedStyle(e);var bg=effBg(e);return {label:label,color:cs.color,bg:bg,size:cs.fontSize,ratio:ratio(cs.color,bg)}}
return {theme:document.documentElement.getAttribute('data-theme'),
 pairs:[pair('hero figure','.account-hero-val'),
        pair('hero label','.account-label'),
        pair('KPI value (pos)','.sub-metric-block strong'),
        pair('ledger row label','.inv-metric-row span'),
        pair('table head','.holdings-table th'),
        pair('row +figure','.pos-stream-num-col .tone-positive'),
        pair('row -figure','.pos-stream-num-col .tone-negative'),
        pair('tile +percent','.tile-percent.tone-positive'),
        pair('tile -daypl','.tile-daypl.tone-negative'),
        pair('accent ticker tag','.inst-ticker-tag'),
        pair('read-only tag','.read-only-status'),
        pair('AI badge','.ai-badge'),
        pair('hud kbd','.hud-pill kbd'),
        pair('legal footnote','.legal'),
        pair('chart axis text','.price-chart text'),
        pair('active range','.range-switcher button.active'),
        pair('bar +value','.bar-row b.tone-positive'),
        pair('bar -value','.bar-row b.tone-negative')],
 alpha:{canvas:getComputedStyle(document.querySelector('.t212-native-app-root')).backgroundColor, plate:getComputedStyle(document.querySelector('.cockpit-account-card')).backgroundColor, wash:getComputedStyle(document.querySelector('.read-only-status')).backgroundColor, topbarRule:getComputedStyle(document.querySelector('.t212-native-topbar')).borderBottomColor}};})()