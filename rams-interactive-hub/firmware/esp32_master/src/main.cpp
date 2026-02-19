/**
 * RAMS Kinetic Table — ESP32 Master Firmware v2.1
 *
 * Режим: AP+STA (dual WiFi)
 *   - Создаёт свою точку доступа RAMS-ESP32 (192.168.4.1) — всегда доступен
 *   - Одновременно подключается к роутеру Rams_WIFI — для удобства
 *
 * Как подключить приложение:
 *   Вариант A (рекомендуется): компьютер подключается к Rams_WIFI,
 *             в админке вводишь IP который ESP32 получил от роутера
 *             (смотри Serial Monitor при загрузке: "[STA] IP: 192.168.x.x")
 *   Вариант B (резерв): компьютер подключается к RAMS-ESP32,
 *             в админке IP = 192.168.4.1 (уже стоит по умолчанию)
 *
 * HTTP API:
 *   GET  /api/status              → JSON статус + оба IP
 *   POST /api/block?num=N&action=up/down&duration=D → актуатор
 *   POST /api/all?action=down     → все вниз
 *   POST /api/stop                → экстренная остановка
 *   POST /api/led?mode=RAINBOW    → режим LED
 *   POST /api/led?color=FF0000    → цвет LED
 *   POST /api/led?brightness=200  → яркость LED
 *
 * Подключение:
 *   Serial1 (TX=17, RX=16) → Mega #1 (Blocks 1–8)
 *   Serial2 (TX=4,  RX=5)  → Mega #2 (Blocks 9–15)
 *   GPIO 23                → WS2812B LED Data
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include "protocol.h"

// ===================== AP CONFIG (собственная точка доступа) =====================
const char* AP_SSID     = "RAMS-ESP32";
const char* AP_PASSWORD = "rams2024";
// AP IP = 192.168.4.1 (всегда фиксированный)

// ===================== STA CONFIG (подключение к роутеру) =====================
const char* STA_SSID     = "Rams_WIFI";
const char* STA_PASSWORD = "Rams2021";

// ===================== HARDWARE CONFIG =====================
#define LED_PIN        23
#define NUM_LEDS       900
#define LED_BRIGHTNESS 200

#define MEGA1_TX 17
#define MEGA1_RX 16
#define MEGA2_TX 4
#define MEGA2_RX 5

// ===================== GLOBALS =====================
WebServer server(80);
Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

enum BlockState { STATE_STOP = 0, STATE_UP = 1, STATE_DOWN = -1 };
BlockState blockStates[TOTAL_BLOCKS + 1];

// Active block tracking (max 2 simultaneous)
int activeBlockCount = 0;

// Block timers — auto-stop after duration
unsigned long blockStopTime[TOTAL_BLOCKS + 1];

// LED
enum LedMode { LED_RAINBOW, LED_PULSE, LED_STATIC, LED_WAVE, LED_OFF };
LedMode currentLedMode = LED_RAINBOW;
uint32_t ledBaseColor   = 0x0000FF;
unsigned long lastLedUpdate = 0;
uint16_t animCounter        = 0;

// Mega heartbeat
unsigned long lastHeartbeatMega1 = 0;
unsigned long lastHeartbeatMega2 = 0;
bool mega1Alive = false;
bool mega2Alive = false;

// LED segments per block
struct LedSegment { int start; int count; };
LedSegment blockLeds[TOTAL_BLOCKS + 1] = {
  {0, 0},
  {0,  55}, {55,  55}, {110, 55}, {165, 55},
  {220,55}, {275, 55}, {330, 55},
  {385,55}, {440, 50}, {490, 50}, {540, 50},
  {590,50}, {640, 50}, {690, 50},
  {740,60},
};

// ===================== FORWARD DECLARATIONS =====================
void routeToMega(int blockId, String action);
void sendAllStop();
void sendAllDown();
void checkBlockTimers();
void checkMegaResponses();
void checkSafety();
void updateLeds();
void ledRainbow();
void ledPulse();
void ledWave();
void highlightBlock(int blockId, uint32_t color);
void setupRoutes();

// ===================== HTTP HELPERS =====================
void sendJson(int code, JsonDocument& doc) {
  String body;
  serializeJson(doc, body);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.send(code, "application/json", body);
}

void handleOptions() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

// ===================== ROUTE HANDLERS =====================

// GET /api/status
void handleStatus() {
  JsonDocument doc;
  doc["ok"]            = true;
  doc["mega1"]         = mega1Alive ? "ok" : "dead";
  doc["mega2"]         = mega2Alive ? "ok" : "dead";
  doc["activeBlocks"]  = activeBlockCount;

  // AP info (всегда доступен)
  doc["apIP"]          = WiFi.softAPIP().toString();
  doc["apClients"]     = WiFi.softAPgetStationNum();

  // STA info (роутер)
  doc["staIP"]         = (WiFi.status() == WL_CONNECTED)
                           ? WiFi.localIP().toString()
                           : "not connected";
  doc["staSSID"]       = (WiFi.status() == WL_CONNECTED) ? STA_SSID : "";
  doc["staConnected"]  = (WiFi.status() == WL_CONNECTED);

  JsonArray blocks = doc["blocks"].to<JsonArray>();
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    const char* state = "stop";
    if (blockStates[i] == STATE_UP)   state = "up";
    if (blockStates[i] == STATE_DOWN) state = "down";
    blocks.add(state);
  }
  sendJson(200, doc);
}

// POST /api/block?num=N&action=up/down&duration=D
void handleBlock() {
  if (!server.hasArg("num") || !server.hasArg("action")) {
    JsonDocument err;
    err["error"] = "num and action required";
    sendJson(400, err);
    return;
  }

  int blockNum = server.arg("num").toInt();
  String action = server.arg("action");
  action.toUpperCase();
  unsigned long duration = server.hasArg("duration")
    ? (unsigned long)server.arg("duration").toInt()
    : 10000UL;

  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    JsonDocument err;
    err["error"] = "invalid block number";
    sendJson(400, err);
    return;
  }

  // Enforce max 2 simultaneous blocks
  if (action == ACTION_UP && blockStates[blockNum] != STATE_UP) {
    if (activeBlockCount >= 2) {
      JsonDocument err;
      err["error"]   = "max 2 blocks active";
      err["active"]  = activeBlockCount;
      sendJson(429, err);
      return;
    }
    activeBlockCount++;
    blockStopTime[blockNum] = millis() + duration;
  }
  else if (action == ACTION_DOWN && blockStates[blockNum] == STATE_UP) {
    activeBlockCount = max(0, activeBlockCount - 1);
    blockStopTime[blockNum] = 0;
  }

  if      (action == ACTION_UP)   blockStates[blockNum] = STATE_UP;
  else if (action == ACTION_DOWN) blockStates[blockNum] = STATE_DOWN;
  else if (action == ACTION_STOP) blockStates[blockNum] = STATE_STOP;

  routeToMega(blockNum, action);

  JsonDocument doc;
  doc["ok"]       = true;
  doc["block"]    = blockNum;
  doc["action"]   = action;
  doc["duration"] = duration;
  sendJson(200, doc);

  Serial.printf("[API] block %d → %s (dur=%lums)\n", blockNum, action.c_str(), duration);
}

// POST /api/all?action=down
void handleAll() {
  String action = server.hasArg("action") ? server.arg("action") : "stop";
  action.toUpperCase();

  if (action == ACTION_DOWN) {
    sendAllDown();
  } else {
    sendAllStop();
  }

  JsonDocument doc;
  doc["ok"]     = true;
  doc["action"] = action;
  sendJson(200, doc);
}

// POST /api/stop  (emergency stop)
void handleStop() {
  sendAllStop();
  JsonDocument doc;
  doc["ok"] = true;
  doc["action"] = "emergency_stop";
  sendJson(200, doc);
  Serial.println("[API] EMERGENCY STOP");
}

// POST /api/led?mode=RAINBOW|PULSE|WAVE|STATIC|OFF
//              &color=FF0000
//              &brightness=200
void handleLed() {
  if (server.hasArg("mode")) {
    String mode = server.arg("mode");
    mode.toUpperCase();
    if      (mode == "RAINBOW") currentLedMode = LED_RAINBOW;
    else if (mode == "PULSE")   currentLedMode = LED_PULSE;
    else if (mode == "STATIC")  currentLedMode = LED_STATIC;
    else if (mode == "WAVE")    currentLedMode = LED_WAVE;
    else if (mode == "OFF")     currentLedMode = LED_OFF;
  }
  if (server.hasArg("color")) {
    ledBaseColor = (uint32_t)strtol(server.arg("color").c_str(), NULL, 16);
    currentLedMode = LED_STATIC;
  }
  if (server.hasArg("brightness")) {
    int b = server.arg("brightness").toInt();
    if (b >= 0 && b <= 255) strip.setBrightness(b);
  }

  JsonDocument doc;
  doc["ok"] = true;
  sendJson(200, doc);
}

// ===================== SETUP ROUTES =====================
void setupRoutes() {
  server.on("/api/status", HTTP_GET,  handleStatus);
  server.on("/api/block",  HTTP_POST, handleBlock);
  server.on("/api/all",    HTTP_POST, handleAll);
  server.on("/api/stop",   HTTP_POST, handleStop);
  server.on("/api/led",    HTTP_POST, handleLed);

  // CORS preflight
  server.on("/api/block",  HTTP_OPTIONS, handleOptions);
  server.on("/api/all",    HTTP_OPTIONS, handleOptions);
  server.on("/api/stop",   HTTP_OPTIONS, handleOptions);
  server.on("/api/led",    HTTP_OPTIONS, handleOptions);

  // 404
  server.onNotFound([]() {
    JsonDocument doc;
    doc["error"] = "not found";
    doc["uri"]   = server.uri();
    sendJson(404, doc);
  });
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial1.begin(SERIAL_BAUD, SERIAL_8N1, MEGA1_RX, MEGA1_TX);
  Serial2.begin(SERIAL_BAUD, SERIAL_8N1, MEGA2_RX, MEGA2_TX);

  Serial.println("\n=== RAMS ESP32 Master v2.0 ===");

  // Initialize block states
  for (int i = 0; i <= TOTAL_BLOCKS; i++) {
    blockStates[i]   = STATE_STOP;
    blockStopTime[i] = 0;
  }

  // LED init
  strip.begin();
  strip.setBrightness(LED_BRIGHTNESS);
  strip.show();
  Serial.println("[LED] Initialized");

  // ===== WiFi AP+STA dual mode =====
  WiFi.mode(WIFI_AP_STA);

  // 1) Поднимаем точку доступа (всегда на 192.168.4.1)
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  Serial.printf("[AP]  SSID: %s | IP: %s\n", AP_SSID, WiFi.softAPIP().toString().c_str());

  // 2) Подключаемся к роутеру
  Serial.printf("[STA] Connecting to '%s'", STA_SSID);
  WiFi.begin(STA_SSID, STA_PASSWORD);

  // Ждём до 10 сек (не блокируем надолго — AP уже работает)
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(250);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[STA] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("[STA] >>> Введи этот IP в Admin → Hardware: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[STA] Not connected to router — AP mode still works at 192.168.4.1");
  }
  // ===== End WiFi =====

  // HTTP server (слушает на обоих интерфейсах)
  setupRoutes();
  server.begin();
  Serial.println("[HTTP] Server started on port 80");

  // Ping Megas
  Serial1.println("PING");
  Serial2.println("PING");
  lastHeartbeatMega1 = millis();
  lastHeartbeatMega2 = millis();

  Serial.println("[RAMS] Ready!");
  Serial.printf("[RAMS] AP:  http://%s/api/status\n", WiFi.softAPIP().toString().c_str());
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[RAMS] STA: http://%s/api/status\n", WiFi.localIP().toString().c_str());
  }
}

// ===================== LOOP =====================
void loop() {
  server.handleClient();
  checkBlockTimers();
  checkMegaResponses();
  checkSafety();

  if (millis() - lastLedUpdate > 33) {
    updateLeds();
    lastLedUpdate = millis();
  }

  // Heartbeat to Megas every 2 seconds
  static unsigned long lastHB = 0;
  if (millis() - lastHB > HEARTBEAT_INTERVAL) {
    Serial1.println("PING");
    Serial2.println("PING");
    lastHB = millis();
  }
}

// ===================== BLOCK AUTO-STOP TIMERS =====================
void checkBlockTimers() {
  unsigned long now = millis();
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i] == STATE_UP && blockStopTime[i] > 0 && now >= blockStopTime[i]) {
      blockStates[i]   = STATE_STOP;
      blockStopTime[i] = 0;
      activeBlockCount = max(0, activeBlockCount - 1);
      routeToMega(i, ACTION_STOP);
      Serial.printf("[Timer] Block %d auto-stopped\n", i);
    }
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
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    blockStates[i]   = STATE_STOP;
    blockStopTime[i] = 0;
  }
  activeBlockCount = 0;
  Serial1.println("ALL:STOP");
  Serial2.println("ALL:STOP");
  Serial.println("[ALL] STOP");
}

void sendAllDown() {
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i] == STATE_UP) {
      blockStates[i]   = STATE_DOWN;
      blockStopTime[i] = 0;
      routeToMega(i, ACTION_DOWN);
      delay(STAGGER_DELAY_MS);
    }
  }
  activeBlockCount = 0;
  Serial.println("[ALL] DOWN");
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
    Serial.println("[SAFETY] Mega#1 heartbeat lost! Stopping blocks 1-8");
    mega1Alive = false;
    Serial1.println("ALL:STOP");
    for (int i = MEGA1_BLOCK_START; i <= MEGA1_BLOCK_END; i++) {
      if (blockStates[i] == STATE_UP) activeBlockCount = max(0, activeBlockCount - 1);
      blockStates[i] = STATE_STOP;
    }
  }

  if (now - lastHeartbeatMega2 > HEARTBEAT_INTERVAL * 3 && mega2Alive) {
    Serial.println("[SAFETY] Mega#2 heartbeat lost! Stopping blocks 9-15");
    mega2Alive = false;
    Serial2.println("ALL:STOP");
    for (int i = MEGA2_BLOCK_START; i <= MEGA2_BLOCK_END; i++) {
      if (blockStates[i] == STATE_UP) activeBlockCount = max(0, activeBlockCount - 1);
      blockStates[i] = STATE_STOP;
    }
  }
}

// ===================== LED ANIMATION =====================
void updateLeds() {
  animCounter++;
  switch (currentLedMode) {
    case LED_RAINBOW: ledRainbow(); break;
    case LED_PULSE:   ledPulse();   break;
    case LED_WAVE:    ledWave();    break;
    case LED_STATIC:  strip.fill(ledBaseColor, 0, NUM_LEDS); break;
    case LED_OFF:     strip.clear(); break;
  }
  // Highlight active blocks
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i] == STATE_UP)   highlightBlock(i, strip.Color(255, 255, 255));
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
  uint8_t brightness = (sin(animCounter * 0.05f) + 1.0f) * 127;
  uint8_t r = ((ledBaseColor >> 16) & 0xFF) * brightness / 255;
  uint8_t g = ((ledBaseColor >>  8) & 0xFF) * brightness / 255;
  uint8_t b = ( ledBaseColor        & 0xFF) * brightness / 255;
  strip.fill(strip.Color(r, g, b), 0, NUM_LEDS);
}

void ledWave() {
  for (int i = 0; i < NUM_LEDS; i++) {
    uint8_t brightness = (sin((i + animCounter) * 0.1f) + 1.0f) * 127;
    uint8_t r = ((ledBaseColor >> 16) & 0xFF) * brightness / 255;
    uint8_t g = ((ledBaseColor >>  8) & 0xFF) * brightness / 255;
    uint8_t b = ( ledBaseColor        & 0xFF) * brightness / 255;
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
