
const btn_connect_ref = document.getElementById('btn_connect');
const btn_disconnect_ref = document.getElementById('btn_disconnect');

const panel_status_ref = document.getElementById('panel_status');
//
const SERVICE_UUID = "0000181a-0000-1000-8000-00805f9b34fb";
const TEMP_CHAR_UUID = "00002a6e-0000-1000-8000-00805f9b34fb";
const HUM_CHAR_UUID = "00002a6f-0000-1000-8000-00805f9b34fb";
const PRES_CHAR_UUID = "00002a6d-0000-1000-8000-00805f9b34fb";

//
let bleServer = null; // Variable globale pour stocker le périphérique
let userDisconnected = false;

//*********************** */
function showConnectButton() {
	btn_connect_ref.classList.remove('hidden');
	btn_disconnect_ref.classList.add('hidden');
}
//********************** */
function showDisconnectButton() {
	btn_connect_ref.classList.add('hidden');
	btn_disconnect_ref.classList.remove('hidden');
}
//****************************************** */
function setBleConnected(thename) {
	panel_status_ref.textContent = `Connected to ${thename}`;
	showDisconnectButton();
}
//****************************** */
function setBleDisconnected(msg) {
	panel_status_ref.textContent = msg || 'BLE Device Disconnected';
	showConnectButton();
}
//*************************************************** */
btn_disconnect_ref.addEventListener('click', async () => {
	if (!bleServer || !bleServer.connected) {
		panel_status_ref.textContent = 'Bluetooth is not connected';
		return;
	}
	//
	userDisconnected = true;
	try {
		await bleServer.disconnect();
		setBleDisconnected('Disconnected');

	} catch (error) {
		panel_status_ref.textContent = 'Disconnected error: ' + error.message;
	}
});
//*********************************************** */
btn_connect_ref.addEventListener('click', async () => {
	if (!('bluetooth' in navigator)) {
		panel_status_ref.textContent = "Votre navigateur ne supporte pas le Web BLE (Utilisez Chrome/Edge sur HTTPS)";
		return;
	}
	//
	try {
		userDisconnected = false;

		console.log("Recherche de l'appareil ESP32...");
		// 1. Filtrer pour trouver notre ESP32
		const device = await navigator.bluetooth.requestDevice({
			filters: [{ services: [SERVICE_UUID] }]
		});


		device.addEventListener('gattserverdisconnected', onDisconnected);

		console.log("Connexion au serveur GATT...");
		const server = await device.gatt.connect();
		//
		bleServer = server;
		setBleConnected(server.device.name);

		console.log("Récupération du service...");
		const service = await server.getPrimaryService(SERVICE_UUID);

		// Gestion de la caractéristique Température
		console.log("Configuration Température...");
		const tempChar = await service.getCharacteristic(TEMP_CHAR_UUID);
		await tempChar.startNotifications();
		tempChar.addEventListener('characteristicvaluechanged', (event) => {
			const decoder = new TextDecoder('utf-8');
			const val = decoder.decode(event.target.value);
			//console.log(`Temperature = ${val}`);
			gaugeLocalTemperature.setValue(val);
		});

		// Gestion de la caractéristique Humidité
		console.log("Configuration Humidité...");
		const humChar = await service.getCharacteristic(HUM_CHAR_UUID);
		await humChar.startNotifications();
		humChar.addEventListener('characteristicvaluechanged', (event) => {
			const decoder = new TextDecoder('utf-8');
			const val = decoder.decode(event.target.value);
			//console.log(`Humidity = ${val}`);
			gaugeLocalHumidity.setValue(val);
		});

		// Gestion de la caractéristique Pression
		console.log("Configuration Pression...");
		const presChar = await service.getCharacteristic(PRES_CHAR_UUID);
		await presChar.startNotifications();
		presChar.addEventListener('characteristicvaluechanged', (event) => {
			const decoder = new TextDecoder('utf-8');
			const val = decoder.decode(event.target.value);
			gaugeLocalLuminosity.setValue(val);
		});

		//
	} catch (error) {
		console.error("Erreur de connexion BLE : ", error);
		setBleDisconnected('Connection failed: ' + error.message);
		alert("Échec de la connexion. Vérifiez la console.");
	}
});
//******************* */
function onDisconnected(event) {
	const device = event.target;
	console.log(`Le périphérique ${device.name} s'est déconnecté.`);
}
////////////////////////////////////
// les canvas gauges
////////////////////////////////////
/// gauge local temperature
const gaugeLocalTemperature = new LcdGauge('canvas_local_temperature_id', {
	title: 'Temp',
	unit: '°C',
	min: -5,
	max: 50,
	value: 0,
	tickInterval: 5,
});
//********************* */
//// gauge local humidity
const gaugeLocalHumidity = new LcdGauge('canvas_local_humidity_id', {
	title: 'Hum',
	unit: '%',
	min: 0,
	max: 100,
	value: 0,
	tickInterval: 10,
});
//************************ */
///// gauge local Pression
const gaugeLocalLuminosity = new LcdGauge('canvas_local_pressure_id', {
	title: 'Pres',
	unit: 'hPa',
	min: 0,
	max: 3000,
	value: 0,
	tickInterval: 250,
});
///////////////////////
//********************************* */
window.addEventListener('beforeunload', (event) => {
	//clearInterval(t1);
});
//end

