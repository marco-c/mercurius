var machineId;
var machineName;

// all static DOM elements
var domShowTokenInput = document.getElementById('showTokenInput');
var domTokenInput = document.getElementById('tokenInput');
var domTokenLabel = document.getElementById('tokenLabel');
var domTokenInteractive = document.getElementById('interactive');
var domMachineName = document.getElementById('machineName');
var domToken = document.getElementById('token');
var domTokenBarcode = document.getElementById('tokenBarcode');
var domRegister = document.getElementById('register');
var domUnregister = document.getElementById('unregister');
var domMachines = document.getElementById('machines');
var domShowMachineName = document.getElementById('showMachineName');

domShowTokenInput.onclick = function() {
  domTokenInput.style.display = 'block';
  domTokenLabel.style.display = 'block';
  this.style.display = 'none';

  Quagga.init({}, function(err) {
    if (err) {
      console.error(err);
      return;
    }

    Quagga.start();
  });

  Quagga.onDetected(function(result) {
    domTokenInput.value = result.codeResult.code;
    Quagga.stop();
    domTokenInteractive.style.display = 'none';
    window.alert('Token detected!');
  });
};

domMachineName.placeholder = window.navigator.userAgent;

function drawBarcode(text) {
  var bw = new BWIPJS();

  bw.bitmap(new Bitmap());

  bw.scale(2, 2);

  bw.push(text);
  bw.push({
    includetext: true,
  });

  bw.call('code128', function(e) {
    if (e) {
      if (typeof e === 'string') {
        console.error(e);
      } else if (e.stack) {
        console.error(e.message + '\r\n' + e.stack);
      } else {
        var s = '';
        if (e.fileName) {
          s += e.fileName + ' ';
        }
        if (e.lineNumber) {
          s += '[line ' + e.lineNumber + '] ';
        }
        console.error(s + (s ? ': ' : '') + e.message);
      }
    } else {
      bw.bitmap().show(domTokenBarcode, 'N');
    }
  });
}

function register() {
  localforage.getItem('token')
  .then(function(token) {
    if (token) {
      return;
    }

    navigator.serviceWorker.ready
    .then(function(registration) {
      return registration.pushManager.getSubscription()
      .then(function(subscription) {
        if (subscription) {
          return subscription;
        }

        return registration.pushManager.subscribe({ userVisibleOnly: true })
        .then(function(newSubscription) {
          return newSubscription;
        });
      });
    })
    .then(function(subscription) {
      var key = subscription.getKey ? subscription.getKey('p256dh') : '';

      machineName = domMachineName.value;

      fetch('./register', {
        method: 'post',
        headers: {
          'Content-type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          key: key ? btoa(String.fromCharCode.apply(null, new Uint8Array(key))) : '',
          machineId: machineId,
          token: domTokenInput.value,
          name: machineName
        }),
      })
      .then(function(response) {
        response.json()
        .then(function(body) {
          var token = body.token;
          if (response.ok) {
            localforage.setItem('token', token);
            localforage.setItem('machineName', machineName);
            domShowMachineName.textContent = machineName || machineId;
            domToken.textContent = token;
            drawBarcode(token);
            showSection('unregistrationForm');
            showMachines(token, body.machines, body.clients);
          } else {
            alert('Error: ' + token);
          }
        });
      });
    });
  });
}

domRegister.onclick = register;

var sections = ['registrationForm', 'unregistrationForm', 'unsupported'];
function showSection(section) {
  for (var index = 0; index < sections.length; index++) {
    if (sections[index] === section) {
      document.getElementById(section).style.display = 'block';
    } else {
      document.getElementById(sections[index]).style.display = 'none';
    }
  }
}

function forceUnregister() {
  domToken.textContent = '';
  domTokenBarcode.style.display = 'none';
  showSection('registrationForm');
  localforage.removeItem('token');
}

domUnregister.onclick = function() {
  unregisterMachine(machineId)
  .then(forceUnregister);
};

function unregisterMachine(mId) {
  return localforage.getItem('token')
  .then(function(token) {
    return fetch('./unregisterMachine', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        machineId: mId
      }),
    });
  });
}

// generate a random string (default: 40)
function makeId(length) {
  var arr = new Uint8Array((length || 40) / 2);
  window.crypto.getRandomValues(arr);
  return [].map.call(arr, function(n) { return n.toString(16); }).join("");
}

// create DOM Element for a device
function showMachine(token, mId, device, clients) {
  var tr = document.createElement('tr');
  if (mId === machineId) {
    tr.classList.add('currentMachine');
  }
  var td = document.createElement('td');
  var a = document.createElement('a');
  td.classList.add('machine');
  // unregister current machine only by using a button
  if (mId !== machineId) {
    a.textContent = '[x]';
    a.onclick = function() {
      unregisterMachine(mId)
      .then(function(response) {
        response.json()
        .then(function(body) {
          showMachines(token, body.machines, body.clients);
        });
      });
    };
    td.appendChild(a);
  }
  td.appendChild(document.createTextNode(' ' + (device.name || mId)));
  tr.appendChild(td);
  function toggleOnclick(ev) {
    toggleMachineClientNotification(token, mId, ev.target.dataset.client)
    .then(function(response) {
      response.json()
      .then(function(body) {
        showMachines(token, body.machines, body.clients);
      });
    });
  }
  for (var i = 0; i < clients.length; i++) {
    td = document.createElement('td');
    td.dataset.client = clients[i];
    td.onclick = toggleOnclick;
    if (device.clients && device.clients[clients[i]] === '0') {
      // machine is NOT receiving notifications from this client
      td.classList.add('off');
      td.textContent = 'off';
    } else {
      td.classList.add('on');
      td.textContent = 'on';
    }
    tr.appendChild(td);
  }
  domMachines.appendChild(tr);
}

// clean machine list and call showMachine on each machine from the list
function showMachines(token, deviceList, clientsList) {
  // delete everything in the list
  domMachines.innerHTML = "";
  // create the list
  for (var machineId in deviceList) {
    showMachine(token, machineId, deviceList[machineId], clientsList);
  }
  // create header
  var head = document.createElement('thead');
  var tr = document.createElement('tr');
  tr.appendChild(document.createElement('td'));
  for (var i = 0; i < clientsList.length; i++) {
    var td = document.createElement('td');
    td.textContent = clientsList[i];
    tr.appendChild(td);
  }
  head.appendChild(tr);
  domMachines.appendChild(head);
}

// load machines from the server
function getMachines(token) {
  fetch('/devices/' + token)
  .then(function(response) {
    response.json()
    .then(function(body) {
      showMachines(token, body.machines, body.clients);
    });
  });
}

// toggle client notification per machine
function toggleMachineClientNotification(token, machineId, client) {
  return localforage.getItem('token')
  .then(function(token) {
    return fetch('./toggleClientNotification', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        machineId: machineId,
        client: client
      }),
    });
  });
}

if (navigator.serviceWorker) {
  navigator.serviceWorker.register('service-worker.js');
} else {
  showSection('unsupported');
}

window.onload = function() {
  if (!navigator.serviceWorker) {
    return;
  }

  localforage.getItem('machineId')
  .then(function(id) {
    if (id) {
      machineId = id;
    } else {
      machineId = makeId(20);
      localforage.setItem('machineId', machineId);
    }
  })
  .then(function() {
    localforage.getItem('token')
    .then(function(token) {
      if (token) {
        showSection('unregistrationForm');
        domToken.textContent = token;
        drawBarcode(token);
        localforage.getItem('machineName')
        .then(function(mName) {
          machineName = mName;
          domShowMachineName.textContent = machineName || machineId;
        });
        getMachines(token);
      } else {
        showSection('registrationForm');
      }
    });
  });
};
