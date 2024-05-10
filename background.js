var cards = [], sellers = [];
var count = 0;
var sellerFilters = '{"filters":{"term":{"sellerStatus":"Live","channelId":0,"language":["English"]},"range":{"quantity":{"gte":1}},"exclude":{"channelExclusion":0}},"sort":{"field":"price+shipping","order":"asc"},"context":{"shippingCountry":"US","cart":{}},"aggregations":["listingType"],"size":50,"from":';


function addCard(id, name, mana) {
  var pageOffset = 0, pageTotal = 0, sellersAll = [], sellersMin = [];

  if(cards.some(c => c.id == id))
    return 1;

  var xhttp = new XMLHttpRequest();
  xhttp.onloadend = function() {
    if(this.status == 200) {
      var sellersPage = JSON.parse(this.responseText);
      sellersAll.push(...sellersPage.results[0].results);
      pageTotal = sellersPage.results[0].totalResults;
      pageOffset += 50;
      if(pageOffset < pageTotal) { //more sellers to paginate
        xhttp.open('POST', 'https://mp-search-api.tcgplayer.com/v1/product/' + id + '/listings', true);
        xhttp.setRequestHeader('Content-Type', 'application/json');
        xhttp.send(sellerFilters + pageOffset + '}');
      }
      else {
        sellersAll = sellersAll.filter(e => !e.directSeller && e.languageAbbreviation === 'EN' && e.condition !== "Damaged");
        //for(s of sellersAll) //this nullifies sellersAll for some reason
        //  sellersMin.push({ listingId: s.listingId, sellerName: s.sellerName, sellerId: s.sellerId, sellerKey: s.sellerKey, price: s.price });
        //sellers.push(sellersMin);
        //remove dup sellers (keep cheapest card)
        sellersAll = sellersAll.filter((value, index, self) => self.findIndex(t => t.sellerId === value.sellerId) === index)
        sellers.push(sellersAll);
        cards.push({ id: id, name: name, mana: mana, sellerIdx: sellers.length - 1 });
      }
    }
  }

  xhttp.open('POST', 'https://mp-search-api.tcgplayer.com/v1/product/' + id + '/listings', true);
  xhttp.setRequestHeader('Content-Type', 'application/json');
  xhttp.send(sellerFilters + pageOffset + '}');

  return 1;
}


function removeCard(id) {
  cards = cards.filter(c => c.id !== id);
  return 1;
}


function queryCard(id) {
  return cards.some(c => c.id == id);
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
  let msgType = request.id[0];
  let _id = request.id.substring(1);
  let re = /^\d+$/;
  if(!re.test(_id)) {
    sendResponse(0);
    return 0;
  }
  _id = +_id;

  let res = 0;
  if(msgType === 'a') res = addCard(_id, request.name, request.mana);
  if(msgType === 'r') res = removeCard(_id);
  if(msgType === 'q') res = queryCard(_id);
  if(msgType === 'c') return getCart(sendResponse);
  if(msgType === 's') return getSellers(sendResponse);

  sendResponse(res);
}


browser.runtime.onMessage.addListener(contentMsg);
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(changeInfo.url && tab.url.startsWith('https://www.tcgplayer.com/product/'))
    browser.tabs.sendMessage(tab.id, 1);
}, { properties: ["url"] });
