/**
 * RAMS Kinetic Table — ESP32 Master Firmware
 *
 * Роль: WiFi приёмник команд + LED контроллер + Serial роутер на 2 Mega
 *
 * Подключение:
 *   Serial1 (TX=17, RX=16) → Mega #1 (Blocks 1–8)
 *   Serial2 (TX=4,  RX=5)  → Mega #2 (Blocks 9–15)
 *   GPIO 23                 → WS2812B LED Data
 *   WiFi UDP port 4210      → Windows App
 */

#include <Arduino.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include "protocol.h"

// ===================== CONFIG =====================
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

#define LED_PIN       23
#define NUM_LEDS      900
#define LED_BRIGHTNESS 200

#define MEGA1_TX 17
#define MEGA1_RX 16
#define MEGA2_TX 4
#define MEGA2_RX 5

// ===================== GLOBALS =====================
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
WiFiUDP udp;
char udpBuffer[256];

enum BlockState { STATE_STOP = 0, STATE_UP = 1, STATE_DOWN = -1 };
BlockState blockStates[TOTAL_BLOCKS + 1];

enum LedMode { LED_RAINBOW, LED_PULSE, LED_STATIC, LED_WAVE, LED_OFF };
LedMode currentLedMode = LED_RAINBOW;
uint32_t ledBaseColor = 0x0000FF;
unsigned long lastLedUpdate = 0;
uint16_t animCounter = 0;

unsigned long lastHeartbeatMega1 = 0;
unsigned long lastHeartbeatMega2 = 0;
unsigned long lastWiFiActive = 0;
bool mega1Alive = false;
bool mega2Alive = false;
bool wifiStopSent = false;

struct LedSegment { int start; int count; };

LedSegment blockLeds[TOTAL_BLOCKS + 1] = {
  {0, 0},
  {0, 55},   {55, 55},   {110, 55},  {165, 55},
  {220, 55}, {275, 55},  {330, 55},
  {385, 55}, {440, 50},  {490, 50},  {540, 50},
  {590, 50}, {640, 50},  {690, 50},
  {740, 60},
};

// ===================== FORWARD DECLARATIONS =====================
void processCommand(String cmd, IPAddress remoteIP, uint16_t remotePort);
void routeToMega(int blockId, String action);
void sendAllStop();
void sendStaggered(String action);
void checkMegaResponses();
void checkSafety();
void updateLeds();
void ledRainbow();
void ledPulse();
void ledWave();
void highlightBlock(int blockId, uint32_t color);
void sendUdpResponse(IPAddress ip, uint16_t port, String msg);

// ===================== SETUP =====================
void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial1.begin(SERIAL_BAUD, SERIAL_8N1, MEGA1_RX, MEGA1_TX);
  Serial2.begin(SERIAL_BAUD, SERIAL_8N1, MEGA2_RX, MEGA2_TX);

  Serial.println("ESP32: Starting...");

  for (int i = 0; i <= TOTAL_BLOCKS; i++) blockStates[i] = STATE_STOP;

  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  strip.show();

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi connecting");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi OK! IP: %s\n", WiFi.localIP().toString().c_str());
    udp.begin(UDP_PORT);
    lastWiFiActive = millis();
  } else {
    Serial.println("\nWiFi FAIL — running offline");
  }

  Serial1.println("PING");
  Serial2.println("PING");
  lastHeartbeatMega1 = millis();
  lastHeartbeatMega2 = millis();

  Serial.println("ESP32: Ready.");
}

// ===================== LOOP =====================
void loop() {
  int packetSize = udp.parsePacket();
  if (packetSize) {
    int len = udp.read(udpBuffer, sizeof(udpBuffer) - 1);
    if (len > 0) {
      udpBuffer[len] = 0;
      String cmd = String(udpBuffer);
      cmd.trim();
      lastWiFiActive = millis();
      processCommand(cmd, udp.remoteIP(), udp.remotePort());
    }
  }

  checkMegaResponses();
  checkSafety();

  if (millis() - lastLedUpdate > 33) {
    updateLeds();
    lastLedUpdate = millis();
  }

  static unsigned long lastHB = 0;
  if (millis() - lastHB > HEARTBEAT_INTERVAL) {
    Serial1.println("PING");
    Serial2.println("PING");
    lastHB = millis();
  }
}

// ===================== COMMAND PROCESSING =====================
void processCommand(String cmd, IPAddress remoteIP, uint16_t remotePort) {
  Serial.printf("CMD: %s\n", cmd.c_str());

  if (cmd.startsWith("BLOCK:")) {
    int first = cmd.indexOf(':');
    int second = cmd.indexOf(':', first + 1);
    if (second == -1) return;

    int blockId = cmd.substring(first + 1, second).toInt();
    String action = cmd.substring(second + 1);

    if (blockId < 1 || blockId > TOTAL_BLOCKS) {
      sendUdpResponse(remoteIP, remotePort, "ERR:INVALID_BLOCK:" + String(blockId));
      return;
    }

    if (action == ACTION_UP) blockStates[blockId] = STATE_UP;
    else if (action == ACTION_DOWN) blockStates[blockId] = STATE_DOWN;
    else if (action == ACTION_STOP) blockStates[blockId] = STATE_STOP;

    routeToMega(blockId, action);
    sendUdpResponse(remoteIP, remotePort, "ACK:" + cmd);
  }
  else if (cmd.startsWith("ALL:")) {
    String action = cmd.substring(4);
    if (action == ACTION_STOP) sendAllStop();
    else sendStaggered(action);
    sendUdpResponse(remoteIP, remotePort, "ACK:" + cmd);
  }
  else if (cmd.startsWith("RING:")) {
    int first = cmd.indexOf(':');
    int second = cmd.indexOf(':', first + 1);
    String ring = cmd.substring(first + 1, second);
    String action = cmd.substring(second + 1);

    int start, end;
    if (ring == "OUTER") { start = OUTER_RING_START; end = OUTER_RING_END; }
    else if (ring == "INNER") { start = INNER_RING_START; end = INNER_RING_END; }
    else return;

    for (int i = start; i <= end; i++) {
      if (action == ACTION_UP) blockStates[i] = STATE_UP;
      else if (action == ACTION_DOWN) blockStates[i] = STATE_DOWN;
      else if (action == ACTION_STOP) blockStates[i] = STATE_STOP;
      routeToMega(i, action);
      if (action != ACTION_STOP) delay(STAGGER_DELAY_MS);
    }
    sendUdpResponse(remoteIP, remotePort, "ACK:" + cmd);
  }
  else if (cmd.startsWith("LED:")) {
    String sub = cmd.substring(4);
    if (sub.startsWith("MODE:")) {
      String mode = sub.substring(5);
      if (mode == "RAINBOW") currentLedMode = LED_RAINBOW;
      else if (mode == "PULSE") currentLedMode = LED_PULSE;
      else if (mode == "STATIC") currentLedMode = LED_STATIC;
      else if (mode == "WAVE") currentLedMode = LED_WAVE;
      else if (mode == "OFF") currentLedMode = LED_OFF;
    }
    else if (sub.startsWith("BRIGHTNESS:")) {
      int b = sub.substring(11).toInt();
      if (b >= 0 && b <= 255) strip.setBrightness(b);
    }
    else if (sub.startsWith("COLOR:")) {
      ledBaseColor = (uint32_t)strtol(sub.substring(6).c_str(), NULL, 16);
      currentLedMode = LED_STATIC;
    }
    sendUdpResponse(remoteIP, remotePort, "ACK:" + cmd);
  }
  else if (cmd == "PING") {
    String response = "PONG:MEGA1=" + String(mega1Alive ? "OK" : "DEAD") +
                      ",MEGA2=" + String(mega2Alive ? "OK" : "DEAD");
    sendUdpResponse(remoteIP, remotePort, response);
  }
  else if (cmd == "STATUS") {
    String s = "STATE:";
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      if (i > 1) s += ",";
      s += String(i) + ":";
      if (blockStates[i] == STATE_UP) s += "UP";
      else if (blockStates[i] == STATE_DOWN) s += "DOWN";
      else s += "STOP";
    }
    sendUdpResponse(remoteIP, remotePort, s);
  }
}

// ===================== SERIAL ROUTING =====================
void routeToMega(int blockId, String action) {
  String msg = "BLOCK:" + String(blockId) + ":" + action + "\n";
  if (blockId >= MEGA1_BLOCK_START && blockId <= MEGA1_BLOCK_END) {
    Serial1.print(msg);
  } else if (blockId >= MEGA2_BLOCK_START && blockId <= MEGA2_BLOCK_END) {
    Serial2.print(msg);
  }
}

void sendAllStop() {
  for (int i = 1; i <= TOTAL_BLOCKS; i++) blockStates[i] = STATE_STOP;
  Serial1.println("ALL:STOP");
  Serial2.println("ALL:STOP");
  Serial.println(">>> ALL STOP <<<");
}

void sendStaggered(String action) {
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (action == ACTION_UP) blockStates[i] = STATE_UP;
    else if (action == ACTION_DOWN) blockStates[i] = STATE_DOWN;
    routeToMega(i, action);
    delay(STAGGER_DELAY_MS);
  }
}

// ===================== MEGA RESPONSES =====================
void checkMegaResponses() {
  while (Serial1.available()) {
    String line = Serial1.readStringUntil('\n');
    line.trim();
    if (line == "PONG") { mega1Alive = true; lastHeartbeatMega1 = millis(); }
  }
  while (Serial2.available()) {
    String line = Serial2.readStringUntil('\n');
    line.trim();
    if (line == "PONG") { mega2Alive = true; lastHeartbeatMega2 = millis(); }
  }
}

// ===================== SAFETY =====================
void checkSafety() {
  unsigned long now = millis();

  if (now - lastHeartbeatMega1 > HEARTBEAT_INTERVAL * 3 && mega1Alive) {
    Serial.println("WARNING: Mega#1 heartbeat lost!");
    mega1Alive = false;
    Serial1.println("ALL:STOP");
    for (int i = MEGA1_BLOCK_START; i <= MEGA1_BLOCK_END; i++) blockStates[i] = STATE_STOP;
  }

  if (now - lastHeartbeatMega2 > HEARTBEAT_INTERVAL * 3 && mega2Alive) {
    Serial.println("WARNING: Mega#2 heartbeat lost!");
    mega2Alive = false;
    Serial2.println("ALL:STOP");
    for (int i = MEGA2_BLOCK_START; i <= MEGA2_BLOCK_END; i++) blockStates[i] = STATE_STOP;
  }

  if (WiFi.status() != WL_CONNECTED && (now - lastWiFiActive > WIFI_TIMEOUT_MS)) {
    if (!wifiStopSent) {
      Serial.println("WiFi lost — ALL STOP");
      sendAllStop();
      wifiStopSent = true;
    }
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect > 10000) { WiFi.reconnect(); lastReconnect = now; }
  } else if (WiFi.status() == WL_CONNECTED) {
    wifiStopSent = false;
  }
}

// ===================== LED ANIMATION =====================
void updateLeds() {
  animCounter++;
  switch (currentLedMode) {
    case LED_RAINBOW: ledRainbow(); break;
    case LED_PULSE:   ledPulse(); break;
    case LED_WAVE:    ledWave(); break;
    case LED_STATIC:  strip.fill(ledBaseColor, 0, NUM_LEDS); break;
    case LED_OFF:     strip.clear(); break;
  }
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i] == STATE_UP) highlightBlock(i, strip.Color(255, 255, 255));
    else if (blockStates[i] == STATE_DOWN) highlightBlock(i, strip.Color(255, 100, 0));
  }
  strip.show();
}

void ledRainbow() {
  for (int i = 0; i < NUM_LEDS; i++) {
    uint16_t hue = (i * 65536L / NUM_LEDS + animCounter * 256) & 0xFFFF;
    strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(hue)));
  }
}

void ledPulse() {
  uint8_t brightness = (sin(animCounter * 0.05) + 1.0) * 127;
  uint8_t r = ((ledBaseColor >> 16) & 0xFF) * brightness / 255;
  uint8_t g = ((ledBaseColor >> 8) & 0xFF) * brightness / 255;
  uint8_t b = (ledBaseColor & 0xFF) * brightness / 255;
  strip.fill(strip.Color(r, g, b), 0, NUM_LEDS);
}

void ledWave() {
  for (int i = 0; i < NUM_LEDS; i++) {
    uint8_t brightness = (sin((i + animCounter) * 0.1) + 1.0) * 127;
    uint8_t r = ((ledBaseColor >> 16) & 0xFF) * brightness / 255;
    uint8_t g = ((ledBaseColor >> 8) & 0xFF) * brightness / 255;
    uint8_t b = (ledBaseColor & 0xFF) * brightness / 255;
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
}

void highlightBlock(int blockId, uint32_t color) {
  if (blockId < 1 || blockId > TOTAL_BLOCKS) return;
  LedSegment seg = blockLeds[blockId];
  for (int i = seg.start; i < seg.start + seg.count && i < NUM_LEDS; i++) {
    strip.setPixelColor(i, color);
  }
}

void sendUdpResponse(IPAddress ip, uint16_t port, String msg) {
  udp.beginPacket(ip, port);
  udp.print(msg);
  udp.endPacket();
}
