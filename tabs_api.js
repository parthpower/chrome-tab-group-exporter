// get tabs
let init = async () => {
  let tabs = await chrome.tabs.query({})
  console.log(`Tabs: ${tabs}`)
  let tabGroup = {};
  for (var i = tabs.length - 1; i >= 0; i--) {
    let o = tabs[i];
    
    // get group name
    let groupName = "" 
    if(o.groupId == -1) {
      groupName = "nogroup"
    } else {
      let group = await chrome.tabGroups.get(o.groupId)
      groupName = group.title
      if(groupName === undefined) {
        groupName = o.groupId
      }
    }

    // populate map
    if(tabGroup[groupName] === undefined) {
      tabGroup[groupName] = [o.url] 
    } else {
      tabGroup[groupName].push(o.url)
    }
  }
  let jsonstr = JSON.stringify(tabGroup)
  console.log(jsonstr)
  el = document.querySelector("#tab-group-json")
  if (el === null ) {
    prompt("Tab group json",jsonstr)
  } else {
    el.textContent = jsonstr;
  }
  
  // update storage div on init
  chrome.storage.sync.get(renderStore)  
  let fancyDate = dateFormat(new Date(), "dd/mm/yyyy HH:MM:ss")
  
  document.querySelector("#store-name").value = `Session ${fancyDate}`
}



init()

document.querySelector("#load").onclick = async () => {
  // load tabs from json
  let jsonstr = document.querySelector("#tab-group-json").value
  let tabGroups = JSON.parse(jsonstr)
  let window = await chrome.windows.create({focused:false})
  for(group in tabGroups) {
    let urls = tabGroups[group]
    let tabIds = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(url)
      let tab = await chrome.tabs.create({
        url: url,
        active: false,
      })
      if(tab.id !== chrome.tabs.TAB_ID_NONE) {
        tabIds.push(tab.id)
      }
    }
    let groupId = await chrome.tabs.group({
      tabIds: tabIds
    })
    chrome.tabGroups.update(groupId, {title: group})
    chrome.tabGroups.move(groupId, {
      index: -1,
      windowId: window.id
    })
  }
}

document.querySelector("#store-button").onclick = async () => {
  let jsonstr = document.querySelector("#tab-group-json").value
  let storename = document.querySelector("#store-name").value
  let o = {}
  o[storename] = jsonstr
  let v = await chrome.storage.sync.set(o)
}

document.querySelector("#store-clear-button").onclick = async () => {
  chrome.storage.sync.clear(()=>{console.log("storage cleared")})
}

chrome.storage.sync.onChanged.addListener( async (changes) => {
  console.log(`store changed`)
  chrome.storage.sync.get(renderStore)
})

function renderStore(store) {
  let parentEl = document.querySelector("#stored-json")
  removeAllChildNodes(parentEl)
  for(k in store) {
    let e = genEl(k,store[k])
    parentEl.appendChild(e)
  }
}

// parse json to elements
function genEl(name, jsonstr ) {
  let parentEl = document.createElement("tr")
  
  let loadEl = document.createElement("td")
  let loadButtonEl = document.createElement("button")
  loadButtonEl.textContent = "Load"
  loadButtonEl.jsonstr = jsonstr
  loadButtonEl.onclick = async(e) => {
    document.querySelector("#tab-group-json").value = e.target.jsonstr
    document.querySelector("#load").click()
  }
  loadEl.appendChild(loadButtonEl)
  let delButtonEl = document.createElement("button")
  delButtonEl.textContent = "del"
  delButtonEl.nm = name
  delButtonEl.onclick = async(e) => {
    chrome.storage.sync.remove(e.target.nm, ()=>{console.log(`storage entry deleted: ${e.target.nm}`)})
  }
  loadEl.appendChild(delButtonEl)
  parentEl.appendChild(loadEl)

  let detailsEl = document.createElement("details")
  let nameEl = document.createElement("summary")
  nameEl.textContent = name
  detailsEl.appendChild(nameEl)
  
  let jsonstrEl = document.createElement("p")
  jsonstrEl.textContent = jsonstr
  detailsEl.appendChild(jsonstrEl)
  parentEl.appendChild(detailsEl)
  
  return parentEl
}


function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}
