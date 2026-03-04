/**
 * RAMS Controller v3.3 - PRODUCTION (Fixed LED Mapping + OTA)
 *
 * Управляет 15 актуаторными блоками + LED зонами
 * - ESP32 → Serial1 (GPIO25/26) → Mega #1 (блоки 1-8)
 * - ESP32 → Serial2 (GPIO16/17) → Mega #2 (блоки 9-15)
 * - ESP32 → GPIO pins → WS2812B LEDs (10 strips)
 * - OTA Updates → Port 3232 (Password: rams2026)
 *
 * LED конфигурация (из svetdiod-project/main.cpp):
 * - 8 лучей: GPIO 21,22,23,15,13,27,32,33 (по 33 LED)
 * - Внутренний круг: GPIO 5 (64 LED)
 * - Внешний круг: GPIO 2 (150 LED)
 *
 * Логика: Блок 1 UP → Актуаторы 1 UP + LED зона 1 ON
 *
 * ИЗМЕНЕНИЯ v3.3 (2026-03-04):
 * ✅ Исправлен маппинг блоков на LED координаты
 * ✅ Устранено дублирование кода в fade анимациях
 * ✅ Добавлено кэширование координат блоков (оптимизация)
 * ✅ Создана функция applyFadeBrightnessToBlock() для fade IN/OUT
 * ✅ Добавлена поддержка OTA обновлений (ArduinoOTA)
 *
 * OTA ОБНОВЛЕНИЕ:
 * - Hostname: RAMS-ESP32
 * - Password: rams2026
 * - Port: 3232 (default)
 * - Arduino IDE: Tools → Port → Network Ports → RAMS-ESP32
 *
 * @version 3.3 (Production - Fixed + OTA)
 * @date 2026-03-04
 * @author RAMS Global Team
 */

#include <WiFi.h>
#include <WebServer.h>
#include <FastLED.h>
#include <ArduinoOTA.h>
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
static uint8_t heat[NUM_STRIPS][MAX_LEDS];  // Для эффекта Fire
static bool mask[NUM_STRIPS][MAX_LEDS];     // Маска активных LED (из svetdiod-project)

// Глобальные LED параметры
uint8_t gR = 0, gG = 150, gB = 255;  // Cyan
uint8_t gBri = 200;
uint8_t gFx = 0;    // Текущий эффект: 0=Static, 1=Pulse, 2=Rainbow, 3=Chase, 4=Sparkle, 5=Wave, 6=Fire, 7=Meteor
uint8_t gSpd = 128; // Скорость эффекта (0-255)

#define FPS 50  // Частота обновления эффектов

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
// POWER CONTROL КОНФИГУРАЦИЯ (ВРЕМЕННО ОТКЛЮЧЕНО)
// ============================================================================
// #define RELAY_MAIN_POWER  19  // GPIO19 → Relay 10A (актуаторы + LED + контроллеры)
// #define POWER_BUTTON      4   // GPIO4  → Физическая кнопка Power ON/OFF (INPUT_PULLUP)
// bool mainPowerOn = false;

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

// LED состояния - ОТДЕЛЬНО от актуаторов!
// LED включается при UP и остается ВКЛ пока не придет STOP или DOWN
bool ledStates[TOTAL_BLOCKS + 1];  // true = LED ВКЛ, false = LED ВЫКЛ

// Fade IN состояния для плавного ВКЛЮЧЕНИЯ LED при поднятии
struct FadeInState {
  bool isActive;
  unsigned long startTime;
  int duration;
};

FadeInState fadeInStates[TOTAL_BLOCKS + 1];  // 0 не используется

// Fade OUT состояния для плавного угасания LED при опускании
struct FadeOutState {
  bool isActive;
  unsigned long startTime;
  int duration;
};

FadeOutState fadeOutStates[TOTAL_BLOCKS + 1];  // 0 не используется

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
  Serial.println("  RAMS CONTROLLER v3.3 PRODUCTION");
  Serial.println("  Actuators + LED Zones + OTA Updates");
  Serial.println("  Fixed LED Mapping + Optimizations");
  Serial.println("========================================");

  // Power Control инициализация (ВРЕМЕННО ОТКЛЮЧЕНО)
  // pinMode(RELAY_MAIN_POWER, OUTPUT);
  // pinMode(POWER_BUTTON, INPUT_PULLUP);
  // digitalWrite(RELAY_MAIN_POWER, LOW);
  // Serial.println("[POWER] Relay initialized");
  // Serial.println("[POWER] GPIO19 = Main Power (OFF)");
  // Serial.println("[POWER] GPIO4  = Power Button (INPUT)");

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

  // Инициализация LED координат блоков (ВАЖНО: ПЕРЕД использованием!)
  initBlockLEDCoords();
  Serial.println("[LED] Block coordinates initialized");

  // Инициализация состояний блоков и маски
  for (int i = 0; i <= TOTAL_BLOCKS; i++) {
    blockStates[i].isActive = false;
    blockStates[i].startTime = 0;
    blockStates[i].duration = 0;
    ledStates[i] = false;  // LED выключены
    fadeInStates[i].isActive = false;
    fadeInStates[i].startTime = 0;
    fadeInStates[i].duration = 0;
    fadeOutStates[i].isActive = false;
    fadeOutStates[i].startTime = 0;
    fadeOutStates[i].duration = 0;
  }

  // Инициализация маски (все LED выключены)
  memset(mask, 0, sizeof(mask));

  // Mega Serial
  Mega1Serial.begin(SERIAL_BAUD, SERIAL_8N1, MEGA1_RX, MEGA1_TX);
  Mega2Serial.begin(SERIAL_BAUD, SERIAL_8N1, MEGA2_RX, MEGA2_TX);
  Serial.println("[MEGA] Serial ready on GPIO25/26 and GPIO16/17");

  // WiFi - сначала сканируем доступные сети
  Serial.println("[WIFI] Scanning networks...");
  int n = WiFi.scanNetworks();
  Serial.printf("[WIFI] Found %d networks:\n", n);
  bool foundRamsWiFi = false;
  for (int i = 0; i < n; i++) {
    Serial.printf("  %d: %s (RSSI: %d, Channel: %d)\n", i+1, WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i));
    if (WiFi.SSID(i) == WIFI_SSID) {
      foundRamsWiFi = true;
      Serial.println("    ✅ Found Rams_WIFI!");
    }
  }

  if (!foundRamsWiFi) {
    Serial.println("[WIFI] ⚠️ Rams_WIFI not found in scan! Check router is ON and 2.4GHz");
  }

  // Пытаемся подключиться к роутеру (Station Mode)
  Serial.printf("[WIFI] Connecting to '%s' with password '%s'...\n", WIFI_SSID, WIFI_PASS);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  // Ждем подключения 10 секунд
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    Serial.printf("[%d]", WiFi.status()); // Показать код статуса
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
    Serial.printf("[WIFI] Final status code: %d\n", WiFi.status());
    Serial.println("[WIFI] Status codes: 0=IDLE, 1=NO_SSID_AVAIL, 3=CONNECTED, 4=CONNECT_FAILED, 6=DISCONNECTED");
    Serial.println("[WIFI] Starting AP Mode (backup)...");
    WiFi.mode(WIFI_AP);
    WiFi.softAP(AP_SSID, AP_PASS);
    Serial.print("[WIFI] AP: ");
    Serial.print(AP_SSID);
    Serial.print(" IP: ");
    Serial.println(WiFi.softAPIP());
  }

  // ===== CORS ЗАГОЛОВКИ =====
  // Обработка OPTIONS preflight запросов для CORS
  server.on("/api/status", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);  // No Content
  });

  server.on("/api/block", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/stop", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/color", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/effect", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

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
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

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
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

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
      ledStates[blockNum] = true;   // ✅ LED ВКЛ
      lightUpBlock(blockNum);
    } else if (action == "DOWN") {
      // Fade LED зоны
      ledStates[blockNum] = false;  // ❌ LED ВЫКЛ
      fadeBlock(blockNum);
    } else if (action == "STOP") {
      // Выключить LED зону
      ledStates[blockNum] = false;  // ❌ LED ВЫКЛ
      turnOffBlock(blockNum);
    }

    Serial.printf("[BLOCK] %d %s %dms (active: %d/%d)\n", blockNum, action.c_str(), duration, activeBlocksCount, MAX_ACTIVE_BLOCKS);
    server.send(200, "text/plain", "OK");
  });

  server.on("/api/stop", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    Serial.println("[API] STOP ALL");

    Mega1Serial.println("ALL:STOP");
    Mega2Serial.println("ALL:STOP");

    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      blockStates[i].isActive = false;
      ledStates[i] = false;  // ❌ Выключить все LED
      fadeInStates[i].isActive = false;   // ❌ Отменить fade IN
      fadeOutStates[i].isActive = false;  // ❌ Отменить fade OUT
    }
    activeBlocksCount = 0;

    // Очистить маску и LED
    memset(mask, 0, sizeof(mask));
    FastLED.clear(true);

    server.send(200, "text/plain", "OK");
  });

  server.on("/api/color", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    // Получить RGB параметры из query string
    int r = server.arg("r").toInt();
    int g = server.arg("g").toInt();
    int b = server.arg("b").toInt();

    // Валидация (0-255)
    if (r < 0) r = 0;
    if (r > 255) r = 255;
    if (g < 0) g = 0;
    if (g > 255) g = 255;
    if (b < 0) b = 0;
    if (b > 255) b = 255;

    // Обновить глобальные переменные
    gR = r;
    gG = g;
    gB = b;

    Serial.printf("[API] LED color set to RGB(%d, %d, %d)\n", r, g, b);

    server.send(200, "text/plain", "OK");
  });

  server.on("/api/effect", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    // Получить ID эффекта и скорость
    int id = server.arg("id").toInt();
    int speed = server.arg("speed").toInt();

    // Валидация
    if (id < 0) id = 0;
    if (id > 7) id = 7;

    if (speed >= 0 && speed <= 255) {
      gSpd = speed;
    }

    // Обновить эффект
    gFx = id;

    // Очистить heat buffer при переключении на Fire
    if (id == 6) {
      memset(heat, 0, sizeof(heat));
    }

    Serial.printf("[API] LED effect set to %d (speed: %d)\n", id, gSpd);

    server.send(200, "text/plain", "OK");
  });

  // OPTIONS для /api/bri
  server.on("/api/bri", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/bri", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    int v = server.arg("v").toInt();
    if (v < 0) v = 0;
    if (v > 255) v = 255;

    gBri = v;
    FastLED.setBrightness(gBri);
    FastLED.show();

    Serial.printf("[API] LED brightness set to %d\n", gBri);
    server.send(200, "text/plain", "OK");
  });

  // OPTIONS для /api/spd
  server.on("/api/spd", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/spd", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    int v = server.arg("v").toInt();
    if (v < 0) v = 0;
    if (v > 255) v = 255;

    gSpd = v;

    Serial.printf("[API] LED speed set to %d\n", gSpd);
    server.send(200, "text/plain", "OK");
  });

  // OPTIONS для /api/zones
  server.on("/api/zones", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.on("/api/zones", HTTP_POST, []() {
    // CORS заголовки
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");

    // Зоны пока не используются, но эндпоинт нужен для совместимости
    int m = server.arg("m").toInt();

    Serial.printf("[API] LED zones mask set to %d (not implemented)\n", m);
    server.send(200, "text/plain", "OK");
  });

  // ===== POWER CONTROL API (ВРЕМЕННО ОТКЛЮЧЕНО) =====
  /*
  server.on("/api/power/on", HTTP_POST, []() {
    Serial.println("[POWER] Main power ON");
    digitalWrite(RELAY_MAIN_POWER, HIGH);
    mainPowerOn = true;
    server.send(200, "text/plain", "Power ON");
  });

  server.on("/api/power/off", HTTP_POST, []() {
    Serial.println("[POWER] Main power OFF - stopping all blocks first");
    Mega1Serial.println("ALL:STOP");
    Mega2Serial.println("ALL:STOP");
    FastLED.clear(true);
    delay(500);
    digitalWrite(RELAY_MAIN_POWER, LOW);
    mainPowerOn = false;
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      blockStates[i].isActive = false;
    }
    activeBlocksCount = 0;
    server.send(200, "text/plain", "Power OFF");
  });

  server.on("/api/power/status", HTTP_GET, []() {
    String json = "{\"power\":" + String(mainPowerOn ? "true" : "false") + "}";
    server.send(200, "application/json", json);
  });
  */

  server.begin();
  Serial.println("[SERVER] Started on port 80");

  // ===== OTA UPDATE SETUP =====
  ArduinoOTA.setHostname("RAMS-ESP32");
  ArduinoOTA.setPassword("rams2026");  // Пароль для OTA обновления

  ArduinoOTA.onStart([]() {
    String type;
    if (ArduinoOTA.getCommand() == U_FLASH) {
      type = "sketch";
    } else {  // U_SPIFFS
      type = "filesystem";
    }
    Serial.println("[OTA] Update Start: " + type);

    // Остановить все актуаторы перед обновлением
    Mega1Serial.println("ALL:STOP");
    Mega2Serial.println("ALL:STOP");

    // Выключить LED
    FastLED.clear(true);
  });

  ArduinoOTA.onEnd([]() {
    Serial.println("\n[OTA] Update Complete!");
  });

  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progress: %u%%\r", (progress / (total / 100)));
  });

  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error[%u]: ", error);
    if (error == OTA_AUTH_ERROR) Serial.println("Auth Failed");
    else if (error == OTA_BEGIN_ERROR) Serial.println("Begin Failed");
    else if (error == OTA_CONNECT_ERROR) Serial.println("Connect Failed");
    else if (error == OTA_RECEIVE_ERROR) Serial.println("Receive Failed");
    else if (error == OTA_END_ERROR) Serial.println("End Failed");
  });

  ArduinoOTA.begin();
  Serial.println("[OTA] Ready for updates");
  Serial.print("[OTA] Hostname: RAMS-ESP32");
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(" | IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.print(" | AP IP: ");
    Serial.println(WiFi.softAPIP());
  }

  Serial.println("[READY] System initialized!\n");
}

// ============================================================================
// LED УПРАВЛЕНИЕ ДЛЯ БЛОКОВ
// ============================================================================

/**
 * Структура для хранения координат LED блока
 * Используется для кэширования и избежания дублирования кода
 */
struct BlockLEDCoords {
  uint8_t leftRay;      // Левый луч (0-7)
  uint8_t rightRay;     // Правый луч (0-7)
  int sector;           // Сектор (0-7)
  bool isOuter;         // true = внешний блок, false = внутренний
  bool isSpecial;       // true = блок 15 (особый случай)
};

/**
 * Кэш координат для всех блоков (вычисляется 1 раз в setup)
 */
static BlockLEDCoords blockCoords[TOTAL_BLOCKS + 1];

/**
 * Инициализация координат блоков
 * ВАЖНО: Вызывать в setup() ОДИН РАЗ!
 */
void initBlockLEDCoords() {
  for (int blockNum = 1; blockNum <= TOTAL_BLOCKS; blockNum++) {
    int sector = (blockNum - 1) / 2;
    blockCoords[blockNum].sector = sector;
    blockCoords[blockNum].leftRay = RAY[sector];
    blockCoords[blockNum].rightRay = RAY[(sector + 1) % 8];
    blockCoords[blockNum].isOuter = (blockNum % 2 == 1);
    blockCoords[blockNum].isSpecial = (blockNum == 15);
  }
}

/**
 * Обновить маску для конкретного блока
 */
void updateMaskForBlock(int blockNum, bool enable) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) return;

  const BlockLEDCoords& coords = blockCoords[blockNum];
  uint8_t L = coords.leftRay;
  uint8_t R = coords.rightRay;
  int sector = coords.sector;

  if (coords.isSpecial) {
    // Блок 15: полные лучи + внутренний круг, БЕЗ внешнего круга!
    for (int j = 0; j < 33; j++) {
      mask[L][j] = enable;
      mask[R][j] = enable;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      mask[S_INNER][INNER_START[sector] + j] = enable;
    }
  }
  else if (coords.isOuter) {
    // ВНЕШНИЕ блоки (1,3,5,7,9,11,13): внешняя часть лучей + внешний круг
    for (int j = RAY_OUT_START; j < RAY_OUT_START + RAY_OUT_COUNT; j++) {
      mask[L][j] = enable;
      mask[R][j] = enable;
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      mask[S_OUTER][OUTER_START[sector] + j] = enable;
    }
  }
  else {
    // ВНУТРЕННИЕ блоки (2,4,6,8,10,12,14): внутренняя часть лучей + оба круга
    for (int j = RAY_IN_START; j < RAY_IN_START + RAY_IN_COUNT; j++) {
      mask[L][j] = enable;
      mask[R][j] = enable;
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      mask[S_INNER][INNER_START[sector] + j] = enable;
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      mask[S_OUTER][OUTER_START[sector] + j] = enable;
    }
  }
}

/**
 * Применить fade яркость к LED блока (используется в fade IN/OUT)
 * @param blockNum Номер блока (1-15)
 * @param fadeBrightness Яркость fade (0-255)
 */
void applyFadeBrightnessToBlock(int blockNum, uint8_t fadeBrightness) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) return;

  const BlockLEDCoords& coords = blockCoords[blockNum];
  uint8_t L = coords.leftRay;
  uint8_t R = coords.rightRay;
  int sector = coords.sector;

  if (coords.isSpecial) {
    // Блок 15: полные лучи + внутренний круг
    for (int j = 0; j < 33; j++) {
      leds[L][j].nscale8(fadeBrightness);
      leds[R][j].nscale8(fadeBrightness);
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j].nscale8(fadeBrightness);
    }
  }
  else if (coords.isOuter) {
    // ВНЕШНИЕ блоки: внешняя часть лучей + внешний круг
    for (int j = RAY_OUT_START; j < RAY_OUT_START + RAY_OUT_COUNT; j++) {
      leds[L][j].nscale8(fadeBrightness);
      leds[R][j].nscale8(fadeBrightness);
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      leds[S_OUTER][OUTER_START[sector] + j].nscale8(fadeBrightness);
    }
  }
  else {
    // ВНУТРЕННИЕ блоки: внутренняя часть лучей + оба круга
    for (int j = RAY_IN_START; j < RAY_IN_START + RAY_IN_COUNT; j++) {
      leds[L][j].nscale8(fadeBrightness);
      leds[R][j].nscale8(fadeBrightness);
    }
    for (int j = 0; j < INNER_COUNT[sector]; j++) {
      leds[S_INNER][INNER_START[sector] + j].nscale8(fadeBrightness);
    }
    for (int j = 0; j < OUTER_COUNT[sector]; j++) {
      leds[S_OUTER][OUTER_START[sector] + j].nscale8(fadeBrightness);
    }
  }
}

/**
 * Применить маску - выключить неактивные LED
 */
void applyMask() {
  for (int s = 0; s < NUM_STRIPS; s++) {
    for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
      if (!mask[s][j]) leds[s][j] = CRGB::Black;
    }
  }
}

/**
 * Включить LED зону для блока
 *
 * Логика маппинга:
 * - ВНЕШНИЕ блоки (1,3,5,7,9,11,13): внешняя часть лучей + внешний круг
 * - ВНУТРЕННИЕ блоки (2,4,6,8,10,12,14): внутренняя часть лучей + оба круга
 * - Блок 15 (особый): ПОЛНЫЕ лучи + внутренний круг, БЕЗ внешнего круга
 *
 * Примеры:
 * - Блок 1 (outer): лучи 0-1 [18-32] + внешний круг [128-149]
 * - Блок 2 (inner): лучи 0-1 [0-17] + внутренний круг [16-23] + внешний круг [128-149]
 * - Блок 15 (special): лучи 7-0 [0-32] + внутренний круг [24-32], БЕЗ внешнего
 */
void lightUpBlock(int blockNum) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    Serial.printf("[LED] Block %d - invalid block number\n", blockNum);
    return;
  }

  // Обновить маску для этого блока
  updateMaskForBlock(blockNum, true);

  // Запустить FADE IN анимацию (1 секунда = плавное появление)
  fadeInStates[blockNum].isActive = true;
  fadeInStates[blockNum].startTime = millis();
  fadeInStates[blockNum].duration = 1000;  // 1 секунда

  const BlockLEDCoords& coords = blockCoords[blockNum];
  Serial.printf("[LED] Block %d FADE IN started (sector %d, rays %d-%d, %s)\n",
    blockNum, coords.sector, coords.leftRay, coords.rightRay,
    coords.isSpecial ? "SPECIAL" : (coords.isOuter ? "OUTER" : "INNER"));
}

/**
 * Fade LED зоны для блока (плавное угасание синхронно с опусканием актуатора)
 */
void fadeBlock(int blockNum) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    return;
  }

  // Запустить FADE OUT анимацию с тем же duration что у актуатора
  fadeOutStates[blockNum].isActive = true;
  fadeOutStates[blockNum].startTime = millis();
  fadeOutStates[blockNum].duration = blockStates[blockNum].duration;

  Serial.printf("[LED] Block %d FADE OUT started (%dms)\n", blockNum, fadeOutStates[blockNum].duration);
}

/**
 * Выключить LED зону для блока (МГНОВЕННО, без fade)
 */
void turnOffBlock(int blockNum) {
  if (blockNum < 1 || blockNum > TOTAL_BLOCKS) {
    return;
  }

  // Обновить маску - выключить этот блок
  updateMaskForBlock(blockNum, false);

  // Применить маску - это очистит LED этого блока
  applyMask();
  FastLED.show();

  Serial.printf("[LED] Block %d OFF (instant)\n", blockNum);
}

// ============================================================================
// LED ЭФФЕКТЫ (из svetdiod-project)
// ============================================================================

/**
 * Эффект 1: Пульсация
 */
void fxPulse() {
  CRGB c(gR, gG, gB);
  c.nscale8(beatsin8(map(gSpd, 0, 255, 8, 60), 15, 255));

  // Применить ко ВСЕМ лентам
  for (int s = 0; s < NUM_STRIPS; s++) {
    for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
      leds[s][j] = mask[s][j] ? c : CRGB::Black;
    }
  }
}

/**
 * Эффект 2: Радуга
 */
void fxRainbow() {
  static uint8_t hue = 0;
  hue += map(gSpd, 0, 255, 1, 5);

  // Генерировать радугу на ВСЕХ лентах
  for (int s = 0; s < NUM_STRIPS; s++) {
    for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
      leds[s][j] = mask[s][j] ? (CRGB)CHSV(hue + j * 3 + s * 25, 255, 255) : CRGB::Black;
    }
  }
}

/**
 * Эффект 3: Бегущая точка
 */
void fxChase() {
  static uint16_t pos = 0;
  static uint32_t last = 0;
  uint32_t now = millis();

  if (now - last >= (uint32_t)map(gSpd, 0, 255, 150, 20)) {
    last = now;
    pos++;
  }

  for (int s = 0; s < NUM_STRIPS; s++) {
    uint16_t n = PIN_LEDS[s];
    fill_solid(leds[s], n, CRGB::Black);
    uint16_t p = pos % n;
    leds[s][p] = CRGB(gR, gG, gB);

    // Хвост
    for (int t = 1; t <= 6 && t < (int)n; t++) {
      int tp = ((int)p - t + (int)n) % (int)n;
      leds[s][tp].setRGB(gR, gG, gB);
      leds[s][tp].nscale8(255 - t * 40);
    }
  }
  applyMask();  // ✅ Применить маску!
}

/**
 * Эффект 4: Искры
 */
void fxSparkle() {
  uint8_t rate = map(gSpd, 0, 255, 30, 180);

  for (int s = 0; s < NUM_STRIPS; s++) {
    for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
      leds[s][j].nscale8(170);
    }
    if (random8() < rate) {
      uint16_t p = random16() % PIN_LEDS[s];
      if (mask[s][p]) leds[s][p] = CRGB(gR, gG, gB);  // ✅ Проверка маски!
    }
  }
  applyMask();  // ✅ Применить маску!
}

/**
 * Эффект 5: Волна
 */
void fxWave() {
  static uint16_t phase = 0;
  phase += map(gSpd, 0, 255, 50, 600);

  for (int s = 0; s < NUM_STRIPS; s++) {
    for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
      if (!mask[s][j]) {  // ✅ Проверка маски!
        leds[s][j] = CRGB::Black;
        continue;
      }
      leds[s][j].setRGB(gR, gG, gB);
      leds[s][j].nscale8(sin8((uint8_t)(j * 255 / PIN_LEDS[s]) + (phase >> 8) + s * 40));
    }
  }
}

/**
 * Эффект 6: Огонь
 */
void fxFire() {
  uint8_t cool = map(gSpd, 0, 255, 20, 80);
  uint8_t spark = map(gSpd, 0, 255, 60, 200);

  for (int s = 0; s < NUM_STRIPS; s++) {
    uint16_t n = PIN_LEDS[s];

    // Cooling
    for (uint16_t j = 0; j < n; j++) {
      heat[s][j] = qsub8(heat[s][j], random8(0, ((cool * 10) / n) + 2));
    }

    // Heat diffusion
    for (int j = n - 1; j >= 2; j--) {
      heat[s][j] = ((uint16_t)heat[s][j-1] + heat[s][j-2] + heat[s][j-2]) / 3;
    }

    // Sparks
    if (random8() < spark) {
      uint8_t y = random8(min((uint16_t)4, n));
      heat[s][y] = qadd8(heat[s][y], random8(160, 255));
    }

    // Convert heat to color
    for (uint16_t j = 0; j < n; j++) {
      leds[s][j] = HeatColor(heat[s][j]);
    }
  }
  applyMask();  // ✅ Применить маску!
}

/**
 * Эффект 7: Метеор
 */
void fxMeteor() {
  static uint16_t pos = 0;
  static uint32_t last = 0;
  uint32_t now = millis();

  if (now - last >= (uint32_t)map(gSpd, 0, 255, 80, 10)) {
    last = now;
    pos++;
  }

  for (int s = 0; s < NUM_STRIPS; s++) {
    uint16_t n = PIN_LEDS[s];

    // Fade
    for (uint16_t j = 0; j < n; j++) {
      if (random8() < 100) leds[s][j].nscale8(140);
    }

    // Meteor head
    uint16_t head = pos % (n * 2);
    if (head < n) {
      leds[s][head] = CRGB(gR, gG, gB);
      if (head > 0) {
        leds[s][head-1].setRGB(gR, gG, gB);
        leds[s][head-1].nscale8(180);
      }
    }
  }
  applyMask();  // ✅ Применить маску!
}

// ============================================================================
// MAIN LOOP - СТИЛЬ DroneControl.ino
// ============================================================================

void loop() {
  server.handleClient();
  ArduinoOTA.handle();  // Обработка OTA обновлений

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
  // ВАЖНО: LED НЕ выключается по timeout!
  // LED остается включенным пока не придет команда STOP или DOWN
  // Таймаут нужен только для безопасности актуаторов (автостоп после движения)
  unsigned long now = millis();

  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (blockStates[i].isActive) {
      unsigned long elapsed = now - blockStates[i].startTime;

      if (elapsed >= blockStates[i].duration) {
        Serial.printf("[TIMEOUT] Block %d - actuator stopped, LED stays ON\n", i);

        // Блок больше не активен (актуатор остановился)
        blockStates[i].isActive = false;

        // НЕ выключаем LED! LED остается включенным до STOP/DOWN
        // turnOffBlock(i);  ← УБРАНО

        // Пересчитать активные
        activeBlocksCount = 0;
        for (int k = 1; k <= TOTAL_BLOCKS; k++) {
          if (blockStates[k].isActive) activeBlocksCount++;
        }
      }
    }
  }

  // ===== ФИЗИЧЕСКАЯ КНОПКА POWER (ВРЕМЕННО ОТКЛЮЧЕНО) =====
  /*
  static bool lastButtonState = HIGH;
  bool buttonState = digitalRead(POWER_BUTTON);

  if (buttonState == LOW && lastButtonState == HIGH) {
    delay(50);
    if (digitalRead(POWER_BUTTON) == LOW) {
      mainPowerOn = !mainPowerOn;
      digitalWrite(RELAY_MAIN_POWER, mainPowerOn ? HIGH : LOW);
      if (mainPowerOn) {
        Serial.println("[BUTTON] Power ON");
      } else {
        Serial.println("[BUTTON] Power OFF - stopping all blocks");
        Mega1Serial.println("ALL:STOP");
        Mega2Serial.println("ALL:STOP");
        FastLED.clear(true);
        for (int i = 1; i <= TOTAL_BLOCKS; i++) {
          blockStates[i].isActive = false;
        }
        activeBlocksCount = 0;
      }
    }
  }
  lastButtonState = buttonState;
  */

  // ===== HEARTBEAT (PING каждые 2 сек) =====
  if (now - lastHeartbeat > HEARTBEAT_INTERVAL) {
    Mega1Serial.println(CMD_PING);
    Mega2Serial.println(CMD_PING);
    lastHeartbeat = now;
  }

  // ===== FADE IN - ПЛАВНОЕ ПОЯВЛЕНИЕ LED ПРИ ПОДНЯТИИ =====
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (fadeInStates[i].isActive) {
      unsigned long elapsed = now - fadeInStates[i].startTime;

      if (elapsed >= fadeInStates[i].duration) {
        // Fade IN завершен - LED полностью включены
        fadeInStates[i].isActive = false;
        Serial.printf("[LED] Block %d FADE IN completed\n", i);
      }
      // Fade IN применяется автоматически через mask и эффект Static
    }
  }

  // ===== FADE OUT - ПЛАВНОЕ УГАСАНИЕ LED ПРИ ОПУСКАНИИ =====
  for (int i = 1; i <= TOTAL_BLOCKS; i++) {
    if (fadeOutStates[i].isActive) {
      unsigned long elapsed = now - fadeOutStates[i].startTime;

      if (elapsed >= fadeOutStates[i].duration) {
        // Fade OUT завершен - выключаем LED полностью
        fadeOutStates[i].isActive = false;
        updateMaskForBlock(i, false);  // Убрать из маски
        applyMask();
        FastLED.show();
        Serial.printf("[LED] Block %d FADE OUT completed\n", i);
      }
      // Fade OUT продолжается - применяется ниже
    }
  }

  // ===== LED ЭФФЕКТЫ =====
  // ВАЖНО: Эффекты работают ВСЕГДА на включенных LED (через mask)
  // Fade IN/OUT только модулирует яркость при поднятии/опускании
  static uint32_t lastEffectFrame = 0;

  if (now - lastEffectFrame >= (1000 / FPS)) {
    lastEffectFrame = now;

    // Сначала применяем эффект (или static) ко ВСЕМ включенным LED
    if (gFx == 0) {
      // Статический цвет
      CRGB c(gR, gG, gB);
      for (int s = 0; s < NUM_STRIPS; s++) {
        for (uint16_t j = 0; j < PIN_LEDS[s]; j++) {
          leds[s][j] = mask[s][j] ? c : CRGB::Black;
        }
      }
    } else {
      // Анимированный эффект (Rainbow, Fire, Wave, etc)
      switch (gFx) {
        case 1: fxPulse();   break;
        case 2: fxRainbow(); break;
        case 3: fxChase();   break;
        case 4: fxSparkle(); break;
        case 5: fxWave();    break;
        case 6: fxFire();    break;
        case 7: fxMeteor();  break;
      }
    }

    // Теперь применяем FADE IN анимации (модулируем яркость 0→255)
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      if (fadeInStates[i].isActive) {
        unsigned long elapsed = now - fadeInStates[i].startTime;
        float progress = (float)elapsed / (float)fadeInStates[i].duration;  // 0.0 - 1.0
        if (progress > 1.0) progress = 1.0;
        uint8_t fadeBrightness = (uint8_t)(255 * progress);  // 0 → 255

        // ✅ Применяем fade яркость ПОВЕРХ эффекта
        applyFadeBrightnessToBlock(i, fadeBrightness);
      }
    }

    // Применяем FADE OUT анимации (модулируем яркость 255→0)
    for (int i = 1; i <= TOTAL_BLOCKS; i++) {
      if (fadeOutStates[i].isActive) {
        unsigned long elapsed = now - fadeOutStates[i].startTime;
        float progress = (float)elapsed / (float)fadeOutStates[i].duration;  // 0.0 - 1.0
        if (progress > 1.0) progress = 1.0;
        uint8_t fadeBrightness = (uint8_t)(255 * (1.0 - progress));  // 255 → 0

        // ✅ Применяем fade яркость ПОВЕРХ эффекта
        applyFadeBrightnessToBlock(i, fadeBrightness);
      }
    }

    // Обновить LED ленты
    FastLED.show();
  }
}
