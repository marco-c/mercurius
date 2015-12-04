var registrationPromise = navigator.serviceWorker.register('service-worker.js');
var machineId;

// all static DOM elements
var domShowTokenInput = document.getElementById('showTokenInput');
var domTokenInput = document.getElementById('tokenInput');
var domTokenLabel = document.getElementById('tokenLabel');
var domMachineName = document.getElementById('machineName');
var domToken = document.getElementById('token');
var domRegister = document.getElementById('register');
var domUnregister = document.getElementById('unregister');
var domMachines = document.getElementById('machines');

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

      console.log(domMachineName, domMachineName.value);
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
          name: domMachineName.value
        }),
      }).then(function(response) {
        response.text().then(function(token) {
          localforage.setItem('token', token);
          domToken.textContent = token;
          showSection('unregistrationForm');
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
  localforage.getItem('token').then(function(token) {
    fetch('./unregister', {
      method: 'post',
      headers: {
        'Content-type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        machineId: machineId
      }),
    }).then(function(response) {
      domToken.textContent = '';
      showSection('registrationForm');
      localforage.removeItem('token');
    });
  });
};

function makeId(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

// displays all machines assigned to a token from an object
function displayMachines(machines) {
  // clean current elements
  var ul;
  var machine;
  for (var index = 0; index < machines.length; index++) {
    machine = machines[index];
    ul = document.createElement('ul');
    ul.appendChild(document.createTextNode(machine.name || machine.id);
  }
}

window.onload = function() {
  localforage.getItem('machineId').then(function(id) {
    if (id) {
      machineId = id;
    } else {
      machineId = makeId(20);
      localforage.setItem('machineId', machineId);
    }
  });
  localforage.getItem('token').then(function(token) {
    if (token) {
      showSection(null);
      showSection('unregistrationForm');
      domToken.textContent = token;
    } else {
      showSection('registrationForm');
    }
  });
};
