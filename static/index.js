var registrationPromise = navigator.serviceWorker.register('service-worker.js');
var machineId;
var machineName;

// all static DOM elements
var domShowTokenInput = document.getElementById('showTokenInput');
var domTokenInput = document.getElementById('tokenInput');
var domTokenLabel = document.getElementById('tokenLabel');
var domMachineName = document.getElementById('machineName');
var domToken = document.getElementById('token');
var domRegister = document.getElementById('register');
var domUnregister = document.getElementById('unregister');
var domMachines = document.getElementById('machines');
var domShowMachineName = document.getElementById('showMachineName');

domShowTokenInput.onclick = function() {
  domTokenInput.style.display = 'block';
  domTokenLabel.style.display = 'block';
  this.style.display = 'none';
};

domMachineName.placeholder = window.navigator.userAgent;

function register() {
  localforage.getItem('token').then(function(token) {
    if (token) {
      return;
    }

    registrationPromise.then(function(registration) {
      return registration.pushManager.getSubscription().then(function(subscription) {
        if (subscription) {
          return subscription;
        }

        return registration.pushManager.subscribe({ userVisibleOnly: true }).then(function(newSubscription) {
          return newSubscription;
        });
      });
    }).then(function(subscription) {
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
      }).then(function(response) {
        response.json().then(function(body) {
          var token = body.token;
          if (response.ok) {
            localforage.setItem('token', token);
            localforage.setItem('machineName', machineName);
            domShowMachineName.textContent = machineName || machineId;
            domToken.textContent = token;
            showSection('unregistrationForm');
            showMachines(body.machines);
          } else {
            alert('Error: ' + token);
          }
        });
      });
    });
  });
}

domRegister.onclick = register;

var sections = ['registrationForm', 'unregistrationForm'];
function showSection(section) {
  for (var index = 0; index < sections.length; index++) {
    if (sections[index] === section) {
      document.getElementById(section).style.display = 'block';
    } else {
      document.getElementById(sections[index]).style.display = 'none';
    }
  }
}

domUnregister.onclick = function() {
  unregisterMachine(machineId)
  .then(function(response) {
    domToken.textContent = '';
    showSection('registrationForm');
    localforage.removeItem('token');
  });
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
function showMachine(mId, device) {
  var li = document.createElement('li');
  var a = document.createElement('a');
  li.textContent = (device.name || mId) + ' ';
  a.textContent = '[x]';
  a.onclick = function() {
    var thisMachineId = mId;
    return function() {
      unregisterMachine(thisMachineId)
      .then(function(response) {
        response.json()
        .then(function(body) {
          showMachines(body.machines);
        });
      });
    };
  }();
  li.appendChild(a);
  domMachines.appendChild(li);
}

// clean machine list and call showMachine on each machine from the list
function showMachines(deviceList) {
  // delete everything in the list
  domMachines.innerHTML = "";
  // create the list
  for (var machineId in deviceList) {
    showMachine(machineId, deviceList[machineId]);
  }
}

// load machines from the server
function getMachines(token) {
  fetch('/devices/' + token)
    .then(function(response) {
      response.json()
        .then(function(body) {
          showMachines(body.machines);
      });
    });
}

window.onload = function() {
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
