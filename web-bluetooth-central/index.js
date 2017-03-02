document.querySelector('#startButton').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();

    if (isWebBluetoothEnabled()) {
        ChromeSamples.clearLog();
        onStartButtonClick();
    }
});

var bluetoothDevice;
var powerSwitchCharateristic;
var speedCharacteristic;
var log = ChromeSamples.log;

document.querySelector('#controlsDiv').hidden = true;

document.querySelector('#speed').addEventListener('change', onSpeedChange);
document.querySelector('#powerswitch').addEventListener('click', onPowerSwitchChange);
document.querySelector('#disconnectButton').addEventListener('click', disconnect);

function onSpeedChange(event) {
  let speed = event.target.value;
  speedCharacteristic.writeValue(new Uint8Array([speed]));
  // Sync the UI (notification from peripheral would be better)
  if (speed === "0") {
    powerswitch.checked = false;
  } else if (!powerswitch.checked) {
    powerswitch.checked = true;
  }
}

function onPowerSwitchChange(event) {
  let checked = event.target.checked;

  if (checked) {
    powerSwitchCharateristic.writeValue(new Uint8Array([1]));
    speed.value = 0xFF;
  } else {
    powerSwitchCharateristic.writeValue(new Uint8Array([0]));
  }
}

function onStartButtonClick() {
  let serviceUuid = BluetoothUUID.getCharacteristic(0xFFF1);
  let powerSwitchCharateristicUuid = BluetoothUUID.getCharacteristic(0xFFF2);
  let speedCharacteristicUuid = BluetoothUUID.getCharacteristic(0xFFF3);

  log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
  .then(device => {
    bluetoothDevice = device; // save a copy
    document.querySelector('#startButton').hidden = true;
    document.querySelector('#controlsDiv').hidden = false;
    // hide speed until we know the peripheral supports 0xFFF3
    speed.hidden = true;
    speed.labels[0].style.display = 'none';

    log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    log('Getting Service...');
    return server.getPrimaryService(serviceUuid);
  })
  .then(service => {
    log('Getting Characteristic...');
    return service.getCharacteristics();
  })
  .then(characteristics => {

    // save references to the characteristics we care about
    characteristics.forEach(c => {

      switch(c.uuid) {
        case speedCharacteristicUuid:
          log('Speed Characteristic');
          speedCharacteristic = c;
          speedCharacteristic.readValue().then(updateSpeedSlider);
          // show the speed control and label
          speed.hidden = false;
          speed.labels[0].style.display = '';
          break;

        case powerSwitchCharateristicUuid:
          log('Power Switch Characteristic');
          powerSwitchCharateristic = c;
          powerSwitchCharateristic.readValue().then(updatePowerSwitch);
          break;

        default:
          log('Skipping ' + c.uuid);
      }
    });
  })
  .catch(error => {
    log('Argh! ' + error);
  });
}

function updateSpeedSlider(value) {
  document.querySelector('#speed').value = value.getUint8(0);
}

function updatePowerSwitch(value) {
  // expecting DataView with uint8: 1 for on, 0 for off
  document.querySelector('#powerswitch').checked = value.getUint8(0);
}

function powerSwitchCharacteristicChanged(event) {
  let value = event.target.value;
  console.log('Power Switch Value Changed', value.getUint8(0));
  updatePowerSwitch(value);
}

function disconnect() {
  if (bluetoothDevice && bluetoothDevice.gatt) {
    bluetoothDevice.gatt.disconnect();
  }
  document.querySelector('#startButton').hidden = false;
  document.querySelector('#controlsDiv').hidden = true;
}
