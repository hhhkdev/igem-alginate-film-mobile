import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { tokens } from "../lib/design-tokens";

interface LocationPickerMapProps {
  latitude: number;
  longitude: number;
  onLocationSelect: (coords: { latitude: number; longitude: number }) => void;
}

export default function LocationPickerMap({ latitude, longitude, onLocationSelect }: LocationPickerMapProps) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "LOCATION_PICKED") {
        onLocationSelect({
          latitude: event.data.latitude,
          longitude: event.data.longitude,
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [onLocationSelect]);

  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <style>
        body, html, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #f8fafc;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script>
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${latitude}, ${longitude}], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        var marker = L.marker([${latitude}, ${longitude}], { draggable: true }).addTo(map);

        function updateLocation(lat, lng) {
          window.parent.postMessage({ type: 'LOCATION_PICKED', latitude: lat, longitude: lng }, '*');
        }

        marker.on('dragend', function(e) {
          var position = marker.getLatLng();
          updateLocation(position.lat, position.lng);
        });

        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;
          marker.setLatLng([lat, lng]);
          updateLocation(lat, lng);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={srcDoc}
        style={styles.iframe as any}
        title="Location Picker Map"
        frameBorder="0"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: "100%",
    borderRadius: tokens.radius.toggleInner,
    overflow: "hidden",
    marginTop: 4,
    borderWidth: 1,
    borderColor: tokens.color.borderDefault,
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: 0,
  },
});
