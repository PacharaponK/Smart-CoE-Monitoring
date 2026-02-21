#include <SPI.h>
#include <RF24.h>

#define CE_PIN   4
#define CSN_PIN  5

RF24 radio(CE_PIN, CSN_PIN);

const byte address[6] = "LR001";

struct Payload {
  uint32_t counter;
  float t;
  float h;
};

Payload rx;

void setup() {
  Serial.begin(115200);
  delay(200);

  if (!radio.begin()) {
    Serial.println("NRF24 init failed!");
    while (1) {}
  }

  // ====== LONG RANGE SETTINGS (ต้องตรงกับ TX) ======
  radio.setPALevel(RF24_PA_MAX);
  radio.setDataRate(RF24_250KBPS);
  radio.setChannel(100);
  radio.setCRCLength(RF24_CRC_16);
  radio.setAutoAck(true);
  radio.setRetries(15, 15);
  radio.enableDynamicPayloads();
  radio.setPayloadSize(sizeof(Payload));
  radio.setAddressWidth(5);

  radio.openReadingPipe(1, address);
  radio.startListening();

  Serial.println("RX Long Range Ready");
  radio.printDetails();
}

void loop() {
  if (radio.available()) {
    radio.read(&rx, sizeof(rx));

    Serial.print("Recv #"); Serial.print(rx.counter);
    Serial.print(" T="); Serial.print(rx.t, 2);
    Serial.print(" H="); Serial.print(rx.h, 2);
    Serial.println();
  }
}