import * as Automerge from "@automerge/automerge";
let docId = window.location.hash.replace(/^#/, "");
let channel = new BroadcastChannel(docId);
let binary = await localforage.getItem(docId);
let doc = Automerge.init();
let actorId = Automerge.getActorId(doc);
let form = document.querySelector("form");
let input = document.querySelector("#new-todo");

if (binary) {
  doc = Automerge.load(binary);
  render(doc);
}

channel.onmessage = (ev) => {
  let newDoc = Automerge.merge(doc, Automerge.load(ev.data));
  doc = newDoc;
  render(newDoc);
};

form.onsubmit = (ev) => {
  ev.preventDefault();
  addItem(input.value);
  input.value = null;
};

// Call when the app starts up
loadFromRemote(docId);

function saveToRemote(docId, binary) {
  fetch(`http://192.168.0.30:5000/${docId}`, {
    body: binary,
    method: "post",
    headers: {
      "Content-Type": "application/octet-stream",
    },
  }).catch((err) => console.log(err));
}

async function loadFromRemote(docId) {
  const response = await fetch(`http://192.168.0.30:5000/${docId}`);
  if (response.status != 200)
    throw new Error("No saved draft for doc with id=" + docId);
  const respbuffer = await response.arrayBuffer();
  if (respbuffer.byteLength === 0)
    throw new Error("No saved draft for doc with id=" + docId);
  if (respbuffer.byteLength === 0)
    throw new Error("No saved draft for doc with id=" + docId);
  const view = new Uint8Array(respbuffer);

  let newDoc = Automerge.merge(doc, Automerge.load(view));
  doc = newDoc;
  render(newDoc);
}

function updateDoc(newDoc) {
  doc = newDoc;
  render(newDoc);
  let binary = Automerge.save(newDoc);
  localforage.setItem(docId, binary).catch((err) => console.log(err));
  channel.postMessage(binary);
  saveToRemote(docId, binary);
}

function addItem(text) {
  let newDoc = Automerge.change(doc, (doc) => {
    if (!doc.items) doc.items = [];
    doc.items.push({ text, done: false });
  });
  updateDoc(newDoc);
}

function deleteItem(index) {
  let newDoc = Automerge.change(doc, (doc) => {
    if (doc.items[index]) {
      doc.items.splice(index, 1);
    }
  });
  updateDoc(newDoc);
}

function toggle(index) {
  let newDoc = Automerge.change(doc, (doc) => {
    if (doc.items[index]) {
      doc.items[index].done = !doc.items[index].done;
    }
  });
  updateDoc(newDoc);
}

function render(doc) {
  let list = document.querySelector("#todo-list");
  list.innerHTML = "";
  doc.items &&
    doc.items.forEach((item, index) => {
      let itemDiv = document.createElement("div");
      itemDiv.classList.add("item-div");

      // Create toggleable item description
      let itemDesc = document.createElement("div");
      itemDesc.innerText = item.text;
      itemDesc.style = item.done ? "text-decoration: line-through" : "";
      itemDesc.classList.add("item-desc");
      itemDesc.onclick = function () {
        toggle(index);
      };

      // Create delete button
      let delButton = document.createElement("button");
      delButton.innerText = "Delete";
      delButton.classList.add("item-delete");
      delButton.onclick = (_) => deleteItem(index);

      itemDiv.appendChild(itemDesc);
      itemDiv.appendChild(delButton);

      list.appendChild(itemDiv);
    });
}
