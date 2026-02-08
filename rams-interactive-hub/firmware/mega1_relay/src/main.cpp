/**
 * RAMS Kinetic Table — Arduino Mega #1 Firmware
 * Blocks 1–8 (Outer Ring 1–7 + Inner Block 8)
 * Serial1 (RX=19, TX=18) ← ESP32
 * Pins 22–37: 8 relay modules (H-Bridge)
 */

#include <Arduino.h>
#include "protocol.h"

struct Block {
  int id, pinUp, pinDown, state;
  unsigned long actionTime;
};

Block blocks[8] = {
  {1, 22, 23, 0, 0}, {2, 24, 25, 0, 0}, {3, 26, 27, 0, 0}, {4, 28, 29, 0, 0},
  {5, 30, 31, 0, 0}, {6, 32, 33, 0, 0}, {7, 34, 35, 0, 0}, {8, 36, 37, 0, 0},
};
const int NUM_BLOCKS = 8;

void stopBlock(int idx) {
  digitalWrite(blocks[idx].pinUp, RELAY_OFF);
  digitalWrite(blocks[idx].pinDown, RELAY_OFF);
  blocks[idx].state = 0;
}

void moveUp(int idx) {
  if (blocks[idx].state == 1) return;
  stopBlock(idx);
  delay(DEADTIME_MS);
  digitalWrite(blocks[idx].pinUp, RELAY_ON);
  blocks[idx].state = 1;
  blocks[idx].actionTime = millis();
}

void moveDown(int idx) {
  if (blocks[idx].state == -1) return;
  stopBlock(idx);
  delay(DEADTIME_MS);
  digitalWrite(blocks[idx].pinDown, RELAY_ON);
  blocks[idx].state = -1;
  blocks[idx].actionTime = millis();
}

void stopAll() { for (int i = 0; i < NUM_BLOCKS; i++) stopBlock(i); }

int findBlock(int id) {
  for (int i = 0; i < NUM_BLOCKS; i++) if (blocks[i].id == id) return i;
  return -1;
}

void processCommand(String cmd) {
  if (cmd == "PING") { Serial1.println("PONG"); return; }
  if (cmd == "ALL:STOP") { stopAll(); Serial1.println("ACK:ALL:STOP"); return; }
  if (cmd.startsWith("ALL:")) {
    String action = cmd.substring(4);
    for (int i = 0; i < NUM_BLOCKS; i++) {
      if (action == ACTION_UP) moveUp(i);
      else if (action == ACTION_DOWN) moveDown(i);
      delay(STAGGER_DELAY_MS);
    }
    Serial1.println("ACK:" + cmd);
    return;
  }
  if (!cmd.startsWith("BLOCK:")) return;
  int first = cmd.indexOf(':');
  int second = cmd.indexOf(':', first + 1);
  if (second == -1) return;
  int blockId = cmd.substring(first + 1, second).toInt();
  String action = cmd.substring(second + 1);
  int idx = findBlock(blockId);
  if (idx == -1) { Serial1.println("ERR:UNKNOWN_BLOCK:" + String(blockId)); return; }
  if (action == ACTION_UP) moveUp(idx);
  else if (action == ACTION_DOWN) moveDown(idx);
  else if (action == ACTION_STOP) stopBlock(idx);
  Serial1.println("ACK:BLOCK:" + String(blockId) + ":" + action);
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  Serial1.begin(SERIAL_BAUD);
  for (int i = 0; i < NUM_BLOCKS; i++) {
    pinMode(blocks[i].pinUp, OUTPUT);
    pinMode(blocks[i].pinDown, OUTPUT);
    digitalWrite(blocks[i].pinUp, RELAY_OFF);
    digitalWrite(blocks[i].pinDown, RELAY_OFF);
  }
  Serial.println("MEGA#1: Ready. Blocks 1-8.");
}

void loop() {
  if (Serial1.available()) {
    String cmd = Serial1.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) processCommand(cmd);
  }
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.length() > 0) processCommand(cmd);
  }
  unsigned long now = millis();
  for (int i = 0; i < NUM_BLOCKS; i++) {
    if (blocks[i].state != 0 && (now - blocks[i].actionTime > ACTUATOR_TIMEOUT_MS)) {
      stopBlock(i);
      Serial1.println("ERR:BLOCK:" + String(blocks[i].id) + ":TIMEOUT");
    }
  }
}
