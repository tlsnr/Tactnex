# SMOKELAB V3 – erster 3D-Prototyp

Ein minimaler, **wirklich dreidimensionaler** Browser-Prototyp: Vorplatz, Einfamilienhaus, bewegliche Haustür, Flur, angedeuteter Kellerabgang. **Kein** fertiger Feuerwehrsimulator, kein Multiplayer und keine fachlich geprüfte Übung.

## Testen

Benötigt Internet für das Three.js-Modul (`esm.sh`). Lokal im Projektordner:

```bash
python3 -m http.server 8000
```

Dann am Entwicklungscomputer `http://localhost:8000` öffnen. Für iPads im selben WLAN die lokale IP des Computers anstelle von `localhost` verwenden (Firewall prüfen). iPad: Pfeiltasten unten links bewegen, ↶/↷ drehen, über die Szene ziehen zum Umsehen, `Tür öffnen` in Türnähe. PC: WASD und E.

## GitHub

Neues leeres Repository `smokelab-v3` erstellen; diese Dateien hochladen oder `git init`, `git add .`, `git commit -m "Initial 3D prototype"` und das Repository als `origin` verbinden. Es wurden keine Konten verbunden oder Uploads ausgeführt.

## Firebase Hosting (optional, Spark)

1. Firebase-Projekt im kostenlosen Spark-Tarif erstellen.
2. Firebase CLI lokal installieren und `firebase login` ausführen.
3. `firebase init hosting` im Projektordner; öffentliches Verzeichnis `.`; keine bestehende `index.html` überschreiben lassen.
4. `firebase deploy --only hosting`.

**Achtung:** Firebase Hosting benötigt Internet. Für echtes Multiplayer-Synchronisieren benötigen wir später Firebase Realtime Database mit Authentifizierung und sicheren Regeln; das ist **noch nicht implementiert**. Keine offenen Datenbankregeln für eine produktive App verwenden.

## Nächste Schritte

Kollisionssystem verbessern, Türinteraktionen und Ausrüstung, Ausbilder-Ansicht, Szenariozustand, 2/3-iPad-Synchronisierung, regelbasierter KI-Partner, fachliche Prüfung anhand FwDV und Herstellerdokumentation.
