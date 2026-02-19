# GitHub Actions Build Fix

## Что изменилось

### 1. package.json - Имена артефактов
**Было:**
```json
"win": {
  "artifactName": "${productName}-${version}-win-${arch}.${ext}"
}
```
Это создавало **ОДИНАКОВЫЕ** имена для Setup.exe и Portable.exe!

**Стало:**
```json
"nsis": {
  "artifactName": "${productName}-${version}-Setup.${ext}"
},
"portable": {
  "artifactName": "${productName}-${version}-Portable.${ext}"
}
```

Теперь создаются файлы:
- `RAMS Interactive Hub-2.0.0-Setup.exe` (установщик)
- `RAMS Interactive Hub-2.0.0-Portable.exe` (portable версия)

---

### 2. .github/workflows/build.yml - Улучшенный workflow

**Ключевые улучшения:**

✅ **Точные пути к файлам**
```yaml
path: rams-interactive-hub/dist/*Setup*.exe     # Только Setup
path: rams-interactive-hub/dist/*Portable*.exe  # Только Portable
```

✅ **Проверка билда перед загрузкой**
```yaml
- name: Verify build output
  run: |
    Get-ChildItem dist/*.exe | Format-Table Name, Size
    Get-FileHash *.exe  # SHA256 checksums
```

✅ **Раздельные артефакты**
- `Windows-Installer` (Setup.exe)
- `Windows-Portable` (Portable.exe)
- `Build-Metadata` (latest.yml, builder-debug.yml)

✅ **Строгая проверка ошибок**
```yaml
if-no-files-found: error  # Фейлит если нет файлов
```

✅ **Автоматические релизы** (опционально)
```yaml
# Если пушнуть tag v2.0.0 - создаст GitHub Release
- name: Create Release
  if: startsWith(github.ref, 'refs/tags/v')
```

---

## Почему старый билд не работал

1. **Неправильные имена файлов**: Setup и Portable имели одинаковое имя
2. **Широкие glob паттерны**: `**/*.exe` находил все .exe включая зависимости
3. **continue-on-error: true**: Скрывал реальные ошибки
4. **if-no-files-found: warn**: Не останавливал workflow при отсутствии файлов

---

## Как использовать

### Обычный push (автоматически)
```bash
git push origin main
```
→ Создаст артефакты в Actions

### С тегом (создаст Release)
```bash
git tag v2.0.0
git push origin v2.0.0
```
→ Создаст GitHub Release с .exe файлами

### Вручную
GitHub → Actions → Build Windows Release → Run workflow

---

## Ожидаемый результат

После успешного билда в **Artifacts** появятся:

1. **Windows-Installer** (~200 MB)
   - `RAMS Interactive Hub-2.0.0-Setup.exe`

2. **Windows-Portable** (~250 MB)
   - `RAMS Interactive Hub-2.0.0-Portable.exe`

3. **Build-Metadata** (~2 KB)
   - `latest.yml` - метаданные для auto-update
   - `builder-debug.yml` - debug информация

---

## Проверка

В workflow логах будет:

```
=== Build Output Files ===
Name                                      Size (MB)
----                                      ---------
RAMS Interactive Hub-2.0.0-Setup.exe         203.45
RAMS Interactive Hub-2.0.0-Portable.exe      267.89

=== Checksums ===
RAMS Interactive Hub-2.0.0-Setup.exe: abc123...
RAMS Interactive Hub-2.0.0-Portable.exe: def456...
```

---

**Дата изменений**: 2026-02-19
**Коммит**: Готов к пушу
