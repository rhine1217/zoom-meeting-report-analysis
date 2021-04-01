var iframe  = document.createElement ("iframe");
iframe.src  = chrome.extension.getURL ("popup.html");
iframe.style.position="absolute";
iframe.style.top="10px";
iframe.style.right="10px";
iframe.style.border="solid 1px #aaa";

document.querySelector("body").appendChild(iframe);