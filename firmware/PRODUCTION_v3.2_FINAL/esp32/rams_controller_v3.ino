/**
 * RAMS Controller v3.2 - PRODUCTION (DroneControl Style)
 *
 * Управляет 15 актуаторными блоками + LED зонами
 * - ESP32 → Serial1 (GPIO25/26) → Mega #1 (блоки 1-8)
 * - ESP32 → Serial2 (GPIO16/17) → Mega #2 (блоки 9-15)
 * - ESP32 → GPIO pins → WS2812B LEDs (10 strips)
 *
 * LED конфигурация (из svetdiod-project/main.cpp):
 * - 8 лучей: GPIO 21,22,23,15,13,27,32,33 (по 33 LED)
 * - Внутренний круг: GPIO 5 (64 LED)
 * - Внешний круг: GPIO 2 (150 LED)
 *
 * Логика: Блок 1 UP → Актуаторы 1 UP + LED зона 1 ON
 *
 * @version 3.2 (Production)
 * @date 2026-02-15
 * @author RAMS Global Team
 */

#include <WiFi.h>
#include <WebServer.h>
#include <FastLED.h>
#include "ACTUATOR_CONFIG.h"

// ============================================================================
// WiFi КОНФИГУРАЦИЯ
// ============================================================================
// Station Mode - подключение к общему WiFi роутеру
#define WIFI_SSID   "Rams_WIFI"
#define WIFI_PASS   "Rams2021"

// AP Mode (резервный, если не подключился к роутеру)
#define AP_SSID     "RAMS_Controller"
#define AP_PASS     "rams2026"

// ============================================================================
// LED КОНФИГУРАЦИЯ (из svetdiod-project)
// ============================================================================
#define NUM_STRIPS  10
#define MAX_LEDS    150

// GPIO пины для LED лент
//  idx:   0    1    2    3    4    5    6    7    8    9
// pin:   21   22   23   15   13   27   32   33    5    2
// desc:  R1   R2   R3   R4   R5   R6   R7   R8  Inner Outer
static const uint8_t  PIN_GPIO[NUM_STRIPS] = { 21, 22, 23, 15, 13, 27, 32, 33,  5,  2 };
static const uint16_t PIN_LEDS[NUM_STRIPS] = { 33, 33, 33, 33, 33, 33, 33, 33, 64, 150 };

static CRGB leds[NUM_STRIPS][MAX_LEDS];

// Глобальные LED параметры
uint8_t gR = 0, gG = 150, gB = 255;  // Cyan
uint8_t gBri = 200;

// Разделение луча на внутреннюю/внешнюю части
#define RAY_IN_START   0
#define RAY_IN_COUNT  18   // 0-17 (18 LED)
#define RAY_OUT_START 18
#define RAY_OUT_COUNT 15   // 18-32 (15 LED)

// Индексы лучей и кругов
#define S_INNER  8   // GPIO 5, внутренний круг 64 LED
#define S_OUTER  9   // GPIO 2, внешний круг 150 LED

// Маппинг лучей
static const uint8_t RAY[8] = { 0, 1, 2, 3, 4, 5, 6, 7 };

// Маппинг внутреннего круга (64 LED на 8 долей)
//                                     доля1    доля2   доля3   доля4   доля5   доля6   доля7   доля8
static const uint16_t INNER_START[8] = { 16,     8,      0,     56,     47,     40,     33,     24 };
static const uint16_t INNER_COUNT[8] = {  8,     8,      8,      9,      9,      7,      7,      9 };

// Маппинг внешнего круга (150 LED на 8 долей, блок 8 БЕЗ внешнего круга!)
//                                     доля1    доля2   доля3   доля4   доля5   доля6   доля7   доля8
static const uint16_t OUTER_START[8]   = { 128,   106,     84,     62,     38,     18,      0,      0 };
static const uint16_t OUTER_COUNT[8]   = {  22,    22,     22,     22,     24,     20,     18,      0 };

// ============================================================================
// MEGA SERIAL КОНФИГУРАЦИЯ
// ============================================================================
#define MEGA1_TX 25
#define MEGA1_RX 26
HardwareSerial Mega1Serial(1);

#define MEGA2_TX 16
#define MEGA2_RX 17
HardwareSerial Mega2Serial(2);

// ============================================================================
// СОСТОЯНИЕ БЛОКОВ
// ============================================================================
struct BlockState {
  bool isActive;
  unsigned long startTime;
  int duration;
};

BlockState blockStates[TOTAL_BLOCKS + 1];  // 0 не используется
int activeBlocksCount = 0;

// Heartbeat
bool mega1Alive = false;
bool mega2Alive = false;
unsigned long lastHeartbeat = 0;

// ============================================================================
// WEB SERVER
// ============================================================================
WebServer server(80);

String mega1Response;
String mega2Response;

// ============================================================================
// SETUP
// ============================================================================

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n========================================");
  Serial.println("  RAMS CONTROLLER v3.2 PRODUCTION");
  Serial.println("  Actuators + LED Zones");
  Serial.println("  DroneControl Style");
  Serial.println("========================================");

  // LED инициализация (из svetdiod-project)
  FastLED.addLeds<WS2812B, 21, GRB>(leds[0], PIN_LEDS[0]);  // Ray 1
  FastLED.addLeds<WS2812B, 22, GRB>(leds[1], PIN_LEDS[1]);  // Ray 2
  FastLED.addLeds<WS2812B, 23, GRB>(leds[2], PIN_LEDS[2]);  // Ray 3
  FastLED.addLeds<WS2812B, 15, GRB>(leds[3], PIN_LEDS[3]);  // Ray 4
  FastLED.addLeds<WS2812B, 13, GRB>(leds[4], PIN_LEDS[4]);  // Ray 5
  FastLED.addLeds<WS2812B, 27, GRB>(leds[5], PIN_LEDS[5]);  // Ray 6
  FastLED.addLeds<WS2812B, 32, GRB>(leds[6], PIN_LEDS[6]);  // Ray 7
  FastLED.addLeds<WS2812B, 33, GRB>(leds[7], PIN_LEDS[7]);  // Ray 8
  FastLED.addLeds<WS2812B,  5, GRB>(leds[8], PIN_LEDS[8]);  // Inner circle
  FastLED.addLeds<WS2812B,  2, GRB>(leds[9], PIN_LEDS[9]);  // Outer circle

  FastLED.setBrightness(gBri);
  FastLED.clear(true);
  Serial.println("[LED] 10 strips initialized");
  Serial.println("[LED] Rays: 8x33 LED | Inner: 64 LED | Outer: 150 LED");

  // Инициализация состояний блоков
  for (int i = 0; i <= TOTAL_BLOCKS; i++) {
    blockStates[i].isActive = false;
    blockStates[i].startTime = 0;
    blockStates[i].duration = 0;
  }

  // Mega Serial
  Mega1Serial.begin(SERIAL_BAUD, SERIAL_8N1, MEGA1_RX, MEGA1_TX);
  Mega2Serial.begin(SERIAL_BAUD, SERIAL_8N1, MEGA2_RX, MEGA2_TX);
  Serial.println("[MEGA] Serial ready on GPIO25/26 and GPIO16/17");

  // WiFi - пытаемся подключиться к роутеру (Station Mode)
  Serial.println("[WIFI] Connecting to Rams_WIFI...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  // Ждем подключения 10 секунд
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    // Успешно подключились к роутеру
    Serial.println("\n[WIFI] ✅ Connected to Rams_WIFI!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WIFI] Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("[WIFI] Signal: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    // Не удалось подключиться - запускаем AP Mode (резервный)
    Serial.println("\n[WIFI] ❌ Failed to connect to Rams_WIFI");
    Serial.println("[WIFI] Starting AP Mode (backup)...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.print("[WIFI] AP: ");
    Serial.print(AP_SSID);
    Serial.print(" IP: ");
    Serial.println(WiFi.softAPIP());
  }

  // Web Server
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'>";
    html += "<title>RAMS v3.2</title>";
    html += "<style>*{margin:0;padding:0;box-sizing:border-box}";
    html += "body{font-family:Arial;background:#111;color:#fff;padding:20px}";
    html += "h1{color:#0ff;text-align:center;margin-bottom:20px}";
    html += ".info{text-align:center;margin-bottom:20px;color:#888}";
    html += ".grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:20px}";
    html += ".block{background:#222;padding:15px;border-radius:8px;border:2px solid #333}";
    html += ".block.active{border-color:#0f0;background:#1a2a1a}";
    html += ".block h3{color:#0ff;margin-bottom:10px;font-size:16px}";
    html += ".btn{padding:8px 16px;margin:4px;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:14px}";
    html += ".btn:active{transform:scale(0.95)}";
    html += ".up{background:#0f0;color:#000}.down{background:#f60;color:#fff}.stop{background:#f00;color:#fff}";
    html += ".all-stop{background:#f00;color:#fff;padding:12px 24px;font-size:18px;margin:20px auto;display:block}";
    html += "</style></head><body>";
    html += "<h1>RAMS v3.2 PRODUCTION</h1>";
    html += "<div class='info'>Actuators + LED Zones | Active: <span id='active'>0</span>/2</div>";
    html += "<button class='all-stop' onclick='stopAll()'>STOP ALL</button>";
    html += "<div class='grid'>";

    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      html += "<div class='block' id='b" + String(i) + "'>";
      html += "<h3>Block " + String(i) + "</h3>";
      html += "<button class='btn up' onclick='cmd(" + String(i) + ",\"UP\")'>UP</button>";
      html += "<button class='btn down' onclick='cmd(" + String(i) + ",\"DOWN\")'>DOWN</button>";
      html += "<button class='btn stop' onclick='cmd(" + String(i) + ",\"STOP\")'>STOP</button>";
      html += "</div>";
    }

    html += "</div><script>";
    html += "function cmd(b,a){fetch('/api/block?num='+b+'&action='+a+'&duration=10000',{method:'POST'}).then(()=>updateStatus())}";
    html += "function stopAll(){fetch('/api/stop',{method:'POST'}).then(()=>updateStatus())}";
    html += "function updateStatus(){fetch('/api/status').then(r=>r.json()).then(d=>{";
    html += "document.getElementById('active').textContent=d.active;";
    html += "for(let i=1;i<=15;i++){";
    html += "const b=document.getElementById('b'+i);";
    html += "if(b)b.classList.toggle('active',d.blocks.includes(i))";
    html += "}});}";
    html += "setInterval(updateStatus,1000);updateStatus();";
    html += "</script></body></html>";

    server.send(200, "text/html", html);
  });

  server.on("/api/status", HTTP_GET, []() {
    String json = "{\"active\":" + String(activeBlocksCount) + ",\"blocks\":[";
    bool first = true;
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      if (blockStates[i].isActive) {
        if (!first) json += ",";
        json += String(i);
        first = false;
      }
    }
    json += "]}";
    server.send(200, "application/json", json);
  });

  server.on("/api/block", HTTP_POST, []() {
    int blockNum = server.arg("num").toInt();
    String action = server.arg("action");
    int duration = server.arg("duration").toInt();

    if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
      server.send(400, "text/plain", "ERROR:Invalid block");
      return;
    }

    if (duration <= 0) duration = DEFAULT_DURATION_MS;

    // Лимит активных блоков
    if ((action == "UP" || action == "DOWN") && activeBlocksCount >= MAX_ACTIVE_BLOCKS && !blockStates[blockNum].isActive) {
      server.send(429, "text/plain", "ERROR:Max active");
      return;
    }

    // Формат команды: BLOCK:5:UP:10000
    String cmd = "BLOCK:" + String(blockNum) + ":" + action + ":" + String(duration);

    // Роутинг через общий конфиг
    const BlockConfig* cfg = getBlockConfig(blockNum);
    if (cfg->megaNum == 1) {
      Mega1Serial.println(cmd);
      Serial.println("[MEGA1 TX] " + cmd);
    } else {
      Mega2Serial.println(cmd);
      Serial.println("[MEGA2 TX] " + cmd);
    }

    // Обновить состояние
    blockStates[blockNum].isActive = (action != "STOP");
    blockStates[blockNum].startTime = millis();
    blockStates[blockNum].duration = duration;

    // Пересчитать активные
    activeBlocksCount = 0;
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      if (blockStates[i].isActive) activeBlocksCount++;
    }

    // ===== LED УПРАВЛЕНИЕ =====
    if (action == "UP") {
      // Включить LED зону для этого блока
      lightUpBlock(blockNum);
    } else if (action == "DOWN") {
      // Fade LED зоны
      fadeBlock(blockNum);
    } else if (action == "STOP") {
      // Выключить LED зону
      turnOffBlock(blockNum);
    }

    Serial.printf("[BLOCK] %d %s %dms (active: %d/%d)\n", blockNum, action.c_str(), duration, activeBlocksCount, MAX_ACTIVE_BLOCKS);
    server.send(200, "text/plain", "OK");
  });

  server.on("/api/stop", HTTP_POST, []() {
    Serial.println("[API] STOP ALL");

    Mega1Serial.println("ALL:STOP");
    Mega2Serial.println("ALL:STOP");

    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      blockStates[i].isActive = false;
    }
    activeBlocksCount = 0;

    FastLED.clear(true);

    server.send(200, "text/plain", "OK");
  });

  server.begin();
  Serial.println("[SERVER] Started on port 80");

  Serial.println("[READY] System initialized!\n");
}

// ============================================================================
// LED УПРАВЛЕНИЕ ДЛЯ БЛОКОВ
// ============================================================================

/**
 * Включить LED зону для блока
 *
 * Логика маппинга:
 * - ВНЕШНИЕ блоки (1,3,5,7,9,11,13,15): внешняя часть лучей + внешний круг
 * - ВНУТРЕННИЕ блоки (2,4,6,8,10,12,14): внутренняя часть лучей + внутренний круг
 * - Блок 15 (особый): ПОЛНЫЕ лучи + внутренний круг, БЕЗ внешнего круга
 */
void lightUpBlock(int blockNum) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    Serial.printf("[LED] Block %d - invalid block number\n", blockNum);
    return;
  }

  // Определяем долю пиццы (0-7) на основе блока
  // Блоки 1-2 → доля 0
  // Блоки 3-4 → доля 1
  // ...
  // Блоки 15 → доля 7
  int sector = (blockNum - 1) / 2;  // 0-7
  bool isOuter = (blockNum % 2 == 1);  // Нечетные = внешние

  uint8_t L = RAY[sector];              // Левый луч
  uint8_t R = RAY[(sector + 1) % 8];    // Правый луч

  CRGB color = CRGB(gR, gG, gB);

  if (blockNum == 15) {
    // Блок 15 (особый): ПОЛНЫЕ лучи + внутренний круг, БЕЗ внешнего круга
    for (int j = 0; j < 33; j++) {
      leds[L][j] = color;
      leds[R][j] = color;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j] = color;
    }
    Serial.printf("[LED] Block 15 ON (sector %d, FULL rays + inner)\n", sector);
  }
  else if (isOuter) {
    // ВНЕШНИЕ блоки (1,3,5,7,9,11,13): внешняя часть лучей + внешний круг
    for (int j = RAY_OUT_START; j < RAY_OUT_START + RAY_OUT_COUNT; j++) {
      leds[L][j] = color;
      leds[R][j] = color;
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      leds[S_OUTER][OUTER_START[sector] + j] = color;
    }
    Serial.printf("[LED] Block %d OUTER ON (sector %d, rays %d-%d)\n", blockNum, sector, L, R);
  }
  else {
    // ВНУТРЕННИЕ блоки (2,4,6,8,10,12,14): внутренняя часть лучей + внутренний круг
    for (int j = RAY_IN_START; j < RAY_IN_START + RAY_IN_COUNT; j++) {
      leds[L][j] = color;
      leds[R][j] = color;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j] = color;
    }
    Serial.printf("[LED] Block %d INNER ON (sector %d, rays %d-%d)\n", blockNum, sector, L, R);
  }

  FastLED.show();
}

/**
 * Fade LED зоны для блока
 */
void fadeBlock(int blockNum) {
  // TODO: реализовать fade эффект
  Serial.printf("[LED] Block %d FADE (not implemented yet)\n", blockNum);
}

/**
 * Выключить LED зону для блока
 */
void turnOffBlock(int blockNum) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    return;
  }

  int sector = (blockNum - 1) / 2;  // 0-7
  bool isOuter = (blockNum % 2 == 1);  // Нечетные = внешние

  uint8_t L = RAY[sector];
  uint8_t R = RAY[(sector + 1) % 8];

  if (blockNum == 15) {
    // Блок 15: выключить полные лучи + внутренний круг
    for (int j = 0; j < 33; j++) {
      leds[L][j] = CRGB::Black;
      leds[R][j] = CRGB::Black;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j] = CRGB::Black;
    }
  }
  else if (isOuter) {
    // ВНЕШНИЕ блоки: выключить внешнюю часть лучей + внешний круг
    for (int j = RAY_OUT_START; j < RAY_OUT_START + RAY_OUT_COUNT; j++) {
      leds[L][j] = CRGB::Black;
      leds[R][j] = CRGB::Black;
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      leds[S_OUTER][OUTER_START[sector] + j] = CRGB::Black;
    }
  }
  else {
    // ВНУТРЕННИЕ блоки: выключить внутреннюю часть лучей + внутренний круг
    for (int j = RAY_IN_START; j < RAY_IN_START + RAY_IN_COUNT; j++) {
      leds[L][j] = CRGB::Black;
      leds[R][j] = CRGB::Black;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j] = CRGB::Black;
    }
  }

  FastLED.show();
  Serial.printf("[LED] Block %d OFF\n", blockNum);
}

// ============================================================================
// MAIN LOOP - СТИЛЬ DroneControl.ino
// ============================================================================

void loop() {
  server.handleClient();

  // ===== ЧТЕНИЕ ОТВЕТОВ ОТ MEGA =====
  if (Mega1Serial.available()) {
    mega1Response = Mega1Serial.readStringUntil('\n');
    mega1Response.trim();
    if (mega1Response.length() > 0) {
      Serial.println("[MEGA1 RX] " + mega1Response);

      if (mega1Response == CMD_PONG) {
        mega1Alive = true;
      }
    }
  }

  if (Mega2Serial.available()) {
    mega2Response = Mega2Serial.readStringUntil('\n');
    mega2Response.trim();
    if (mega2Response.length() > 0) {
      Serial.println("[MEGA2 RX] " + mega2Response);

      if (mega2Response == CMD_PONG) {
        mega2Alive = true;
      }
    }
  }

  // ===== ТАЙМАУТЫ БЛОКОВ =====
  unsigned long now = millis();

  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i].isActive) {
      unsigned long elapsed = now - blockStates[i].startTime;

      if (elapsed >= blockStates[i].duration) {
        Serial.printf("[TIMEOUT] Block %d\n", i);

        blockStates[i].isActive = false;

        // Выключить LED
        turnOffBlock(i);

        // Пересчитать активные
        activeBlocksCount = 0;
        for (int k = 1; k <= TOTAL_BLOCKS; k++) {
          if (blockStates[k].isActive) activeBlocksCount++;
        }
      }
    }
  }

  // ===== HEARTBEAT (PING каждые 2 сек) =====
  if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
    Mega1Serial.println(CMD_PING);
    Mega2Serial.println(CMD_PING);
    lastHeartbeat = now;
  }
}
