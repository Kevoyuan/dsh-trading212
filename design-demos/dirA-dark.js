(async function(){document.documentElement.setAttribute('data-theme','dark');await new Promise(function(r){setTimeout(r,900)});return (function(){
function lum(c){var m=c.match(/[\d.]+/g);if(!m)return null;var v=m.slice(0,3).map(Number).map(function(x){x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4)});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2]}
function ratio(a,b){var l1=lum(a),l2=lum(b);if(l1===null||l2===null)return null;var hi=Math.max(l1,l2),lo=Math.min(l1,l2);return (hi+0.05)/(lo+0.05)}
function effBg(el){var n=el;while(n&&n.nodeType===1){var cs=getComputedStyle(n);var bg=cs.backgroundColor;var img=cs.backgroundImage;
 if(img&&img.indexOf('gradient')>=0){var cols=img.match(/rgba?\([^)]*\)/g)||[];var best=null;cols.forEach(function(c){var m=c.match(/[\d.]+/g);if(m&&m.length>=3){var a=m.length>3?parseFloat(m[3]):1;if(a>0.5){if(!best||lum(c)>lum(best))best=c}}});
 if(best)return best}
 if(bg&&bg.indexOf('rgba(0, 0, 0, 0)')<0){var m2=bg.match(/rgba?\([^)]*,\s*([\d.]+)\)/);if(!m2||parseFloat(m2[1])>0.85)return bg}
 n=n.parentElement}return 'rgb(255,255,255)'}
function cnt(a){var m=new Map();a.forEach(function(k){m.set(k,(m.get(k)||0)+1)});return Array.from(m.entries()).sort(function(x,y){return y[1]-x[1]})}
var all=Array.prototype.slice.call(document.querySelectorAll('*'));
var fs=[],rad=[],bg=[],fg=[],bd=[],sh=[],ea=[],du=[],fam=[],gap=[],pad=[];
var backdrop=0,gradient=0,maxDepth=0,cards=0,cardNames=[],fails=[],overflow=[];
all.forEach(function(el){
 var cs=getComputedStyle(el);var r=el.getBoundingClientRect();if(r.width<1||r.height<1)return;
 var d=0,n=el;while(n.parentElement){d++;n=n.parentElement}if(d>maxDepth)maxDepth=d;
 fs.push(cs.fontSize);
 if(cs.borderTopLeftRadius!=='0px')rad.push(cs.borderTopLeftRadius);
 if(cs.backgroundColor&&cs.backgroundColor.indexOf('rgba(0, 0, 0, 0)')<0)bg.push(cs.backgroundColor);
 if(el.children.length===0&&el.textContent.trim())fg.push(cs.color);
 if(cs.borderTopWidth!=='0px')bd.push(cs.borderTopWidth+' '+cs.borderTopStyle+' '+cs.borderTopColor);
 if(cs.boxShadow&&cs.boxShadow!=='none')sh.push(cs.boxShadow);
 if(cs.backdropFilter&&cs.backdropFilter!=='none')backdrop++;
 if(cs.backgroundImage&&cs.backgroundImage.indexOf('gradient')>=0)gradient++;
 if(cs.transitionDuration!=='0s'){du.push(cs.transitionDuration);ea.push(cs.transitionTimingFunction)}
 fam.push(cs.fontFamily.split(',')[0].trim());gap.push(cs.rowGap);pad.push(cs.paddingTop+'/'+cs.paddingLeft);
 var rounded=cs.borderTopLeftRadius!=='0px',hasBg=cs.backgroundColor&&cs.backgroundColor.indexOf('rgba(0, 0, 0, 0)')<0,hasB=cs.borderTopWidth!=='0px';
 if(rounded&&hasBg&&(hasB||cs.boxShadow!=='none')){cards++;cardNames.push(String(el.className).slice(0,40))}
 if(el.scrollWidth>el.clientWidth+2&&cs.overflowX!=='auto'&&cs.overflowX!=='scroll'&&r.width>40){overflow.push({cls:String(el.className).slice(0,40),sw:el.scrollWidth,cw:el.clientWidth})}
});
all.forEach(function(el){
 if(el.children.length)return;var t=el.textContent.trim();if(!t)return;
 var cs=getComputedStyle(el);var s=parseFloat(cs.fontSize);var w=parseInt(cs.fontWeight)||400;
 var large=(s>=24)||(s>=18.66&&w>=700);var need=large?3:4.5;
 var cr=ratio(cs.color,effBg(el));
 if(cr!==null&&cr<need)fails.push({cls:String(el.className).slice(0,38),txt:t.slice(0,24),fs:s,cr:Math.round(cr*100)/100,need:need});
});
return {
 width:document.documentElement.clientWidth, pageHeight:document.documentElement.scrollHeight,
 elementCount:all.length, maxDepth:maxDepth, cards:cards,
 backdropFilterEls:backdrop, gradientEls:gradient,
 fontSizes:cnt(fs), radii:cnt(rad),
 bgCount:cnt(bg).length, bgTop:cnt(bg).slice(0,10),
 fgCount:cnt(fg).length, fgTop:cnt(fg).slice(0,10),
 borders:cnt(bd).slice(0,10), shadows:cnt(sh).slice(0,8),
 easingCount:cnt(ea).length, durationCount:cnt(du).length,
 families:cnt(fam), gapCount:cnt(gap).length, gapTop:cnt(gap).slice(0,10),
 padCount:cnt(pad).length,
 contrastFailCount:fails.length, contrastFails:fails.slice(0,20),
 overflowCount:overflow.length, overflow:overflow.slice(0,10),
 topCardNames:cnt(cardNames).slice(0,10)
};})();})()