/**
 * RAMS Screen - MEGA ACTUATOR CONTROLLER
 *
 * УПРАВЛЕНИЕ 8 БЛОКАМИ АКТУАТОРОВ ПО КОМАНДАМ ОТ ESP32
 *
 * 8 блоков, каждый блок = 2 актуатора = 4 пина
 * Всего 16 актуаторов, 32 пина (22-53)
 * ИНВЕРСНАЯ ЛОГИКА: LOW = включено, HIGH = выключено
 *
 * БЛОК 1: пины 22, 23, 24, 25
 * БЛОК 2: пины 26, 27, 28, 29
 * БЛОК 3: пины 30, 31, 32, 33
 * БЛОК 4: пины 34, 35, 36, 37
 * БЛОК 5: пины 38, 39, 40, 41
 * БЛОК 6: пины 50, 51, 52, 53 (ФИЗИЧЕСКИ ЗАПАЯН НА ЭТИХ ПИНАХ)
 * БЛОК 7: пины 42, 43, 44, 45
 * БЛОК 8: пины 46, 47, 48, 49
 *
 * СВЯЗЬ С ESP32:
 * - Serial1 (TX1=18, RX1=19) → ESP32
 * - Формат команды: JSON строка с \n
 *   {"block":1,"action":"up","duration":12000}
 *   {"block":2,"action":"down","duration":12000}
 *   {"block":0,"action":"stop"}  // 0 = все блоки
 */

#include <ArduinoJson.h>

#define MOVE_DURATION 12000  // Время движения по умолчанию (12 секунд)
#define PAUSE_DURATION 2000  // Пауза между блоками (2 секунды)

// Таймауты для автоматической остановки
unsigned long blockTimers[8] = {0, 0, 0, 0, 0, 0, 0, 0};
int blockDurations[8] = {0, 0, 0, 0, 0, 0, 0, 0};

// Функция для теста одного блока
void testBlock(int blockNum, int pin1, int pin2, int pin3, int pin4) {
  Serial.print("\n[BLOCK ");
  Serial.print(blockNum);
  Serial.print("] Pins ");
  Serial.print(pin1);
  Serial.print(",");
  Serial.print(pin2);
  Serial.print(",");
  Serial.print(pin3);
  Serial.print(",");
  Serial.print(pin4);
  Serial.println(" (2 actuators)");

  // ОБА АКТУАТОРА ВВЕРХ
  Serial.println("  → BOTH UP (12 sec)");
  digitalWrite(pin1, LOW);    // Актуатор 1 вверх
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, LOW);    // Актуатор 2 вверх
  digitalWrite(pin4, HIGH);
  delay(MOVE_DURATION);

  // СТОП
  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, HIGH);
  Serial.println("  → STOP");
  delay(PAUSE_DURATION);

  // ОБА АКТУАТОРА ВНИЗ
  Serial.println("  → BOTH DOWN (12 sec)");
  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, LOW);    // Актуатор 1 вниз
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, LOW);    // Актуатор 2 вниз
  delay(MOVE_DURATION);

  // СТОП
  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, HIGH);
  Serial.println("  → STOP");
  delay(PAUSE_DURATION);
}

// Маппинг блоков на пины
struct Block {
  int pin1, pin2, pin3, pin4;
};

Block blocks[8] = {
  {22, 23, 24, 25},  // Блок 1
  {26, 27, 28, 29},  // Блок 2
  {30, 31, 32, 33},  // Блок 3
  {34, 35, 36, 37},  // Блок 4
  {38, 39, 40, 41},  // Блок 5
  {50, 51, 52, 53},  // Блок 6 (ФИЗИЧЕСКИЕ ПИНЫ)
  {42, 43, 44, 45},  // Блок 7
  {46, 47, 48, 49}   // Блок 8
};

void setup() {
  // Serial для дебага (USB)
  Serial.begin(115200);

  // Serial1 для связи с ESP32 (TX1=18, RX1=19)
  Serial1.begin(115200);
  delay(100);

  Serial.println("\n========================================");
  Serial.println("  RAMS MEGA ACTUATOR CONTROLLER");
  Serial.println("  16 Actuators (8 blocks x 2 actuators)");
  Serial.println("  Arduino Mega - Pins 22 to 53");
  Serial.println("  INVERSE LOGIC (LOW=ON, HIGH=OFF)");
  Serial.println("  Serial1 (TX1=18, RX1=19) ↔ ESP32");
  Serial.println("========================================\n");

  // Настройка всех пинов от 22 до 53
  for (int pin = 22; pin <= 53; pin++) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, HIGH); // Все выключены (HIGH = OFF)
  }

  Serial.println("[INIT] 32 pins (22-53) initialized (all OFF)");
  Serial.println("[INIT] 8 blocks x 2 actuators ready");
  Serial.println("[INIT] Serial1 ready for ESP32 commands");
  Serial.println("\n[READY] Waiting for commands from ESP32...");
  Serial.println("========================================\n");

  // Отправляем подтверждение ESP32
  Serial1.println("{\"status\":\"ready\",\"blocks\":8}");
}

// Функция для движения блока ВВЕРХ
void blockUp(int blockNum, int pin1, int pin2, int pin3, int pin4) {
  Serial.print("[BLOCK ");
  Serial.print(blockNum);
  Serial.println("] → UP");

  // Отправляем команду ESP32
  Serial1.print("B");
  Serial1.print(blockNum);
  Serial1.println("U");

  digitalWrite(pin1, LOW);
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, LOW);
  digitalWrite(pin4, HIGH);
}

// Функция для движения блока ВНИЗ
void blockDown(int blockNum, int pin1, int pin2, int pin3, int pin4) {
  Serial.print("[BLOCK ");
  Serial.print(blockNum);
  Serial.println("] → DOWN");

  // Отправляем команду ESP32
  Serial1.print("B");
  Serial1.print(blockNum);
  Serial1.println("D");

  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, LOW);
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, LOW);
}

// Функция для остановки блока
void blockStop(int pin1, int pin2, int pin3, int pin4) {
  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, HIGH);
}

void loop() {
  // Проверяем наличие команды от ESP32 через Serial1
  if (Serial1.available()) {
    String command = Serial1.readStringUntil('\n');
    command.trim();

    if (command.length() > 0) {
      handleCommand(command);
    }
  }

  // Проверяем таймауты для автоматической остановки блоков
  checkBlockTimers();

  delay(10); // Небольшая задержка для стабильности
}

// ============================================================================
// ОБРАБОТКА КОМАНДЫ ОТ ESP32
// ============================================================================
void handleCommand(String jsonString) {
  Serial.print("[CMD] Received: ");
  Serial.println(jsonString);

  // Парсинг JSON
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, jsonString);

  if (error) {
    Serial.print("[ERROR] JSON parse failed: ");
    Serial.println(error.c_str());

    // Отправляем ошибку ESP32
    Serial1.print("{\"status\":\"error\",\"message\":\"");
    Serial1.print(error.c_str());
    Serial1.println("\"}");
    return;
  }

  // Извлекаем параметры
  int blockNum = doc["block"] | 0;
  String action = doc["action"] | "";
  int duration = doc["duration"] | MOVE_DURATION;

  // Выполняем команду
  bool success = executeBlockCommand(blockNum, action, duration);

  // Отправляем подтверждение ESP32
  if (success) {
    Serial1.print("{\"status\":\"ok\",\"block\":");
    Serial1.print(blockNum);
    Serial1.print(",\"action\":\"");
    Serial1.print(action);
    Serial1.println("\"}");
  } else {
    Serial1.println("{\"status\":\"error\",\"message\":\"Invalid command\"}");
  }
}

// ============================================================================
// ВЫПОЛНЕНИЕ КОМАНДЫ
// ============================================================================
bool executeBlockCommand(int blockNum, String action, int duration) {

  // STOP ALL - остановить все блоки
  if (blockNum == 0 && action == "stop") {
    Serial.println("[CMD] STOP ALL BLOCKS");
    stopAllBlocks();
    return true;
  }

  // Проверка диапазона блока (1-8)
  if (blockNum < 1 || blockNum > 8) {
    Serial.print("[ERROR] Invalid block number: ");
    Serial.println(blockNum);
    return false;
  }

  int index = blockNum - 1; // Индекс массива (0-7)
  Block b = blocks[index];

  // UP - движение вверх
  if (action == "up") {
    Serial.print("[BLOCK ");
    Serial.print(blockNum);
    Serial.print("] → UP (");
    Serial.print(duration);
    Serial.println("ms)");

    blockUpByPins(b.pin1, b.pin2, b.pin3, b.pin4);

    // Установить таймер автоматической остановки
    blockTimers[index] = millis();
    blockDurations[index] = duration;

    return true;
  }

  // DOWN - движение вниз
  else if (action == "down") {
    Serial.print("[BLOCK ");
    Serial.print(blockNum);
    Serial.print("] → DOWN (");
    Serial.print(duration);
    Serial.println("ms)");

    blockDownByPins(b.pin1, b.pin2, b.pin3, b.pin4);

    // Установить таймер автоматической остановки
    blockTimers[index] = millis();
    blockDurations[index] = duration;

    return true;
  }

  // STOP - остановка блока
  else if (action == "stop") {
    Serial.print("[BLOCK ");
    Serial.print(blockNum);
    Serial.println("] → STOP");

    blockStop(b.pin1, b.pin2, b.pin3, b.pin4);

    // Сбросить таймер
    blockTimers[index] = 0;
    blockDurations[index] = 0;

    return true;
  }

  else {
    Serial.print("[ERROR] Unknown action: ");
    Serial.println(action);
    return false;
  }
}

// ============================================================================
// ПРОВЕРКА ТАЙМЕРОВ (автоостановка после duration)
// ============================================================================
void checkBlockTimers() {
  unsigned long now = millis();

  for (int i = 0; i < 8; i++) {
    // Если таймер активен и время вышло
    if (blockTimers[i] > 0 && (now - blockTimers[i] >= blockDurations[i])) {
      Serial.print("[AUTO-STOP] Block ");
      Serial.println(i + 1);

      Block b = blocks[i];
      blockStop(b.pin1, b.pin2, b.pin3, b.pin4);

      // Сбросить таймер
      blockTimers[i] = 0;
      blockDurations[i] = 0;

      // Уведомить ESP32
      Serial1.print("{\"status\":\"stopped\",\"block\":");
      Serial1.print(i + 1);
      Serial1.println(",\"reason\":\"timeout\"}");
    }
  }
}

// ============================================================================
// УПРАВЛЕНИЕ АКТУАТОРАМИ (низкоуровневые функции)
// ============================================================================

// Движение блока ВВЕРХ (по пинам)
void blockUpByPins(int pin1, int pin2, int pin3, int pin4) {
  digitalWrite(pin1, LOW);   // Актуатор 1 вверх
  digitalWrite(pin2, HIGH);
  digitalWrite(pin3, LOW);   // Актуатор 2 вверх
  digitalWrite(pin4, HIGH);
}

// Движение блока ВНИЗ (по пинам)
void blockDownByPins(int pin1, int pin2, int pin3, int pin4) {
  digitalWrite(pin1, HIGH);
  digitalWrite(pin2, LOW);   // Актуатор 1 вниз
  digitalWrite(pin3, HIGH);
  digitalWrite(pin4, LOW);   // Актуатор 2 вниз
}

// Остановка всех блоков
void stopAllBlocks() {
  for (int i = 0; i < 8; i++) {
    Block b = blocks[i];
    blockStop(b.pin1, b.pin2, b.pin3, b.pin4);
    blockTimers[i] = 0;
    blockDurations[i] = 0;
  }
  Serial.println("[SYSTEM] All blocks stopped");
}
