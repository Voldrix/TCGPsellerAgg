var btnBox, id, path, timerId;
var div = document.createElement("div");
var removeBtn = '<button class=TCGPSellerAggBtn type=button onclick=removeCard()>Remove From Virtual Cart</button>';
var addBtn = '<button class=TCGPSellerAggBtn type=button onclick=addCard(false)>Add to Virtual Cart</button> <button class=TCGPSellerAggBtn type=button onclick=addCard(true)>Foil</button>';
loadCheck();
browser.runtime.onMessage.addListener(loadCheck);


function loadCheck() {
  path = window.location.pathname.split('/');
  if(path[1] !== 'product')
    return;
  btnBox = document.getElementsByClassName('spotlight')[0];
  if(!btnBox) {
    clearTimeout(timerId);
    timerId = setTimeout(loadCheck, 30);
  }
  else {
    id = path[2];
    queryCard();
  }
}


function addCard(foil) {
  var cardName = document.getElementsByClassName('product-details__name')[0].innerText.split('-')[0].trim();
  var manaCost = document.getElementsByClassName('casting-cost__mana')[0];
  var manaStr = '';
  if(manaCost) {
    var mana = manaCost.getElementsByTagName('svg');
    if(mana)
      for(m of mana)
        manaStr += m.outerHTML;
  }
  div.innerHTML = removeBtn; //optimistic
  browser.runtime.sendMessage({ msgType: 'addCard', name: cardName, id: id, foil: foil, mana: manaStr })
  .then(message => {
    if(message === 2) div.innerHTML = 'Card already in vCart<br>' + removeBtn;
    else if(message !== 1) div.innerHTML = 'Error adding card<br>' + addBtn;
  }, handleError);
}


function queryCard() {
  browser.runtime.sendMessage({ msgType: 'queryCard', id: id })
  .then(message => {
    div.innerHTML = (message === 1) ? removeBtn : addBtn;
    btnBox.insertAdjacentElement('afterend', div);
  }, handleError);
}


function removeCard() {
  div.innerHTML = addBtn;
  browser.runtime.sendMessage({ msgType: 'removeCard', id: id })
  .then(message => {
    if(message === 0) div.innerHTML = 'Card not found in vCart<br>' + addBtn;
    else if(message !== 1) div.innerHTML = 'Error removing card<br>';
  }, handleError);
}


function handleError(error) {
  console.log(`Error: ${error}`);
}


exportFunction(addCard, window, { defineAs: "addCard" });
exportFunction(removeCard, window, { defineAs: "removeCard" });
exportFunction(loadCheck, window, { defineAs: "loadCheck" });

