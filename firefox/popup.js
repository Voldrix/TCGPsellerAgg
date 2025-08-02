var cards, cartCookie, sellers;
getCards();

browser.cookies.get({ url: 'https://www.tcgplayer.com', name: 'StoreCart_PRODUCTION' }).then((c) => {
  if(c) {
    cartCookie = c.value.substring(c.value.indexOf('CK=') + 3);
    cartCookie = cartCookie.split('&')[0];
  }
  else
    createAnonymousCart();
}, createAnonymousCart);



function cardsResponse(_cards) {
  cards = _cards;
  for(c of _cards) {
    let row = cartTable.insertRow();
    let cell = row.insertCell();
    cell.innerHTML = c.mana;
    cell = row.insertCell();
    cell.innerHTML = `<a href="https://www.tcgplayer.com/product/${c.id}?Language=English">${c.name}</a>`;
    cell = row.insertCell();
    if(c.inCart)
      cell.innerHTML = '<svg class="inCartIcon" cardid="' + c.id + '" xmlns="http://www.w3.org/2000/svg" height="18px" width="18px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>';
    cell = row.insertCell();
    cell.innerHTML = `<span class=cardRemove cardid=${c.id}>X</span>`;
  }

  var x = document.getElementsByClassName('cardRemove'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', removeCard);
  x = document.getElementsByClassName('inCartIcon'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', removeCardFromCart);
}


function getCards() {
  browser.runtime.sendMessage({ msgType: 'getCards' })
  .then(cardsResponse, handleError);
}


function removeCard() {
  var id = +this.getAttribute('cardid');
  browser.runtime.sendMessage({ msgType: 'removeCard', id: id })
  .then((x) => {
    this.parentElement.parentElement.remove();
    cards = cards.filter(c => c.id !== id);
  }, handleError);
}


function removeCardFromCart() {
  var id = +this.getAttribute('cardid');
  var card = cards.find(c => c.id === id);
  if(!card) return;
  browser.runtime.sendMessage({ msgType: 'removeCardFromCart', id: id, sellerIdx: card.sellerIdx })
  .then((x) => {
    card.inCart = false;
    this.remove();
  }, handleError);
}


function aggregate() {
  browser.runtime.sendMessage({ msgType: 'aggregate' })
  .then(aggregate3);
}


function aggregate3(_sellers) {
  if(!(_sellers instanceof Event)) sellers = _sellers;
  cart.style.display = 'none';
  refreshBtn.style.display = 'none';
  aggBtn.style.display = 'none';
  aggregation.innerHTML = '';
  var count = 0, maxAggregation = 0, sellerTotals = [];

  for(card of cards) { //max aggregation & min cost
   if(card.inCart) continue;
    count += 1;
    let minCost = Number.MAX_VALUE;
    let maxCardsPerSeller = 1;
    for(s of sellers[card.sellerIdx]) {
      minCost = (s.price < minCost) ? s.price : minCost;
      let slr = sellerTotals.find((e) => e[0] === s.sellerId);
      if(slr) {
        slr[1] += 1;
        maxCardsPerSeller = (maxCardsPerSeller < slr[1]) ? slr[1] : maxCardsPerSeller;
      }
      else
        sellerTotals.push([s.sellerId, 1, s.sellerName, 0.0, s.sellerKey]); //magic numbers: maxAggregation, seller total package Price
    }
    maxAggregation = (maxAggregation < maxCardsPerSeller) ? maxCardsPerSeller : maxAggregation;
    card.minCost = (minCost === Number.MAX_VALUE) ? '-' : '$' + minCost;
  }

  maxAggregation = (maxAggregation < 3) ? 3 : maxAggregation; //omit sellers with 1 card

  sellerTotals = sellerTotals.filter(s => s[1] > maxAggregation - 2); //filter sellers

  for(card of cards) { //min cost shown & package total price
    if(card.inCart) continue;
    let minCost = Number.MAX_VALUE;
    for(s of sellerTotals) {
      let slr = sellers[card.sellerIdx].find((sel) => sel.sellerId === s[0]);
      if(!slr) continue;
      minCost = (slr.price < minCost) ? slr.price : minCost; //min cost shown
      s[3] += slr.price; //package total price
    }
    card.minCostShown = (minCost === Number.MAX_VALUE) ? '-' : '$' + minCost;
  }

  sellerTotals.sort((a, b) => {return ((b[1] - a[1]) || (a[3] - b[3]));}); //sort by num of cards, total package price

  for(s of sellerTotals) { //render loop. sellers
    let price, slrIdx, numInCart = 0, htmlStr = '';

    for(card of cards) { //loop cards per seller
      slrIdx = sellers[card.sellerIdx].findIndex((sel) => sel.sellerId === s[0]);
      if(slrIdx >= 0) numInCart += !!sellers[card.sellerIdx][slrIdx].inCart;
      if(card.inCart) continue;
      price = (slrIdx < 0) ? '-' : '$' + sellers[card.sellerIdx][slrIdx].price;
      if(price !== '-')
        htmlStr += `<tr><td>${card.name}</td><td>${card.minCost}</td><td>${card.minCostShown}</td><td>${price}</td><td><button class=addToCartX sellerIdx=${card.sellerIdx} sellerIdxIdx=${slrIdx}>Add to Cart</button></td></tr>`;
      else
        htmlStr += '<tr><td>' + card.name + '</td><td>-</td><td>-</td><td>-</td><td>Unavailable</td></tr>';
    }
    aggregation.innerHTML += `<div class="sellerHeader accordian" id=${s[0]}><div class=sellerName>${s[2]} <a href="https://shop.tcgplayer.com/sellerfeedback/${s[4]}"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg></a></div><div>${s[1]} / ${count}</div><div><svg xmlns="http://www.w3.org/2000/svg" height="12px" width="12px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg> ${numInCart}</div><div>$${s[3].toFixed(2)}</div><div><button class=addToCartA sellerIdx=${card.sellerIdx} sellerIdxIdx=${slrIdx}>Add All to Cart</button></div></div><table id=ct${s[0]}><tbody>` + htmlStr + '</tbody></table>';
  }


  var x = aggregation.getElementsByClassName('sellerHeader');  //onClick listeners
  if(x.length) x[0].classList.remove('accordian');
  for(xc of x)
    xc.addEventListener('click', e=>{e.target.classList.toggle('accordian'); e.target.parentElement.classList.toggle('accordian');});
  x = aggregation.getElementsByClassName('addToCartX'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', addToCart);
  x = aggregation.getElementsByClassName('addToCartA'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', addAllToCart);
}


function addAllToCart() {
  var tbl = this.parentElement.parentElement.nextElementSibling;
  this.parentElement.parentElement.classList.remove('accordian');
  var cardBtns = tbl.getElementsByClassName('addToCartX');
  for(cb of cardBtns)
    addToCart(cb);
}


function addToCart(btn) {
  var elem = btn.target || btn;
  var sellerIdx = +elem.getAttribute('sellerIdx');
  var seller = sellers[sellerIdx][+elem.getAttribute('sellerIdxIdx')];
  var req = {sku: seller.productConditionId, sellerKey: seller.sellerKey, channelId: 0, requestedQuantity: 1, price: seller.price, isDirect: false, countryCode: "US"};

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      elem.parentElement.style.color = '#1d1';
      elem.parentElement.innerHTML = 'In Cart';
      refreshBtn.style.display = 'block';
      if(card) {
        browser.runtime.sendMessage({ msgType: 'addCardToCart', id: card.id, sellerIdx: sellerIdx, sellerIdxIdx: +elem.getAttribute('sellerIdxIdx') })
        .then(x => {
          if(card) {
            card.inCart = true;
            seller.inCart = true;
          }
        });
      }
    }
    else elem.style.color = '#F00';
  }

  xhttp.open('POST', 'https://mpgateway.tcgplayer.com/v1/cart/' + cartCookie + '/item/add', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(req));

  var card = cards.find(e => e.sellerIdx === sellerIdx);
}


function createAnonymousCart() {
  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var key = JSON.parse(this.responseText);
      cartCookie = key.results[0].cartKey;
      browser.cookies.set({
        url: 'https://www.tcgplayer.com/product/',
        domain: '.tcgplayer.com',
        name: 'StoreCart_PRODUCTION',
        value: 'CK=' + cartCookie + '&Ignore=false',
        path: '/'
      });
    }
    else console.log('Create Anonymous Cart Fail', this);
  }
  xhttp.open('POST', 'https://mpgateway.tcgplayer.com/v1/cart/create/anonymouscart', true);
  xhttp.send();
}


function handleError(message) {
  console.log('popup error', message);
}


aggBtn.addEventListener("click", aggregate);
refreshBtn.addEventListener('click', aggregate3);

