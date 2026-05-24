import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

interface Location {
  latitude: number;
  longitude: number;
}

interface MarkerData {
  id: string;
  location?: Location;
  concentration: number;
  area: number;
  date: string;
  locationName?: string;
  sampleName?: string;
  notes?: string;
}

interface CustomMapViewProps {
  markers: MarkerData[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export default function CustomMapView({ markers, initialRegion }: CustomMapViewProps) {
  const router = useRouter();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "VIEW_RESULT") {
        const markerId = event.data.id;
        const marker = markers.find((m) => m.id === markerId);
        if (marker) {
          router.push({
            pathname: "/result",
            params: {
              area: marker.area.toFixed(2),
              concentration: marker.concentration.toFixed(1),
              locationName: marker.locationName || "",
              sampleName: marker.sampleName || "Sample A",
              notes: marker.notes || "",
              latitude: marker.location?.latitude?.toString() || "",
              longitude: marker.location?.longitude?.toString() || "",
            },
          });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [markers]);

  // Generate dynamic HTML with serialized markers & Leaflet.markercluster support
  const serializedMarkers = JSON.stringify(markers);
  const srcDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <title>Contaminant Cluster Map</title>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
      <style>
        body, html, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #f8fafc;
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #ffffff;
          color: #0f172a;
          border-radius: 12px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          border: 1px solid #e2e8f0;
        }
        .custom-popup .leaflet-popup-tip {
          background: #ffffff;
          border: 1px solid #e2e8f0;
        }
        /* Custom cluster indicator color tweaks for premium branding */
        .marker-cluster-small {
          background-color: rgba(59, 130, 246, 0.2);
        }
        .marker-cluster-small div {
          background-color: rgba(59, 130, 246, 0.6);
          color: white;
          font-weight: 700;
        }
        .marker-cluster-medium {
          background-color: rgba(249, 115, 22, 0.2);
        }
        .marker-cluster-medium div {
          background-color: rgba(249, 115, 22, 0.6);
          color: white;
          font-weight: 700;
        }
        .marker-cluster-large {
          background-color: rgba(239, 68, 68, 0.2);
        }
        .marker-cluster-large div {
          background-color: rgba(239, 68, 68, 0.6);
          color: white;
          font-weight: 700;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
      <script>
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${initialRegion.latitude}, ${initialRegion.longitude}], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        var markersCluster = L.markerClusterGroup({
          showCoverageOnHover: false,
          maxClusterRadius: 40
        });

        var markersData = ${serializedMarkers};

        markersData.forEach(function(marker) {
          if (!marker.location || typeof marker.location.latitude !== 'number' || typeof marker.location.longitude !== 'number') return;
          
          var color = marker.concentration === 0 ? '#3b82f6' : (marker.concentration < 15 ? '#f97316' : '#ef4444');
          var badgeTitle = marker.concentration === 0 ? 'SAFE' : (marker.concentration < 15 ? 'WARNING' : 'DANGER');
          var badgeBg = marker.concentration === 0 ? '#dbeafe' : (marker.concentration < 15 ? '#ffedd5' : '#fee2e2');

          var customIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div style="background-color: ' + color + '; width: 16px; height: 16px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 3px 6px rgba(0,0,0,0.25); transform: translate(-1px, -1px);"></div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });

          var leafletMarker = L.marker([marker.location.latitude, marker.location.longitude], { icon: customIcon });

          var popupHtml = 
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \\'Segoe UI\\', Roboto, Helvetica, Arial, sans-serif; padding: 6px; min-width: 200px;">' +
              '<div style="font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 2px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">' + (marker.sampleName || 'Field Sample') + '</div>' +
              '<div style="font-size: 11px; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">' +
                '<span>📍</span> ' + (marker.locationName || 'Unknown Location') +
              '</div>' +
              '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background-color: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #f1f5f9;">' +
                '<span style="font-size: 11px; font-weight: 700; color: ' + color + '; background-color: ' + badgeBg + '; padding: 2px 6px; border-radius: 4px;">' + marker.concentration.toFixed(1) + ' ppm (' + badgeTitle + ')</span>' +
                '<span style="font-size: 10px; color: #94a3b8;">' + new Date(marker.date).toLocaleDateString() + '</span>' +
              '</div>' +
              (marker.notes ? '<div style="font-size: 11px; color: #64748b; font-style: italic; margin-bottom: 8px; max-height: 40px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">&ldquo;' + marker.notes + '&rdquo;</div>' : '') +
              '<button ' +
                'style="width: 100%; background-color: #3b82f6; color: white; border: none; padding: 8px; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.25);" ' +
                'onclick="window.parent.postMessage({type: \\'VIEW_RESULT\\', id: \\'' + marker.id + '\\'}, \\'*\\')">' +
                'View Telemetry Details &rarr;' +
              '</button>' +
            '</div>';

          leafletMarker.bindPopup(popupHtml, {
            className: 'custom-popup',
            closeButton: false
          });

          markersCluster.addLayer(leafletMarker);
        });

        map.addLayer(markersCluster);
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <iframe
        srcDoc={srcDoc}
        style={styles.iframe as any}
        title="Interactive Database Contaminant Map"
        frameBorder="0"
        allowFullScreen
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: 0,
  },
});
