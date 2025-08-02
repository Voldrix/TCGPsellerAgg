var cards = [], sellers = [];
var sellerFilters = {"filters":{"term":{"sellerStatus":"Live","channelId":0,"language":["English"],"printing":["Foil"]},"range":{"quantity":{"gte":1}},"exclude":{"channelExclusion":0}},"sort":{"field":"price+shipping","order":"asc"},"context":{"shippingCountry":"US","cart":{}},"aggregations":["listingType"],"size":50,"from":0};


function addCard(id, name, foil, mana) {
  var pageTotal = 0, sellersAll = [], sellersMin = [];

  if(cards.some(c => c.id === id))
    return 2;

  sellerFilters.from = 0;
  sellerFilters.filters.term.printing[0] = foil ? "Foil" : "Normal";

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status === 200) {
      var sellersPage = JSON.parse(this.responseText);
      sellersAll.push(...sellersPage.results[0].results);
      pageTotal = sellersPage.results[0].totalResults;
      sellerFilters.from += 50;
      if(sellerFilters.from < pageTotal) { //more sellers to paginate
        xhttp.open('POST', 'https://mp-search-api.tcgplayer.com/v1/product/' + id + '/listings', true);
        xhttp.setRequestHeader('Content-Type', 'application/json');
        xhttp.send(JSON.stringify(sellerFilters));
      }
      else {
        sellersAll = sellersAll.filter(e => !e.directSeller && e.languageAbbreviation === 'EN' && e.condition !== "Damaged");
        sellersAll = sellersAll.filter((value, index, self) => self.findIndex(t => t.sellerId === value.sellerId) === index); //remove duplicates
        sellers.push(sellersAll);
        if(foil) 
          name += ' *F*';
        cards.push({ id: id, name: name, mana: mana, sellerIdx: sellers.length - 1, inCart: false });
      }
    }
    else return 0;
  }

  xhttp.open('POST', 'https://mp-search-api.tcgplayer.com/v1/product/' + id + '/listings', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(JSON.stringify(sellerFilters));

  return 1;
}


function removeCard(id) {
  var card = cards.find(c => c.id === id);
  if(card) {
    delete sellers[card.sellerIdx];
    cards = cards.filter(c => c.id !== id);
    return 1;
  }
  return 0;
}


function cardCart(id, inOrOut) {
  var card = cards.find(c => c.id === id);
  if(card)
    card.inCart = inOrOut;
  return +!!card;
}


function queryCard(id) {
  return +cards.some(c => c.id === id);
}


function getCart(sendResponse) {
  sendResponse(cards);
  return 1;
}


function getSellers(sendResponse) {
  sendResponse(sellers);
  return 1;
}


function contentMsg(request, sender, sendResponse) {
  var res = 0;
  var _id = +request.id;
  if(request.msgType === 'addCard') res = addCard(_id, request.name, request.foil, request.mana);
  if(request.msgType === 'removeCard') res = removeCard(_id);
  if(request.msgType === 'queryCard') res = queryCard(_id);
  if(request.msgType === 'addCardToCart') { res = cardCart(_id, true); sellers[+request.sellerIdx][+request.sellerIdxIdx].inCart = true; }
  if(request.msgType === 'removeCardFromCart') { res = cardCart(_id, false); const si = +request.sellerIdx; for(let i = 0; i < sellers[si].length; i++) sellers[si][i].inCart = false; }
  if(request.msgType === 'getCards') return getCart(sendResponse);
  if(request.msgType === 'aggregate') return getSellers(sendResponse);

  sendResponse(res);
}


browser.runtime.onMessage.addListener(contentMsg);
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(changeInfo.url && tab.url.startsWith('https://www.tcgplayer.com/product/'))
    browser.tabs.sendMessage(tab.id, 1);
}, { properties: ["url"] });

