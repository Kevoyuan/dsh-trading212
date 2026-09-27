(function(){
function bx(sel){var e=document.querySelector(sel);var r=e.getBoundingClientRect();var cs=getComputedStyle(e);return {sel:sel,box:[Math.round(r.width),Math.round(r.height)],color:cs.color,bg:cs.backgroundColor,radius:cs.borderTopLeftRadius}}
var before=bx('.account-hero-val');
document.body.classList.add('hide-balances');
var after=bx('.account-hero-val');
var row=bx('.pos-stream-num-col .js-balance');
return {before:before, after:after, rowMasked:row, count:document.querySelectorAll('.js-balance').length};})()