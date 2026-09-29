//https://adecarvalho.github.io/ESP32_BME280_Web_Ble

const SERVICE_UUID = "0000181a-0000-1000-8000-00805f9b34fb";
const TEMP_CHAR_UUID = "00002a6e-0000-1000-8000-00805f9b34fb";
const HUM_CHAR_UUID = "00002a6f-0000-1000-8000-00805f9b34fb";
const PRES_CHAR_UUID = "00002a6d-0000-1000-8000-00805f9b34fb";
//
class App {
	constructor() {
		this.btn_connect_ref = document.getElementById('btn_connect');
		this.btn_disconnect_ref = document.getElementById('btn_disconnect');

		this.panel_status_ref = document.getElementById('panel_status');
		//
		//gauge local temperature
		this.gaugeLocalTemperature = new LcdGauge('canvas_local_temperature_id', {
			title: 'Temp',
			unit: '°C',
			min: -5,
			max: 50,
			value: 0,
			tickInterval: 5,
		});
		//
		//gauge local humidity
		this.gaugeLocalHumidity = new LcdGauge('canvas_local_humidity_id', {
			title: 'Hum',
			unit: '%',
			min: 0,
			max: 100,
			value: 0,
			tickInterval: 10,
		});
		//
		//gauge local Pression
		this.gaugeLocalLuminosity = new LcdGauge('canvas_local_pressure_id', {
			title: 'Pres',
			unit: 'hPa',
			min: 0,
			max: 3000,
			value: 0,
			tickInterval: 250,
		});
		//
		this.bleServer = null; // Variable globale pour stocker le périphérique
		this.userDisconnected = false;
		//
		this.#initEvent();
	}
	//
	#initEvent() {
		//
		this.btn_disconnect_ref.addEventListener('click', async () => {
			if (!this.bleServer || !this.bleServer.connected) {
				this.#afficheStatus('Bluetooth is not connected');
				return;
			}
			//
			this.userDisconnected = true;
			try {
				await this.bleServer.disconnect();
				this.#setBleDisconnected();

			} catch (error) {
				this.#afficheStatus('Disconnected error: ' + error.message);
			}
		});
		//
		this.btn_connect_ref.addEventListener('click', async () => {
			if (!('bluetooth' in navigator)) {
				this.#afficheStatus("Your browser does not support Web BLE (use Chrome/Edge over HTTPS");
				return;
			}
			//
			try {
				this.userDisconnected = false;

				console.log("Recherche de l'appareil ESP32...");
				//Filtrer pour trouver notre ESP32
				const device = await navigator.bluetooth.requestDevice({
					filters: [{ services: [SERVICE_UUID] }]
				});

				// callback disconnected
				device.addEventListener('gattserverdisconnected', (event) => {
					const device = event.target;
					this.#afficheStatus(`${device.name} is disconnected.`);
				});
				//
				console.log("Connexion au serveur GATT...");
				this.bleServer = await device.gatt.connect();
				//
				this.#setBleConnected(this.bleServer.device.name);

				console.log("Récupération du service...");
				const service = await this.bleServer.getPrimaryService(SERVICE_UUID);

				// Gestion de la caractéristique Température
				console.log("Configuration Température...");
				const tempChar = await service.getCharacteristic(TEMP_CHAR_UUID);
				await tempChar.startNotifications();
				tempChar.addEventListener('characteristicvaluechanged', (event) => {
					const decoder = new TextDecoder('utf-8');
					const val = decoder.decode(event.target.value);
					this.gaugeLocalTemperature.setValue(val);
				});

				// Gestion de la caractéristique Humidité
				console.log("Configuration Humidité...");
				const humChar = await service.getCharacteristic(HUM_CHAR_UUID);
				await humChar.startNotifications();
				humChar.addEventListener('characteristicvaluechanged', (event) => {
					const decoder = new TextDecoder('utf-8');
					const val = decoder.decode(event.target.value);
					this.gaugeLocalHumidity.setValue(val);
				});

				// Gestion de la caractéristique Pression
				console.log("Configuration Pression...");
				const presChar = await service.getCharacteristic(PRES_CHAR_UUID);
				await presChar.startNotifications();
				presChar.addEventListener('characteristicvaluechanged', (event) => {
					const decoder = new TextDecoder('utf-8');
					const val = decoder.decode(event.target.value);
					this.gaugeLocalLuminosity.setValue(val);
				});

				//
			} catch (error) {
				this.#setBleDisconnected();
				this.#afficheStatus("Erreur de connexion BLE : ", error.message);
			}
		});
	}
	//
	#afficheStatus(txt) {
		this.panel_status_ref.textContent = txt;
	}
	//
	#showConnectButton() {
		this.btn_connect_ref.classList.remove('hidden');
		this.btn_disconnect_ref.classList.add('hidden');
	}
	//
	#showDisconnectButton() {
		this.btn_connect_ref.classList.add('hidden');
		this.btn_disconnect_ref.classList.remove('hidden');
	}
	//
	#setBleConnected(thename) {
		this.#afficheStatus(`${thename} is connected`);
		this.#showDisconnectButton();
	}
	//
	#setBleDisconnected() {
		this.#showConnectButton();
	}
}
//
window.addEventListener('DOMContentLoaded', () => {
	window.app = new App();
});
//
//end

