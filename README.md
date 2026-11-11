# TactNex · Kellerbrand

Spielbare 3D-Entwicklungsvorschau auf `neubau-v1`. Die veröffentlichte Fassung liegt auf `main`.

## Starten

Im Repository auf `neubau-v1` wechseln und einen statischen Server starten:

```sh
python3 -m http.server 8000
```

[localhost:8000/preview/](http://localhost:8000/preview/) öffnen. Auf dem iPad im gleichen WLAN statt `localhost` die LAN-Adresse des Rechners verwenden. Für die volle Grafikqualität verwendet die Vorschau WebGL 2. Ohne WebGL startet eine vereinfachte Canvas-3D-Darstellung. Three.js r170 (MIT) ist unter `preview/vendor/` enthalten. Es sind kein Build, kein externer Laufzeitdienst und kein Konto nötig.

## Spielen

Durch die Haustür und den Flur zur Kellertreppe. Im Keller den Technikraum öffnen und den Brandherd mit dem Strahlrohr treffen. Sobald der Brand aus ist, zurück zum Vorplatz und über das Funkgerät melden.

| Aktion | Desktop | iPad |
| --- | --- | --- |
| Bewegen | WASD | Linker Stick |
| Umsehen | Maus auf der Szene ziehen | Auf der Szene wischen |
| Tür bedienen | E | Tür-Schaltfläche |
| Gerät wählen | 1 bis 6 | Geräteleiste |
| Gerät benutzen | F | Rechte Aktionsschaltfläche |
| Ducken | C | Ducken |

Das Strahlrohr bietet Voll- und Sprühstrahl sowie einen begrenzten Tank. Zum Nachfüllen am Vorplatz „Hände“ wählen und „Tank füllen“ antippen. Die Geräteansichten verwenden die bereitgestellten Fotos des Dräger-Messgeräts, der K85 und des Sepura-Sprechmikrofons. Wärmebild und Gasmessung starten beim Auswählen. Das Messgerät zeigt simulierte O₂- und CO-Werte sowie einen Rauchindex. Bei einem Spielalarm blinkt das Display und gibt einen Doppelton aus, sofern Browser und Gerät Audio zulassen. Das Mikrofon zeigt den Sendestatus und quittiert die Bedienung akustisch. Die Übung lässt sich mit ↻ zurücksetzen.

## Modellgrenzen

Das Szenario enthält ein Erdgeschoss und einen Keller, ein Fahrzeug als Kulisse sowie einen festen Brandherd. Feuer, Rauch, Dampf, Wasserwirkung und Messwerte sind vereinfachte Spielmodelle. Es gibt keine Brandweiterleitung zwischen Gegenständen, keine Schlauchverlegung, keine Atemschutzsimulation und keinen Mehrspielerbetrieb.
