var cards, cartCookie, sellers, sellerTotals = [];
aggBtn.addEventListener("click", aggregate);
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
  console.log('cart: ', _cards);
  for(c of _cards) {
    cart.innerHTML += `<div class=cardTile><div class=cardName>${c.mana} <a href="https://www.tcgplayer.com/product/${c.id}/${c.name.replaceAll(' ','-')}?Language=English">${c.name}</a></div><div class=cardRemove cardid=${c.id}>X</div></div>`;
  }

  var x = document.getElementsByClassName('cardRemove'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', removeCard);
}



function getCards() {
  browser.runtime.sendMessage({ id: 'c457' })
  .then(cardsResponse, handleError);
}



function removeCard() {
  var id = this.getAttribute('cardid');
  browser.runtime.sendMessage({ id: 'r' + id })
  .then(this.parentElement.remove());
}



function aggregate() {
  browser.runtime.sendMessage({ id: 's331355' })
  .then(aggregate2);
}



function aggregate2(_sellers) {
  sellers = _sellers;
  cart.style.display = 'none';

  for(card of cards) {
    let minCost = Number.MAX_VALUE;
    for(s of sellers[card.sellerIdx]) {
      minCost = (s.price < minCost) ? s.price : minCost;
      let slr = sellerTotals.find((e) => e[0] == s.sellerId);
      if(slr)
        slr[1] += 1;
      else
        sellerTotals.push([s.sellerId, 1, s.sellerName]);
    }
    card.minCost = minCost;
  }

  sellerTotals.sort((a, b) => b[1] - a[1]);

  var aggregationStr = '<table>';
  for(card of cards) {
    aggregationStr += `<tr><td><a href="https://www.tcgplayer.com/product/${card.id}/${card.name.replaceAll(' ','-')}?Language=English">${card.name}</a></td><td>$${card.minCost}</td><td><table class=nestedTable>`;
    var count = 0, maxAggregation = 0;
    for(s of sellerTotals) {
      let slrIdx = sellers[card.sellerIdx].findIndex((sel) => sel.sellerId == s[0]);
      let slr = sellers[card.sellerIdx][slrIdx];
      if(slrIdx >= 0) {
        maxAggregation = (maxAggregation < s[1]) ? s[1] : maxAggregation;
        aggregationStr += `<tr><td>$${slr.price}</td><td><a href="https://shop.tcgplayer.com/sellerfeedback/${slr.sellerKey}">${s[2]}</a></td><td>${s[1]}</td><td><button class=addToCartX sellerIdx=${card.sellerIdx} sellerIdxIdx=${slrIdx}>Add to Cart</button></td></tr>`;
        count += 1;
      }
      if(count > 2 && maxAggregation > s[1]) break;
    }
    aggregationStr += '</table></td></tr>';
  }
  aggregationStr += '</table>';
  aggregation.innerHTML = aggregationStr;

  var x = document.getElementsByClassName('addToCartX'); //onClick listeners
  for(xc of x)
    xc.addEventListener('click', addToCart);
}



function addToCart() {
  var elem = this;
  var _seller = sellers[elem.getAttribute('sellerIdx')][elem.getAttribute('sellerIdxIdx')];
  var req = {sku: _seller.productConditionId, sellerKey: _seller.sellerKey, channelId: 0, requestedQuantity: 1, price: _seller.price, isDirect: false, countryCode: "US"};

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      elem.style.color = '#0F0';
    }
    else elem.style.color = '#F00';
  }

  xhttp.open('POST', 'https://mpgateway.tcgplayer.com/v1/cart/' + cartCookie + '/item/add', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(req));
}



function createAnonymousCart() {
  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var key = JSON.parse(this.responseText);
      cartCookie = key.results[0].cartKey;
console.log('createAnonymousCart', key, cartCookie);
      browser.cookies.set({
        url: 'https://www.tcgplayer.com/product/',
        domain: '.tcgplayer.com',
        name: 'StoreCart_PRODUCTION',
        value: 'CK=' + cartCookie + '&Ignore=false',
        path: '/'
      });
    }
    else console.log('create Anonymous Cart Fail', this);
  }
  xhttp.open('POST', 'https://mpgateway.tcgplayer.com/v1/cart/create/anonymouscart', true);
  xhttp.send();
}



function handleError(message) {
  console.log('popup error', message);
}

