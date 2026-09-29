/*
ESP32 Upesy_21
Capteur BME280 (Temperature, Humidite, Pression atmo)
Communication en Bluetooth BLE+ Client Web BLE
29 Sept 2026
*/
#include <Arduino.h>
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Ticker.h>
#include <BME280.h>

// define
//  BLE UUIDs
//  Environmental Sensing Service
#define SERVICE_UUID "0000181a-0000-1000-8000-00805f9b34fb"
// Temperature
#define TEMP_CHARACTERISTIC_UUID "00002a6e-0000-1000-8000-00805f9b34fb"
// Humidity
#define HUM_CHARACTERISTIC_UUID "00002a6f-0000-1000-8000-00805f9b34fb"
// Pressure
#define PRESS_CHARACTERISTIC_UUID "00002a6d-0000-1000-8000-00805f9b34fb"

// const
const uint32_t PERIOD = 2000;
const uint8_t LED_INTERNAL_PIN = 2;
const uint8_t BME280_ADDRESS = 0x77;

// prototypes
void action();
void mesure();
void notifyFloat(BLECharacteristic *pChar, float value);

// obj
Ticker myTicker;
BME280 myBME280;
// BLE variables
BLEServer *pServer = nullptr;
BLECharacteristic *pTempChar = nullptr;
BLECharacteristic *pHumChar = nullptr;
BLECharacteristic *pPressChar = nullptr;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// var gloables
BME_DataDef myBME_Data_t = {.Temperature = 0, .Humidity = 0, .Pressure = 0, .DewPoint = 0};

//******************* */
// BLE server callbacks
//******************* */
class ServerCallbacks : public BLEServerCallbacks
{
  void onConnect(BLEServer *pServer) override
  {
    deviceConnected = true;
    Serial.println("BLE client connected.");
  }
  void onDisconnect(BLEServer *pServer) override
  {
    deviceConnected = false;
    Serial.println("BLE client disconnected.");
  }
};

//******************************************************************** */
// Format a float to one decimal place and set it on a BLE characteristic,
// then call notify() so connected clients receive it immediately
void notifyFloat(BLECharacteristic *pChar, float value)
{
  char buf[16];
  snprintf(buf, sizeof(buf), "%.1f", value);
  pChar->setValue(buf);
  pChar->notify();
}

//********* */
void mesure()
{
  BME_STATUS status = myBME280.read(&myBME_Data_t);

  if (status == BME_STATUS_OK)
  {
    Serial.printf("Temp= %.2f Hum= %.2f Pres= %.2f \n\r", myBME_Data_t.Temperature, myBME_Data_t.Humidity, myBME_Data_t.Pressure);
  }
  else
  {
    myBME_Data_t.Temperature = 0;
    myBME_Data_t.Humidity = 0;
    myBME_Data_t.Pressure = 0;

    Serial.println("Error read BME280 !");
  }
}
//************ */
void action()
{
  mesure();
  //
  // Notify BLE client with sensor readings if a BLE client is connected
  if (deviceConnected)
  {
    notifyFloat(pTempChar, myBME_Data_t.Temperature);
    notifyFloat(pHumChar, myBME_Data_t.Humidity);
    notifyFloat(pPressChar, myBME_Data_t.Pressure);
  }
}
//************ */
void setup()
{
  Serial.begin(115200);
  Wire.begin();
  //
  pinMode(LED_INTERNAL_PIN, OUTPUT);
  digitalWrite(LED_INTERNAL_PIN, 1);
  delay(500);
  digitalWrite(LED_INTERNAL_PIN, 0);
  //
  // init BME280
  bool res = myBME280.begin(BME280_ADDRESS, BME280_SAMPLING_x8, BME280_SAMPLING_x4, BME280_SAMPLING_x4, BME280_IIR_16, BME280_STANDBY_MS_125);

  if (res)
  {
    Serial.println("Init BME280 OK");
  }
  else
  {
    Serial.println("ERROR BME280 Init");
  }
  //
  // ESP32 BLE init
  // BLEDevice::init("ESP32_BME280");
  BLEDevice::init("UPESY_21");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Temperature characteristic — READ + NOTIFY
  pTempChar = pService->createCharacteristic(
      TEMP_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pTempChar->addDescriptor(new BLE2902());

  // Humidity characteristic — READ + NOTIFY
  pHumChar = pService->createCharacteristic(
      HUM_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pHumChar->addDescriptor(new BLE2902());

  // Pressure characteristic — READ + NOTIFY
  pPressChar = pService->createCharacteristic(
      PRESS_CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pPressChar->addDescriptor(new BLE2902());

  // Set initial values
  pTempChar->setValue("0.0");
  pHumChar->setValue("0.0");
  pPressChar->setValue("0.0");

  // Start the service
  pService->start();

  // Start BLE Device Advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // Aide pour la compatibilité iOS/macOS
  pAdvertising->setMinPreferred(0x12);

  BLEDevice::startAdvertising();
  Serial.println("L'ESP32 diffuse son signal !");
  //
  myTicker.attach_ms(PERIOD, action);
}
//************* */
void loop()
{
  // Handle BLE reconnect after unexpected disconnect
  if (!deviceConnected && oldDeviceConnected)
  {
    delay(500);
    pServer->startAdvertising();
    Serial.println("Restarted advertising.");
    oldDeviceConnected = false;
  }
  //
  if (deviceConnected && !oldDeviceConnected)
  {
    oldDeviceConnected = true;
    Serial.println("BLE client connected.");
  }
}
